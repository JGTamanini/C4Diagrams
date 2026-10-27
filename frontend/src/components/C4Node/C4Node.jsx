import { useEffect } from 'react';
import { Handle, Position, useConnection, useUpdateNodeInternals } from '@xyflow/react';
import { C4_ELEMENTS, typeLabel } from '../../constants/c4Notation';

const BODY_SHAPE_CLASSES = {
  box: 'rounded-xl',
  person: 'rounded-[28px]',
  database: 'rounded-[50%/14%]',
};

// Anel de seleção na cor de destaque da interface (fora da notação: só indica o que está selecionado)
const SELECTED_RING = '0 0 0 2px var(--color-canvas-deep), 0 0 0 4px var(--color-accent-text), 0 12px 32px -8px rgb(47 107 255 / 0.5)';
const RESTING_SHADOW = '0 10px 24px -10px rgb(0 0 0 / 0.7)';

// Nota: desenha o elemento segundo a notação C4 oficial — nome, [tipo(: tecnologia)] e descrição, com as cores e
// formas do tipo (silhueta para pessoa, cilindro para banco de dados). Sombra, hover e anel de seleção são da
// interface e não alteram a notação.
function C4Node({ id, type, data, selected = false }) {
  const element = C4_ELEMENTS[type];
  // Enquanto outro elemento está sendo conectado, este inteiro vira alvo: basta passar o mouse sobre ele
  const isConnectionTarget = useConnection((connection) => connection.inProgress && connection.fromNode?.id !== id);
  const updateNodeInternals = useUpdateNodeInternals();

  // Ponto de conexão criado/removido dinamicamente precisa ser registrado no React Flow para receber a conexão
  useEffect(() => {
    updateNodeInternals(id);
  }, [id, isConnectionTarget, updateNodeInternals]);
  const colors = { backgroundColor: element.background, borderColor: element.border, color: element.color };

  return (
    <div
      data-testid="c4-node"
      data-shape={element.shape}
      data-selected={selected}
      className="group flex w-[200px] flex-col items-center transition-transform duration-150 hover:-translate-y-0.5"
    >
      {/* Pontos de conexão nos quatro lados (a conexão é flutuante: o lado escolhido não fica salvo) */}
      <Handle type="target" position={Position.Top} />
      <Handle type="source" id="esquerda" position={Position.Left} />
      <Handle type="source" id="direita" position={Position.Right} />
      {isConnectionTarget && (
        <Handle type="target" id="corpo" position={Position.Top} data-testid="c4-node-drop-target" className="c4-drop-target" />
      )}

      {element.shape === 'person' && (
        <span aria-hidden="true" className="-mb-3 block h-12 w-12 rounded-full border-2" style={colors} />
      )}

      <div
        data-testid="c4-node-body"
        className={`relative w-full border-2 px-3 py-4 text-center wrap-break-word transition-[box-shadow,filter] duration-150 group-hover:brightness-110 ${BODY_SHAPE_CLASSES[element.shape]}`}
        style={{ ...colors, boxShadow: selected ? SELECTED_RING : RESTING_SHADOW }}
      >
        {element.shape === 'database' && (
          <span aria-hidden="true" className="absolute inset-x-0 top-0 block h-5 rounded-[50%] border-b-2" style={{ borderColor: element.border }} />
        )}
        <strong className="block text-sm font-semibold">{data.label}</strong>
        <span className="block text-[11px] opacity-80">{typeLabel(type, data.technology)}</span>
        {data.description && <p className="mt-2 text-xs leading-snug opacity-95">{data.description}</p>}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default C4Node;
