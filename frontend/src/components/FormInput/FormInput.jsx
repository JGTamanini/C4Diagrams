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
  const fieldClassName = `rounded-md border border-line bg-canvas-deep px-3 text-text-primary outline-none focus:border-accent ${className}`;

  return (
    <>
      <label htmlFor={id} className="mb-1 text-sm text-text-secondary">
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
