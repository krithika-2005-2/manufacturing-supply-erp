const { asyncHandler } = require('../utils/async-handler');
const quotationService = require('../services/quotation-service');

const create = asyncHandler(async (req, res) => {
  const quotation = await quotationService.createQuotation({
    payload: req.body,
    userId: req.user.id,
  });
  res.status(201).json({ success: true, data: quotation });
});

const list = asyncHandler(async (req, res) => {
  const result = await quotationService.listQuotations(req.query);
  res.status(200).json({ success: true, ...result });
});

const getById = asyncHandler(async (req, res) => {
  const quotation = await quotationService.getQuotation(req.params.id);
  res.status(200).json({ success: true, data: quotation });
});

const updateStatus = asyncHandler(async (req, res) => {
  const quotation = await quotationService.updateQuotationStatus(req.params.id, req.body.status);
  res.status(200).json({ success: true, data: quotation });
});

const convert = asyncHandler(async (req, res) => {
  const salesOrder = await quotationService.convertQuotationToSalesOrder({
    quotationId: req.params.id,
    userId: req.user.id,
  });
  res.status(201).json({ success: true, data: salesOrder });
});

module.exports = { create, list, getById, updateStatus, convert };
