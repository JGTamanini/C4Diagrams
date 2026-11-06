import api from './api';
import { projectPath } from './projects';

// Nota: RF16 — se a IA está ligada (anthropic, demonstração ou desligada) e quantos pedidos restam hoje
export async function getAiStatus() {
  const response = await api.get('/ai/status');
  return response.data;
}

// Nota: RF16 — sugestões para o nível aberto (estado atual, ainda não salvo). Nada é gravado; signal permite cancelar
export async function requestSuggestions(projectId, level, body, { signal } = {}) {
  const response = await api.post(`${projectPath(projectId)}/diagrams/${level}/suggestions`, body, { signal });
  return response.data;
}
