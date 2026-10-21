import { LoaderCircle } from 'lucide-react';
import { buttonClasses } from './buttonStyles';

// Nota: botão único da interface — variantes primary/secondary/ghost/danger, com resposta visual em hover,
// clique (leve "afundar") e foco por teclado. type="button" por padrão: submit só quando pedido.
function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  icon: Icon,
  loading = false,
  disabled = false,
  className = '',
  onClick,
  buttonRef,
}) {
  return (
    <button
      ref={buttonRef}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, className })}
    >
      {loading ? (
        <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
      ) : (
        Icon && <Icon aria-hidden="true" className="h-4 w-4" />
      )}
      {children}
    </button>
  );
}

export default Button;
