import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { LEVELS, elementMatchKey } from '../../constants/c4Notation';
import ElementGlyph from '../ElementGlyph/ElementGlyph';

// Em quais OUTROS níveis o elemento aparece (mesmo tipo e nome — a regra do motor de validação)
function otherLevelsByKey(nodesByLevel) {
  const levelsByKey = new Map();
  for (const level of LEVELS) {
    for (const node of nodesByLevel[level.id]) {
      const key = elementMatchKey(node);
      levelsByKey.set(key, [...(levelsByKey.get(key) ?? []), level]);
    }
  }
  return (levelId, node) =>
    (levelsByKey.get(elementMatchKey(node)) ?? []).filter((level) => level.id !== levelId).map((level) => level.label);
}

function LevelFolder({ level, nodes, active, expanded, onToggle, otherLevels, onSelectElement }) {
  return (
    <li>
      <button
        type="button"
        aria-label={`${level.label} (${nodes.length})`}
        aria-expanded={expanded}
        aria-current={active ? 'true' : undefined}
        onClick={onToggle}
        className={`flex w-full items-center gap-1.5 rounded-[var(--radius-control)] px-2 py-1.5 text-left text-xs font-medium transition-colors duration-150 hover:bg-surface ${
          active ? 'text-text-primary' : 'text-text-secondary'
        }`}
      >
        <ChevronRight aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`} />
        <span className="flex-1">{level.label}</span>
        <span className="text-text-muted">{nodes.length}</span>
      </button>

      {expanded && (
        <ul aria-label={`Elementos de ${level.label}`} className="ml-3 border-l border-line-subtle pl-1.5">
          {nodes.length === 0 && <li className="px-2 py-1 text-[11px] text-text-muted">Nenhum elemento ainda</li>}
          {nodes.map((node) => {
            const alsoIn = otherLevels(level.id, node);
            const current = active && node.selected;
            return (
              <li key={node.id}>
                <button
                  type="button"
                  aria-label={node.data.label}
                  aria-current={current ? 'true' : undefined}
                  title={node.data.label}
                  onClick={() => onSelectElement(level.id, node.id)}
                  className={`flex w-full items-start gap-2 rounded-[var(--radius-control)] px-2 py-1 text-left transition-colors duration-150 hover:bg-surface ${
                    current ? 'bg-accent/15 text-text-primary' : 'text-text-secondary'
                  }`}
                >
                  <span className="mt-1 shrink-0">
                    <ElementGlyph type={node.type} size="sm" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs">{node.data.label}</span>
                    {alsoIn.length > 0 && (
                      <span className="block text-[10px] text-text-muted">também em: {alsoIn.join(', ')}</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

// Nota: árvore dos elementos do projeto (abaixo da paleta) — os três níveis como pastas, com os elementos de cada um.
// Clicar num elemento leva até ele (troca de nível se preciso). Os níveis ainda não têm ligação explícita entre si,
// então a árvore é por nível; o mesmo elemento em outro nível aparece como "também em".
function ElementTree({ nodesByLevel, activeLevel, onSelectElement }) {
  const [collapsed, setCollapsed] = useState(() => new Set());
  const otherLevels = otherLevelsByKey(nodesByLevel);

  function toggle(levelId) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(levelId)) next.delete(levelId);
      else next.add(levelId);
      return next;
    });
  }

  return (
    <aside
      aria-labelledby="element-tree-title"
      className="pointer-events-auto flex max-h-full w-56 flex-col rounded-[var(--radius-card)] border border-line bg-surface/95 shadow-[var(--shadow-raised)] backdrop-blur-sm"
    >
      <h2 id="element-tree-title" className="px-4 pt-3 pb-1 text-sm font-semibold text-text-primary">
        Estrutura do projeto
      </h2>
      <ul className="min-h-0 overflow-y-auto px-2 pb-2">
        {LEVELS.map((level) => (
          <LevelFolder
            key={level.id}
            level={level}
            nodes={nodesByLevel[level.id]}
            active={level.id === activeLevel}
            expanded={!collapsed.has(level.id)}
            onToggle={() => toggle(level.id)}
            otherLevels={otherLevels}
            onSelectElement={onSelectElement}
          />
        ))}
      </ul>
    </aside>
  );
}

export default ElementTree;
