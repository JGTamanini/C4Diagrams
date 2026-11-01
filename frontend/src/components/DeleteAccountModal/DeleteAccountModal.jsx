import { useState } from 'react';
import Modal from '../Modal/Modal';
import FormInput from '../FormInput/FormInput';
import Button from '../Button/Button';
import { deleteAccount } from '../../services/users';

// Nota: exclusão da conta (LGPD — RFC 6.4) confirmada pela senha atual. É irreversível: leva junto todos os
// projetos e diagramas (RN05), então o texto deixa isso explícito antes do botão.
function DeleteAccountModal({ onDeleted, onClose }) {
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');

    if (!password) {
      setErrorMessage('Informe sua senha para confirmar.');
      return;
    }

    setDeleting(true);
    try {
      await deleteAccount(password);
      onDeleted();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Não foi possível excluir a conta. Tente novamente.');
      setDeleting(false);
    }
  }

  return (
    <Modal title="Excluir conta" onClose={onClose} closable busy={deleting}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col">
        <p className="mb-5 text-sm text-text-secondary">
          Todos os seus projetos e diagramas serão excluídos permanentemente. Esta ação não pode ser desfeita.
        </p>

        <FormInput
          id="delete-account-password"
          label="Senha atual"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4"
        />

        {errorMessage && (
          <p role="alert" className="mb-4 text-sm text-danger">
            {errorMessage}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="danger" loading={deleting}>
            Excluir minha conta
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default DeleteAccountModal;
