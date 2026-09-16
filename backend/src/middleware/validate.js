const validate = (schema) => (req, res, next) => {
  const parsed = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (!parsed.success) {
    next(parsed.error);
    return;
  }

  if (parsed.data.body !== undefined) {
    req.body = parsed.data.body;
  }
  if (parsed.data.params !== undefined) {
    req.params = parsed.data.params;
  }
  if (parsed.data.query !== undefined) {
    req.query = parsed.data.query;
  }
  next();
};

module.exports = { validate };
