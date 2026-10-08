import { Handle, Position } from '@xyflow/react';
import { C4_ELEMENTS, typeLabel } from '../../constants/c4Notation';

const BODY_SHAPE_CLASSES = {
  box: 'rounded-md',
  person: 'rounded-3xl',
  database: 'rounded-[50%/14%]',
};

// Nota: desenha o elemento segundo a notação C4 oficial — nome, [tipo(: tecnologia)] e descrição,
// com as cores e formas do tipo (silhueta para pessoa, cilindro para banco de dados)
function C4Node({ type, data }) {
  const element = C4_ELEMENTS[type];
  const colors = { backgroundColor: element.background, borderColor: element.border, color: element.color };

  return (
    <div data-testid="c4-node" data-shape={element.shape} className="flex w-[200px] flex-col items-center">
      <Handle type="target" position={Position.Top} />

      {element.shape === 'person' && (
        <span aria-hidden="true" className="-mb-3 block h-12 w-12 rounded-full border-2" style={colors} />
      )}

      <div
        data-testid="c4-node-body"
        className={`relative w-full border-2 px-3 py-4 text-center ${BODY_SHAPE_CLASSES[element.shape]}`}
        style={colors}
      >
        {element.shape === 'database' && (
          <span aria-hidden="true" className="absolute inset-x-0 top-0 block h-5 rounded-[50%] border-b-2" style={{ borderColor: element.border }} />
        )}
        <strong className="block text-sm">{data.label}</strong>
        <span className="block text-[11px] opacity-80">{typeLabel(type, data.technology)}</span>
        {data.description && <p className="mt-2 text-xs leading-snug">{data.description}</p>}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default C4Node;
