const userService = require('../services/user.service');
const asyncHandler = require('../middlewares/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const user = await userService.register({ name, email, password });

  res.status(201).json(user);
});

module.exports = { register };