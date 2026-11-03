import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from './api';
import { getAiStatus, requestSuggestions } from './ai';

vi.mock('./api');

const PROJECT_ID = '3b241101-e2bb-4255-8caf-4136c566a962';

describe('ai service (RF16)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve consultar se a IA está ligada e quantos pedidos restam', async () => {
    api.get.mockResolvedValue({ data: { mode: 'demo', limits: {}, remaining: {} } });

    expect(await getAiStatus()).toEqual({ mode: 'demo', limits: {}, remaining: {} });
    expect(api.get).toHaveBeenCalledWith('/ai/status');
  });

  it('deve pedir sugestões para o nível, com o diagrama atual e a opção de cancelar', async () => {
    const signal = new AbortController().signal;
    const body = { diagram: { nodes: [], edges: [] }, depth: 'standard', description: 'Loja' };
    api.post.mockResolvedValue({ data: { suggestions: [] } });

    expect(await requestSuggestions(PROJECT_ID, 'context', body, { signal })).toEqual({ suggestions: [] });
    expect(api.post).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/diagrams/context/suggestions`, body, { signal });
  });
});
