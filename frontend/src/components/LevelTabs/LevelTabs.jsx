import { motion } from 'motion/react';
import { LEVELS } from '../../constants/c4Notation';

const EASE_OUT_SOFT = [0.22, 1, 0.36, 1];

// Nota: abas de nível flutuando no topo do canvas, fixas no centro (não acompanham a paleta nem o assistente, para
// não "dançarem" ao abrir e fechar os painéis); o destaque do nível ativo desliza entre as abas. Usadas no editor e na
// visualização do link.
function LevelTabs({ activeLevel, onSelect }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center">
      <div
        role="tablist"
        aria-label="Níveis do modelo C4"
        className="pointer-events-auto flex gap-1 rounded-full border border-line bg-surface/90 p-1 shadow-[var(--shadow-raised)] backdrop-blur-sm"
      >
        {LEVELS.map((level) => {
          const selected = level.id === activeLevel;
          return (
            <button
              key={level.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelect(level.id)}
              className={`relative rounded-full px-4 py-1.5 text-sm transition-colors duration-200 ${
                selected ? 'text-accent-fg' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {selected && (
                <motion.span
                  layoutId="active-level"
                  aria-hidden="true"
                  transition={{ duration: 0.25, ease: EASE_OUT_SOFT }}
                  className="absolute inset-0 rounded-full bg-accent"
                />
              )}
              <span className="relative">{level.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default LevelTabs;
