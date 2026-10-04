function PrimaryButton({ children, className = 'mb-6', type = 'submit', disabled = false, onClick }) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${className} rounded-md bg-accent py-3 text-sm font-medium text-accent-fg disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {children}
    </button>
  );
}

export default PrimaryButton;
