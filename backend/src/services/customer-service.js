const { prisma } = require('../prisma/client');
const { ApiError } = require('../utils/api-error');
const { paginate, paginated } = require('../utils/pagination');

const createCustomer = async ({ payload }) => {
  return prisma.customer.create({
    data: {
      companyName: payload.companyName,
      contactPerson: payload.contactPerson,
      mobile: payload.mobile,
      email: payload.email,
      city: payload.city,
    },
  });
};

const listCustomers = async (query) => {
  const { skip, take, page, limit } = paginate(query);
  const where = query.search
    ? {
        OR: [
          { companyName: { contains: query.search, mode: 'insensitive' } },
          { contactPerson: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [rows, total] = await prisma.$transaction([
    prisma.customer.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.customer.count({ where }),
  ]);

  return paginated({ rows, total, page, limit });
};

const getCustomer = async (id) => {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    throw ApiError.notFound('Customer not found');
  }
  return customer;
};

const updateCustomer = async (id, payload) => {
  await getCustomer(id);
  return prisma.customer.update({
    where: { id },
    data: payload,
  });
};

module.exports = {
  createCustomer,
  listCustomers,
  getCustomer,
  updateCustomer,
};