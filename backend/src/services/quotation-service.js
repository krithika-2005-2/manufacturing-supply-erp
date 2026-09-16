const { Prisma } = require('@prisma/client');
const { prisma } = require('../prisma/client');
const { ApiError } = require('../utils/api-error');
const { quantityForRelation, moneyFor } = require('../utils/numeric');
const {
  relationTargetModel,
  resolveFieldName,
  writableData,
  valueFrom,
  missingRequiredScalars,
} = require('../utils/dmmf');
const { paginate, paginated } = require('../utils/pagination');
const { nextDocumentNumber } = require('../utils/document-number');
const { calculateQuotationTotals } = require('../utils/money');

// A document total goes by many names across ERP schemas.
const TOTAL_ALIASES = ['totalAmount', 'netAmount', 'orderTotal', 'totalValue', 'finalAmount'];

const QUOTATION_ALIASES = {
  notes: ['remarks', 'description', 'comments'],
  validUntil: ['validTill', 'expiryDate'],
  grandTotal: TOTAL_ALIASES,
};

const SALES_ORDER_ALIASES = {
  grandTotal: TOTAL_ALIASES,
  orderDate: ['orderedOn', 'salesOrderDate'],
};

// Resolves the real column first so the value is formatted for that column's
// type, then lets writableData place it under the right key.
const moneyValue = (model, logicalName, aliases, value) => {
  const column = resolveFieldName(model, [logicalName, ...(aliases[logicalName] ?? [])]);
  return column ? moneyFor(model, column, value) : value;
};

const DEFAULT_VALIDITY_DAYS = 30;

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Fail with the column name rather than letting Prisma throw a wall of text.
const assertNoMissingColumns = (modelName, data, hint) => {
  const missing = missingRequiredScalars(modelName, data);
  if (missing.length > 0) {
    throw ApiError.badRequest(
      `${modelName} requires ${missing
        .map((field) => `${field.name} (${field.type})`)
        .join(', ')}, which the request did not supply. ${hint}`,
      { missingColumns: missing },
    );
  }
};

const MONEY_LINE_FIELDS = [
  'unitPrice',
  'discountPercent',
  'gstPercent',
  'baseAmount',
  'discountAmount',
  'gstAmount',
  'lineTotal',
];

// Case and underscore differences are handled by name normalization; these
// cover columns that use a genuinely different word for the same value.
const LINE_ALIASES = {
  unitPrice: ['unitRate', 'rate', 'price'],
  lineTotal: ['lineAmount', 'lineValue', 'totalAmount', 'netAmount'],
  baseAmount: ['grossAmount', 'taxableAmount'],
  discountAmount: ['discountValue'],
  gstAmount: ['taxAmount'],
  discountPercent: ['discountPct', 'discountRate'],
  gstPercent: ['taxPercent', 'taxRate'],
};

// Only write the money columns this database actually has, in its own types.
const lineItemData = (ownerModel, line) => {
  const model = relationTargetModel(ownerModel, 'items');
  const data = { quantity: quantityForRelation(ownerModel, 'items', line.quantity) };

  for (const field of MONEY_LINE_FIELDS) {
    const aliases = LINE_ALIASES[field] ?? [];
    const column = resolveFieldName(model, [field, ...aliases]);
    const value = valueFrom(line, field, aliases);

    if (column && value !== undefined) {
      data[field] = moneyFor(model, column, value);
    }
  }

  const mapped = writableData(model, data, LINE_ALIASES);
  assertNoMissingColumns(
    model,
    mapped,
    'The API does not calculate this value, so the column needs a database default.',
  );

  return mapped;
};

const quotationItemData = (line) => lineItemData('Quotation', line);

const salesOrderItemData = (item) => lineItemData('SalesOrder', item);
const quotationInclude = {
  customer: true,
  enquiry: true,
  items: { include: { product: true } },
  salesOrder: true,
};

const assertCanConvert = (quotation) => {
  if (quotation.status === 'DRAFT') {
    throw ApiError.conflict('DRAFT quotations cannot be converted to sales orders');
  }
  if (quotation.status === 'REJECTED') {
    throw ApiError.conflict('REJECTED quotations cannot be converted to sales orders');
  }
  if (quotation.status !== 'ACCEPTED') {
    throw ApiError.conflict('Only ACCEPTED quotations can be converted to sales orders');
  }
  if (quotation.salesOrder) {
    throw ApiError.conflict('This quotation already has a sales order');
  }
};

