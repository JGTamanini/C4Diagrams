import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Brand from '../../components/Brand/Brand';
import FormInput from '../../components/FormInput/FormInput';
import Button from '../../components/Button/Button';
import EmailConfirmationCard from '../../components/EmailConfirmationCard/EmailConfirmationCard';
import ResendVerification from '../../components/ResendVerification/ResendVerification';
import AuthItem from '../../components/AuthLayout/AuthItem';
import { useAuthIllustration } from '../../components/AuthLayout/authIllustration';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useAuthIllustration(successMessage ? 'emailSent' : 'register');

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setSubmitting(true);

    try {
      await api.post('/auth/register', { name, email, password });
      setSuccessMessage('Cadastro realizado! Verifique seu e-mail para confirmar a conta.');
    } catch (err) {
      const message = err.response?.data?.message || 'Erro ao cadastrar. Tente novamente.';
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (successMessage) {
    return (
      <AuthItem>
        <EmailConfirmationCard message={successMessage} />
        <ResendVerification email={email} />
      </AuthItem>
    );
  }

  return (
    <>
      <AuthItem>
        <Brand className="mb-8" />
        <h1 className="mb-2 text-2xl font-semibold text-text-primary">Criar conta</h1>
        <p className="mb-6 text-sm text-text-secondary">Comece a modelar em poucos minutos.</p>
      </AuthItem>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <AuthItem className="flex flex-col">
          <FormInput id="name" label="Nome" value={name} onChange={(e) => setName(e.target.value)} className="mb-3" />
        </AuthItem>
        <AuthItem className="flex flex-col">
          <FormInput id="email" label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mb-3" />
        </AuthItem>
        <AuthItem className="flex flex-col">
          <FormInput id="password" label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mb-5" />
        </AuthItem>
        <AuthItem>
          <Button type="submit" loading={submitting} className="mb-5 w-full">
            Cadastrar
          </Button>
        </AuthItem>
      </form>

      {errorMessage && (
        <p role="alert" className="mb-4 text-center text-sm text-danger">
          {errorMessage}
        </p>
      )}

      <AuthItem>
        <p className="text-center text-sm text-text-secondary">
          Já tem uma conta?{' '}
          <Link to="/login" className="text-link">
            Entrar
          </Link>
        </p>
      </AuthItem>
    </>
  );
}

export default Register;
