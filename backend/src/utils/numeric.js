const { ApiError } = require('./api-error');
const { toDecimal } = require('./money');
const { fieldType, relationTargetModel } = require('./dmmf');

// The live database owns the column types, so read them from the generated
// client rather than assuming Decimal: an Int column rejects "10.0000".
const numericFor = (modelName, fieldName, value, decimalPlaces = 4) => {
  if (value === undefined || value === null) {
    return value;
  }

  const amount = toDecimal(value);

  switch (fieldType(modelName, fieldName)) {
    case 'Int':
    case 'BigInt':
      if (!amount.isInteger()) {
        throw ApiError.badRequest(
          `${fieldName} must be a whole number because ${modelName}.${fieldName} is an integer column`,
        );
      }
      return amount.toNumber();
    case 'Float':
      return amount.toNumber();
    case 'Decimal':
    case 'String':
      return amount.toFixed(decimalPlaces);
    default:
      // Unknown column: a plain number is accepted by Int, Float and Decimal
      // columns alike, so only fall back to a string when we need the decimals.
      return amount.isInteger() ? amount.toNumber() : amount.toFixed(decimalPlaces);
  }
};

const quantityFor = (modelName, value) => numericFor(modelName, 'quantity', value, 4);

const quantityForRelation = (ownerModelName, relationField, value) =>
  numericFor(relationTargetModel(ownerModelName, relationField), 'quantity', value, 4);

const moneyFor = (modelName, fieldName, value) => numericFor(modelName, fieldName, value, 2);

module.exports = {
  numericFor,
  quantityFor,
  quantityForRelation,
  moneyFor,
};