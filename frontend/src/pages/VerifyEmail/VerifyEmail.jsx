import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');

    async function verify() {
      try {
        const response = await api.post('/auth/verify-email', { token });
        setMessage(response.data.message);
        setStatus('success');
      } catch (err) {
        const errorMessage = err.response?.data?.message || 'Erro ao verificar e-mail.';
        setMessage(errorMessage);
        setStatus('error');
      }
    }

    verify();
  }, [searchParams]);

  return (
    <div>
      <h1>Verificação de e-mail</h1>

      {status === 'loading' && <p>Verificando...</p>}
      {status === 'success' && (
        <>
          <p role="status">{message}</p>
          <Link to="/login">Ir para o login</Link>
        </>
      )}
      {status === 'error' && <p role="alert">{message}</p>}
    </div>
  );
}

export default VerifyEmail;