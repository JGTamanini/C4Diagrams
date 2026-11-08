import { useState } from 'react';
import { Download } from 'lucide-react';
import Modal from '../Modal/Modal';
import Button from '../Button/Button';

const OPTIONS = [
  {
    name: 'format',
    legend: 'Formato',
    choices: [
      { value: 'png', label: 'PNG' },
      { value: 'pdf', label: 'PDF' },
    ],
  },
  {
    name: 'area',
    legend: 'Área',
    choices: [
      { value: 'content', label: 'Diagrama inteiro (ajustado ao conteúdo)' },
      { value: 'visible', label: 'Área visível na tela' },
    ],
  },
  {
    name: 'background',
    legend: 'Fundo',
    choices: [
      { value: 'light', label: 'Claro (para documentos e impressão)' },
      { value: 'dark', label: 'Escuro (como no editor)' },
    ],
  },
];

// Nota: RF18 — opções da imagem do nível aberto. O padrão é o mais comum em documentos: PNG do diagrama inteiro em
// fundo claro. Enquanto gera, não fecha (busy); se falhar, mostra o motivo e continua aberto.
function ExportImageModal({ levelLabel, onExport, onClose }) {
  const [values, setValues] = useState({ format: 'png', area: 'content', background: 'light' });
  const [exporting, setExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');
    setExporting(true);
    try {
      await onExport(values);
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Não foi possível gerar a imagem. Tente novamente.');
      setExporting(false);
    }
  }

  return (
    <Modal title={`Exportar imagem do nível ${levelLabel}`} onClose={onClose} closable busy={exporting}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {OPTIONS.map((option) => (
          <fieldset key={option.name}>
            <legend className="mb-2 text-sm font-medium text-text-secondary">{option.legend}</legend>
            <div className="flex flex-col gap-2">
              {option.choices.map((choice) => (
                <label key={choice.value} className="flex cursor-pointer items-center gap-2.5 text-sm text-text-primary">
                  <input
                    type="radio"
                    name={option.name}
                    value={choice.value}
                    checked={values[option.name] === choice.value}
                    onChange={() => setValues((current) => ({ ...current, [option.name]: choice.value }))}
                    className="h-4 w-4 accent-[var(--color-accent)]"
                  />
                  {choice.label}
                </label>
              ))}
            </div>
          </fieldset>
        ))}

        <p className="text-xs text-text-muted">A imagem leva o nome do projeto, o nível e a legenda da notação C4.</p>

        {errorMessage && (
          <p role="alert" className="text-sm text-danger">
            {errorMessage}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={exporting}>
            Cancelar
          </Button>
          <Button type="submit" icon={Download} loading={exporting}>
            Exportar
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default ExportImageModal;
