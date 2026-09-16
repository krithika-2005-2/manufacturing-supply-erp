const crypto = require('crypto');

const PREFIXES = {
  enquiry: 'ENQ',
  quotation: 'QT',
  salesOrder: 'SO',
  dispatch: 'DSP',
};

const nextDocumentNumber = async (_tx, key) => {
  const prefix = PREFIXES[key];
  if (!prefix) {
    throw new Error(`Unknown document sequence key: ${key}`);
  }

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const serial = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${stamp}-${serial}`;
};

module.exports = { nextDocumentNumber };