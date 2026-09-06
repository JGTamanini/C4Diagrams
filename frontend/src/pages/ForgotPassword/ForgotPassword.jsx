import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setMessage(response.data.message);
    } catch (err) {
      setMessage('Ocorreu um erro. Tente novamente.');
    }
  }

  return (
    <div>
      <h1>Esqueci minha senha</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button type="submit">Enviar</button>
      </form>

      {message && <p role="status">{message}</p>}

      <Link to="/login">Voltar ao login</Link>
    </div>
  );
}

export default ForgotPassword;