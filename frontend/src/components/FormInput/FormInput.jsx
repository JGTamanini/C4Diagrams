function FormInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  className = '',
  multiline = false,
  required = true,
  maxLength,
  inputRef,
}) {
  // Nota: o anel de foco substitui o contorno padrão; a borda reage ao mouse e ao foco com transição suave
  const fieldClassName =
    'rounded-[var(--radius-control)] border border-line bg-canvas-deep px-3 text-text-primary outline-none ' +
    'transition-[border-color,box-shadow,background-color] duration-150 ease-[var(--ease-out-soft)] ' +
    'placeholder:text-text-muted hover:border-text-secondary/70 hover:bg-canvas focus:border-accent focus:bg-canvas ' +
    `focus:shadow-[0_0_0_3px_rgb(61_111_214/0.3)] focus-visible:outline-none ${className}`;

  return (
    <>
      <label htmlFor={id} className="mb-1.5 text-sm font-medium text-text-secondary">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={onChange}
          required={required}
          maxLength={maxLength}
          rows={4}
          className={`resize-none py-2 ${fieldClassName}`}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          maxLength={maxLength}
          ref={inputRef}
          className={`h-11 ${fieldClassName}`}
        />
      )}
    </>
  );
}

export default FormInput;
