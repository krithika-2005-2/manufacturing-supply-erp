const { z } = require('zod');
const { idParam, paginationQuery, positiveQuantity, moneyAmount, percent } = require('./common');

const quotationItem = z.object({
  productId: z.string().uuid(),
  quantity: positiveQuantity,
  unitPrice: moneyAmount,
  discountPercent: percent.optional(),
  gstPercent: percent.optional(),
});

const createQuotationSchema = z.object({
  body: z.object({
    enquiryId: z.string().uuid(),
    notes: z.string().max(2000).optional(),
    items: z.array(quotationItem).min(1),
  }),
});

const quotationIdSchema = z.object({
  params: idParam,
});

const quotationStatusSchema = z.object({
  params: idParam,
  body: z.object({
    status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED']),
  }),
});

const listQuotationsSchema = z.object({
  query: paginationQuery.extend({
    status: z.enum(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED']).optional(),
    enquiryId: z.string().uuid().optional(),
  }),
});

module.exports = {
  createQuotationSchema,
  quotationIdSchema,
  quotationStatusSchema,
  listQuotationsSchema,
};
