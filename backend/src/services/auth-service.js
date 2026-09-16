const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../prisma/client');
const { ApiError } = require('../utils/api-error');
const { publicUser } = require('../utils/sanitize');

const login = async ({ email, username, password }) => {
  const user = await prisma.user.findFirst({
    where: email ? { email } : { username },
  });

  if (!user) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRATION || '8h' },
  );

  return {
    token,
    tokenType: 'Bearer',
    expiresIn: process.env.JWT_EXPIRATION || '8h',
    user: publicUser(user),
  };
};

module.exports = { login };