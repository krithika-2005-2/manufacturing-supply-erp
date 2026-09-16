const { prisma } = require('../prisma/client');
const { ApiError } = require('../utils/api-error');
const { paginate, paginated } = require('../utils/pagination');
const { toDecimal, availableQuantity } = require('../utils/money');
const { numericFor } = require('../utils/numeric');
const {
  resolveFieldName,
  writableData,
  valueFrom,
  missingRequiredScalars,
} = require('../utils/dmmf');

const serializeProduct = (product) => {
  if (!product) {
    return product;
  }
  return {
    ...product,
    sku: valueFrom(product, 'sku', PRODUCT_ALIASES.sku),
    name: valueFrom(product, 'name', PRODUCT_ALIASES.name),
  };
};

const serializeInventory = (inventory) => {
  const physical = toDecimal(valueFrom(inventory, 'physicalQuantity') ?? 0);
  const reserved = toDecimal(valueFrom(inventory, 'reservedQuantity') ?? 0);
  const available = availableQuantity(physical, reserved);
  return {
    productId: valueFrom(inventory, 'productId') ?? inventory.product?.id,
    product: serializeProduct(inventory.product),
    physicalQuantity: physical.toFixed(4),
    reservedQuantity: reserved.toFixed(4),
    availableQuantity: available.toFixed(4),
  };
};

const PRODUCT_ALIASES = {
  sku: ['productCode', 'itemCode', 'code'],
  name: ['productName', 'itemName'],
  basePrice: ['price', 'unitPrice', 'standardPrice', 'rate'],
  category: ['productCategory', 'categoryName'],
  unit: ['uom', 'unitOfMeasure'],
  isActive: ['active', 'enabled'],
};

const toProductWriteData = (payload) => {
  const priceColumn = resolveFieldName('Product', [
    'basePrice',
    ...PRODUCT_ALIASES.basePrice,
  ]);
  const price = payload.basePrice ?? payload.base_price;

  return writableData(
    'Product',
    {
      sku: payload.sku ?? payload.product_code,
      name: payload.name ?? payload.product_name,
      unit: payload.unit,
      isActive: payload.isActive,
      category: payload.category,
      basePrice: priceColumn && price !== undefined ? numericFor('Product', priceColumn, price, 2) : price,
    },
    PRODUCT_ALIASES,
  );
};

const assertNoMissingColumns = (modelName, data) => {
  const missing = missingRequiredScalars(modelName, data);
  if (missing.length > 0) {
    throw ApiError.badRequest(
      `${modelName} requires ${missing
        .map((field) => `${field.name} (${field.type})`)
        .join(', ')}, which the request did not supply.`,
      { missingColumns: missing },
    );
  }
};

const createProduct = async (payload) => {
  const productData = toProductWriteData({
    ...payload,
    unit: payload.unit ?? 'PCS',
    isActive: payload.isActive ?? true,
  });
  assertNoMissingColumns('Product', productData);

  const inventoryData = writableData('Inventory', {
    physicalQuantity: numericFor('Inventory', 'physicalQuantity', payload.physicalQuantity ?? 0),
    reservedQuantity: numericFor('Inventory', 'reservedQuantity', 0),
  });

  const created = await prisma.product.create({
    data: {
      ...productData,
      inventory: { create: inventoryData },
    },
    include: { inventory: true },
  });
  return serializeProduct(created);
};

const listProducts = async (query) => {
  const { skip, take, page, limit } = paginate(query);
  const where = query.search
    ? {
        OR: [
          { product_code: { contains: query.search, mode: 'insensitive' } },
          { product_name: { contains: query.search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [rows, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy: { product_name: 'asc' },
      include: { inventory: true },
    }),
    prisma.product.count({ where }),
  ]);

  return paginated({ rows: rows.map(serializeProduct), total, page, limit });
};

const getProduct = async (id) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { inventory: true },
  });
  if (!product) {
    throw ApiError.notFound('Product not found');
  }
  return serializeProduct(product);
};

const updateProduct = async (id, payload) => {
  await getProduct(id);
  const data = toProductWriteData(payload);
  const updated = await prisma.product.update({
    where: { id },
    data,
    include: { inventory: true },
  });
  return serializeProduct(updated);
};

const listInventory = async () => {
  const rows = await prisma.inventory.findMany({
    include: { product: true },
    // Sort by whatever the product foreign key is actually called, or fall
    // back to the primary key if this database names it something else.
    orderBy: {
      [resolveFieldName('Inventory', ['productId', 'product_id'], { includeReadOnly: true }) ??
      'id']: 'asc',
    },
  });
  return rows.map(serializeInventory);
};

const getInventoryByProduct = async (productId) => {
  const inventory = await prisma.inventory.findFirst({
    where: { product: { id: productId } },
    include: { product: true },
  });
  if (!inventory) {
    throw ApiError.notFound('Inventory record not found for product');
  }
  return serializeInventory(inventory);
};

const updateInventory = async (productId, payload) => {
  const current = await prisma.inventory.findFirst({ where: { product: { id: productId } } });
  if (!current) {
    throw ApiError.notFound('Inventory record not found for product');
  }

  const physical = payload.physicalQuantity ?? current.physicalQuantity;
  const reserved = payload.reservedQuantity ?? current.reservedQuantity;

  if (toDecimal(physical).lessThan(0) || toDecimal(reserved).lessThan(0)) {
    throw ApiError.badRequest('Inventory quantities cannot be negative');
  }
  if (toDecimal(reserved).greaterThan(toDecimal(physical))) {
    throw ApiError.conflict('Reserved quantity cannot exceed physical quantity');
  }

  // Update by the row's own primary key so this does not depend on the
  // product foreign key being unique in the database.
  const updated = await prisma.inventory.update({
    where: { id: current.id },
    data: {
      physicalQuantity: numericFor('Inventory', 'physicalQuantity', physical),
      reservedQuantity: numericFor('Inventory', 'reservedQuantity', reserved),
    },
    include: { product: true },
  });

  return serializeInventory(updated);
};

module.exports = {
  serializeProduct,
  toProductWriteData,
  serializeInventory,
  createProduct,
  listProducts,
  getProduct,
  updateProduct,
  listInventory,
  getInventoryByProduct,
  updateInventory,
};