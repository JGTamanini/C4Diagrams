const projectRepository = require('../repositories/project.repository');
const { isUuid } = require('../domain/uuid');
const { MissingFieldError } = require('../errors/user.errors');
const { ProjectNotFoundError, FieldTooLongError, NoFieldsToUpdateError } = require('../errors/project.errors');

const NAME_MAX_LENGTH = 255;

function normalizeName(name) {
  const trimmedName = typeof name === 'string' ? name.trim() : '';

  if (!trimmedName) throw new MissingFieldError('name');
  if (trimmedName.length > NAME_MAX_LENGTH) throw new FieldTooLongError('name', NAME_MAX_LENGTH);

  return trimmedName;
}

function normalizeDescription(description) {
  const trimmedDescription = typeof description === 'string' ? description.trim() : '';

  return trimmedDescription || null;
}

// Nota: PATCH — só os campos enviados entram em changes; description null limpa, ausente mantém
function buildChanges({ name, description }) {
  const changes = {};

  if (name !== undefined) changes.name = normalizeName(name);
  if (description !== undefined) changes.description = normalizeDescription(description);

  if (Object.keys(changes).length === 0) throw new NoFieldsToUpdateError();

  return changes;
}

// Nota: id fora do formato UUID recebe o mesmo 404 de "não existe" — não revela nada e evita erro 500 do Postgres
function assertValidId(id) {
  if (!isUuid(id)) throw new ProjectNotFoundError();
}

async function createProject(userId, { name, description }) {
  return projectRepository.create(userId, {
    name: normalizeName(name),
    description: normalizeDescription(description),
  });
}

async function listProjects(userId) {
  return projectRepository.findAllByUser(userId);
}

async function getProject(id, userId) {
  assertValidId(id);

  const project = await projectRepository.findById(id, userId);
  if (!project) throw new ProjectNotFoundError();

  return project;
}

async function updateProject(id, userId, input) {
  assertValidId(id);

  const project = await projectRepository.update(id, userId, buildChanges(input));
  if (!project) throw new ProjectNotFoundError();

  return project;
}

async function deleteProject(id, userId) {
  assertValidId(id);

  const removed = await projectRepository.remove(id, userId);
  if (!removed) throw new ProjectNotFoundError();
}

module.exports = { createProject, listProjects, getProject, updateProject, deleteProject };
