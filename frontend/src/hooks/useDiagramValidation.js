import { useEffect, useMemo, useRef, useState } from 'react';
import { validateDiagram } from '../services/diagrams';
import { toApi } from '../services/diagramMapper';

// Espera a edição parar antes de validar (RNF03: o resultado aparece em até 1 s depois da mudança)
export const VALIDATION_DELAY_MS = 400;

// Só o conteúdo que as regras olham: posição e seleção ficam de fora, então arrastar elementos não gera validação
function contentKey(level, document) {
  return JSON.stringify({
    level,
    nodes: document.nodes.map(({ id, type, data }) => ({ id, type, data })),
    edges: document.edges,
  });
}

const EMPTY = { status: 'ready', issues: [] };

// Nota: RF17 no editor — valida o nível aberto no backend pouco depois de cada mudança de conteúdo, sem bloquear a
// edição (RN11). Resposta antiga que chegue depois de uma mais nova é descartada; falha mantém a última lista válida
// e tenta de novo na próxima mudança.
export function useDiagramValidation(projectId, level, nodes, edges) {
  const document = useMemo(() => toApi({ nodes, edges }), [nodes, edges]);
  const key = contentKey(level, document);
  const isEmpty = document.nodes.length === 0;
  // O documento mais recente, lido pelo timer da validação (atualizado num efeito, nunca durante a renderização)
  const documentRef = useRef(document);
  useEffect(() => {
    documentRef.current = document;
  }, [document]);
  const lastRequestRef = useRef(0);
  // Antes da primeira resposta, "validando" — e não "sem problemas", que apareceria por um instante sem ser verdade
  const [result, setResult] = useState({ level, status: 'validating', issues: [] });

  useEffect(() => {
    if (isEmpty) return undefined;

    const requestId = ++lastRequestRef.current;
    const timer = setTimeout(async () => {
      try {
        const issues = await validateDiagram(projectId, level, documentRef.current);
        if (requestId === lastRequestRef.current) setResult({ level, status: 'ready', issues });
      } catch {
        if (requestId === lastRequestRef.current) setResult((current) => ({ ...current, level, status: 'error' }));
      }
    }, VALIDATION_DELAY_MS);

    return () => clearTimeout(timer);
    // key resume o que importa do documento: a validação só refaz quando o conteúdo (ou o nível) muda
  }, [projectId, level, key, isEmpty]);

  if (isEmpty) return EMPTY;
  // Ao trocar de nível, a lista do nível anterior não vale para o novo
  if (result.level !== level) return { status: 'validating', issues: [] };
  return { status: result.status, issues: result.issues };
}
