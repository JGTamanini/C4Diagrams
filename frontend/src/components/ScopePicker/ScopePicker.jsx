// Nota: RF22 — com mais de um candidato no nível de cima (ex.: dois sistemas no Contexto), o nível pede qual deles
// ele detalha. Fica logo abaixo das abas de nível; com um candidato só, ele é o foco e a escolha não aparece.
function ScopePicker({ scope, onChange }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-16 z-20 flex justify-center">
      <label className="pointer-events-auto flex items-center gap-2 rounded-full border border-line bg-surface/90 py-1 pr-1 pl-3 text-xs text-text-secondary shadow-[var(--shadow-raised)] backdrop-blur-sm">
        Este nível detalha
        <select
          aria-label="Elemento que este nível detalha"
          value={scope.focus?.id ?? ''}
          onChange={(event) => onChange(event.target.value)}
          className="rounded-full border border-line bg-surface-raised px-2 py-1 text-xs text-text-primary"
        >
          {!scope.focus && (
            <option value="" disabled>
              Escolha…
            </option>
          )}
          {scope.candidates.map((node) => (
            <option key={node.id} value={node.id}>
              {node.data.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export default ScopePicker;
