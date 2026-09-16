const { toDecimal, availableQuantity } = require('../utils/money');

const conditionalReserve = (state, requested) => {
  const available = availableQuantity(state.physicalQuantity, state.reservedQuantity);
  if (toDecimal(requested).greaterThan(available)) {
    return false;
  }
  state.reservedQuantity = toDecimal(state.reservedQuantity).plus(requested).toNumber();
  return true;
};

describe('inventory concurrency', () => {
  test('two overlapping reservations cannot both succeed against the same stock', () => {
    const state = { physicalQuantity: 100, reservedQuantity: 0 };

    const first = conditionalReserve(state, 80);
    const second = conditionalReserve(state, 50);

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(state.reservedQuantity).toBe(80);
    expect(availableQuantity(state.physicalQuantity, state.reservedQuantity).toNumber()).toBe(20);
  });
});
