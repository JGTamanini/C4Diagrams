function PrimaryButton({ children, className = 'mb-6' }) {
  return (
    <button type="submit" className={`${className} rounded-md bg-accent py-3 text-sm font-medium text-accent-fg`}>
      {children}
    </button>
  );
}

export default PrimaryButton;