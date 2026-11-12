const { randomBytes } = require('node:crypto');
const shareRepository = require('../repositories/projectShare.repository');
const { isUuid } = require('../domain/uuid');
const { ProjectNotFoundError, SharedProjectNotFoundError } = require('../errors/project.errors');

// 24 bytes aleatórios = 32 caracteres em base64url: impossível de adivinhar, e cabe numa URL sem escapar nada
const TOKEN_BYTES = 24;
const TOKEN_FORMAT = /^[A-Za-z0-9_-]{32}$/;

function assertValidId(projectId) {
  if (!isUuid(projectId)) throw new ProjectNotFoundError();
}

// Nota: link de visualização (só leitura). O dono vê, cria (ou troca) e revoga o link; projeto alheio responde como
// inexistente (RN02), igual às outras rotas de projeto.
async function getShareLink(projectId, userId) {
  assertValidId(projectId);
  const share = await shareRepository.findToken(projectId, userId);
  if (!share) throw new ProjectNotFoundError();
  return share;
}

// Gerar de novo troca o código: o link anterior deixa de abrir
async function createShareLink(projectId, userId) {
  assertValidId(projectId);
  const token = randomBytes(TOKEN_BYTES).toString('base64url');
  if (!(await shareRepository.setToken(projectId, userId, token))) throw new ProjectNotFoundError();
  return { token };
}

async function revokeShareLink(projectId, userId) {
  assertValidId(projectId);
  if (!(await shareRepository.clearToken(projectId, userId))) throw new ProjectNotFoundError();
}

// Qualquer pessoa logada com o link vê o projeto, sem poder editar. Sempre o salvo mais recente, com a data da última
// alteração (o professor vê se o diagrama mudou depois da entrega).
async function getSharedProject(token) {
  if (!TOKEN_FORMAT.test(token)) throw new SharedProjectNotFoundError();
  const shared = await shareRepository.findByToken(token);
  if (!shared) throw new SharedProjectNotFoundError();
  return shared;
}

module.exports = { getShareLink, createShareLink, revokeShareLink, getSharedProject };
