const { calculateLine, calculateQuotationTotals } = require('../utils/money');

describe('quotation total calculation', () => {
  test('calculates line and grand totals from quantity, price, discount and GST', () => {
    const totals = calculateQuotationTotals([
      { quantity: 10, unitPrice: 100, discountPercent: 10, gstPercent: 18 },
      { quantity: 2, unitPrice: 50, discountPercent: 0, gstPercent: 18 },
    ]);

    expect(totals.lines[0]).toMatchObject({
      baseAmount: '1000.00',
      discountAmount: '100.00',
      gstAmount: '162.00',
      lineTotal: '1062.00',
    });
    expect(totals.lines[1]).toMatchObject({
      baseAmount: '100.00',
      discountAmount: '0.00',
      gstAmount: '18.00',
      lineTotal: '118.00',
    });
    expect(totals.grandTotal).toBe('1180.00');
  });

  test('ignores client-supplied grand totals by recalculating locally', () => {
    const line = calculateLine({
      quantity: 3,
      unitPrice: 19.99,
      discountPercent: 5,
      gstPercent: 12,
    });

    expect(line.baseAmount).toBe('59.97');
    expect(line.discountAmount).toBe('3.00');
    expect(line.gstAmount).toBe('6.84');
    expect(line.lineTotal).toBe('63.81');
  });
});
