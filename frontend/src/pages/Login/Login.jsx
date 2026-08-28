import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');

    try {
      const response = await api.post('/auth/login', { email, password });
      const { token } = response.data;

      if (typeof token !== 'string' || token.length === 0) {
        throw new Error('Token inválido recebido do servidor.');
      }

      localStorage.setItem('token', token);
      navigate('/canvas-test');
    } catch (err) {
      const message = err.response?.data?.message || 'Erro ao entrar. Tente novamente.';
      setErrorMessage(message);
    }
  }

  return (
    <div>
      <h1>Login</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">E-mail</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="password">Senha</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Entrar</button>
      </form>

      {errorMessage && <p role="alert">{errorMessage}</p>}

      <Link to="/cadastro">Não tem conta? Cadastre-se</Link>
    </div>
  );
}

export default Login;