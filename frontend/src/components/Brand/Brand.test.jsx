import { render, screen } from '@testing-library/react';
import Brand from './Brand';

describe('Brand', () => {
  it('deve mostrar o nome com o ícone decorativo (ignorado por leitores de tela)', () => {
    const { container } = render(<Brand />);

    expect(screen.getByText('C4//diagrams')).toBeInTheDocument();
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
