import { C4_ELEMENTS } from '../../constants/c4Notation';

// Nota: miniatura de um tipo de elemento na forma e nas cores oficiais (paleta e legenda) — pessoa com cabeça,
// banco de dados como cilindro, os demais como caixa
function ElementGlyph({ type, size = 'md' }) {
  const element = C4_ELEMENTS[type];
  const colors = { backgroundColor: element.background, borderColor: element.border };
  const small = size === 'sm';

  return (
    <span data-testid="element-glyph" data-shape={element.shape} aria-hidden="true" className="flex flex-col items-center">
      {element.shape === 'person' && (
        <span className={`block rounded-full border ${small ? '-mb-1 h-2 w-2' : '-mb-1.5 h-3.5 w-3.5'}`} style={colors} />
      )}
      <span
        className={`block border ${small ? 'h-2.5 w-4' : 'h-6 w-10'} ${
          { person: 'rounded-lg', database: 'rounded-[50%/22%]', box: 'rounded-[5px]' }[element.shape]
        }`}
        style={colors}
      />
    </span>
  );
}

export default ElementGlyph;
