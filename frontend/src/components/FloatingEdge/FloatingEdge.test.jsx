import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import FloatingEdge from './FloatingEdge';

describe('FloatingEdge', () => {
  it('não deve desenhar nada enquanto os elementos ligados não existirem no canvas', () => {
    const { container } = render(
      <ReactFlowProvider>
        <svg>
          <FloatingEdge id="e1" source="ausente" target="tambem-ausente" label="Usa" data={{ offset: 0 }} />
        </svg>
      </ReactFlowProvider>
    );

    expect(container.querySelector('path')).toBeNull();
  });
});
