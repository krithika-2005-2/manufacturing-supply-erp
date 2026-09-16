const { asyncHandler } = require('../utils/async-handler');
const salesOrderService = require('../services/sales-order-service');

const list = asyncHandler(async (req, res) => {
  const result = await salesOrderService.listSalesOrders(req.query);
  res.status(200).json({ success: true, ...result });
});

const getById = asyncHandler(async (req, res) => {
  const order = await salesOrderService.getSalesOrder(req.params.id);
  res.status(200).json({ success: true, data: order });
});

const confirm = asyncHandler(async (req, res) => {
  const order = await salesOrderService.confirmSalesOrder(req.params.id);
  res.status(200).json({ success: true, data: order });
});

const dispatch = asyncHandler(async (req, res) => {
  const result = await salesOrderService.dispatchSalesOrder({
    orderId: req.params.id,
    payload: req.body,
    userId: req.user.id,
  });
  res.status(201).json({ success: true, data: result });
});

module.exports = { list, getById, confirm, dispatch };
