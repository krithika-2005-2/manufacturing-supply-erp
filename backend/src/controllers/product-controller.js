const { asyncHandler } = require('../utils/async-handler');
const productService = require('../services/product-service');

const create = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body);
  res.status(201).json({ success: true, data: product });
});

const list = asyncHandler(async (req, res) => {
  const result = await productService.listProducts(req.query);
  res.status(200).json({ success: true, ...result });
});

const getById = asyncHandler(async (req, res) => {
  const product = await productService.getProduct(req.params.id);
  res.status(200).json({ success: true, data: product });
});

const update = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body);
  res.status(200).json({ success: true, data: product });
});

const listInventory = asyncHandler(async (req, res) => {
  const inventory = await productService.listInventory();
  res.status(200).json({ success: true, data: inventory });
});

const getInventory = asyncHandler(async (req, res) => {
  const inventory = await productService.getInventoryByProduct(req.params.productId);
  res.status(200).json({ success: true, data: inventory });
});

const updateInventory = asyncHandler(async (req, res) => {
  const inventory = await productService.updateInventory(req.params.productId, req.body);
  res.status(200).json({ success: true, data: inventory });
});

module.exports = {
  create,
  list,
  getById,
  update,
  listInventory,
  getInventory,
  updateInventory,
};
