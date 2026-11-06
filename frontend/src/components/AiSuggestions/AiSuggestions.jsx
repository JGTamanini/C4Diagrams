import { useState } from 'react';
import { Check, Lightbulb, Link2, PencilLine, Plus } from 'lucide-react';
import Button from '../Button/Button';
import FormInput from '../FormInput/FormInput';
import { C4_ELEMENTS, LEVELS, elementMatchKey } from '../../constants/c4Notation';

// Descrição do sistema para o ponto de partida (a do projeto tem só 150 caracteres)
const DESCRIPTION_MAX_LENGTH = 1000;

const KIND_ICONS = { add_element: Plus, add_relationship: Link2, improve_text: PencilLine, note: Lightbulb };

function normalized(name) {
  return name.trim().toLowerCase().replaceAll(/\s+/g, ' ');
}

// Checklist do ponto de partida: o item se marca sozinho quando o usuário constrói o que foi sugerido (mesmo tipo e
// nome; a relação, em qualquer sentido) — a ferramenta acompanha, quem constrói é ele
function isDone(item, nodes, edges) {
  if (item.kind === 'add_element') {
    return nodes.some((node) => elementMatchKey(node) === `${item.elementType}:${normalized(item.name)}`);
  }
  if (item.kind === 'add_relationship') {
    const idsNamed = (name) => nodes.filter((node) => normalized(node.data.label) === normalized(name)).map((node) => node.id);
    const from = idsNamed(item.source);
    const to = idsNamed(item.target);
    return edges.some(
      (edge) => (from.includes(edge.source) && to.includes(edge.target)) || (from.includes(edge.target) && to.includes(edge.source))
    );
  }
  return false;
}

function detailOf(item) {
  switch (item.kind) {
    case 'add_element':
      return `${C4_ELEMENTS[item.elementType]?.name ?? 'Elemento'}: ${item.name}${item.technology ? ` [${item.technology}]` : ''}`;
    case 'add_relationship':
      return `${item.source} → ${item.target}${item.description ? ` · "${item.description}"` : ''}`;
    case 'improve_text':
      if (item.description) return `"${item.description}"`;
      return item.technology ? `Tecnologia: ${item.technology}` : null;
    default:
      return null;
  }
}

function sourceLabel(result) {
  if (result.source === 'demo') return 'Exemplo (modo demonstração)';
  if (result.escalated) return 'Revisadas pelo modelo avançado';
  if (result.source.includes('opus')) return 'Resultado da análise aprofundada';
  return 'Geradas pela IA';
}

function SuggestionItem({ item, done, onSelectElement, onDismiss }) {
  const Icon = KIND_ICONS[item.kind] ?? Lightbulb;
  const detail = detailOf(item);
  return (
    <li className="rounded-[var(--radius-control)] border border-line-subtle bg-surface/60 p-2.5">
      <div className="flex items-start gap-2">
        <Icon aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-text" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-text-primary">{item.title}</p>
          {detail && <p className="mt-0.5 text-[11px] break-words text-text-secondary">{detail}</p>}
          {item.reason && <p className="mt-1 text-[11px] leading-relaxed text-text-muted">{item.reason}</p>}
        </div>
        {done && (
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-success">
            <Check aria-hidden="true" className="h-3.5 w-3.5" />
            Feito
          </span>
        )}
      </div>
      <div className="mt-1.5 flex justify-end gap-1">
        {item.nodeId && (
          <button
            type="button"
            onClick={() => onSelectElement({ nodeId: item.nodeId })}
            className="rounded-[var(--radius-control)] px-2 py-1 text-[11px] text-accent-text transition-colors duration-150 hover:bg-surface"
          >
            Ver no diagrama
          </button>
        )}
        <button
          type="button"
          onClick={() => onDismiss(item.id)}
          className="rounded-[var(--radius-control)] px-2 py-1 text-[11px] text-text-muted transition-colors duration-150 hover:bg-surface hover:text-text-secondary"
        >
          Ignorar
        </button>
      </div>
    </li>
  );
}

function Remaining({ count }) {
  return <span className="shrink-0 text-[11px] text-text-muted">Restam {count} hoje</span>;
}

