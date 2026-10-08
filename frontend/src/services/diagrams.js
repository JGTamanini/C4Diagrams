import api from './api';
import { projectPath } from './projects';
import { LEVEL_IDS } from '../constants/c4Notation';

function diagramsPath(projectId) {
  return `${projectPath(projectId)}/diagrams`;
}

export async function listDiagrams(projectId) {
  const response = await api.get(diagramsPath(projectId));
  return response.data;
}

// Nota: canvas vazio remove o nível no backend (RN10) e responde 204 — devolvemos null nesse caso
export async function saveDiagram(projectId, level, data) {
  if (!LEVEL_IDS.includes(level)) {
    throw new Error(`Nível de diagrama inválido: ${level}`);
  }

  const response = await api.put(`${diagramsPath(projectId)}/${level}`, data);
  return response.status === 204 ? null : response.data;
}
