const { z } = require('zod');
const { idParam, paginationQuery, positiveQuantity, isoDate } = require('./common');

const enquiryItem = z.object({
  productId: z.string().uuid(),
  quantity: positiveQuantity,
  notes: z.string().max(500).optional(),
});

const enquiryBody = z.object({
  customerId: z.string().uuid(),
  enquiryDate: isoDate,
  requiredDate: isoDate,
  notes: z.string().max(2000).optional(),
  items: z.array(enquiryItem).min(1),
});

const createEnquirySchema = z.object({
  body: enquiryBody,
});

const updateEnquirySchema = z.object({
  params: idParam,
  body: z
    .object({
      customerId: z.string().uuid().optional(),
      enquiryDate: isoDate.optional(),
      requiredDate: isoDate.optional(),
      notes: z.string().max(2000).optional(),
      status: z.enum(['NEW', 'QUOTED', 'WON', 'LOST']).optional(),
      items: z.array(enquiryItem).min(1).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required',
    }),
});

const enquiryIdSchema = z.object({
  params: idParam,
});

const listEnquiriesSchema = z.object({
  query: paginationQuery.extend({
    status: z.enum(['NEW', 'QUOTED', 'WON', 'LOST']).optional(),
    customerId: z.string().uuid().optional(),
  }),
});

module.exports = {
  createEnquirySchema,
  updateEnquirySchema,
  enquiryIdSchema,
  listEnquiriesSchema,
};
