const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { authorize } = require('../middleware/authorize');
const { validate } = require('../middleware/validate');
const {
  createEnquirySchema,
  updateEnquirySchema,
  enquiryIdSchema,
  listEnquiriesSchema,
} = require('../validators/enquiry-validator');
const enquiryController = require('../controllers/enquiry-controller');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('ADMIN', 'SALES_USER'), validate(listEnquiriesSchema), enquiryController.list);
router.get('/:id', authorize('ADMIN', 'SALES_USER'), validate(enquiryIdSchema), enquiryController.getById);
router.post('/', authorize('SALES_USER', 'ADMIN'), validate(createEnquirySchema), enquiryController.create);
router.put('/:id', authorize('SALES_USER', 'ADMIN'), validate(updateEnquirySchema), enquiryController.update);
router.patch('/:id', authorize('SALES_USER', 'ADMIN'), validate(updateEnquirySchema), enquiryController.update);

module.exports = router;
