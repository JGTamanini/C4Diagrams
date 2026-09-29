const projectRepository = require('../repositories/project.repository');
const { MissingFieldError } = require('../errors/user.errors');
const { ProjectNotFoundError, FieldTooLongError } = require('../errors/project.errors');

const NAME_MAX_LENGTH = 255;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeProjectInput({ name, description }) {
  const trimmedName = typeof name === 'string' ? name.trim() : '';

  if (!trimmedName) throw new MissingFieldError('name');
  if (trimmedName.length > NAME_MAX_LENGTH) throw new FieldTooLongError('name', NAME_MAX_LENGTH);

  const trimmedDescription = typeof description === 'string' ? description.trim() : '';

  return { name: trimmedName, description: trimmedDescription || null };
}

// Nota: id fora do formato UUID recebe o mesmo 404 de "não existe" — não revela nada e evita erro 500 do Postgres
function assertValidId(id) {
  if (!UUID_REGEX.test(id)) throw new ProjectNotFoundError();
}

async function createProject(userId, input) {
  return projectRepository.create(userId, normalizeProjectInput(input));
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

  const project = await projectRepository.update(id, userId, normalizeProjectInput(input));
  if (!project) throw new ProjectNotFoundError();

  return project;
}

async function deleteProject(id, userId) {
  assertValidId(id);

  const removed = await projectRepository.remove(id, userId);
  if (!removed) throw new ProjectNotFoundError();
}

module.exports = { createProject, listProjects, getProject, updateProject, deleteProject };
