#!/usr/bin/env node
/*
 * Prints the model/field/type map of the generated Prisma client, i.e. the
 * real shape of the connected database. Run it and share the output when a
 * service hits a PrismaClientValidationError:
 *
 *   node scripts/print-schema.js
 *   node scripts/print-schema.js Enquiry EnquiryItem
 */
const { Prisma } = require('@prisma/client');

const requested = process.argv.slice(2).map((name) => name.toLowerCase());
const models = Prisma.dmmf?.datamodel?.models ?? [];

if (models.length === 0) {
  console.error('No data model found. Run "npx prisma generate" first.');
  process.exit(1);
}

const wanted = models.filter(
  (model) => requested.length === 0 || requested.includes(model.name.toLowerCase()),
);

for (const model of wanted) {
  console.log(`\nmodel ${model.name} (table: ${model.dbName ?? model.name})`);
  for (const field of model.fields) {
    const optional = field.isRequired ? '' : '?';
    const list = field.isList ? '[]' : '';
    const column = field.dbName && field.dbName !== field.name ? `  @map("${field.dbName}")` : '';
    const relation =
      field.kind === 'object'
        ? `  @relation(fields: [${(field.relationFromFields ?? []).join(', ')}])`
        : '';
    console.log(`  ${field.name.padEnd(22)} ${field.type}${list}${optional}${column}${relation}`);
  }
}

console.log(`\n${wanted.length} of ${models.length} models shown.`);