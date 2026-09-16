const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const {
  createProductSchema,
  updateProductSchema,
  productIdSchema,
  listProductsSchema,
} = require('../validators/product-validator');
const productController = require('../controllers/product-controller');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'SALES_USER'), validate(listProductsSchema), productController.list);
router.get('/:id', authorize('ADMIN', 'SALES_USER'), validate(productIdSchema), productController.getById);
router.post('/', authorize('ADMIN'), validate(createProductSchema), productController.create);
router.patch('/:id', authorize('ADMIN'), validate(updateProductSchema), productController.update);

module.exports = router;
