import { useEffect, useRef, useState } from 'react';
import Modal from '../Modal/Modal';
import SecondaryButton from '../SecondaryButton/SecondaryButton';

// Nota: foco inicial em Cancelar — em ação destrutiva, Enter por engano não confirma
function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }) {
  const [confirming, setConfirming] = useState(false);
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  async function handleConfirm() {
    setConfirming(true);
    try {
      await onConfirm();
    } catch {
      setConfirming(false);
    }
  }

  return (
    <Modal title={title} role="alertdialog" onClose={onCancel}>
      <p className="mb-6 text-sm text-text-secondary">{message}</p>

      <div className="flex justify-end gap-3">
        <SecondaryButton onClick={onCancel} buttonRef={cancelButtonRef}>
          Cancelar
        </SecondaryButton>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirming}
          className="rounded-md bg-danger px-6 py-3 text-sm font-medium text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
