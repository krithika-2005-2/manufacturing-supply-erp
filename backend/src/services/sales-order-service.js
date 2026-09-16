const { Prisma } = require('@prisma/client');
const { prisma } = require('../prisma/client');
const { ApiError } = require('../utils/api-error');
const { quantityForRelation } = require('../utils/numeric');
const {
  relationTargetModel,
  writableData,
  missingRequiredScalars,
} = require('../utils/dmmf');

const DISPATCH_ALIASES = {
  vehicleNumber: ['vehicleNo', 'vehicle'],
  driverName: ['driver'],
};
const { paginate, paginated } = require('../utils/pagination');
const { nextDocumentNumber } = require('../utils/document-number');
const { toDecimal, availableQuantity } = require('../utils/money');

// SalesOrder has no direct enquiry relation; traceability goes through the quotation.
const salesOrderInclude = {
  customer: true,
  quotation: { include: { enquiry: true } },
  items: { include: { product: true } },
  dispatch: { include: { items: true } },
};

const listSalesOrders = async (query) => {
  const { skip, take, page, limit } = paginate(query);
  const where = {};
  if (query.status) {
    where.status = query.status;
  }
  if (query.customerId) {
    where.customerId = query.customerId;
  }

  const [rows, total] = await prisma.$transaction([
    prisma.salesOrder.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: salesOrderInclude,
    }),
    prisma.salesOrder.count({ where }),
  ]);

  return paginated({ rows, total, page, limit });
};

const getSalesOrder = async (id) => {
  const order = await prisma.salesOrder.findUnique({
    where: { id },
    include: salesOrderInclude,
  });
  if (!order) {
    throw ApiError.notFound('Sales order not found');
  }
  return order;
};

const lockInventoryRow = async (tx, productId) => {
  const rows = await tx.$queryRaw(
    Prisma.sql`
      SELECT id, product_id, physical_quantity, reserved_quantity
      FROM inventory
      WHERE product_id = ${productId}::uuid
      FOR UPDATE
    `,
  );
  return rows[0] ?? null;
};

const reserveInventoryForOrder = async (tx, items) => {
  const failures = [];

  for (const item of items) {
    const row = await lockInventoryRow(tx, item.productId);
    if (!row) {
      failures.push({ productId: item.productId, reason: 'Inventory record missing' });
      continue;
    }

    const requested = toDecimal(item.quantity);
    const available = availableQuantity(row.physical_quantity, row.reserved_quantity);
    if (requested.greaterThan(available)) {
      failures.push({
        productId: item.productId,
        requested: requested.toFixed(4),
        available: available.toFixed(4),
        reason: 'Insufficient available quantity',
      });
      continue;
    }

    const updated = await tx.$executeRaw(
      Prisma.sql`
        UPDATE inventory
        SET reserved_quantity = reserved_quantity + ${requested.toString()}::decimal
        WHERE product_id = ${item.productId}::uuid
          AND (physical_quantity - reserved_quantity) >= ${requested.toString()}::decimal
      `,
    );

    if (updated !== 1) {
      failures.push({
        productId: item.productId,
        reason: 'Inventory reservation lost a concurrent race',
      });
    }
  }

  if (failures.length > 0) {
    throw ApiError.conflict('Insufficient inventory to confirm this sales order', { failures });
  }
};

const confirmSalesOrder = async (id) => {
  return prisma.$transaction(async (tx) => {
    const orders = await tx.$queryRaw(
      Prisma.sql`
        SELECT id, status
        FROM sales_orders
        WHERE id = ${id}::uuid
        FOR UPDATE
      `,
    );
    const locked = orders[0];
    if (!locked) {
      throw ApiError.notFound('Sales order not found');
    }
    if (locked.status !== 'PENDING') {
      throw ApiError.conflict(`Sales order cannot be confirmed from status ${locked.status}`);
    }

    const order = await tx.salesOrder.findUnique({
      where: { id },
      include: { items: true },
    });

    await reserveInventoryForOrder(tx, order.items);

    return tx.salesOrder.update({
      where: { id },
      data: { status: 'CONFIRMED' },
      include: salesOrderInclude,
    });
  });
};

