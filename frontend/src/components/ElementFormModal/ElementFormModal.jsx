import { useEffect, useRef, useState } from 'react';
import Modal from '../Modal/Modal';
import FormInput from '../FormInput/FormInput';
import { ArrowLeft, ArrowRight, Layers, Trash2 } from 'lucide-react';
import Button from '../Button/Button';
import IconButton from '../Button/IconButton';
import {
  C4_ELEMENTS,
  DESCRIPTION_MAX_LENGTH,
  TECHNOLOGY_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from '../../constants/c4Notation';

const SMALL_INPUT =
  'min-w-0 rounded-[var(--radius-control)] border border-line bg-canvas px-2.5 py-1.5 text-sm text-text-primary outline-none transition-colors duration-150 focus:border-accent-text';

function remainingText(count) {
  if (count === 0) return '';
  return count === 1
    ? ' Ao trocar o foco para este, o elemento que já está lá continua no nível.'
    : ` Ao trocar o foco para este, os ${count} elementos que já estão lá continuam no nível.`;
}

// RF22: onde o elemento está no modelo — de que elemento do nível de cima ele faz parte e em qual nível é detalhado.
// Cada nível detalha um elemento por vez (RN06): se o nível de baixo já detalha outro, o modal explica a troca
function LevelInfo({ levelInfo, onDetail }) {
  const { partOf, detail } = levelInfo;
  if (!partOf && !detail) return null;

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-[var(--radius-control)] border border-line-subtle bg-canvas/40 px-3 py-2.5 text-sm">
      {partOf && (
        <p className="text-text-secondary">
          <span>Parte de:</span> <strong className="font-medium text-text-primary">{partOf.label}</strong> [{partOf.type}]
        </p>
      )}
      {detail && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {detail.isFocus ? (
            <>
              <p className="text-text-secondary">
                Detalhado no nível {detail.levelName} ({detail.count} {detail.count === 1 ? 'elemento' : 'elementos'})
              </p>
              <Button size="sm" variant="secondary" icon={Layers} onClick={onDetail}>
                Abrir nível {detail.levelName}
              </Button>
            </>
          ) : detail.currentFocusLabel ? (
            <>
              <p className="text-xs leading-relaxed text-text-secondary">
                O nível {detail.levelName} detalha "{detail.currentFocusLabel}". Cada nível detalha um elemento por vez — no C4,
                só se detalha o que agrega valor.{remainingText(detail.count)}
              </p>
              <Button size="sm" variant="secondary" icon={Layers} onClick={onDetail}>
                Trocar o foco para este
              </Button>
            </>
          ) : (
            <Button size="sm" variant="secondary" icon={Layers} onClick={onDetail}>
              Detalhar no nível {detail.levelName}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// RF22: as relações do elemento, editáveis ali mesmo (rótulo e tecnologia) ou marcadas para remover. Tudo é aplicado
// junto com o elemento ao salvar, como um passo só do desfazer. Criar relação continua no canvas.
function Relations({ rows, onChange }) {
  const update = (id, changes) => onChange(rows.map((row) => (row.id === id ? { ...row, ...changes } : row)));

  return (
    <section aria-labelledby="element-relations-title" className="mb-4">
      <h3 id="element-relations-title" className="mb-2 text-sm font-medium text-text-secondary">
        Relações ({rows.length})
      </h3>
      {rows.length === 0 ? (
        <p className="text-xs text-text-muted">
          Nenhuma relação ainda. Para criar, arraste de um ponto de conexão deste elemento até outro elemento no canvas.
        </p>
      ) : (
        <ul className="flex max-h-56 flex-col gap-2 overflow-y-auto">
          {rows.map((row) => {
            const DirectionIcon = row.direction === 'out' ? ArrowRight : ArrowLeft;
            return (
              <li key={row.id} className="rounded-[var(--radius-control)] border border-line-subtle px-2.5 py-2">
                <p className="mb-1.5 flex items-center gap-1.5 text-xs text-text-secondary">
                  <DirectionIcon aria-hidden="true" className="h-3.5 w-3.5 text-accent-text" />
                  <span>{row.direction === 'out' ? `para ${row.otherLabel}` : `de ${row.otherLabel}`}</span>
                </p>
                {row.removed ? (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-danger">Será removida ao salvar</span>
                    <button
                      type="button"
                      aria-label={`Manter relação com ${row.otherLabel}`}
                      onClick={() => update(row.id, { removed: false })}
                      className="rounded-[var(--radius-control)] px-2 py-1 text-accent-text hover:bg-surface"
                    >
                      Manter
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      aria-label={`Rótulo da relação com ${row.otherLabel}`}
                      value={row.label}
                      maxLength={TITLE_MAX_LENGTH}
                      onChange={(event) => update(row.id, { label: event.target.value })}
                      className={`${SMALL_INPUT} flex-1`}
                    />
                    <input
                      aria-label={`Tecnologia da relação com ${row.otherLabel}`}
                      placeholder="Tecnologia"
                      value={row.technology}
                      maxLength={TECHNOLOGY_MAX_LENGTH}
                      onChange={(event) => update(row.id, { technology: event.target.value })}
                      className={`${SMALL_INPUT} w-28`}
                    />
                    <IconButton
                      icon={Trash2}
                      tone="danger"
                      label={`Remover relação com ${row.otherLabel}`}
                      onClick={() => update(row.id, { removed: true })}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// Só o que mudou: relações removidas e as que tiveram rótulo ou tecnologia alterados
function relationChanges(rows, original) {
  const before = new Map(original.map((relation) => [relation.id, relation]));
  const kept = rows.filter((row) => !row.removed);
  return {
    updated: kept
      .map((row) => ({ id: row.id, label: row.label.trim(), technology: row.technology.trim() }))
      .filter((row) => row.label !== before.get(row.id).label || row.technology !== (before.get(row.id).technology ?? '')),
    removed: rows.filter((row) => row.removed).map((row) => row.id),
  };
}

// Nota: RF22 (wireframe 8) — o mesmo modal edita elemento (título, descrição e, para container/componente,
// tecnologia; suas relações; e a ligação com os outros níveis) e conexão (rótulo e tecnologia).
// relations: relações do elemento no nível aberto ({ id, direction, otherLabel, label, technology }).
// levelInfo: { partOf, detail } — de que elemento do nível de cima ele faz parte e em que nível é detalhado.
function ElementFormModal({ target, onSave, onDelete, onClose, relations, levelInfo, onDetail }) {
  const isNode = target.kind === 'node';
  const element = isNode ? C4_ELEMENTS[target.type] : null;
  const hasTechnology = !isNode || Boolean(element.hasTechnology);

  const [label, setLabel] = useState(isNode ? target.data.label : target.label);
  const [description, setDescription] = useState(target.data.description ?? '');
  const [technology, setTechnology] = useState(target.data.technology ?? '');
  const [relationRows, setRelationRows] = useState(() =>
    (relations ?? []).map((relation) => ({ ...relation, technology: relation.technology ?? '', removed: false }))
  );
  const [errorMessage, setErrorMessage] = useState('');
  const labelInputRef = useRef(null);

  useEffect(() => {
    labelInputRef.current?.focus();
  }, []);

  function handleSubmit(event) {
    event.preventDefault();

    if (!label.trim()) {
      setErrorMessage(isNode ? 'O título é obrigatório.' : 'O rótulo é obrigatório.');
      return;
    }
    if (relationRows.some((row) => !row.removed && !row.label.trim())) {
      setErrorMessage('Toda relação precisa de um rótulo.');
      return;
    }

    const values = { label: label.trim() };
    if (isNode) values.description = description.trim();
    if (hasTechnology) values.technology = technology.trim();
    if (isNode && relations) onSave(values, relationChanges(relationRows, relations));
    else onSave(values);
  }

  return (
    <Modal title={isNode ? 'Editar elemento' : 'Editar conexão'} onClose={onClose} closable>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-1">
        {isNode && <p className="mb-4 text-sm text-text-muted">{element.name}</p>}
        {isNode && levelInfo && <LevelInfo levelInfo={levelInfo} onDetail={onDetail} />}

        <FormInput
          id="element-label"
          label={isNode ? 'Título' : 'Rótulo'}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={TITLE_MAX_LENGTH}
          inputRef={labelInputRef}
          className="mb-4"
        />
        {isNode && (
          <FormInput
            id="element-description"
            label="Descrição"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={DESCRIPTION_MAX_LENGTH}
            multiline
            required={false}
            className="mb-4"
          />
        )}
        {hasTechnology && (
          <FormInput
            id="element-technology"
            label="Tecnologia"
            value={technology}
            onChange={(e) => setTechnology(e.target.value)}
            maxLength={TECHNOLOGY_MAX_LENGTH}
            required={false}
            className="mb-4"
          />
        )}
        {isNode && relations && <Relations rows={relationRows} onChange={setRelationRows} />}

        {errorMessage && (
          <p role="alert" className="mb-2 text-sm text-danger">
            {errorMessage}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between gap-3">
          <Button variant="danger-outline" icon={Trash2} onClick={onDelete}>
            Excluir
          </Button>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default ElementFormModal;
