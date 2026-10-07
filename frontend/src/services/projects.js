import api from './api';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class InvalidProjectIdError extends Error {
  constructor() {
    super('Projeto não encontrado.');
    this.name = 'InvalidProjectIdError';
  }
}

// Nota: só ids no formato UUID (o mesmo aceito pelo backend) entram na URL — um valor como "../auth/x"
// poderia trocar o endpoint chamado com o token do usuário. Id inválido nem gera requisição.
function projectPath(id) {
  if (!UUID_REGEX.test(id)) {
    throw new InvalidProjectIdError();
  }

  return `/projects/${encodeURIComponent(id)}`;
}

export async function listProjects() {
  const response = await api.get('/projects');
  return response.data;
}

export async function getProject(id) {
  const response = await api.get(projectPath(id));
  return response.data;
}

export async function createProject(project) {
  const response = await api.post('/projects', project);
  return response.data;
}

export async function updateProject(id, changes) {
  const response = await api.patch(projectPath(id), changes);
  return response.data;
}

export async function deleteProject(id) {
  await api.delete(projectPath(id));
}
