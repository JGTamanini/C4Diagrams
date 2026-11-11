import { useState } from 'react';
import { SCOPE_ISSUE_CODES } from '../../constants/levelScope';
import { AlertCircle, ChevronDown, Lightbulb, PanelRightClose, PanelRightOpen, TriangleAlert } from 'lucide-react';
import IconButton from '../Button/IconButton';
import AiSuggestions from '../AiSuggestions/AiSuggestions';

const GROUPS = [
  { severity: 'error', title: 'Erros', icon: AlertCircle, color: 'text-danger' },
  { severity: 'warning', title: 'Avisos', icon: TriangleAlert, color: 'text-warning' },
];

function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

// Item da lista: leva ao elemento ou à relação quando o problema aponta um, e ao nível de cima nos avisos de foco
// (é lá que se escolhe o que o nível detalha); os demais do diagrama inteiro são só texto
function IssueItem({ issue, onSelectIssue }) {
  if (!issue.nodeId && !issue.edgeId && !SCOPE_ISSUE_CODES.has(issue.code)) {
    return <li className="px-2 py-1.5 text-xs leading-relaxed text-text-secondary">{issue.message}</li>;
  }
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelectIssue(issue)}
        className="w-full rounded-[var(--radius-control)] px-2 py-1.5 text-left text-xs leading-relaxed text-text-secondary transition-colors duration-150 hover:bg-surface hover:text-text-primary"
      >
        {issue.message}
      </button>
    </li>
  );
}

function IssueGroup({ group, issues, onSelectIssue }) {
  if (issues.length === 0) return null;
  const Icon = group.icon;
  const titleId = `validation-group-${group.severity}`;
  return (
    <section aria-labelledby={titleId}>
      <h3 id={titleId} className={`mb-1 flex items-center gap-1.5 px-2 text-xs font-semibold ${group.color}`}>
        <Icon aria-hidden="true" className="h-3.5 w-3.5" />
        {group.title} ({issues.length})
      </h3>
      <ul>
        {issues.map((issue) => (
          <IssueItem key={`${issue.code}-${issue.nodeId ?? issue.edgeId ?? ''}`} issue={issue} onSelectIssue={onSelectIssue} />
        ))}
      </ul>
    </section>
  );
}

// Dicas (descrição e tecnologia): opcionais ao modelar, então ficam recolhidas para não esconderem os avisos. O nome
// "Sugestões" fica com a aba da IA
function Tips({ issues, onSelectIssue }) {
  const [expanded, setExpanded] = useState(false);
  if (issues.length === 0) return null;
  return (
    <section aria-label={`Dicas (${issues.length})`}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center gap-1.5 rounded-[var(--radius-control)] px-2 py-1.5 text-xs text-text-muted transition-colors duration-150 hover:bg-surface hover:text-text-secondary"
      >
        <Lightbulb aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">
          {expanded ? 'Ocultar dicas' : `Mostrar ${plural(issues.length, 'dica', 'dicas')}`}
        </span>
        <ChevronDown aria-hidden="true" className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <ul>
          {issues.map((issue) => (
            <IssueItem key={`${issue.code}-${issue.nodeId ?? issue.edgeId ?? ''}`} issue={issue} onSelectIssue={onSelectIssue} />
          ))}
        </ul>
      )}
    </section>
  );
}

const STATUS_TEXT = {
  validating: 'Validando…',
  error: 'Não foi possível validar agora. Tentaremos de novo na próxima mudança.',
};

const TAB_CLASSES = {
  selected: '-mb-px border-b-2 border-accent px-2 pb-2 text-xs font-medium text-text-primary',
  idle: '-mb-px border-b-2 border-transparent px-2 pb-2 text-xs text-text-secondary transition-colors duration-150 hover:text-text-primary disabled:text-text-muted',
};

