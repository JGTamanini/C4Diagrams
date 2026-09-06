import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';

function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');

    const token = searchParams.get('token');

    try {
      await api.post('/auth/reset-password', { token, newPassword });
      navigate('/login');
    } catch (err) {
      const message = err.response?.data?.message || 'Erro ao redefinir senha. Tente novamente.';
      setErrorMessage(message);
    }
  }

  return (
    <div>
      <h1>Redefinir senha</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="newPassword">Nova senha</label>
        <input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />

        <button type="submit">Redefinir</button>
      </form>

      {errorMessage && <p role="alert">{errorMessage}</p>}
    </div>
  );
}

export default ResetPassword;