import api from './api';

export async function listProjects() {
  const response = await api.get('/projects');
  return response.data;
}

export async function getProject(id) {
  const response = await api.get(`/projects/${id}`);
  return response.data;
}

export async function createProject(project) {
  const response = await api.post('/projects', project);
  return response.data;
}

export async function updateProject(id, changes) {
  const response = await api.patch(`/projects/${id}`, changes);
  return response.data;
}

export async function deleteProject(id) {
  await api.delete(`/projects/${id}`);
}
