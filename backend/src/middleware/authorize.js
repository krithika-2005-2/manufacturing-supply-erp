const { ApiError } = require('../utils/api-error');

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    next(ApiError.unauthorized());
    return;
  }
  if (!allowedRoles.includes(req.user.role)) {
    next(ApiError.forbidden('Insufficient role for this operation'));
    return;
  }
  next();
};

module.exports = { authorize };
