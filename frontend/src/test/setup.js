import '@testing-library/jest-dom';
import { MotionGlobalConfig } from 'motion/react';

// Animações instantâneas nos testes: o comportamento (abrir, fechar, foco) é o mesmo, sem esperar transições
MotionGlobalConfig.skipAnimations = true;
