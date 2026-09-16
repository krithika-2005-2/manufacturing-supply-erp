const omit = (record, keys) => {
  if (!record) {
    return record;
  }
  const clone = { ...record };
  for (const key of keys) {
    delete clone[key];
  }
  return clone;
};

const publicUser = (user) => omit(user, ['passwordHash']);

module.exports = { omit, publicUser };
