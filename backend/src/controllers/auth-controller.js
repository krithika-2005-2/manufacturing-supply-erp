const { asyncHandler } = require('../utils/async-handler');
const authService = require('../services/auth-service');

const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  res.status(200).json({ success: true, data: result });
});

module.exports = { login };
