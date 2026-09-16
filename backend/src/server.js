require('dotenv').config();

const { loadEnv } = require('./config/env');
const { createApp } = require('./app');
const { prisma } = require('./prisma/client');

const env = loadEnv();
const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`ERP API listening on port ${env.PORT} (${env.NODE_ENV})`);
  console.log(`Swagger UI: http://localhost:${env.PORT}/docs`);
});

const shutdown = async () => {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
