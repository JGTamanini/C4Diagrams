import api from './api';
import { projectPath } from './projects';

// Nota: link de visualização (só leitura) — o dono consulta, cria (ou troca) e revoga o link do projeto
function sharePath(projectId) {
  return `${projectPath(projectId)}/share`;
}

export async function getShareLink(projectId) {
  const response = await api.get(sharePath(projectId));
  return response.data;
}

// Gerar de novo troca o código: o link anterior para de funcionar
export async function createShareLink(projectId) {
  const response = await api.post(sharePath(projectId));
  return response.data;
}

export async function revokeShareLink(projectId) {
  await api.delete(sharePath(projectId));
}

// Qualquer pessoa logada abre o projeto pelo código. encodeURIComponent: o código vem da URL e não pode mudar o
// caminho da API chamada com o token do usuário
export async function getSharedProject(token) {
  const response = await api.get(`/shared/${encodeURIComponent(token)}`);
  return response.data;
}

export function shareUrl(token) {
  return `${window.location.origin}/compartilhado/${token}`;
}