const createQuotation = async ({ payload, userId }) => {
  const enquiry = await prisma.enquiry.findUnique({
    where: { id: payload.enquiryId },
    include: { customer: true },
  });
  if (!enquiry) {
    throw ApiError.notFound('Enquiry not found');
  }
  if (enquiry.status === 'LOST') {
    throw ApiError.conflict('Cannot quote a lost enquiry');
  }

  const productIds = [...new Set(payload.items.map((item) => item.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  if (products.length !== productIds.length) {
    throw ApiError.badRequest('One or more products do not exist');
  }

  const totals = calculateQuotationTotals(payload.items);

  const validUntil = payload.validUntil
    ? new Date(payload.validUntil)
    : addDays(new Date(), DEFAULT_VALIDITY_DAYS);

  return prisma.$transaction(async (tx) => {
    const quotationNumber = await nextDocumentNumber(tx, 'quotation');
    const quotationData = writableData(
      'Quotation',
      {
        quotationNumber,
        validUntil,
        notes: payload.notes,
        grandTotal: moneyValue('Quotation', 'grandTotal', QUOTATION_ALIASES, totals.grandTotal),
      },
      QUOTATION_ALIASES,
    );

    assertNoMissingColumns(
      'Quotation',
      quotationData,
      'Send it in the request body or give the column a database default.',
    );

    const quotation = await tx.quotation.create({
      data: {
        ...quotationData,
        enquiry: { connect: { id: enquiry.id } },
        customer: { connect: { id: enquiry.customerId } },
        users: { connect: { id: userId } },
        items: {
          create: totals.lines.map((line, index) => ({
            ...quotationItemData(line),
            product: { connect: { id: payload.items[index].productId } },
          })),
        },
      },
      include: quotationInclude,
    });

    if (enquiry.status === 'NEW') {
      await tx.enquiry.update({
        where: { id: enquiry.id },
        data: { status: 'QUOTED' },
      });
    }

    return quotation;
  });
};

const listQuotations = async (query) => {
  const { skip, take, page, limit } = paginate(query);
  const where = {};
  if (query.status) {
    where.status = query.status;
  }
  if (query.enquiryId) {
    where.enquiryId = query.enquiryId;
  }

  const [rows, total] = await prisma.$transaction([
    prisma.quotation.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: quotationInclude,
    }),
    prisma.quotation.count({ where }),
  ]);

  return paginated({ rows, total, page, limit });
};

const getQuotation = async (id) => {
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: quotationInclude,
  });
  if (!quotation) {
    throw ApiError.notFound('Quotation not found');
  }
  return quotation;
};

const updateQuotationStatus = async (id, status) => {
  const quotation = await getQuotation(id);

  const allowed = {
    DRAFT: ['SENT'],
    SENT: ['ACCEPTED', 'REJECTED'],
    ACCEPTED: [],
    REJECTED: [],
  };

  if (quotation.status === status) {
    return quotation;
  }
  if (!allowed[quotation.status].includes(status)) {
    throw ApiError.conflict(`Cannot change quotation status from ${quotation.status} to ${status}`);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.quotation.update({
      where: { id },
      data: { status },
      include: quotationInclude,
    });

    if (status === 'REJECTED') {
      const remaining = await tx.quotation.count({
        where: {
          enquiryId: quotation.enquiryId,
          status: { in: ['DRAFT', 'SENT', 'ACCEPTED'] },
        },
      });
      if (remaining === 0) {
        await tx.enquiry.update({
          where: { id: quotation.enquiryId },
          data: { status: 'LOST' },
        });
      }
    }

    return updated;
  });
};

const convertQuotationToSalesOrder = async ({ quotationId, userId }) => {
  return prisma.$transaction(async (tx) => {
    const quotation = await tx.quotation.findUnique({
      where: { id: quotationId },
      include: { items: true, salesOrder: true },
    });
    if (!quotation) {
      throw ApiError.notFound('Quotation not found');
    }

    assertCanConvert(quotation);

    const orderNumber = await nextDocumentNumber(tx, 'salesOrder');

    try {
      const salesOrderData = writableData(
        'SalesOrder',
        {
          orderNumber,
          orderDate: new Date(),
          grandTotal: moneyValue(
            'SalesOrder',
            'grandTotal',
            SALES_ORDER_ALIASES,
            valueFrom(quotation, 'grandTotal', TOTAL_ALIASES),
          ),
        },
        SALES_ORDER_ALIASES,
      );

      assertNoMissingColumns(
        'SalesOrder',
        salesOrderData,
        'Give the column a database default so conversion can fill it.',
      );

      const salesOrder = await tx.salesOrder.create({
        data: {
          ...salesOrderData,
          quotation: { connect: { id: quotation.id } },
          customer: { connect: { id: quotation.customerId } },
          users: { connect: { id: userId } },
          items: {
            create: quotation.items.map((item) => ({
              ...salesOrderItemData(item),
              product: { connect: { id: item.productId } },
            })),
          },
        },
        include: {
          customer: true,
          quotation: { include: { enquiry: true } },
          items: { include: { product: true } },
        },
      });

      await tx.enquiry.update({
        where: { id: quotation.enquiryId },
        data: { status: 'WON' },
      });

      return salesOrder;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw ApiError.conflict('This quotation already has a sales order');
      }
      throw error;
    }
  });
};

module.exports = {
  assertCanConvert,
  quotationItemData,
  salesOrderItemData,
  createQuotation,
  listQuotations,
  getQuotation,
  updateQuotationStatus,
  convertQuotationToSalesOrder,
};