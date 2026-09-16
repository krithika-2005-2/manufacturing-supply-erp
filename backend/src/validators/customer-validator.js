const { z } = require('zod');
const { idParam, indianMobile, paginationQuery } = require('./common');

const customerBody = z.object({
  companyName: z.string().trim().min(2).max(200),
  contactPerson: z.string().trim().min(2).max(120),
  mobile: indianMobile,
  email: z.string().trim().email(),
  city: z.string().trim().min(2).max(120),
});

const createCustomerSchema = z.object({
  body: customerBody,
});

const updateCustomerSchema = z.object({
  params: idParam,
  body: customerBody.partial().refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  }),
});

const customerIdSchema = z.object({
  params: idParam,
});

const listCustomersSchema = z.object({
  query: paginationQuery.extend({
    search: z.string().optional(),
  }),
});

module.exports = {
  createCustomerSchema,
  updateCustomerSchema,
  customerIdSchema,
  listCustomersSchema,
};
