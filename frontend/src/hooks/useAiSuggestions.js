import { useEffect, useRef, useState } from 'react';
import { getAiStatus, requestSuggestions } from '../services/ai';
import { toApi } from '../services/diagramMapper';

const GENERIC_ERROR = 'Não foi possível gerar sugestões agora. Tente de novo em instantes.';
const LIMITED_SCOPES = new Set(['suggestion', 'deep']);

// Nota: RF16 — sugestões da IA sob pedido (nunca automáticas). O resultado fica guardado por nível: trocar de aba e
// voltar mostra o último resultado daquele nível. Um pedido por vez, que pode ser cancelado; sugestões ignoradas
// somem só da tela. O foco do nível (RF22) vai junto: o backend diz à IA o que o nível detalha.
export function useAiSuggestions(projectId, level, nodes, edges, scope = null) {
  const [status, setStatus] = useState(null);
  const [resultsByLevel, setResultsByLevel] = useState({});
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);

  useEffect(() => {
    let active = true;
    getAiStatus()
      .then((value) => active && setStatus(value))
      .catch(() => active && setStatus({ mode: 'disabled', limits: null, remaining: null }));
    return () => {
      active = false;
    };
  }, []);

  // Sair do editor no meio de um pedido: cancela
  useEffect(() => () => controllerRef.current?.abort(), []);

  async function generate(depth, description) {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const requestedLevel = level;
    setPending({ level: requestedLevel, depth });
    setError(null);

    try {
      const result = await requestSuggestions(
        projectId,
        requestedLevel,
        { diagram: toApi({ nodes, edges, scope }), depth, description },
        { signal: controller.signal }
      );
      setResultsByLevel((current) => ({ ...current, [requestedLevel]: { ...result, dismissed: [] } }));
      setStatus((current) => current && { ...current, remaining: result.remaining });
    } catch (err) {
      if (controller.signal.aborted) return;
      setError({ level: requestedLevel, message: err.response?.data?.message ?? GENERIC_ERROR });

      const { status: httpStatus, data } = err.response ?? {};
      if (httpStatus === 429 && LIMITED_SCOPES.has(data?.scope)) {
        setStatus((current) => current && { ...current, remaining: { ...current.remaining, [data.scope]: 0 } });
      }
      if (httpStatus === 503) setStatus((current) => current && { ...current, mode: 'disabled' });
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setPending(null);
      }
    }
  }

  // O servidor já pode ter contado o pedido cancelado: busca de novo quantos restam, para a tela não prometer a mais
  function cancel() {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setPending(null);
    getAiStatus()
      .then(setStatus)
      .catch(() => {});
  }

  function dismiss(id) {
    setResultsByLevel((current) => ({
      ...current,
      [level]: { ...current[level], dismissed: [...current[level].dismissed, id] },
    }));
  }

  const current = resultsByLevel[level];
  return {
    mode: status?.mode ?? 'loading',
    limits: status?.limits ?? null,
    remaining: status?.remaining ?? null,
    loading: pending?.level === level ? pending.depth : null,
    busy: Boolean(pending),
    pendingElsewhere: pending && pending.level !== level ? pending.level : null,
    error: error?.level === level ? error.message : null,
    result: current
      ? { ...current, suggestions: current.suggestions.filter((item) => !current.dismissed.includes(item.id)) }
      : null,
    generate,
    cancel,
    dismiss,
  };
}
