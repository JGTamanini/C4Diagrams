// Nota: ícone com os quatro níveis do C4 (Contexto, Container, Componente, Código) nas cores oficiais da notação;
// o mesmo desenho é o favicon (public/icone.svg — nome diferente do favicon padrão do Vite, que os navegadores guardavam em cache)
function BrandMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" className="h-5 w-5 shrink-0">
      <rect x="1" y="1" width="30" height="30" rx="7" fill="#111826" stroke="#263249" />
      <rect x="5" y="5" width="10" height="10" rx="2.5" fill="#08427B" />
      <rect x="17" y="5" width="10" height="10" rx="2.5" fill="#1168BD" />
      <rect x="5" y="17" width="10" height="10" rx="2.5" fill="#438DD5" />
      <rect x="17" y="17" width="10" height="10" rx="2.5" fill="#85BBF0" />
    </svg>
  );
}

function Brand({ className = 'mb-10' }) {
  return (
    <span className={`${className} flex w-fit items-center gap-2 font-mono text-sm font-medium text-text-primary select-none`}>
      <BrandMark />
      C4//diagrams
    </span>
  );
}

export default Brand;
