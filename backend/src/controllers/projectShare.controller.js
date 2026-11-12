const shareService = require('../services/projectShare.service');
const asyncHandler = require('../middlewares/asyncHandler');

// Nota: link de visualização — o dono vê, cria (ou troca) e revoga; qualquer pessoa logada abre pelo código
const get = asyncHandler(async (req, res) => {
  res.status(200).json(await shareService.getShareLink(req.params.id, req.user.id));
});

const create = asyncHandler(async (req, res) => {
  res.status(201).json(await shareService.createShareLink(req.params.id, req.user.id));
});

const revoke = asyncHandler(async (req, res) => {
  await shareService.revokeShareLink(req.params.id, req.user.id);
  res.status(204).end();
});

const open = asyncHandler(async (req, res) => {
  res.status(200).json(await shareService.getSharedProject(req.params.token));
});

module.exports = { get, create, revoke, open };
