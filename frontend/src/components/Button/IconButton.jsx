import { iconButtonClasses } from './buttonStyles';

// Nota: botão só com ícone — o rótulo é obrigatório: vira o nome acessível e a dica ao passar o mouse
function IconButton({ icon: Icon, label, onClick, tone = 'neutral', className = '', disabled = false }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={iconButtonClasses({ tone, className })}
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
    </button>
  );
}

export default IconButton;
