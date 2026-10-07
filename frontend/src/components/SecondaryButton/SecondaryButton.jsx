function SecondaryButton({ children, className = '', onClick, buttonRef }) {
  return (
    <button
      type="button"
      onClick={onClick}
      ref={buttonRef}
      className={`${className} rounded-md border border-line px-4 py-3 text-sm font-medium text-text-primary hover:bg-surface`}
    >
      {children}
    </button>
  );
}

export default SecondaryButton;
