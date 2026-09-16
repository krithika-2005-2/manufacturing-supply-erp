const { z } = require('zod');

const idParam = z.object({
  id: z.string().uuid(),
});

const productIdParam = z.object({
  productId: z.string().uuid(),
});

const paginationQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const positiveQuantity = z
  .union([z.string(), z.number()])
  .refine((value) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0;
  }, 'Quantity must be a positive number');

const nonNegativeQuantity = z
  .union([z.string(), z.number()])
  .refine((value) => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0;
  }, 'Quantity must be zero or a positive number');

const moneyAmount = z
  .union([z.string(), z.number()])
  .refine((value) => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0;
  }, 'Monetary value must be zero or positive');

const percent = z
  .union([z.string(), z.number()])
  .refine((value) => {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 && n <= 100;
  }, 'Percentage must be between 0 and 100');

const indianMobile = z
  .string()
  .trim()
  .regex(/^[0-9]{10}$/, 'Mobile must be a 10-digit number');

const isoDate = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date');

module.exports = {
  idParam,
  productIdParam,
  paginationQuery,
  positiveQuantity,
  nonNegativeQuantity,
  moneyAmount,
  percent,
  indianMobile,
  isoDate,
};
