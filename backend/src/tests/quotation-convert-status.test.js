const { assertCanConvert } = require('../services/quotation-service');
const { ApiError } = require('../utils/api-error');

describe('quotation conversion rules', () => {
  test('DRAFT quotation cannot create a sales order', () => {
    expect(() => assertCanConvert({ status: 'DRAFT', salesOrder: null })).toThrow(ApiError);
    try {
      assertCanConvert({ status: 'DRAFT', salesOrder: null });
    } catch (error) {
      expect(error.statusCode).toBe(409);
      expect(error.message).toMatch(/DRAFT/);
    }
  });

  test('REJECTED quotation cannot create a sales order', () => {
    expect(() => assertCanConvert({ status: 'REJECTED', salesOrder: null })).toThrow(ApiError);
    try {
      assertCanConvert({ status: 'REJECTED', salesOrder: null });
    } catch (error) {
      expect(error.statusCode).toBe(409);
      expect(error.message).toMatch(/REJECTED/);
    }
  });

  test('SENT quotation cannot create a sales order', () => {
    expect(() => assertCanConvert({ status: 'SENT', salesOrder: null })).toThrow(ApiError);
  });

  test('ACCEPTED quotation without an existing sales order can convert', () => {
    expect(() => assertCanConvert({ status: 'ACCEPTED', salesOrder: null })).not.toThrow();
  });
});
