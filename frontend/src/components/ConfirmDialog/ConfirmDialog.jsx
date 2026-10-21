import { useEffect, useRef, useState } from 'react';
import Modal from '../Modal/Modal';
import Button from '../Button/Button';

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
        <Button variant="secondary" onClick={onCancel} buttonRef={cancelButtonRef}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={handleConfirm} loading={confirming}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
