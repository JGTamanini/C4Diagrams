import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ValidationPanel from './ValidationPanel';

const issues = [
  { code: 'DUPLICATE_RELATIONSHIP', severity: 'error', edgeId: 'e2', message: 'Já existe uma relação entre "A" e "B".' },
  { code: 'CONTEXT_WITHOUT_PERSON', severity: 'warning', message: 'O diagrama de Contexto não mostra quem usa o sistema.' },
  { code: 'ISOLATED_ELEMENT', severity: 'warning', nodeId: 'n3', message: '"E-mail" não tem nenhuma relação.' },
  { code: 'MISSING_DESCRIPTION', severity: 'info', nodeId: 'n1', message: '"Cliente" não tem descrição.' },
  { code: 'MISSING_DESCRIPTION', severity: 'info', nodeId: 'n2', message: '"Loja" não tem descrição.' },
];

function renderPanel(props = {}) {
  const handlers = { onToggle: vi.fn(), onSelectIssue: vi.fn() };
  render(<ValidationPanel open status="ready" issues={issues} {...handlers} {...props} />);
  return handlers;
}

describe('ValidationPanel', () => {
  it('deve mostrar o assistente com a aba Validação ativa e Sugestões (IA) ainda em breve', () => {
    renderPanel();

    expect(screen.getByRole('complementary', { name: 'Assistente' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Validação' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Sugestões/ })).toBeDisabled();
  });

  it('deve receber cliques mesmo dentro de um contêiner que deixa passar os cliques para o canvas', () => {
    renderPanel();

    expect(screen.getByRole('complementary', { name: 'Assistente' })).toHaveClass('pointer-events-auto');
  });

  it('deve agrupar por importância, com a contagem de cada grupo', () => {
    renderPanel();

    const errors = screen.getByRole('region', { name: 'Erros (1)' });
    const warnings = screen.getByRole('region', { name: 'Avisos (2)' });
    expect(within(errors).getByText('Já existe uma relação entre "A" e "B".')).toBeInTheDocument();
    expect(within(warnings).getAllByRole('listitem')).toHaveLength(2);
  });

  it('deve deixar as sugestões recolhidas por padrão, para não esconderem os avisos', async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(screen.queryByText('"Cliente" não tem descrição.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mostrar 2 sugestões' }));

    expect(screen.getByText('"Cliente" não tem descrição.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ocultar sugestões' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('deve levar ao elemento ou à relação do problema ao clicar nele', async () => {
    const user = userEvent.setup();
    const { onSelectIssue } = renderPanel();

    await user.click(screen.getByRole('button', { name: '"E-mail" não tem nenhuma relação.' }));
    await user.click(screen.getByRole('button', { name: 'Já existe uma relação entre "A" e "B".' }));

    expect(onSelectIssue).toHaveBeenNthCalledWith(1, issues[2]);
    expect(onSelectIssue).toHaveBeenNthCalledWith(2, issues[0]);
  });

  it('não deve oferecer clique em problema que é do diagrama inteiro (sem elemento)', () => {
    renderPanel();

    expect(screen.queryByRole('button', { name: 'O diagrama de Contexto não mostra quem usa o sistema.' })).not.toBeInTheDocument();
    expect(screen.getByText('O diagrama de Contexto não mostra quem usa o sistema.')).toBeInTheDocument();
  });

  it.each([
    ['ready', [], 'Nenhum problema encontrado neste nível.'],
    ['validating', [], 'Validando…'],
    ['error', [], 'Não foi possível validar agora. Tentaremos de novo na próxima mudança.'],
  ])('deve mostrar o estado %s', (status, list, text) => {
    renderPanel({ status, issues: list });

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('deve manter a última lista visível quando a validação mais recente falhar', () => {
    renderPanel({ status: 'error' });

    expect(screen.getByText('Não foi possível validar agora. Tentaremos de novo na próxima mudança.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Erros (1)' })).toBeInTheDocument();
  });

  it('deve ocultar pelo botão do painel', async () => {
    const user = userEvent.setup();
    const { onToggle } = renderPanel();

    await user.click(screen.getByRole('button', { name: 'Ocultar assistente' }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  describe('oculto', () => {
    it('deve virar um botão discreto com a contagem de erros e avisos', async () => {
      const user = userEvent.setup();
      const { onToggle } = renderPanel({ open: false });

      expect(screen.queryByRole('complementary', { name: 'Assistente' })).not.toBeInTheDocument();
      const button = screen.getByRole('button', { name: 'Mostrar assistente (1 erro, 2 avisos)' });
      await user.click(button);

      expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('não deve mostrar contagem quando não houver erros nem avisos (sugestões não contam)', () => {
      renderPanel({ open: false, issues: issues.filter((issue) => issue.severity === 'info') });

      expect(screen.getByRole('button', { name: 'Mostrar assistente' })).toBeInTheDocument();
    });
  });
});
