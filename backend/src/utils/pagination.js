const paginate = (query = {}) => {
  const page = query.page || 1;
  const limit = query.limit || 20;
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
  };
};

const paginated = ({ rows, total, page, limit }) => ({
  data: rows,
  meta: {
    total,
    page,
    limit,
    pageCount: Math.ceil(total / limit) || 0,
  },
});

module.exports = { paginate, paginated };
