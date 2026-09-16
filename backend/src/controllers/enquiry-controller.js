const { asyncHandler } = require('../utils/async-handler');
const enquiryService = require('../services/enquiry-service');

const create = asyncHandler(async (req, res) => {
  const enquiry = await enquiryService.createEnquiry({
    payload: req.body,
    userId: req.user.id,
  });
  res.status(201).json({ success: true, data: enquiry });
});

const list = asyncHandler(async (req, res) => {
  const result = await enquiryService.listEnquiries(req.query);
  res.status(200).json({ success: true, ...result });
});

const getById = asyncHandler(async (req, res) => {
  const enquiry = await enquiryService.getEnquiry(req.params.id);
  res.status(200).json({ success: true, data: enquiry });
});

const update = asyncHandler(async (req, res) => {
  const enquiry = await enquiryService.updateEnquiry(req.params.id, req.body);
  res.status(200).json({ success: true, data: enquiry });
});

module.exports = { create, list, getById, update };
