const { z } = require('zod');

const loginSchema = z.object({
  body: z
    .object({
      email: z.string().email().optional(),
      username: z.string().trim().min(3).optional(),
      password: z.string().min(8),
    })
    .refine((data) => Boolean(data.email || data.username), {
      message: 'Email or username is required',
      path: ['email'],
    }),
});

module.exports = { loginSchema };
