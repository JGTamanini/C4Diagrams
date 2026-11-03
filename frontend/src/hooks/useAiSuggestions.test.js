import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAiSuggestions } from './useAiSuggestions';
import { getAiStatus, requestSuggestions } from '../services/ai';

vi.mock('../services/ai');

const PROJECT_ID = '3b241101-e2bb-4255-8caf-4136c566a962';
const nodes = [{ id: 'n1', type: 'c4-person', position: { x: 0, y: 0 }, data: { label: 'Cliente' }, selected: true }];
const status = { mode: 'anthropic', limits: { suggestion: 20, deep: 3 }, remaining: { suggestion: 20, deep: 3 } };
const result = {
  suggestions: [
    { id: 's1', kind: 'note', title: 'Primeira' },
    { id: 's2', kind: 'note', title: 'Segunda' },
  ],
  source: 'claude-haiku-5-5',
  escalated: false,
  remaining: { suggestion: 19, deep: 3 },
};

function renderSuggestions(level = 'context') {
  return renderHook((props) => useAiSuggestions(PROJECT_ID, props.level, nodes, []), { initialProps: { level } });
}

function apiError(status, data) {
  return Object.assign(new Error('falhou'), { response: { status, data } });
}

describe('useAiSuggestions (RF16)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAiStatus.mockResolvedValue(status);
    requestSuggestions.mockResolvedValue(result);
  });

  it('deve consultar o estado da IA ao abrir', async () => {
    const { result: hook } = renderSuggestions();
    expect(hook.current.mode).toBe('loading');

    await waitFor(() => expect(hook.current.mode).toBe('anthropic'));
    expect(hook.current.remaining).toEqual({ suggestion: 20, deep: 3 });
  });

  it('deve tratar falha na consulta como IA indisponível', async () => {
    getAiStatus.mockRejectedValue(new Error('rede'));
    const { result: hook } = renderSuggestions();

    await waitFor(() => expect(hook.current.mode).toBe('disabled'));
  });

  it('deve pedir sugestões com o diagrama no formato da API e guardar o resultado do nível', async () => {
    const { result: hook } = renderSuggestions();
    await waitFor(() => expect(hook.current.mode).toBe('anthropic'));

    await act(() => hook.current.generate('deep', 'Loja de livros'));

    expect(requestSuggestions).toHaveBeenCalledWith(
      PROJECT_ID,
      'context',
      {
        diagram: { nodes: [{ id: 'n1', type: 'c4-person', position: { x: 0, y: 0 }, data: { label: 'Cliente' } }], edges: [] },
        depth: 'deep',
        description: 'Loja de livros',
      },
      { signal: expect.any(AbortSignal) }
    );
    expect(hook.current.result).toEqual(expect.objectContaining({ source: 'claude-haiku-5-5', suggestions: result.suggestions }));
    expect(hook.current.remaining).toEqual({ suggestion: 19, deep: 3 });
    expect(hook.current.loading).toBeNull();
  });

  it('deve indicar o pedido em andamento só no nível em que foi feito', async () => {
    let resolve;
    requestSuggestions.mockReturnValue(new Promise((done) => (resolve = done)));
    const { result: hook, rerender } = renderSuggestions();
    await waitFor(() => expect(hook.current.mode).toBe('anthropic'));

    act(() => {
      void hook.current.generate('standard');
    });
    expect(hook.current.loading).toBe('standard');
    expect(hook.current.busy).toBe(true);

    rerender({ level: 'container' });
    expect(hook.current.loading).toBeNull();
    expect(hook.current.busy).toBe(true);

    await act(async () => resolve(result));
    expect(hook.current.result).toBeNull();
    rerender({ level: 'context' });
    expect(hook.current.result.suggestions).toHaveLength(2);
  });

  it('deve mostrar a mensagem da API quando o pedido falhar', async () => {
    requestSuggestions.mockRejectedValue(apiError(502, { message: 'Não foi possível gerar sugestões agora.' }));
    const { result: hook } = renderSuggestions();
    await waitFor(() => expect(hook.current.mode).toBe('anthropic'));

    await act(() => hook.current.generate('standard'));

    expect(hook.current.error).toBe('Não foi possível gerar sugestões agora.');
  });

  it('deve usar uma mensagem genérica quando a falha não trouxer mensagem (ex.: sem conexão)', async () => {
    requestSuggestions.mockRejectedValue(new Error('Network Error'));
    const { result: hook } = renderSuggestions();
    await waitFor(() => expect(hook.current.mode).toBe('anthropic'));

    await act(() => hook.current.generate('standard'));

    expect(hook.current.error).toMatch(/Não foi possível gerar sugestões/);
  });

  it('deve zerar o que resta daquele tipo ao atingir o limite diário', async () => {
    requestSuggestions.mockRejectedValue(apiError(429, { message: 'Limite atingido.', scope: 'deep' }));
    const { result: hook } = renderSuggestions();
    await waitFor(() => expect(hook.current.mode).toBe('anthropic'));

    await act(() => hook.current.generate('deep'));

    expect(hook.current.remaining).toEqual({ suggestion: 20, deep: 0 });
  });

  it('deve passar a mostrar a IA como indisponível quando o servidor disser que ela está fora', async () => {
    requestSuggestions.mockRejectedValue(apiError(503, { message: 'Indisponível.' }));
    const { result: hook } = renderSuggestions();
    await waitFor(() => expect(hook.current.mode).toBe('anthropic'));

    await act(() => hook.current.generate('standard'));

    expect(hook.current.mode).toBe('disabled');
  });

  it('deve cancelar o pedido em andamento, sem mostrar erro', async () => {
    requestSuggestions.mockImplementation(
      (_, __, ___, { signal }) =>
        new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('canceled'))))
    );
    const { result: hook } = renderSuggestions();
    await waitFor(() => expect(hook.current.mode).toBe('anthropic'));

    let pending;
    act(() => {
      pending = hook.current.generate('standard');
    });
    await act(async () => {
      hook.current.cancel();
      await pending;
    });

    expect(hook.current.loading).toBeNull();
    expect(hook.current.busy).toBe(false);
    expect(hook.current.error).toBeNull();
  });

  it('deve esconder uma sugestão ignorada', async () => {
    const { result: hook } = renderSuggestions();
    await waitFor(() => expect(hook.current.mode).toBe('anthropic'));
    await act(() => hook.current.generate('standard'));

    act(() => hook.current.dismiss('s1'));

    expect(hook.current.result.suggestions.map((item) => item.id)).toEqual(['s2']);
  });
});
