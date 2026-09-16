const { asyncHandler } = require('../utils/async-handler');
const customerService = require('../services/customer-service');

const create = asyncHandler(async (req, res) => {
  const customer = await customerService.createCustomer({
    payload: req.body,
    userId: req.user.id,
  });
  res.status(201).json({ success: true, data: customer });
});

const list = asyncHandler(async (req, res) => {
  const result = await customerService.listCustomers(req.query);
  res.status(200).json({ success: true, ...result });
});

const getById = asyncHandler(async (req, res) => {
  const customer = await customerService.getCustomer(req.params.id);
  res.status(200).json({ success: true, data: customer });
});

const update = asyncHandler(async (req, res) => {
  const customer = await customerService.updateCustomer(req.params.id, req.body);
  res.status(200).json({ success: true, data: customer });
});

module.exports = { create, list, getById, update };
