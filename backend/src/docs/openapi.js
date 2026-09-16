const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Manufacturing & Supply ERP API',
    version: '1.0.0',
    description:
      'REST API for Customer Enquiry → Quotation → Sales Order → Inventory Reservation → Dispatch.',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local development' }],
  tags: [
    { name: 'Auth' },
    { name: 'Customers' },
    { name: 'Products' },
    { name: 'Inventory' },
    { name: 'Enquiries' },
    { name: 'Quotations' },
    { name: 'Sales Orders' },
    { name: 'Dispatch' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ProductCreate: {
        type: 'object',
        required: ['sku', 'name', 'category', 'basePrice'],
        properties: {
          sku: { type: 'string', example: 'MS-PLATE-10MM' },
          name: { type: 'string', example: 'Mild Steel Plate 10mm' },
          unit: { type: 'string', example: 'PCS' },
          category: { type: 'string', example: 'Raw Material' },
          basePrice: { type: 'number', minimum: 0, example: 1250.5 },
          isActive: { type: 'boolean', example: true },
          physicalQuantity: { type: 'number', minimum: 0, example: 100 },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'object' },
            },
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['password'],
        properties: {
          email: { type: 'string', format: 'email' },
          username: { type: 'string' },
          password: { type: 'string', minLength: 8 },
        },
      },
      Customer: {
        type: 'object',
        required: ['companyName', 'contactPerson', 'mobile', 'email', 'city'],
        properties: {
          companyName: { type: 'string' },
          contactPerson: { type: 'string' },
          mobile: { type: 'string', example: '9876543210' },
          email: { type: 'string', format: 'email' },
          city: { type: 'string' },
        },
      },
      Enquiry: {
        type: 'object',
        required: ['customerId', 'enquiryDate', 'requiredDate', 'items'],
        properties: {
          customerId: { type: 'string', format: 'uuid' },
          enquiryDate: { type: 'string', format: 'date' },
          requiredDate: { type: 'string', format: 'date' },
          notes: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['productId', 'quantity'],
              properties: {
                productId: { type: 'string', format: 'uuid' },
                quantity: { type: 'number', minimum: 0.0001, example: 1 },
                notes: { type: 'string' },
              },
            },
          },
        },
      },
      Quotation: {
        type: 'object',
        required: ['enquiryId', 'items'],
        properties: {
          enquiryId: { type: 'string', format: 'uuid' },
          validUntil: {
            type: 'string',
            format: 'date',
            description: 'Quotation validity date. Defaults to 30 days from today.',
          },
          notes: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['productId', 'quantity', 'unitPrice'],
              properties: {
                productId: { type: 'string', format: 'uuid' },
                quantity: { type: 'number', minimum: 0.0001, example: 1 },
                unitPrice: { type: 'number', minimum: 0, example: 100 },
                discountPercent: { type: 'number' },
                gstPercent: { type: 'number' },
              },
            },
          },
        },
      },
      Dispatch: {
        type: 'object',
        required: ['dispatchDate', 'vehicleNumber', 'driverName', 'items'],
        properties: {
          dispatchDate: { type: 'string', format: 'date' },
          vehicleNumber: { type: 'string' },
          driverName: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['productId', 'quantity'],
              properties: {
                productId: { type: 'string', format: 'uuid' },
                quantity: { type: 'number', minimum: 0.0001, example: 1 },
              },
            },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['Auth'],
        security: [],
        summary: 'Health check',
        responses: { 200: { description: 'OK' } },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        security: [],
        summary: 'Login with email or username',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          200: { description: 'JWT issued' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/me': {
      get: {
        tags: ['Auth'],
        summary: 'Current user profile',
        responses: { 200: { description: 'Authenticated user' } },
      },
    },
    '/customers': {
      get: { tags: ['Customers'], summary: 'List customers', responses: { 200: { description: 'Paginated customers' } } },
      post: {
        tags: ['Customers'],
        summary: 'Create customer',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Customer' } } },
        },
        responses: { 201: { description: 'Created' } },
      },
    },
    '/customers/{id}': {
      get: {
        tags: ['Customers'],
        summary: 'Get customer',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Customer' }, 404: { description: 'Not found' } },
      },
      put: {
        tags: ['Customers'],
        summary: 'Replace customer',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Customer' } } },
        },
        responses: { 200: { description: 'Updated' } },
      },
      patch: {
        tags: ['Customers'],
        summary: 'Partial update customer',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/products': {
      get: { tags: ['Products'], summary: 'List products', responses: { 200: { description: 'Products' } } },
      post: {
        tags: ['Products'],
        summary: 'Create product (ADMIN)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductCreate' },
            },
          },
        },
        responses: { 201: { description: 'Created' }, 403: { description: 'Forbidden' } },
      },
    },
    '/products/{id}': {
      get: {
        tags: ['Products'],
        summary: 'Get product',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Product' } },
      },
      patch: {
        tags: ['Products'],
        summary: 'Update product (ADMIN)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ProductCreate' },
            },
          },
        },
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/inventory': {
      get: {
        tags: ['Inventory'],
        summary: 'List inventory with available quantity',
        responses: { 200: { description: 'Inventory rows' } },
      },
    },
    '/inventory/{productId}': {
      get: {
        tags: ['Inventory'],
        summary: 'Get inventory for a product',
        parameters: [
          { name: 'productId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 200: { description: 'Inventory' } },
      },
      patch: {
        tags: ['Inventory'],
        summary: 'Update inventory quantities (ADMIN)',
        parameters: [
          { name: 'productId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { 200: { description: 'Updated' }, 403: { description: 'Forbidden' } },
      },
    },
    '/enquiries': {
      get: { tags: ['Enquiries'], summary: 'List enquiries', responses: { 200: { description: 'Enquiries' } } },
      post: {
        tags: ['Enquiries'],
        summary: 'Create enquiry with line items',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Enquiry' } } },
        },
        responses: { 201: { description: 'Created' } },
      },
    },
    '/enquiries/{id}': {
      get: {
        tags: ['Enquiries'],
        summary: 'Get enquiry',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Enquiry' } },
      },
      put: {
        tags: ['Enquiries'],
        summary: 'Update enquiry',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Updated' } },
      },
      patch: {
        tags: ['Enquiries'],
        summary: 'Partial update enquiry',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/quotations': {
      get: { tags: ['Quotations'], summary: 'List quotations', responses: { 200: { description: 'Quotations' } } },
      post: {
        tags: ['Quotations'],
        summary: 'Create quotation; backend calculates totals',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Quotation' } } },
        },
        responses: { 201: { description: 'Created' } },
      },
    },
    '/quotations/{id}': {
      get: {
        tags: ['Quotations'],
        summary: 'Get quotation',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Quotation' } },
      },
    },
    '/quotations/{id}/status': {
      patch: {
        tags: ['Quotations'],
        summary: 'Change quotation status',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Updated' } },
      },
    },
    '/quotations/{id}/convert': {
      post: {
        tags: ['Quotations'],
        summary: 'Convert ACCEPTED quotation to sales order',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          201: { description: 'Sales order created' },
          409: { description: 'Invalid status or duplicate conversion' },
        },
      },
    },
    '/sales-orders': {
      get: { tags: ['Sales Orders'], summary: 'List sales orders', responses: { 200: { description: 'Orders' } } },
    },
    '/sales-orders/{id}': {
      get: {
        tags: ['Sales Orders'],
        summary: 'Get sales order',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { 200: { description: 'Order' } },
      },
    },
    '/sales-orders/{id}/confirm': {
      post: {
        tags: ['Sales Orders'],
        summary: 'ADMIN confirms order and reserves inventory',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Confirmed' },
          403: { description: 'Forbidden' },
          409: { description: 'Insufficient stock' },
        },
      },
    },
    '/sales-orders/{id}/dispatch': {
      post: {
        tags: ['Dispatch'],
        summary: 'ADMIN dispatches a confirmed sales order',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Dispatch' } } },
        },
        responses: {
          201: { description: 'Dispatched' },
          409: { description: 'Invalid dispatch' },
        },
      },
    },
  },
};

module.exports = { openApiSpec };