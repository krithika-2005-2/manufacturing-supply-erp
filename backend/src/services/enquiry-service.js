const { prisma } = require('../prisma/client');
const { ApiError } = require('../utils/api-error');
const { quantityForRelation } = require('../utils/numeric');
const { relationTargetModel, writableData } = require('../utils/dmmf');
const { paginate, paginated } = require('../utils/pagination');
const { nextDocumentNumber } = require('../utils/document-number');
const enquiryInclude = {
  customer: true,
  items: { include: { product: true } },
};

const ENQUIRY_ALIASES = { notes: ['remarks', 'description', 'comments'] };
const ITEM_ALIASES = { notes: ['remarks', 'description', 'comments'] };

const itemModel = () => relationTargetModel('Enquiry', 'items');

const toItemData = (item) => ({
  ...writableData(
    itemModel(),
    {
      quantity: quantityForRelation('Enquiry', 'items', item.quantity),
      notes: item.notes,
    },
    ITEM_ALIASES,
  ),
  product: { connect: { id: item.productId } },
});

const assertCustomerExists = async (customerId) => {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) {
    throw ApiError.notFound('Customer not found');
  }
  return customer;
};

const assertProductsExist = async (items) => {
  const ids = [...new Set(items.map((item) => item.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: ids } } });
  if (products.length !== ids.length) {
    throw ApiError.badRequest('One or more products do not exist');
  }
};

const createEnquiry = async ({ payload, userId }) => {
  await assertCustomerExists(payload.customerId);
  await assertProductsExist(payload.items);

  if (new Date(payload.requiredDate) < new Date(payload.enquiryDate)) {
    throw ApiError.badRequest('Required date cannot be before enquiry date');
  }

  return prisma.$transaction(async (tx) => {
    const enquiryNumber = await nextDocumentNumber(tx, 'enquiry');
    return tx.enquiry.create({
      data: {
        ...writableData(
          'Enquiry',
          {
            enquiryNumber,
            enquiryDate: new Date(payload.enquiryDate),
            requiredDate: new Date(payload.requiredDate),
            notes: payload.notes,
          },
          ENQUIRY_ALIASES,
        ),
        customer: { connect: { id: payload.customerId } },
        users: { connect: { id: userId } },
        items: { create: payload.items.map(toItemData) },
      },
      include: enquiryInclude,
    });
  });
};

const listEnquiries = async (query) => {
  const { skip, take, page, limit } = paginate(query);
  const where = {};
  if (query.status) {
    where.status = query.status;
  }
  if (query.customerId) {
    where.customerId = query.customerId;
  }

  const [rows, total] = await prisma.$transaction([
    prisma.enquiry.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: enquiryInclude,
    }),
    prisma.enquiry.count({ where }),
  ]);

  return paginated({ rows, total, page, limit });
};

const getEnquiry = async (id) => {
  const enquiry = await prisma.enquiry.findUnique({
    where: { id },
    include: { ...enquiryInclude, quotations: true },
  });
  if (!enquiry) {
    throw ApiError.notFound('Enquiry not found');
  }
  return enquiry;
};

const updateEnquiry = async (id, payload) => {
  const existing = await getEnquiry(id);
  if (existing.status === 'WON' || existing.status === 'LOST') {
    throw ApiError.conflict('Closed enquiries cannot be updated');
  }

  if (payload.customerId) {
    await assertCustomerExists(payload.customerId);
  }
  if (payload.items) {
    await assertProductsExist(payload.items);
  }

  const enquiryDate = payload.enquiryDate ? new Date(payload.enquiryDate) : existing.enquiryDate;
  const requiredDate = payload.requiredDate ? new Date(payload.requiredDate) : existing.requiredDate;
  if (requiredDate < enquiryDate) {
    throw ApiError.badRequest('Required date cannot be before enquiry date');
  }

  return prisma.$transaction(async (tx) => {
    if (payload.items) {
      await tx.enquiryItem.deleteMany({ where: { enquiryId: id } });
    }

    return tx.enquiry.update({
      where: { id },
      data: {
        ...writableData(
          'Enquiry',
          {
            enquiryDate: payload.enquiryDate ? new Date(payload.enquiryDate) : undefined,
            requiredDate: payload.requiredDate ? new Date(payload.requiredDate) : undefined,
            notes: payload.notes,
            status: payload.status,
          },
          ENQUIRY_ALIASES,
        ),
        customer: payload.customerId ? { connect: { id: payload.customerId } } : undefined,
        items: payload.items ? { create: payload.items.map(toItemData) } : undefined,
      },
      include: enquiryInclude,
    });
  });
};

module.exports = {
  createEnquiry,
  listEnquiries,
  getEnquiry,
  updateEnquiry,
};