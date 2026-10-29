const userService = require('../services/user.service');
const asyncHandler = require('../middlewares/asyncHandler');

// Nota: exclusão da própria conta — o id vem do token (nunca da URL), e a senha atual confirma a ação
const deleteMe = asyncHandler(async (req, res) => {
  await userService.deleteAccount(req.user.id, req.body?.password);
  res.status(204).end();
});

module.exports = { deleteMe };
