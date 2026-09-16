require('dotenv').config();

const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const seed = async () => {
  const passwordHash = await bcrypt.hash('Password123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@erp.local' },
    update: {},
    create: {
      email: 'admin@erp.local',
      username: 'admin',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const sales = await prisma.user.upsert({
    where: { email: 'sales@erp.local' },
    update: {},
    create: {
      email: 'sales@erp.local',
      username: 'sales',
      passwordHash,
      role: 'SALES_USER',
    },
  });

  const steel = await prisma.product.upsert({
    where: { sku: 'STL-001' },
    update: {},
    create: {
      sku: 'STL-001',
      name: 'Steel Plate 6mm',
      unit: 'PCS',
      inventory: {
        create: {
          physicalQuantity: 100,
          reservedQuantity: 0,
        },
      },
    },
  });

  const gasket = await prisma.product.upsert({
    where: { sku: 'GSK-010' },
    update: {},
    create: {
      sku: 'GSK-010',
      name: 'Rubber Gasket',
      unit: 'PCS',
      inventory: {
        create: {
          physicalQuantity: 250,
          reservedQuantity: 0,
        },
      },
    },
  });

  console.log('Seed complete', {
    admin: admin.email,
    sales: sales.email,
    products: [steel.sku, gasket.sku],
  });
};

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
