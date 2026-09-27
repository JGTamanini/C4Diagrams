function FormInput({ id, label, type = 'text', value, onChange, className = '' }) {
  return (
    <>
      <label htmlFor={id} className="mb-1 text-sm text-text-secondary">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        required
        className={`h-11 rounded-md border border-line bg-canvas-deep px-3 text-text-primary outline-none focus:border-accent ${className}`}
      />
    </>
  );
}

export default FormInput;