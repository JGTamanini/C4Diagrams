import { useState } from 'react';
import { AlertCircle, ChevronDown, Lightbulb, PanelRightClose, PanelRightOpen, TriangleAlert } from 'lucide-react';
import IconButton from '../Button/IconButton';


const GROUPS = [
  { severity: 'error', title: 'Erros', icon: AlertCircle, color: 'text-danger' },
  { severity: 'warning', title: 'Avisos', icon: TriangleAlert, color: 'text-warning' },
];

function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

// Item da lista: leva ao elemento ou à relação quando o problema aponta um; os do diagrama inteiro são só texto
function IssueItem({ issue, onSelectIssue }) {
  if (!issue.nodeId && !issue.edgeId) {
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

// Sugestões (descrição e tecnologia): opcionais ao modelar, então ficam recolhidas para não esconderem os avisos
function Suggestions({ issues, onSelectIssue }) {
  const [expanded, setExpanded] = useState(false);
  if (issues.length === 0) return null;
  return (
    <section aria-label={`Sugestões (${issues.length})`}>
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center gap-1.5 rounded-[var(--radius-control)] px-2 py-1.5 text-xs text-text-muted transition-colors duration-150 hover:bg-surface hover:text-text-secondary"
      >
        <Lightbulb aria-hidden="true" className="h-3.5 w-3.5" />
        <span className="flex-1 text-left">
          {expanded ? 'Ocultar sugestões' : `Mostrar ${plural(issues.length, 'sugestão', 'sugestões')}`}
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

// Nota: painel "Assistente" à direita (espelha a paleta): a aba Validação mostra o resultado do motor de validação C4
// (RF17) em ordem de importância; a aba Sugestões recebe a assistência de IA (RF16) mais adiante. Oculto, vira um
// botão discreto com a contagem de erros e avisos.
function ValidationPanel({ open, status, issues, onToggle, onSelectIssue }) {
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
          aria-selected="true"
          className="-mb-px border-b-2 border-accent px-2 pb-2 text-xs font-medium text-text-primary"
        >
          Validação
        </button>
        <button type="button" role="tab" aria-selected="false" disabled className="px-2 pb-2 text-xs text-text-muted">
          Sugestões <span className="text-[10px]">· em breve</span>
        </button>
      </div>

      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto p-2">
        {statusText && <p className="px-2 pt-1 text-xs text-text-muted">{statusText}</p>}
        {GROUPS.map((group) => (
          <IssueGroup key={group.severity} group={group} issues={bySeverity(group.severity)} onSelectIssue={onSelectIssue} />
        ))}
        <Suggestions issues={bySeverity('info')} onSelectIssue={onSelectIssue} />
      </div>
    </aside>
  );
}

export default ValidationPanel;
