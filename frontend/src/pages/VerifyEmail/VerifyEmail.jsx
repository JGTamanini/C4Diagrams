import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { saveSession } from '../../services/session';
import ResendVerification from '../../components/ResendVerification/ResendVerification';

const STATUS_CONFIG = {
  loading: { border: 'border-line', bg: 'bg-surface', icon: 'text-text-secondary' },
  success: { border: 'border-success', bg: 'bg-success/10', icon: 'text-success' },
  error: { border: 'border-danger', bg: 'bg-danger/10', icon: 'text-danger' },
};

function StatusIcon({ status }) {
  if (status === 'loading') {
    return (
      <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    );
  }
  if (status === 'success') {
    return (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  // O link vale uma vez só: um segundo envio do mesmo token (ex.: o efeito rodando duas vezes no StrictMode) receberia
  // "token inválido" e trocaria o sucesso por erro na tela
  const sentTokenRef = useRef(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (sentTokenRef.current === token) return;
    sentTokenRef.current = token;

    async function verify() {
      try {
        const response = await api.post('/auth/verify-email', { token });
        // O link também entra na conta: a sessão fica salva no navegador, e a aba do cadastro (se ainda estiver
        // aberta) percebe e segue sozinha para os projetos — esta guia pode ser fechada
        saveSession(response.data.token, response.data.user);
        setStatus('success');
      } catch (err) {
        const errorMessage = err.response?.data?.message || 'Erro ao verificar e-mail.';
        setMessage(errorMessage);
        setStatus('error');
      }
    }

    void verify();
  }, [searchParams]);

  const config = STATUS_CONFIG[status];

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center font-sans"
      style={{
        backgroundImage: 'radial-gradient(var(--color-line) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div className={`mb-5 flex h-13 w-13 items-center justify-center rounded-lg border ${config.border} ${config.bg}`}>
        <span className={config.icon}>
          <StatusIcon status={status} />
        </span>
      </div>

      {status === 'loading' && <p className="text-sm text-text-secondary">Verificando...</p>}

      {status === 'success' && (
        <>
          <output className="mb-4 max-w-xs text-sm text-text-secondary">
            E-mail verificado! Pode fechar esta guia: a aba do cadastro já entrou na sua conta.
          </output>
          {/* Link aberto em outro aparelho: não há aba de cadastro aqui, mas a sessão já está salva neste navegador */}
          <p className="text-xs text-text-muted">
            <span>Abriu o link em outro aparelho?</span>{' '}
            <Link to="/projetos" className="text-link">
              Ir para meus projetos
            </Link>
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <p role="alert" className="max-w-xs text-sm text-text-secondary">
            {message}
          </p>
          <ResendVerification />
        </>
      )}
    </div>
  );
}

export default VerifyEmail;