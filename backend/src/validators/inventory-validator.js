const { z } = require('zod');
const { productIdParam, nonNegativeQuantity } = require('./common');

const inventoryIdSchema = z.object({
  params: productIdParam,
});

const updateInventorySchema = z.object({
  params: productIdParam,
  body: z
    .object({
      physicalQuantity: nonNegativeQuantity.optional(),
      reservedQuantity: nonNegativeQuantity.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one inventory field is required',
    }),
});

module.exports = { inventoryIdSchema, updateInventorySchema };
