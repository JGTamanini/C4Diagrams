import '@testing-library/jest-dom';
import { MotionGlobalConfig } from 'motion/react';

// Animações instantâneas nos testes: o comportamento (abrir, fechar, foco) é o mesmo, sem esperar transições
MotionGlobalConfig.skipAnimations = true;

// O jsdom não tem IntersectionObserver (usado pelo Motion em animações "ao rolar a página"): substituto que nunca dispara
if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = class {
    observe() {
      // sem efeito: no teste o conteúdo já é renderizado visível
    }
    unobserve() {
      // sem efeito
    }
    disconnect() {
      // sem efeito
    }
  };
}
