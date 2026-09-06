const userService = require('../services/user.service');
const authService = require('../services/auth.service');
const asyncHandler = require('../middlewares/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const user = await userService.register({ name, email, password });
  res.status(201).json(user);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password });
  res.status(200).json(result);
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  await userService.verifyEmail(token);
  res.status(200).json({ message: 'E-mail verificado com sucesso.' });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await userService.requestPasswordReset(email);
  res.status(200).json({ message: 'Se esse e-mail estiver cadastrado, um link de recuperação foi enviado.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  await userService.resetPassword(token, newPassword);
  res.status(200).json({ message: 'Senha redefinida com sucesso.' });
});

module.exports = { register, login, verifyEmail, forgotPassword, resetPassword };
