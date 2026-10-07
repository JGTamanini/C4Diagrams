exports.shorthands = undefined;

// Nota: registra o último envio do e-mail de verificação. Permite reenviar o MESMO token enquanto válido
// (um reenvio feito por terceiros não invalida o link já recebido) mantendo o intervalo mínimo entre envios.
exports.up = (pgm) => {
  pgm.addColumns('users', {
    verification_sent_at: {
      type: 'timestamp',
      notNull: false,
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('users', ['verification_sent_at']);
};
