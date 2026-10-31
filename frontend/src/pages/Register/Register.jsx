import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Brand from '../../components/Brand/Brand';
import FormInput from '../../components/FormInput/FormInput';
import Button from '../../components/Button/Button';
import EmailConfirmationCard from '../../components/EmailConfirmationCard/EmailConfirmationCard';
import ResendVerification from '../../components/ResendVerification/ResendVerification';
import AuthItem from '../../components/AuthLayout/AuthItem';
import { useAuthIllustration } from '../../components/AuthLayout/authIllustration';

function parseUser(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

const sameEmail = (a, b) => Boolean(a) && a.trim().toLowerCase() === b.trim().toLowerCase();

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  useAuthIllustration(successMessage ? 'emailSent' : 'register');
  const navigate = useNavigate();

  // Nota: enquanto espera a verificação, esta aba escuta o login feito pelo link do e-mail em outra aba do mesmo
  // navegador (o evento "storage" avisa as outras abas quando a sessão é salva) e segue sozinha para os projetos.
  // Só segue se a sessão salva for desta conta: o usuário é gravado depois do token, então é ele que é observado
  useEffect(() => {
    if (!successMessage) return undefined;

    function handleStorage(event) {
      if (event.key !== 'user' || !event.newValue) return;
      if (sameEmail(parseUser(event.newValue)?.email, email)) void navigate('/projetos', { replace: true });
    }

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [successMessage, email, navigate]);

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
