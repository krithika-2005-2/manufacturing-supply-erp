const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const {
  createCustomerSchema,
  updateCustomerSchema,
  customerIdSchema,
  listCustomersSchema,
} = require('../validators/customer-validator');
const customerController = require('../controllers/customer-controller');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'SALES_USER'), validate(listCustomersSchema), customerController.list);
router.get('/:id', authorize('ADMIN', 'SALES_USER'), validate(customerIdSchema), customerController.getById);
router.post('/', authorize('SALES_USER', 'ADMIN'), validate(createCustomerSchema), customerController.create);
router.put('/:id', authorize('SALES_USER', 'ADMIN'), validate(updateCustomerSchema), customerController.update);
router.patch('/:id', authorize('SALES_USER', 'ADMIN'), validate(updateCustomerSchema), customerController.update);

module.exports = router;
