import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Brand from '../../components/Brand/Brand';
import FormInput from '../../components/FormInput/FormInput';
import Button from '../../components/Button/Button';
import EmailConfirmationCard from '../../components/EmailConfirmationCard/EmailConfirmationCard';
import AuthItem from '../../components/AuthLayout/AuthItem';
import { useAuthIllustration } from '../../components/AuthLayout/authIllustration';

function ForgotPassword() {
  useAuthIllustration('recovery');
  const [email, setEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setSubmitting(true);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setSuccessMessage(response.data.message);
    } catch {
      setErrorMessage('Ocorreu um erro. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  if (successMessage) {
    return (
      <AuthItem>
        <EmailConfirmationCard message={successMessage} />
      </AuthItem>
    );
  }

  return (
    <>
      <AuthItem>
        <Brand />
        <h1 className="mb-2 text-2xl font-semibold text-text-primary">Esqueci minha senha</h1>
        <p className="mb-7 max-w-sm text-sm leading-relaxed text-text-secondary">
          Digite seu e-mail e enviaremos um link para redefinir sua senha.
        </p>
      </AuthItem>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <AuthItem className="flex flex-col">
          <FormInput id="email" label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mb-6" />
        </AuthItem>
        <AuthItem>
          <Button type="submit" loading={submitting} className="mb-6 w-full">
            Enviar link de recuperação
          </Button>
        </AuthItem>
      </form>

      {errorMessage && (
        <p role="alert" className="mb-4 text-center text-sm text-danger">
          {errorMessage}
        </p>
      )}

      <AuthItem>
        <p className="text-center text-sm">
          <Link to="/login" className="text-link">
            Voltar ao login
          </Link>
        </p>
      </AuthItem>
    </>
  );
}

export default ForgotPassword;
