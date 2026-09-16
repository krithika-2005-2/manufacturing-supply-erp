const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const { inventoryIdSchema, updateInventorySchema } = require('../validators/inventory-validator');
const productController = require('../controllers/product-controller');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'SALES_USER'), productController.listInventory);
router.get(
  '/:productId',
  authorize('ADMIN', 'SALES_USER'),
  validate(inventoryIdSchema),
  productController.getInventory,
);
router.patch(
  '/:productId',
  authorize('ADMIN'),
  validate(updateInventorySchema),
  productController.updateInventory,
);

module.exports = router;
