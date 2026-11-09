import { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';

// Fonte, entrelinha e preenchimento iguais no texto, na numeração e na cópia invisível: é o que mantém os números
// alinhados às linhas
const TEXT_CLASSES = 'font-mono text-xs leading-relaxed';
const PADDING_CLASSES = 'py-3 pr-3 pl-2';

// Onde cada linha começa e termina no texto (para selecionar uma linha inteira)
function lineRange(value, lineNumber) {
  const lines = value.split('\n');
  const start = lines.slice(0, lineNumber - 1).reduce((total, line) => total + line.length + 1, 0);
  return { start, end: start + (lines[lineNumber - 1]?.length ?? 0) };
}

// Nota: RF19 — texto do modo textual com quebra de linha e numeração. Só a linha real ganha número: a continuação de
// uma linha longa, quebrada para caber no painel, não. Para isso, o texto é copiado numa cópia invisível com a mesma
// largura e fonte, e a altura de cada linha medida ali vira a altura do número dela. A numeração acompanha a rolagem
// do texto. selectLine (pelo ref) seleciona uma linha inteira, para mostrar onde está um erro.
function NumberedTextArea({ ref, label, value, onChange, errorLines = [] }) {
  const textareaRef = useRef(null);
  const mirrorRef = useRef(null);
  const [heights, setHeights] = useState([]);
  const [width, setWidth] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const lines = value.split('\n');
  const errors = new Set(errorLines);

  // A largura disponível muda com o painel e com a barra de rolagem: a cópia invisível acompanha
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const update = () => setWidth(textarea.clientWidth);
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(update);
    observer.observe(textarea);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    setHeights([...mirrorRef.current.children].map((line) => line.offsetHeight));
  }, [value, width]);

  useImperativeHandle(
    ref,
    () => ({
      selectLine(lineNumber) {
        const textarea = textareaRef.current;
        const { start, end } = lineRange(textarea.value, lineNumber);
        textarea.focus();
        textarea.setSelectionRange(start, end);
        // Leva a linha para perto do topo, se a altura das linhas anteriores já foi medida
        const above = heights.slice(0, lineNumber - 1).reduce((total, height) => total + height, 0);
        if (above > 0) textarea.scrollTop = Math.max(0, above - textarea.clientHeight / 3);
      },
    }),
    [heights]
  );

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden rounded-[var(--radius-control)] border border-line bg-canvas focus-within:border-accent-text">
      <div aria-hidden="true" className={`w-9 shrink-0 overflow-hidden border-r border-line text-right text-text-muted select-none ${TEXT_CLASSES}`}>
        <div className="py-3 pr-1.5" style={{ transform: `translateY(${-scrollTop}px)` }}>
          {lines.map((_, index) => {
            const number = index + 1;
            const hasError = errors.has(number);
            return (
              <div
                key={number}
                data-line-number={number}
                data-error={String(hasError)}
                className={hasError ? 'font-semibold text-danger' : undefined}
                style={heights[index] ? { height: `${heights[index]}px` } : undefined}
              >
                {number}
              </div>
            );
          })}
        </div>
      </div>

      <textarea
        ref={textareaRef}
        aria-label={label}
        value={value}
        spellCheck={false}
        onChange={onChange}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        className={`min-h-0 flex-1 resize-none overflow-y-auto bg-transparent text-text-primary outline-none ${TEXT_CLASSES} ${PADDING_CLASSES}`}
      />

      {/* Cópia invisível do texto, na largura do campo, só para medir a altura de cada linha (com as quebras) */}
      <div
        ref={mirrorRef}
        aria-hidden="true"
        className={`pointer-events-none invisible absolute top-0 left-0 break-words whitespace-pre-wrap ${TEXT_CLASSES} ${PADDING_CLASSES}`}
        style={{ width: width ? `${width}px` : undefined, boxSizing: 'border-box', paddingTop: 0, paddingBottom: 0 }}
      >
        {lines.map((line, index) => (
          <div key={index} data-mirror-line="">
            {line || '\u200B' /* linha vazia: um caractere invisível dá a ela a altura de uma linha */}
          </div>
        ))}
      </div>
    </div>
  );
}

export default NumberedTextArea;