// Nota: aba Sugestões do Assistente (RF16). Nível vazio: ponto de partida a partir da descrição do sistema, que vira
// um checklist que se marca sozinho. Nível com elementos: melhorias (Haiku) ou análise aprofundada (Opus). Sempre sob
// pedido; as sugestões só orientam (RN12) — nada é aplicado no diagrama.
function AiSuggestions({ ai, nodes, edges, projectDescription, onSelectElement }) {
  const [description, setDescription] = useState(projectDescription ?? '');

  if (ai.mode === 'loading') return <p className="px-2 pt-1 text-xs text-text-muted">Carregando…</p>;
  if (ai.mode === 'disabled') {
    return (
      <div className="px-2 pt-1 text-xs">
        <p className="text-text-secondary">As sugestões da IA estão indisponíveis no momento.</p>
        <p className="mt-1 text-text-muted">Elas aparecem aqui assim que o serviço de IA for ativado.</p>
      </div>
    );
  }

  const remaining = ai.remaining ?? { suggestion: 0, deep: 0 };
  const isEmptyLevel = nodes.length === 0;

  return (
    <div className="flex flex-col gap-3 px-2 pt-1">
      {ai.mode === 'demo' && (
        <p className="rounded-[var(--radius-control)] bg-highlight/10 px-2 py-1 text-[11px] text-highlight-text">
          Modo demonstração: sugestões de exemplo, sem IA.
        </p>
      )}

      {isEmptyLevel ? (
        <div className="flex flex-col gap-2">
          <FormInput
            id="ai-system-description"
            label="Descreva o sistema"
            multiline
            required={false}
            maxLength={DESCRIPTION_MAX_LENGTH}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          {/* Botão na largura toda (o texto é longo) e o contador embaixo, à direita */}
          <div className="flex flex-col items-end gap-1">
            <Button
              size="sm"
              className="w-full"
              onClick={() => ai.generate('standard', description.trim())}
              disabled={ai.busy || !description.trim() || remaining.suggestion === 0}
            >
              Gerar ponto de partida
            </Button>
            <Remaining count={remaining.suggestion} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <Button size="sm" onClick={() => ai.generate('standard')} disabled={ai.busy || remaining.suggestion === 0}>
              Sugerir melhorias
            </Button>
            <Remaining count={remaining.suggestion} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button size="sm" variant="secondary" onClick={() => ai.generate('deep')} disabled={ai.busy || remaining.deep === 0}>
              Análise aprofundada
            </Button>
            <Remaining count={remaining.deep} />
          </div>
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-text-muted">
        {ai.mode === 'demo' ? 'Nenhum conteúdo é enviado à IA.' : 'O conteúdo deste nível é enviado à Anthropic para gerar as sugestões.'}{' '}
        Nada é alterado no seu diagrama: quem constrói é você.
      </p>

      {ai.loading && (
        <div role="status" className="flex items-center justify-between gap-2 text-xs text-text-secondary">
          <span>{ai.loading === 'deep' ? 'Analisando com o modelo avançado… pode levar até 1 minuto.' : 'Gerando sugestões…'}</span>
          <Button size="sm" variant="ghost" onClick={ai.cancel}>
            Cancelar
          </Button>
        </div>
      )}

      {/* Um pedido por vez: em outro nível, explica por que os botões estão desativados */}
      {ai.pendingElsewhere && (
        <div role="status" className="flex items-center justify-between gap-2 text-xs text-text-secondary">
          <span>Há um pedido em andamento no nível {LEVELS.find((level) => level.id === ai.pendingElsewhere).label}.</span>
          <Button size="sm" variant="ghost" onClick={ai.cancel}>
            Cancelar
          </Button>
        </div>
      )}

      {ai.error && (
        <p role="alert" className="text-xs text-danger">
          {ai.error}
        </p>
      )}

      {ai.result && (
        <section aria-label="Sugestões geradas" className="flex flex-col gap-2">
          <p className="text-[11px] font-medium text-text-muted">{sourceLabel(ai.result)}</p>
          {ai.result.suggestions.length === 0 ? (
            <p className="text-xs text-text-muted">Todas as sugestões foram ignoradas.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {ai.result.suggestions.map((item) => (
                <SuggestionItem
                  key={item.id}
                  item={item}
                  done={isDone(item, nodes, edges)}
                  onSelectElement={onSelectElement}
                  onDismiss={ai.dismiss}
                />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

export default AiSuggestions;