// Nota: painel "Assistente" à direita (espelha a paleta): a aba Validação mostra o resultado do motor de validação C4
// (RF17) em ordem de importância; a aba Sugestões traz a assistência por IA sob pedido (RF16) — sem o ai, fica "em
// breve". As duas abas continuam montadas (só a ativa aparece), para o que foi digitado não se perder ao alternar.
// Oculto, vira um botão discreto com a contagem de erros e avisos.
function ValidationPanel({ open, status, issues, onToggle, onSelectIssue, ai, nodes = [], edges = [], projectDescription }) {
  const [tab, setTab] = useState('validation');
  const bySeverity = (severity) => issues.filter((issue) => issue.severity === severity);
  const errors = bySeverity('error').length;
  const warnings = bySeverity('warning').length;

  if (!open) {
    const counts = [errors > 0 && plural(errors, 'erro', 'erros'), warnings > 0 && plural(warnings, 'aviso', 'avisos')]
      .filter(Boolean)
      .join(', ');
    const badgeColor = errors > 0 ? 'bg-danger' : 'bg-warning';
    return (
      <button
        type="button"
        aria-label={counts ? `Mostrar assistente (${counts})` : 'Mostrar assistente'}
        title="Mostrar assistente"
        onClick={onToggle}
        className="pointer-events-auto relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] border border-line bg-surface/90 text-text-secondary shadow-[var(--shadow-raised)] backdrop-blur-sm transition-colors duration-150 hover:text-text-primary"
      >
        <PanelRightOpen aria-hidden="true" className="h-4 w-4" />
        {counts && (
          <span
            aria-hidden="true"
            className={`absolute -top-1.5 -right-1.5 min-w-5 rounded-full px-1 text-center text-[11px] font-semibold leading-5 text-white ${badgeColor}`}
          >
            {errors + warnings}
          </span>
        )}
      </button>
    );
  }

  const statusText = STATUS_TEXT[status] ?? (issues.length === 0 ? 'Nenhum problema encontrado neste nível.' : null);

  return (
    <aside
      aria-labelledby="assistant-title"
      className="pointer-events-auto flex max-h-full w-72 flex-col rounded-[var(--radius-card)] border border-line bg-surface/95 shadow-[var(--shadow-raised)] backdrop-blur-sm"
    >
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 id="assistant-title" className="text-sm font-semibold text-text-primary">
          Assistente
        </h2>
        <IconButton icon={PanelRightClose} label="Ocultar assistente" onClick={onToggle} className="-mr-2" />
      </div>

      <div role="tablist" aria-label="Assistente" className="mx-4 mt-2 flex gap-1 border-b border-line">
        <button
          type="button"
          role="tab"
          id="assistant-tab-validation"
          aria-selected={tab === 'validation'}
          aria-controls="assistant-panel-validation"
          onClick={() => setTab('validation')}
          className={tab === 'validation' ? TAB_CLASSES.selected : TAB_CLASSES.idle}
        >
          Validação
        </button>
        <button
          type="button"
          role="tab"
          id="assistant-tab-suggestions"
          aria-selected={tab === 'suggestions'}
          aria-controls="assistant-panel-suggestions"
          disabled={!ai}
          onClick={() => setTab('suggestions')}
          className={tab === 'suggestions' ? TAB_CLASSES.selected : TAB_CLASSES.idle}
        >
          Sugestões{!ai && <span className="text-[10px]"> · em breve</span>}
        </button>
      </div>

      <div
        role="tabpanel"
        id="assistant-panel-validation"
        aria-labelledby="assistant-tab-validation"
        hidden={tab !== 'validation'}
        className="min-h-0 overflow-y-auto p-2"
      >
        <div className="flex flex-col gap-3">
          {statusText && <p className="px-2 pt-1 text-xs text-text-muted">{statusText}</p>}
          {GROUPS.map((group) => (
            <IssueGroup key={group.severity} group={group} issues={bySeverity(group.severity)} onSelectIssue={onSelectIssue} />
          ))}
          <Tips issues={bySeverity('info')} onSelectIssue={onSelectIssue} />
        </div>
      </div>

      {ai && (
        <div
          role="tabpanel"
          id="assistant-panel-suggestions"
          aria-labelledby="assistant-tab-suggestions"
          hidden={tab !== 'suggestions'}
          className="min-h-0 overflow-y-auto p-2"
        >
          {/* A descrição do projeto chega depois do painel: a chave recria o campo com ela */}
          <AiSuggestions
            key={projectDescription ?? ''}
            ai={ai}
            nodes={nodes}
            edges={edges}
            projectDescription={projectDescription}
            onSelectElement={onSelectIssue}
          />
        </div>
      )}
    </aside>
  );
}

export default ValidationPanel;
