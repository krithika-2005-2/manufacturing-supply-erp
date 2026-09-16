const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const {
  salesOrderIdSchema,
  listSalesOrdersSchema,
  dispatchSchema,
} = require('../validators/sales-order-validator');
const salesOrderController = require('../controllers/sales-order-controller');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'SALES_USER'), validate(listSalesOrdersSchema), salesOrderController.list);
router.get('/:id', authorize('ADMIN', 'SALES_USER'), validate(salesOrderIdSchema), salesOrderController.getById);
router.post(
  '/:id/confirm',
  authorize('ADMIN'),
  validate(salesOrderIdSchema),
  salesOrderController.confirm,
);
router.post(
  '/:id/dispatch',
  authorize('ADMIN'),
  validate(dispatchSchema),
  salesOrderController.dispatch,
);

module.exports = router;
