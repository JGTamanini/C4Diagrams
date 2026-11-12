import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Link2, RefreshCw } from 'lucide-react';
import Modal from '../Modal/Modal';
import Button from '../Button/Button';
import { createShareLink, getShareLink, revokeShareLink, shareUrl } from '../../services/share';

const COPIED_FEEDBACK_MS = 2000;

// Trocar e revogar derrubam o link de quem já o recebeu: pedem confirmação, como excluir a conta
const CONFIRMATIONS = {
  regenerate: {
    label: 'Confirmar a troca do link',
    message: 'Quem já recebeu o link atual não vai conseguir mais abrir o diagrama. Gerar um link novo?',
    confirmLabel: 'Sim, gerar novo link',
  },
  revoke: {
    label: 'Confirmar a revogação do link',
    message: 'Quem já recebeu o link não vai conseguir mais abrir o diagrama. Revogar o link?',
    confirmLabel: 'Sim, revogar',
  },
};

function errorMessage(err) {
  return err?.response?.data?.message ?? 'Não foi possível concluir. Tente de novo.';
}

// Nota: link de visualização do projeto (só leitura). Qualquer pessoa logada com o link vê o diagrama, sempre a versão
// salva mais recente, com a data da última alteração; ninguém além do dono edita. O dono cria, copia, troca o link
// (o anterior para de funcionar) ou revoga.
function ShareModal({ projectId, onClose }) {
  const [token, setToken] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    let active = true;
    getShareLink(projectId)
      .then((share) => active && setToken(share.token))
      .catch((err) => active && setError(errorMessage(err)));
    return () => {
      active = false;
    };
  }, [projectId]);

  // Foco em Cancelar: Enter por engano não derruba o link
  useEffect(() => {
    if (confirming) cancelButtonRef.current?.focus();
  }, [confirming]);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  async function run(action) {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const create = () => run(async () => setToken((await createShareLink(projectId)).token));
  const revoke = () => run(async () => {
    await revokeShareLink(projectId);
    setToken(null);
  });
  const confirmed = () => {
    const action = confirming === 'revoke' ? revoke : create;
    setConfirming(null);
    return action();
  };
  const copy = () => run(async () => {
    await navigator.clipboard.writeText(shareUrl(token));
    setCopied(true);
  });

  return (
    <Modal title="Compartilhar para visualização" onClose={onClose} closable busy={busy}>
      <p className="mb-4 text-sm leading-relaxed text-text-secondary">
        Qualquer pessoa logada com o link vê o diagrama, com zoom e os três níveis, mas sem poder editar. Ela vê sempre a versão
        salva mais recente, com a data da última alteração.
      </p>

      {token === undefined && !error && <p className="text-sm text-text-muted">Carregando…</p>}

      {token === null && (
        <Button icon={Link2} onClick={create} loading={busy}>
          Criar link
        </Button>
      )}

      {token && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              aria-label="Link de visualização"
              readOnly
              value={shareUrl(token)}
              onFocus={(event) => event.target.select()}
              className="min-w-0 flex-1 rounded-[var(--radius-control)] border border-line bg-canvas px-3 py-2 font-mono text-xs text-text-primary outline-none focus:border-accent-text"
            />
            <Button size="sm" icon={copied ? Check : Copy} onClick={copy} disabled={busy}>
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          {confirming ? (
            <div
              role="group"
              aria-label={CONFIRMATIONS[confirming].label}
              className="flex flex-col gap-3 rounded-[var(--radius-control)] border border-danger/40 bg-danger/5 p-3"
            >
              <p className="text-sm text-text-secondary">{CONFIRMATIONS[confirming].message}</p>
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setConfirming(null)} buttonRef={cancelButtonRef}>
                  Cancelar
                </Button>
                <Button size="sm" variant="danger" onClick={confirmed}>
                  {CONFIRMATIONS[confirming].confirmLabel}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
              <p className="text-xs text-text-muted">Ao gerar um novo link, o link anterior para de funcionar.</p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" icon={RefreshCw} onClick={() => setConfirming('regenerate')} disabled={busy}>
                  Gerar novo link
                </Button>
                <Button size="sm" variant="danger-outline" onClick={() => setConfirming('revoke')} disabled={busy}>
                  Revogar link
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </Modal>
  );
}

export default ShareModal;
