import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Login from './Login';
import api from '../../services/api';

vi.mock('../../services/api');

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderWithRouter(ui, state) {
  return render(<MemoryRouter initialEntries={[{ pathname: '/login', state }]}>{ui}</MemoryRouter>);
}

async function submitLogin(user) {
  await user.type(screen.getByLabelText(/e-mail/i), 'joao@example.com');
  await user.type(screen.getByLabelText('Senha'), 'Senha@12345');
  await user.click(screen.getByRole('button', { name: /entrar/i }));
}

describe('Login', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
  });

  it('deve exibir os campos do formulário', () => {
    renderWithRouter(<Login />);

    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('deve exibir aviso de sessão expirada quando redirecionado após 401', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { sessionExpired: true } }]}>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toHaveTextContent('Sua sessão expirou. Faça login novamente.');
  });

  it('não deve exibir aviso de sessão expirada em um acesso normal', () => {
    renderWithRouter(<Login />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('deve autenticar, salvar a sessão e redirecionar para /projetos', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({
      data: { token: 'header.payload.signature', user: { id: '1', name: 'João Tamanini', email: 'joao@example.com' } },
    });

    renderWithRouter(<Login />);

    await user.type(screen.getByLabelText(/e-mail/i), 'joao@example.com');
    await user.type(screen.getByLabelText('Senha'), 'Senha@12345');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('header.payload.signature');
    });
    expect(JSON.parse(localStorage.getItem('user'))).toEqual({ name: 'João Tamanini', email: 'joao@example.com' });
    expect(mockNavigate).toHaveBeenCalledWith('/projetos');
  });

  it('deve concluir o login mesmo se a resposta não trouxer o usuário', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { token: 'header.payload.signature' } });

    renderWithRouter(<Login />);

    await user.type(screen.getByLabelText(/e-mail/i), 'joao@example.com');
    await user.type(screen.getByLabelText('Senha'), 'Senha@12345');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/projetos'));
    expect(localStorage.getItem('token')).toBe('header.payload.signature');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // Link de visualização: quem chegou pelo link volta para ele depois de entrar
  it.each([
    ['/compartilhado/abc123', '/compartilhado/abc123'],
    ['//site-externo.com', '/projetos'],
    ['https://site-externo.com', '/projetos'],
  ])('deve voltar para de onde veio (%s), só se for um endereço do próprio site', async (from, expected) => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({ data: { token: 'header.payload.signature', user: { id: '1', name: 'J', email: 'j@x.com' } } });

    renderWithRouter(<Login />, { from });
    await submitLogin(user);

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(expected));
  });

  // Review da #80: quem chega pelo link e vai se cadastrar não pode perder a origem
  it('deve guardar de onde veio ao abrir, para o cadastro também voltar ao link', () => {
    renderWithRouter(<Login />, { from: '/compartilhado/abcDEF123_-abcDEF123_-abcDEF1234' });

    expect(JSON.parse(localStorage.getItem('returnTo')).path).toBe('/compartilhado/abcDEF123_-abcDEF123_-abcDEF1234');
  });

  it('deve oferecer reenviar o link quando o e-mail ainda não foi verificado (403)', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({
      response: { status: 403, data: { message: 'Confirme seu e-mail antes de entrar.', code: 'EMAIL_NOT_VERIFIED' } },
    });

    renderWithRouter(<Login />);
    await submitLogin(user);

    expect(await screen.findByText('Confirme seu e-mail antes de entrar.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Não recebeu? Reenviar' })).toBeInTheDocument();
  });

  it('deve exibir mensagem de erro para credenciais inválidas (401)', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({
      response: { status: 401, data: { message: 'E-mail ou senha inválidos.' } },
    });

    renderWithRouter(<Login />);

    await user.type(screen.getByLabelText(/e-mail/i), 'joao@example.com');
    await user.type(screen.getByLabelText('Senha'), 'SenhaErrada@123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText(/e-mail ou senha inválidos/i)).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('deve exibir mensagem de conta bloqueada com o tempo restante (423)', async () => {
    const user = userEvent.setup();
    api.post.mockRejectedValue({
      response: {
        status: 423,
        data: { message: 'Conta bloqueada por excesso de tentativas. Tente novamente em 5 minuto(s).', minutesRemaining: 5 },
      },
    });

    renderWithRouter(<Login />);

    await user.type(screen.getByLabelText(/e-mail/i), 'joao@example.com');
    await user.type(screen.getByLabelText('Senha'), 'Senha@12345');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText(/bloqueada.*5 minuto/i)).toBeInTheDocument();
  });

  it('deve exibir erro quando o token retornado tem formato inválido', async () => {
    const user = userEvent.setup();
    api.post.mockResolvedValue({
      data: { token: 'token-mal-formado', user: { id: '1', email: 'joao@example.com' } },
    });

    renderWithRouter(<Login />);

    await user.type(screen.getByLabelText(/e-mail/i), 'joao@example.com');
    await user.type(screen.getByLabelText('Senha'), 'Senha@12345');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByText(/token inválido/i)).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('deve indicar o carregamento enquanto entra, sem permitir envio duplo', async () => {
    const user = userEvent.setup();
    let finish;
    api.post.mockReturnValue(new Promise((resolve, reject) => { finish = reject; }));
    renderWithRouter(<Login />);

    await user.type(screen.getByLabelText(/e-mail/i), 'joao@example.com');
    await user.type(screen.getByLabelText('Senha'), 'Senha@123');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    const button = screen.getByRole('button', { name: 'Entrar' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    finish({ response: { data: { message: 'Credenciais inválidas.' } } });
    expect(await screen.findByText('Credenciais inválidas.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
  });
});
