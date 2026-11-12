import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import Button from '../Button/Button';
import IconButton from '../Button/IconButton';
import NumberedTextArea from '../NumberedTextArea/NumberedTextArea';
import { diagramToText, exampleText, planTextChanges } from '../../services/textMode';

// Só o que o texto descreve (tipo, nome, descrição, tecnologia e relações): mover ou selecionar não "muda" o diagrama
function contentKey(nodes, edges) {
  return JSON.stringify([
    nodes.map(({ id, type, data }) => [id, type, data.label, data.description ?? '', data.technology ?? '']),
    edges.map(({ id, source, target, label, data }) => [id, source, target, label, data?.technology ?? '']),
  ]);
}

function generate(level, nodes, edges) {
  return { ...diagramToText(level, nodes, edges), key: contentKey(nodes, edges) };
}

function count(value, singular, plural) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function untouchedMessage(untouched) {
  const left =
    untouched === 1
      ? '1 elemento que não está no texto continua no canvas'
      : `${untouched} elementos que não estão no texto continuam no canvas`;
  return `${left}; para excluir, use o canvas.`;
}

function resultMessage(plan) {
  const added = plan.addNodes.length + plan.addEdges.length;
  const updated = plan.updateNodes.length + plan.updateEdges.length;
  const summary = `Aplicado: ${count(added, 'adicionado', 'adicionados')}, ${count(updated, 'atualizado', 'atualizados')}.`;
  return plan.untouched === 0 ? summary : `${summary} ${untouchedMessage(plan.untouched)}`;
}

// Nota: RF19 — modo textual. O painel abre com o nível aberto em texto (sintaxe inspirada no C4-PlantUML); "Aplicar ao
// canvas" adiciona o que é novo e atualiza o que mudou, sem excluir nada (apagar uma linha não apaga o elemento). Com
// erro em qualquer linha, nada é aplicado. Não há sincronização contínua (RFC 2.6): se o canvas mudar, o painel avisa
// e oferece recarregar; depois de aplicar, o texto é gerado de novo a partir do resultado.
// locked: canvas travado (issue #75) — o texto pode ser lido e editado, mas não aplicado
function TextModePanel({ level, levelLabel, nodes, edges, onApply, onClose, locked = false }) {
  const [generated, setGenerated] = useState(() => generate(level, nodes, edges));
  const [text, setText] = useState(generated.text);
  const [errors, setErrors] = useState([]);
  const [message, setMessage] = useState('');
  const [awaitingResult, setAwaitingResult] = useState(false);
  const [confirmingReload, setConfirmingReload] = useState(false);
  const textRef = useRef(null);

  const currentKey = contentKey(nodes, edges);
  const changedOnCanvas = currentKey !== generated.key;

  // Depois de aplicar, o texto volta a ser o do diagrama (com os apelidos dos elementos novos)
  if (awaitingResult && changedOnCanvas) {
    const fresh = generate(level, nodes, edges);
    setGenerated(fresh);
    setText(fresh.text);
    setAwaitingResult(false);
  }

  function reload() {
    const fresh = generate(level, nodes, edges);
    setGenerated(fresh);
    setText(fresh.text);
    setErrors([]);
    setMessage('');
    setConfirmingReload(false);
  }

  function requestReload() {
    if (text !== generated.text) setConfirmingReload(true);
    else reload();
  }

  function apply() {
    const plan = planTextChanges({ level, text, aliases: generated.aliases, nodes, edges });
    setErrors(plan.errors);
    setMessage('');
    if (plan.errors.length > 0) return;

    const nothing = [plan.addNodes, plan.addEdges, plan.updateNodes, plan.updateEdges].every((list) => list.length === 0);
    if (nothing) {
      setMessage(
        plan.untouched > 0
          ? `Nada para aplicar. ${untouchedMessage(plan.untouched)}`
          : 'Nada para aplicar: o texto é igual ao diagrama.'
      );
      return;
    }

    onApply(plan);
    setMessage(resultMessage(plan));
    setAwaitingResult(true);
  }

  return (
    <aside
      aria-label="Modo textual"
      className="pointer-events-auto flex h-full w-[440px] max-w-full flex-col rounded-[var(--radius-card)] border border-line bg-surface/95 shadow-[var(--shadow-raised)] backdrop-blur-sm"
    >
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h2 className="text-sm font-semibold text-text-primary">Modo textual · {levelLabel}</h2>
        <IconButton icon={X} label="Fechar modo textual" onClick={onClose} className="-mr-2" />
      </div>
      <p className="px-4 pb-2 text-[11px] leading-relaxed text-text-muted">
        Uma linha por elemento ou relação, como no C4-PlantUML. Aplicar adiciona e atualiza; apagar uma linha não exclui nada do
        canvas.
      </p>

      {changedOnCanvas && !awaitingResult && (
        <p className="mx-4 mb-2 rounded-[var(--radius-control)] bg-warning/10 px-3 py-2 text-xs text-warning">
          O diagrama mudou desde que o texto foi gerado.
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col px-4">
        <NumberedTextArea
          ref={textRef}
          label={`Texto do nível ${levelLabel}`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          errorLines={errors.map((error) => error.line)}
        />
      </div>

      <div className="flex flex-col gap-2 px-4 py-3">
        {errors.length > 0 && (
          <ul role="alert" className="max-h-28 overflow-y-auto text-xs text-danger">
            {/* Clicar no erro seleciona a linha dele no texto; erro do diagrama inteiro (linha 0) é só texto */}
            {errors.map((error) => (
              <li key={`${error.line}-${error.message}`}>
                {error.line >= 1 ? (
                  <button
                    type="button"
                    onClick={() => textRef.current.selectLine(error.line)}
                    className="text-left hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    {error.message}
                  </button>
                ) : (
                  error.message
                )}
              </li>
            ))}
          </ul>
        )}
        {message && (
          <p role="status" className="text-xs text-text-secondary">
            {message}
          </p>
        )}

        {confirmingReload ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary">
            <span>Descartar o texto editado?</span>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setConfirmingReload(false)}>
                Manter o texto
              </Button>
              <Button size="sm" variant="danger-outline" onClick={reload}>
                Descartar e recarregar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={requestReload}>
                Recarregar do canvas
              </Button>
              {nodes.length === 0 && (
                <Button size="sm" variant="ghost" onClick={() => setText(exampleText(level))}>
                  Inserir exemplo
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {locked && <span className="text-xs text-text-muted">Canvas travado: destrave para aplicar.</span>}
              <Button size="sm" onClick={apply} disabled={locked}>
                Aplicar ao canvas
              </Button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

export default TextModePanel;
