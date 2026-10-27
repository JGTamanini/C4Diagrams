import { useState } from 'react';
import { useLocation, useOutlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import DiagramIllustration from '../DiagramIllustration/DiagramIllustration';
import { AuthIllustrationContext } from './authIllustration';
import { AUTH_ILLUSTRATIONS } from '../../constants/authIllustrations';

const EASE_OUT_SOFT = [0.22, 1, 0.36, 1];

// Conteúdo da tela: entra deslizando e coordena a chegada escalonada dos AuthItem; sai para o lado oposto
const CONTENT_VARIANTS = {
  hidden: { opacity: 0, x: 16 },
  show: { opacity: 1, x: 0, transition: { duration: 0.28, ease: EASE_OUT_SOFT, staggerChildren: 0.05, delayChildren: 0.04 } },
  exit: { opacity: 0, x: -16, transition: { duration: 0.16 } },
};

// Nota: layout comum das telas de entrada (login, cadastro, recuperação de senha). O card permanece entre as telas e
// só o conteúdo troca — a altura se ajusta animada. useOutlet "congela" o conteúdo de cada rota, para a animação de
// saída mostrar a tela antiga, e não a nova.
function AuthLayout() {
  const location = useLocation();
  const outlet = useOutlet();
  const [illustration, setIllustration] = useState('login');

  return (
    <AuthIllustrationContext.Provider value={setIllustration}>
      <div className="grid min-h-screen grid-cols-1 bg-canvas font-sans md:grid-cols-2">
        <div className="flex items-center justify-center px-6 py-16 md:px-16">
          <motion.div
            data-testid="auth-card"
            layout
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT_SOFT, layout: { duration: 0.3, ease: EASE_OUT_SOFT } }}
            className="w-full max-w-md overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface/90 p-8 shadow-[var(--shadow-card)] backdrop-blur-sm sm:p-10"
          >
            <AnimatePresence mode="wait" initial={true}>
              <motion.div key={location.pathname} variants={CONTENT_VARIANTS} initial="hidden" animate="show" exit="exit">
                {outlet}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={illustration}
            data-testid="auth-illustration"
            data-illustration={illustration}
            className="hidden h-full md:block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <DiagramIllustration {...AUTH_ILLUSTRATIONS[illustration]} />
          </motion.div>
        </AnimatePresence>
      </div>
    </AuthIllustrationContext.Provider>
  );
}

export default AuthLayout;
