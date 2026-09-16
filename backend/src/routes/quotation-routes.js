const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const {
  createQuotationSchema,
  quotationIdSchema,
  quotationStatusSchema,
  listQuotationsSchema,
} = require('../validators/quotation-validator');
const quotationController = require('../controllers/quotation-controller');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'SALES_USER'), validate(listQuotationsSchema), quotationController.list);
router.get('/:id', authorize('ADMIN', 'SALES_USER'), validate(quotationIdSchema), quotationController.getById);
router.post('/', authorize('SALES_USER', 'ADMIN'), validate(createQuotationSchema), quotationController.create);
router.patch(
  '/:id/status',
  authorize('SALES_USER', 'ADMIN'),
  validate(quotationStatusSchema),
  quotationController.updateStatus,
);
router.post(
  '/:id/convert',
  authorize('SALES_USER', 'ADMIN'),
  validate(quotationIdSchema),
  quotationController.convert,
);

module.exports = router;
