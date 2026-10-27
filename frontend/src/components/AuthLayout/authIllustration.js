import { createContext, useContext, useEffect } from 'react';

// Nota: a tela de entrada escolhe a ilustração da direita; fora do AuthLayout (ex.: testes da tela) não faz nada
export const AuthIllustrationContext = createContext(null);

export function useAuthIllustration(name) {
  const setIllustration = useContext(AuthIllustrationContext);

  useEffect(() => {
    setIllustration?.(name);
  }, [setIllustration, name]);
}
