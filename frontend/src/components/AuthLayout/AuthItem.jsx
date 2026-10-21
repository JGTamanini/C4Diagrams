import { motion } from 'motion/react';

const ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
};

// Nota: bloco que "chega" em sequência quando a tela de entrada abre (o AuthLayout coordena o escalonamento)
function AuthItem({ children, className = '' }) {
  return (
    <motion.div variants={ITEM_VARIANTS} className={className}>
      {children}
    </motion.div>
  );
}

export default AuthItem;
