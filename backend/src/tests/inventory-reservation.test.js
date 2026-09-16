const { ApiError } = require('../utils/api-error');

jest.mock('../prisma/client', () => ({
  prisma: {},
}));

const { reserveInventoryForOrder } = require('../services/sales-order-service');

describe('inventory reservation', () => {
  test('cannot reserve more than available inventory', async () => {
    const tx = {
      $queryRaw: async () => [
        {
          product_id: 'prod-1',
          physical_quantity: 100,
          reserved_quantity: 40,
        },
      ],
      $executeRaw: async () => 0,
    };

    await expect(
      reserveInventoryForOrder(tx, [{ productId: 'prod-1', quantity: 80 }]),
    ).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  test('reserves when requested quantity is within available stock', async () => {
    const tx = {
      $queryRaw: async () => [
        {
          product_id: 'prod-1',
          physical_quantity: 100,
          reserved_quantity: 20,
        },
      ],
      $executeRaw: async () => 1,
    };

    await expect(
      reserveInventoryForOrder(tx, [{ productId: 'prod-1', quantity: 80 }]),
    ).resolves.toBeUndefined();
  });

  test('rolls back conceptually: one failure prevents treating the order as reserved', async () => {
    const tx = {
      $queryRaw: async ({ values } = {}) => {
        return [
          {
            product_id: 'a',
            physical_quantity: 10,
            reserved_quantity: 0,
          },
        ];
      },
      $executeRaw: async () => 0,
    };

    try {
      await reserveInventoryForOrder(tx, [
        { productId: 'a', quantity: 4 },
        { productId: 'b', quantity: 50 },
      ]);
      throw new Error('expected conflict');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect(error.details.failures.length).toBeGreaterThan(0);
    }
  });
});
