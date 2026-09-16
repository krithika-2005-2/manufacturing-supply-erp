const { z } = require('zod');
const { idParam, paginationQuery, nonNegativeQuantity } = require('./common');

const productBody = z.object({
  sku: z.string().trim().min(1).max(64),
  name: z.string().trim().min(2).max(200),
  unit: z.string().trim().min(1).max(20).optional(),
  // Both columns are NOT NULL in the database, so the API requires them.
  category: z.string().trim().min(1).max(100),
  basePrice: z.preprocess(
    (value) => (value === undefined || value === null || value === '' ? undefined : Number(value)),
    z
      .number({ required_error: 'Required', invalid_type_error: 'Base price must be a number' })
      .nonnegative('Base price cannot be negative'),
  ),
  isActive: z.boolean().optional(),
  physicalQuantity: nonNegativeQuantity.optional(),
});

const createProductSchema = z.object({
  body: productBody,
});

const updateProductSchema = z.object({
  params: idParam,
  body: productBody.partial().refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  }),
});

const productIdSchema = z.object({
  params: idParam,
});

const listProductsSchema = z.object({
  query: paginationQuery.extend({
    search: z.string().optional(),
  }),
});

module.exports = {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
  listProductsSchema,
};