const { z } = require('zod');
const { idParam, paginationQuery, isoDate, positiveQuantity } = require('./common');

const salesOrderIdSchema = z.object({
  params: idParam,
});

const listSalesOrdersSchema = z.object({
  query: paginationQuery.extend({
    status: z.enum(['PENDING', 'CONFIRMED', 'DISPATCHED', 'CANCELLED']).optional(),
    customerId: z.string().uuid().optional(),
  }),
});

const dispatchSchema = z.object({
  params: idParam,
  body: z.object({
    dispatchDate: isoDate,
    vehicleNumber: z.string().trim().min(1).max(40),
    driverName: z.string().trim().min(2).max(120),
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: positiveQuantity,
        }),
      )
      .min(1),
  }),
});

module.exports = {
  salesOrderIdSchema,
  listSalesOrdersSchema,
  dispatchSchema,
};
