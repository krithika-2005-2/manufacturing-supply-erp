const express = require('express');
const { validate } = require('../middleware/validate');
const { loginSchema } = require('../validators/auth-validator');
const authController = require('../controllers/auth-controller');

const router = express.Router();

router.post('/login', validate(loginSchema), authController.login);

module.exports = router;
