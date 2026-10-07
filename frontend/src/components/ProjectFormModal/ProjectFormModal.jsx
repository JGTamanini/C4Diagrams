import { useEffect, useRef, useState } from 'react';
import Modal from '../Modal/Modal';
import FormInput from '../FormInput/FormInput';
import PrimaryButton from '../PrimaryButton/PrimaryButton';
import SecondaryButton from '../SecondaryButton/SecondaryButton';

const NAME_MAX_LENGTH = 255;

// Nota: o mesmo modal atende criação (wireframe 6) e edição (RF05), conforme nota do RFC §4.2.4
function ProjectFormModal({ mode = 'create', initialValues, onSubmit, onClose }) {
  const isEdit = mode === 'edit';
  const [name, setName] = useState(initialValues?.name ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const nameInputRef = useRef(null);

  // Nota: leva o foco ao primeiro campo ao abrir o diálogo (sem o atributo autoFocus)
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');

    if (!name.trim()) {
      setErrorMessage('O nome do projeto é obrigatório.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ name, description });
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Não foi possível salvar o projeto. Tente novamente.');
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? 'Editar Projeto' : 'Novo Projeto'} onClose={onClose} closable>
      <form onSubmit={handleSubmit} className="flex flex-col gap-1">
        <FormInput
          id="project-name"
          label="Nome do Projeto"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX_LENGTH}
          inputRef={nameInputRef}
          className="mb-4"
        />
        <FormInput
          id="project-description"
          label="Descrição"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          required={false}
          className="mb-4"
        />

        {errorMessage && (
          <p role="alert" className="mb-2 text-sm text-danger">
            {errorMessage}
          </p>
        )}

        <div className="mt-2 flex justify-end gap-3">
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton className="px-6" disabled={submitting}>
            {isEdit ? 'Salvar' : 'Criar'}
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  );
}

export default ProjectFormModal;
