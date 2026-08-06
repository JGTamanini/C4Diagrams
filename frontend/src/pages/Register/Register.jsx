import { useState } from 'react';
import api from '../../services/api';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await api.post('/auth/register', { name, email, password });
      setSuccessMessage('Cadastro realizado! Verifique seu e-mail para confirmar a conta.');
    } catch (err) {
      const message = err.response?.data?.message || 'Erro ao cadastrar. Tente novamente.';
      setErrorMessage(message);
    }
  }

  return (
    <div>
      <h1>Cadastro</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="name">Nome</label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

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

        <button type="submit">Cadastrar</button>
      </form>

      {successMessage && <p role="status">{successMessage}</p>}
      {errorMessage && <p role="alert">{errorMessage}</p>}
    </div>
  );
}

export default Register;