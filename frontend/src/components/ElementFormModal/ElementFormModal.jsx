import { useEffect, useRef, useState } from 'react';
import Modal from '../Modal/Modal';
import FormInput from '../FormInput/FormInput';
import PrimaryButton from '../PrimaryButton/PrimaryButton';
import SecondaryButton from '../SecondaryButton/SecondaryButton';
import {
  C4_ELEMENTS,
  DESCRIPTION_MAX_LENGTH,
  TECHNOLOGY_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from '../../constants/c4Notation';

// Nota: RF22 em versão mínima (wireframe 8) — o mesmo modal edita elemento (título, descrição e, para
// container/componente, tecnologia) e conexão (rótulo e tecnologia). "Relacionamentos" chega na Fase 5.
function ElementFormModal({ target, onSave, onDelete, onClose }) {
  const isNode = target.kind === 'node';
  const element = isNode ? C4_ELEMENTS[target.type] : null;
  const hasTechnology = !isNode || Boolean(element.hasTechnology);

  const [label, setLabel] = useState(isNode ? target.data.label : target.label);
  const [description, setDescription] = useState(target.data.description ?? '');
  const [technology, setTechnology] = useState(target.data.technology ?? '');
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

    const values = { label: label.trim() };
    if (isNode) values.description = description.trim();
    if (hasTechnology) values.technology = technology.trim();
    onSave(values);
  }

  return (
    <Modal title={isNode ? 'Editar Elemento' : 'Editar Conexão'} onClose={onClose} closable>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-1">
        {isNode && <p className="mb-4 text-sm text-text-muted">{element.name}</p>}

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

        {errorMessage && (
          <p role="alert" className="mb-2 text-sm text-danger">
            {errorMessage}
          </p>
        )}

        <div className="mt-2 flex items-center justify-between gap-3">
          <button type="button" onClick={onDelete} className="text-sm font-medium text-danger hover:underline">
            Excluir
          </button>
          <div className="flex gap-3">
            <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
            <PrimaryButton className="px-6">Salvar</PrimaryButton>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default ElementFormModal;
