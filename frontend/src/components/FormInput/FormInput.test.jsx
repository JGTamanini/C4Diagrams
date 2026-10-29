import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FormInput from './FormInput';

function PasswordField() {
  const [value, setValue] = useState('');
  return <FormInput id="password" label="Senha" type="password" value={value} onChange={(e) => setValue(e.target.value)} />;
}

function DescriptionField() {
  const [value, setValue] = useState('');
  return <FormInput id="desc" label="Descrição" multiline maxLength={240} value={value} onChange={(e) => setValue(e.target.value)} />;
}

describe('FormInput', () => {
  it('não deve mostrar contador no campo de texto longo sem limite', () => {
    render(<FormInput id="notes" label="Notas" multiline value="Loja" onChange={() => {}} className="mb-4" />);

    const field = screen.getByLabelText('Notas');
    expect(field).not.toHaveAttribute('aria-describedby');
    expect(field).toHaveClass('mb-4');
    expect(screen.queryByText(/\/\d+$/)).not.toBeInTheDocument();
  });

  it('deve mostrar quantos caracteres faltam no campo de texto longo com limite', async () => {
    const user = userEvent.setup();
    render(<DescriptionField />);
    expect(screen.getByText('0/240')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Descrição'), 'Loja');

    expect(screen.getByText('4/240')).toBeInTheDocument();
    expect(screen.getByLabelText('Descrição')).toHaveAccessibleDescription('4/240');
  });

  it('deve associar o rótulo ao campo', () => {
    render(<FormInput id="name" label="Nome" value="" onChange={() => {}} />);

    expect(screen.getByLabelText('Nome')).toHaveAttribute('id', 'name');
  });

  describe('campo de senha', () => {
    it('deve começar oculto e mostrar a senha digitada ao clicar no olho', async () => {
      const user = userEvent.setup();
      render(<PasswordField />);
      const field = screen.getByLabelText('Senha');
      await user.type(field, 'Segredo@1');

      expect(field).toHaveAttribute('type', 'password');
      const toggle = screen.getByRole('button', { name: 'Mostrar senha' });
      expect(toggle).toHaveAttribute('aria-pressed', 'false');

      await user.click(toggle);

      expect(field).toHaveAttribute('type', 'text');
      expect(field).toHaveValue('Segredo@1');
      expect(screen.getByRole('button', { name: 'Ocultar senha' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('deve voltar a ocultar e manter o foco no campo, para continuar digitando', async () => {
      const user = userEvent.setup();
      render(<PasswordField />);

      await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));
      await user.click(screen.getByRole('button', { name: 'Ocultar senha' }));

      expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password');
      expect(screen.getByLabelText('Senha')).toHaveFocus();
    });

    it('deve repassar a ref do campo (foco inicial programático)', () => {
      const ref = { current: null };
      render(<FormInput id="password" label="Senha" type="password" value="" onChange={() => {}} inputRef={ref} />);

      expect(ref.current).toBe(screen.getByLabelText('Senha'));
    });

    it('não deve enviar o formulário ao clicar no olho', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn((event) => event.preventDefault());
      render(
        <form onSubmit={onSubmit}>
          <PasswordField />
        </form>
      );

      await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it('não deve ter o botão de olho em campos que não são de senha', () => {
    render(<FormInput id="email" label="E-mail" type="email" value="" onChange={() => {}} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
