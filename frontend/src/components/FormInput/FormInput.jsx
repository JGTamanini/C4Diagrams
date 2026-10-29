import { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Eye, EyeOff } from 'lucide-react';

// Nota: o anel de foco substitui o contorno padrão; a borda reage ao mouse e ao foco com transição suave
const FIELD_CLASSES =
  'rounded-[var(--radius-control)] border border-line bg-canvas-deep px-3 text-text-primary outline-none ' +
  'transition-[border-color,box-shadow,background-color] duration-150 ease-[var(--ease-out-soft)] ' +
  'placeholder:text-text-muted hover:border-text-secondary/70 hover:bg-canvas focus:border-accent focus:bg-canvas ' +
  'focus:shadow-[0_0_0_3px_rgb(61_111_214/0.3)] focus-visible:outline-none';

// "Piscada": o ícone fecha verticalmente (como uma pálpebra) e abre já no novo estado
const BLINK = {
  initial: { scaleY: 0.1, opacity: 0.4 },
  animate: { scaleY: 1, opacity: 1, transition: { duration: 0.14, ease: 'easeOut' } },
  exit: { scaleY: 0.1, opacity: 0.4, transition: { duration: 0.1, ease: 'easeIn' } },
};

// Nota: campo de senha com o "olho" no final — o usuário confere o que digitou; o foco volta ao campo
function PasswordInput({ id, value, onChange, required, maxLength, inputRef, className }) {
  const [visible, setVisible] = useState(false);
  const fieldRef = useRef(null);

  function setRefs(element) {
    fieldRef.current = element;
    if (inputRef) inputRef.current = element;
  }

  function toggleVisibility() {
    setVisible((current) => !current);
    fieldRef.current?.focus();
  }

  const Icon = visible ? EyeOff : Eye;
  const label = visible ? 'Ocultar senha' : 'Mostrar senha';

  return (
    <div className={`relative flex ${className}`}>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        required={required}
        maxLength={maxLength}
        ref={setRefs}
        className={`h-11 w-full pr-11 ${FIELD_CLASSES}`}
      />
      <button
        type="button"
        onClick={toggleVisibility}
        aria-pressed={visible}
        aria-label={label}
        title={label}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-[var(--radius-control)] text-text-muted transition-colors duration-150 hover:text-text-primary active:scale-90"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={visible ? 'aberto' : 'fechado'} {...BLINK} className="flex">
            <Icon aria-hidden="true" className="h-4 w-4" />
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  );
}

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
  // Contador: sempre no texto longo com limite; no campo de uma linha, só quando o texto já passa do limite (texto
  // salvo antes dele). Nesse caso o maxLength impede digitar, então o aviso diz quanto apagar para voltar a editar.
  const overLimit = Boolean(maxLength) && value.length > maxLength;
  const showCount = Boolean(maxLength) && (multiline || overLimit);
  const countId = `${id}-count`;

  function withCount(field) {
    if (!showCount) return field;

    const excess = value.length - maxLength;
    return (
      <div className={`flex flex-col ${className}`}>
        {field}
        <p id={countId} className={`mt-1 self-end text-right text-xs ${overLimit ? 'text-danger' : 'text-text-muted'}`}>
          {value.length}/{maxLength}
          {overLimit &&
            ` · Acima do limite: apague ${excess} ${excess === 1 ? 'caractere' : 'caracteres'} para continuar editando.`}
        </p>
      </div>
    );
  }

  // Com o contador, a margem (className) vai para o bloco campo + contador, e não só para o campo
  const fieldClassName = showCount ? '' : className;
  const describedBy = showCount ? countId : undefined;

  function renderField() {
    if (multiline) {
      return withCount(
        <textarea
          id={id}
          value={value}
          onChange={onChange}
          required={required}
          maxLength={maxLength}
          rows={4}
          aria-describedby={describedBy}
          className={`resize-none py-2 ${FIELD_CLASSES} ${fieldClassName}`}
        />
      );
    }

    if (type === 'password') {
      return (
        <PasswordInput
          id={id}
          value={value}
          onChange={onChange}
          required={required}
          maxLength={maxLength}
          inputRef={inputRef}
          className={className}
        />
      );
    }

    return withCount(
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        maxLength={maxLength}
        ref={inputRef}
        aria-describedby={describedBy}
        className={`h-11 ${FIELD_CLASSES} ${fieldClassName}`}
      />
    );
  }

  return (
    <>
      <label htmlFor={id} className="mb-1.5 text-sm font-medium text-text-secondary">
        {label}
      </label>
      {renderField()}
    </>
  );
}

export default FormInput;
