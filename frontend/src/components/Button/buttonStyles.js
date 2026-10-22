// Nota: estilos compartilhados entre <Button> e links com aparência de botão (ex.: "Começar agora" na Home)

// Resposta visual em três tempos: o botão levanta e ganha sombra ao passar o mouse, "afunda" no clique e mostra o
// anel de foco no teclado
const BASE =
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-medium select-none ' +
  'transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-[var(--ease-out-soft)] ' +
  'hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] active:duration-75 ' +
  'disabled:pointer-events-none disabled:opacity-55';

const VARIANTS = {
  primary:
    'bg-accent text-accent-fg shadow-[0_1px_0_0_rgb(255_255_255/0.15)_inset] hover:bg-accent-hover ' +
    'hover:shadow-[var(--shadow-glow)] active:bg-accent-active',
  secondary:
    'border border-line bg-surface text-text-primary hover:border-accent-text/70 hover:bg-surface-raised ' +
    'hover:shadow-[var(--shadow-raised)]',
  ghost: 'text-text-secondary hover:bg-surface-raised hover:text-text-primary hover:shadow-[var(--shadow-raised)]',
  danger: 'bg-danger text-white hover:bg-danger-hover hover:shadow-[0_8px_24px_-8px_rgb(242_85_85/0.5)]',
  // Ação destrutiva discreta (ex.: "Excluir" dentro de um modal): só o texto em vermelho, fundo ao passar o mouse
  'danger-ghost': 'text-danger hover:bg-danger/10 hover:text-danger-hover',
};

const SIZES = {
  md: 'h-11 px-5 text-sm',
  sm: 'h-9 px-3.5 text-sm',
};

export function buttonClasses({ variant = 'primary', size = 'md', className = '' } = {}) {
  return `${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`.trim();
}

const ICON_BUTTON_BASE =
  'inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-control)] text-text-secondary select-none ' +
  'transition-[background-color,color,transform] duration-150 ease-[var(--ease-out-soft)] ' +
  'hover:-translate-y-px active:translate-y-0 active:scale-90 disabled:pointer-events-none disabled:opacity-55';

const ICON_BUTTON_TONES = {
  neutral: 'hover:bg-surface-raised hover:text-text-primary',
  danger: 'hover:bg-danger/10 hover:text-danger',
};

export function iconButtonClasses({ tone = 'neutral', className = '' } = {}) {
  return `${ICON_BUTTON_BASE} ${ICON_BUTTON_TONES[tone]} ${className}`.trim();
}
