const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const { openApiSpec } = require('./docs/openapi');
const { errorHandler } = require('./middleware/error-handler');
const { notFoundHandler } = require('./middleware/not-found');
const authRoutes = require('./routes/auth-routes');
const meRoutes = require('./routes/me-routes');
const customerRoutes = require('./routes/customer-routes');
const productRoutes = require('./routes/product-routes');
const inventoryRoutes = require('./routes/inventory-routes');
const enquiryRoutes = require('./routes/enquiry-routes');
const quotationRoutes = require('./routes/quotation-routes');
const salesOrderRoutes = require('./routes/sales-order-routes');

const createApp = () => {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (req, res) => {
    res.status(200).json({ success: true, data: { status: 'ok' } });
  });

  app.get('/docs.json', (req, res) => {
    res.status(200).json(openApiSpec);
  });
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  app.use('/auth', authRoutes);
  app.use('/me', meRoutes);
  app.use('/customers', customerRoutes);
  app.use('/products', productRoutes);
  app.use('/inventory', inventoryRoutes);
  app.use('/enquiries', enquiryRoutes);
  app.use('/quotations', quotationRoutes);
  app.use('/sales-orders', salesOrderRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

module.exports = { createApp };
