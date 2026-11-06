const aiService = require('../services/ai.service');
const asyncHandler = require('../middlewares/asyncHandler');

// Nota: RF16 — o editor consulta se a IA está ligada (e quantos pedidos restam hoje) para mostrar a aba Sugestões
const status = asyncHandler(async (req, res) => {
  res.status(200).json(await aiService.getStatus(req.user.id));
});

// Nota: RF16 — o editor envia o estado atual do nível (ainda não salvo); nada é gravado no diagrama
const suggest = asyncHandler(async (req, res) => {
  const result = await aiService.suggest(req.params.projectId, req.user.id, req.params.level, req.body);
  res.status(200).json(result);
});

module.exports = { status, suggest };
