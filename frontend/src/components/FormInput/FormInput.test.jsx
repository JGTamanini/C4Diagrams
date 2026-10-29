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
  describe('texto salvo antes do limite atual (maior que ele)', () => {
    it('deve avisar no campo de uma linha quanto apagar, já que não dá para digitar mais', () => {
      render(<FormInput id="name" label="Nome" maxLength={5} value="Projeto" onChange={() => {}} />);

      const warning = screen.getByText('7/5 · Acima do limite: apague 2 caracteres para continuar editando.');
      expect(warning).toHaveClass('text-danger');
      expect(screen.getByLabelText('Nome')).toHaveAccessibleDescription(warning.textContent);
    });

    it('deve avisar também no campo de texto longo', () => {
      render(<FormInput id="desc" label="Descrição" multiline maxLength={5} value="Loja Online" onChange={() => {}} />);

      expect(screen.getByText('11/5 · Acima do limite: apague 6 caracteres para continuar editando.')).toHaveClass('text-danger');
    });

    it('deve usar o singular quando faltar apagar um caractere', () => {
      render(<FormInput id="name" label="Nome" maxLength={5} value="Lojas" onChange={() => {}} />);
      expect(screen.queryByText(/Acima do limite/)).not.toBeInTheDocument();

      render(<FormInput id="name2" label="Nome 2" maxLength={5} value="Lojas!" onChange={() => {}} />);
      expect(screen.getByText('6/5 · Acima do limite: apague 1 caractere para continuar editando.')).toBeInTheDocument();
    });
  });

  it('não deve mostrar contador no campo de uma linha dentro do limite', () => {
    render(<FormInput id="name" label="Nome" maxLength={80} value="Loja" onChange={() => {}} className="mb-4" />);

    expect(screen.getByLabelText('Nome')).not.toHaveAttribute('aria-describedby');
    expect(screen.getByLabelText('Nome')).toHaveClass('mb-4');
    expect(screen.queryByText('4/80')).not.toBeInTheDocument();
  });

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
