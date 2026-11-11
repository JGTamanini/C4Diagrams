exports.shorthands = undefined;

// Nota: versão de cada nível, para a concorrência otimista do salvamento (RNF08, issue #74). A aba envia a versão
// que conhece, e o banco só grava se ela ainda for a atual; assim uma aba desatualizada não apaga o que outra salvou.
// Inteiro, e não o updated_at: o banco guarda microssegundos, e o JavaScript só tem milissegundos.
exports.up = (pgm) => {
  pgm.addColumn('diagrams', {
    version: { type: 'integer', notNull: true, default: 1 },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('diagrams', 'version');
};
