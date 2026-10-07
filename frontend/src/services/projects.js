import api from './api';

// Nota: o id é codificado para não alterar o endpoint chamado (ex.: "../auth/x" viraria outra rota da API)
function projectPath(id) {
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
