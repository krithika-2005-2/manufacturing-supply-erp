const { ApiError } = require('../utils/api-error');

jest.mock('../prisma/client', () => ({
  prisma: {
    $transaction: async (fn) => fn(global.__tx),
  },
}));

const { Prisma } = require('@prisma/client');
const { convertQuotationToSalesOrder } = require('../services/quotation-service');

describe('duplicate sales order conversion', () => {
  test('same quotation cannot create multiple sales orders', async () => {
    await expect(
      convertQuotationToSalesOrder({ quotationId: 'q1', userId: 'u1' }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'This quotation already has a sales order',
    });
  });

  test('unique quotation_id constraint is treated as a conflict', async () => {
    const uniqueError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.0.0',
    });

    global.__tx = {
      quotation: {
        findUnique: async () => ({
          id: 'q2',
          status: 'ACCEPTED',
          enquiryId: 'e1',
          customerId: 'c1',
          grandTotal: '100.00',
          items: [{ productId: 'p1', quantity: 1, unitPrice: 100, lineTotal: 100 }],
          salesOrder: null,
        }),
      },
      documentSequence: {
        upsert: async () => ({ lastNumber: 1 }),
      },
      salesOrder: {
        create: async () => {
          throw uniqueError;
        },
      },
    };

    await expect(
      convertQuotationToSalesOrder({ quotationId: 'q2', userId: 'u1' }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

beforeEach(() => {
  global.__tx = {
    quotation: {
      findUnique: async () => ({
        id: 'q1',
        status: 'ACCEPTED',
        enquiryId: 'e1',
        customerId: 'c1',
        grandTotal: '100.00',
        items: [],
        salesOrder: { id: 'so-existing' },
      }),
    },
  };
});
