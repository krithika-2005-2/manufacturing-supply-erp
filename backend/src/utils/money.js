const Decimal = require('decimal.js');

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

const toDecimal = (value) => new Decimal(value);

const roundMoney = (value) => toDecimal(value).toDecimalPlaces(2);

const moneyString = (value) => roundMoney(value).toFixed(2);

const calculateLine = ({ quantity, unitPrice, discountPercent, gstPercent }) => {
  const qty = toDecimal(quantity);
  const price = toDecimal(unitPrice);
  const discountPct = toDecimal(discountPercent ?? 0);
  const gstPct = toDecimal(gstPercent ?? 0);

  const baseAmount = roundMoney(qty.times(price));
  const discountAmount = roundMoney(baseAmount.times(discountPct).dividedBy(100));
  const taxableAmount = roundMoney(baseAmount.minus(discountAmount));
  const gstAmount = roundMoney(taxableAmount.times(gstPct).dividedBy(100));
  const lineTotal = roundMoney(taxableAmount.plus(gstAmount));

  return {
    quantity: qty.toFixed(4),
    unitPrice: price.toFixed(4),
    discountPercent: discountPct.toFixed(2),
    gstPercent: gstPct.toFixed(2),
    baseAmount: moneyString(baseAmount),
    discountAmount: moneyString(discountAmount),
    gstAmount: moneyString(gstAmount),
    taxableAmount: moneyString(taxableAmount),
    lineTotal: moneyString(lineTotal),
  };
};

const calculateQuotationTotals = (items) => {
  const lines = items.map(calculateLine);
  const grandTotal = roundMoney(
    lines.reduce((sum, line) => sum.plus(toDecimal(line.lineTotal)), new Decimal(0)),
  );

  return {
    lines,
    grandTotal: moneyString(grandTotal),
  };
};

const availableQuantity = (physicalQuantity, reservedQuantity) => {
  return toDecimal(physicalQuantity).minus(toDecimal(reservedQuantity));
};

const isPositiveQuantity = (value) => toDecimal(value).greaterThan(0);

module.exports = {
  Decimal,
  toDecimal,
  roundMoney,
  moneyString,
  calculateLine,
  calculateQuotationTotals,
  availableQuantity,
  isPositiveQuantity,
};