const dispatchSalesOrder = async ({ orderId, payload, userId }) => {
  return prisma.$transaction(async (tx) => {
    const orders = await tx.$queryRaw(
      Prisma.sql`
        SELECT id, status
        FROM sales_orders
        WHERE id = ${orderId}::uuid
        FOR UPDATE
      `,
    );
    const locked = orders[0];
    if (!locked) {
      throw ApiError.notFound('Sales order not found');
    }
    if (locked.status === 'CANCELLED') {
      throw ApiError.conflict('Cancelled sales orders cannot be dispatched');
    }
    if (locked.status === 'DISPATCHED') {
      throw ApiError.conflict('Sales order has already been dispatched');
    }
    if (locked.status !== 'CONFIRMED') {
      throw ApiError.conflict('Only CONFIRMED sales orders can be dispatched');
    }

    // Filter through the relation: the dispatches table exposes only id and
    // dispatchNumber as unique, so findUnique on the sales order key is invalid.
    const existingDispatch = await tx.dispatch.findFirst({
      where: { salesOrder: { id: orderId } },
    });
    if (existingDispatch) {
      throw ApiError.conflict('A dispatch already exists for this sales order');
    }

    const order = await tx.salesOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    const quantityByProduct = new Map(
      order.items.map((item) => [item.productId, toDecimal(item.quantity)]),
    );

    for (const item of payload.items) {
      const orderedQty = quantityByProduct.get(item.productId);
      if (!orderedQty) {
        throw ApiError.badRequest(`Product ${item.productId} is not on this sales order`);
      }
      const dispatchQty = toDecimal(item.quantity);
      if (dispatchQty.greaterThan(orderedQty)) {
        throw ApiError.conflict('Cannot dispatch more than the ordered/reserved quantity', {
          productId: item.productId,
          ordered: orderedQty.toFixed(4),
          requested: dispatchQty.toFixed(4),
        });
      }
    }

    for (const item of payload.items) {
      const dispatchQty = toDecimal(item.quantity);
      const inventory = await lockInventoryRow(tx, item.productId);
      if (!inventory) {
        throw ApiError.conflict('Inventory record missing', { productId: item.productId });
      }

      const reserved = toDecimal(inventory.reserved_quantity);
      const physical = toDecimal(inventory.physical_quantity);
      if (dispatchQty.greaterThan(reserved) || dispatchQty.greaterThan(physical)) {
        throw ApiError.conflict('Cannot dispatch beyond reserved or physical quantity', {
          productId: item.productId,
          reserved: reserved.toFixed(4),
          physical: physical.toFixed(4),
          requested: dispatchQty.toFixed(4),
        });
      }

      const updated = await tx.$executeRaw(
        Prisma.sql`
          UPDATE inventory
          SET physical_quantity = physical_quantity - ${dispatchQty.toString()}::decimal,
              reserved_quantity = reserved_quantity - ${dispatchQty.toString()}::decimal
          WHERE product_id = ${item.productId}::uuid
            AND reserved_quantity >= ${dispatchQty.toString()}::decimal
            AND physical_quantity >= ${dispatchQty.toString()}::decimal
        `,
      );

      if (updated !== 1) {
        throw ApiError.conflict('Dispatch inventory update failed due to concurrent change', {
          productId: item.productId,
        });
      }
    }

    const dispatchNumber = await nextDocumentNumber(tx, 'dispatch');
    const dispatchData = writableData(
      'Dispatch',
      {
        dispatchNumber,
        dispatchDate: new Date(payload.dispatchDate),
        vehicleNumber: payload.vehicleNumber,
        driverName: payload.driverName,
      },
      DISPATCH_ALIASES,
    );

    const missing = missingRequiredScalars('Dispatch', dispatchData);
    if (missing.length > 0) {
      throw ApiError.badRequest(
        `Dispatch requires ${missing
          .map((field) => `${field.name} (${field.type})`)
          .join(', ')}, which the request did not supply.`,
        { missingColumns: missing },
      );
    }

    try {
      const dispatch = await tx.dispatch.create({
        data: {
          ...dispatchData,
          salesOrder: { connect: { id: orderId } },
          users: { connect: { id: userId } },
          items: {
            create: payload.items.map((item) => ({
              ...writableData(relationTargetModel('Dispatch', 'items'), {
                quantity: quantityForRelation('Dispatch', 'items', item.quantity),
              }),
              product: { connect: { id: item.productId } },
            })),
          },
        },
        include: { items: { include: { product: true } }, salesOrder: true },
      });

      await tx.salesOrder.update({
        where: { id: orderId },
        data: { status: 'DISPATCHED' },
      });

      return dispatch;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw ApiError.conflict('A dispatch already exists for this sales order');
      }
      throw error;
    }
  });
};

module.exports = {
  listSalesOrders,
  getSalesOrder,
  confirmSalesOrder,
  dispatchSalesOrder,
  reserveInventoryForOrder,
};