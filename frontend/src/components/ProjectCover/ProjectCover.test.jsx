import { render } from '@testing-library/react';
import ProjectCover from './ProjectCover';
import { coverVariant, COVER_VARIANTS } from './projectCovers';

describe('ProjectCover', () => {
  it('deve ser decorativa (ignorada por leitores de tela)', () => {
    const { container } = render(<ProjectCover seed="p1" />);

    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('deve escolher a mesma composição para o mesmo projeto e variar entre projetos', () => {
    expect(coverVariant('p1')).toBe(coverVariant('p1'));
    const variants = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map(coverVariant));
    expect(variants.size).toBe(COVER_VARIANTS);
  });

  it('deve desenhar elementos com as cores oficiais do C4', () => {
    const { container } = render(<ProjectCover seed="p1" />);

    const fills = [...container.querySelectorAll('[data-c4-type]')].map((shape) => shape.getAttribute('fill'));
    expect(fills.length).toBeGreaterThan(0);
    expect(fills.every((fill) => /^#[0-9A-F]{6}$/i.test(fill))).toBe(true);
  });
});
