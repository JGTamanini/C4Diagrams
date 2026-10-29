import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { Plus } from 'lucide-react';
import Button from './Button';
import IconButton from './IconButton';
import { buttonClasses } from './buttonStyles';

describe('Button', () => {
  it('deve ser do tipo "button" por padrão, para não enviar formulários por engano', () => {
    render(<Button>Cancelar</Button>);

    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveAttribute('type', 'button');
  });

  it('deve aceitar type="submit" para formulários', () => {
    render(<Button type="submit">Entrar</Button>);

    expect(screen.getByRole('button', { name: 'Entrar' })).toHaveAttribute('type', 'submit');
  });

  it('deve chamar onClick e não responder quando desabilitado', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Salvar</Button>);

    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    rerender(<Button onClick={onClick} disabled>Salvar</Button>);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('deve indicar carregamento: desabilitado, ocupado e mantendo o nome acessível', () => {
    render(<Button loading>Criar</Button>);

    const button = screen.getByRole('button', { name: 'Criar' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('deve exibir o ícone como decoração, sem alterar o nome acessível', () => {
    render(<Button icon={Plus}>Novo projeto</Button>);

    const button = screen.getByRole('button', { name: 'Novo projeto' });
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('deve repassar a ref (foco inicial em diálogos)', () => {
    const ref = { current: null };
    render(<Button buttonRef={ref}>Cancelar</Button>);

    expect(ref.current).toBe(screen.getByRole('button', { name: 'Cancelar' }));
  });
});

describe('IconButton', () => {
  it('deve usar o rótulo como nome acessível e como dica ao passar o mouse', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<IconButton icon={Plus} label="Adicionar elemento" onClick={onClick} />);

    const button = screen.getByRole('button', { name: 'Adicionar elemento' });
    expect(button).toHaveAttribute('title', 'Adicionar elemento');
    expect(button).toHaveAttribute('type', 'button');
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('deve ter um tom de perigo para ações destrutivas', () => {
    render(<IconButton icon={Plus} label="Excluir" tone="danger" />);

    expect(screen.getByRole('button', { name: 'Excluir' }).className).toContain('hover:text-danger');
  });
});

describe('buttonClasses', () => {
  it('deve gerar classes diferentes por variante, para links com aparência de botão', () => {
    expect(buttonClasses({ variant: 'primary' })).not.toBe(buttonClasses({ variant: 'secondary' }));
    expect(buttonClasses({ className: 'w-full' })).toContain('w-full');
  });

  it('deve ter variante própria para ação destrutiva discreta (sem disputar classes de cor)', () => {
    expect(buttonClasses({ variant: 'danger-ghost' })).toContain('text-danger');
    expect(buttonClasses({ variant: 'danger-ghost' })).not.toContain('text-text-secondary');
  });

  it('deve ter variante destrutiva com borda, para alinhar com botões secundários ao lado', () => {
    expect(buttonClasses({ variant: 'danger-outline' })).toContain('text-danger');
    expect(buttonClasses({ variant: 'danger-outline' })).toContain('border-danger');
  });
});
