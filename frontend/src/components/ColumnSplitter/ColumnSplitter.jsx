import { useEffect, useRef } from 'react';

// Passo de cada tecla (↑/↓)
const KEYBOARD_STEP = 16;

// Nota: divisória arrastável entre dois painéis empilhados (paleta e árvore). Ajusta a altura do painel de cima, pelo
// mouse ou pelo teclado (↑/↓), sempre dentro dos limites. value pode ser null (altura automática): nesse caso, o
// ajuste parte da altura medida agora (getStartValue).
function ColumnSplitter({ label, value, min, max, getStartValue, onChange }) {
  const dragRef = useRef(null);
  const stopDraggingRef = useRef(null);

  // Saiu da tela no meio do arraste (ex.: a coluna foi recolhida): para de ouvir o mouse
  useEffect(() => () => stopDraggingRef.current?.(), []);
  const clamp = (height) => Math.min(max, Math.max(min, height));
  const current = () => value ?? getStartValue();

  function handleKeyDown(event) {
    const step = { ArrowUp: -KEYBOARD_STEP, ArrowDown: KEYBOARD_STEP }[event.key];
    if (step === undefined) return;
    event.preventDefault();
    onChange(clamp(current() + step));
  }

  function handlePointerDown(event) {
    event.preventDefault();
    dragRef.current = { startY: event.clientY, startHeight: current() };

    function handlePointerMove(moveEvent) {
      const { startY, startHeight } = dragRef.current;
      onChange(clamp(startHeight + moveEvent.clientY - startY));
    }
    function handlePointerUp() {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      stopDraggingRef.current = null;
    }
    stopDraggingRef.current = handlePointerUp;

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={label}
      aria-valuenow={Math.round(current())}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title={label}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      className="group pointer-events-auto flex h-3 shrink-0 cursor-row-resize items-center justify-center outline-none"
    >
      <span className="h-1 w-10 rounded-full bg-line transition-colors duration-150 group-hover:bg-accent-text group-focus-visible:bg-accent-text" />
    </div>
  );
}

export default ColumnSplitter;
