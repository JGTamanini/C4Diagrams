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

// Issue #74: a versão do nível que a aba conhece, nos cabeçalhos HTTP de concorrência otimista. null: a aba acha
// que o nível ainda não existe. Se outra aba gravou antes, o backend responde 412 com a versão atual.
function versionHeaders(version) {
  if (version === undefined) return null;
  return version === null ? { 'If-None-Match': '*' } : { 'If-Match': `"${version}"` };
}

// Nota: canvas vazio remove o nível no backend (RN10) e responde 204 — devolvemos null nesse caso
export async function saveDiagram(projectId, level, data, version) {
  if (!LEVEL_IDS.includes(level)) {
    throw new Error(`Nível de diagrama inválido: ${level}`);
  }

  const headers = versionHeaders(version);
  const response = await api.put(`${diagramsPath(projectId)}/${level}`, data, ...(headers ? [{ headers }] : []));
  return response.status === 204 ? null : response.data;
}

// Nota: RF17 — valida o estado atual do nível (ainda não salvo) no motor de validação C4 do backend, sem gravar
export async function validateDiagram(projectId, level, data) {
  const response = await api.post(`${diagramsPath(projectId)}/${level}/validate`, data);
  return response.data.issues;
}
