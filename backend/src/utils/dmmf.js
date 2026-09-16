const { Prisma } = require('@prisma/client');

// The database is the source of truth for this project: the Prisma schema is
// introspected from it and may name or omit columns differently from the
// original design. These helpers read the generated client's data model so the
// services can adapt instead of failing with PrismaClientValidationError.

const dataModels = () => Prisma.dmmf?.datamodel?.models ?? [];

// "EnquiryItem", "enquiry_items" and "enquiryItems" all collapse to one key.
const normalize = (name) =>
  String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/s$/, '');

const findModel = (modelName) => {
  if (!modelName) {
    return undefined;
  }
  const models = dataModels();
  return (
    models.find((model) => model.name === modelName) ??
    models.find((model) => normalize(model.name) === normalize(modelName))
  );
};

const findField = (modelName, fieldName) => {
  const model = findModel(modelName);
  if (!model || !fieldName) {
    return undefined;
  }
  return (
    model.fields.find((field) => field.name === fieldName) ??
    model.fields.find((field) => normalize(field.name) === normalize(fieldName))
  );
};

const fieldType = (modelName, fieldName) => findField(modelName, fieldName)?.type;

const relationTargetModel = (ownerModelName, relationField) => {
  const field = findField(ownerModelName, relationField);
  return field?.kind === 'object' ? field.type : undefined;
};

const warned = new Set();

const warnOnce = (message) => {
  if (warned.has(message)) {
    return;
  }
  warned.add(message);
  // eslint-disable-next-line no-console
  console.warn(`[schema] ${message}`);
};

// Returns the real column name for a logical field, trying aliases, so a
// payload key such as "notes" can land on a column named "remarks".
// Foreign-key scalars are read-only to Prisma writes but are still valid for
// filtering and ordering, hence the option.
const resolveFieldName = (modelName, candidates, { includeReadOnly = false } = {}) => {
  const list = Array.isArray(candidates) ? candidates : [candidates];
  for (const candidate of list) {
    const field = findField(modelName, candidate);
    if (field && field.kind === 'scalar' && (includeReadOnly || !field.isReadOnly)) {
      return field.name;
    }
  }
  return undefined;
};

// Builds a Prisma data object containing only fields the model actually has.
// Unknown keys are dropped with a one-time warning rather than crashing the
// request; `aliases` lets a logical name map onto a differently named column.
const writableData = (modelName, data, aliases = {}) => {
  const result = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }

    const column = resolveFieldName(modelName, [key, ...(aliases[key] ?? [])]);
    if (column) {
      result[column] = value;
    } else {
      warnOnce(`${modelName} has no column for "${key}"; the value was not saved`);
    }
  }

  return result;
};

// Reads a logical value out of a row whose keys may use the database's naming
// (line_amount) rather than the API's (lineTotal).
const valueFrom = (row, logicalName, aliases = []) => {
  if (!row) {
    return undefined;
  }

  const candidates = [logicalName, ...aliases];
  for (const candidate of candidates) {
    if (row[candidate] !== undefined) {
      return row[candidate];
    }
  }

  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const key = keys.find((name) => normalize(name) === normalize(candidate));
    if (key !== undefined && row[key] !== undefined) {
      return row[key];
    }
  }

  return undefined;
};

// Scalar columns the database insists on that the payload does not set, and
// that have no default or generated value. Lets a service fail with a readable
// message naming the column instead of a raw PrismaClientValidationError.
const missingRequiredScalars = (modelName, data) => {
  const model = findModel(modelName);
  if (!model) {
    return [];
  }

  return model.fields
    .filter(
      (field) =>
        field.kind === 'scalar' &&
        field.isRequired &&
        !field.isList &&
        !field.isId &&
        !field.isUpdatedAt &&
        !field.isReadOnly &&
        !field.hasDefaultValue &&
        data[field.name] === undefined,
    )
    .map((field) => ({ name: field.name, type: field.type }));
};

module.exports = {
  normalize,
  findModel,
  findField,
  fieldType,
  relationTargetModel,
  resolveFieldName,
  writableData,
  valueFrom,
  missingRequiredScalars,
};