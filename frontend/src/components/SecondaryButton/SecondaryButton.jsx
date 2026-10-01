function SecondaryButton({ children, className = '', onClick, autoFocus = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      autoFocus={autoFocus}
      className={`${className} rounded-md border border-line px-4 py-3 text-sm font-medium text-text-primary hover:bg-surface`}
    >
      {children}
    </button>
  );
}

export default SecondaryButton;
