exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('users', {
    verification_token: {
      type: 'varchar(255)',
      notNull: false,
    },
    verification_token_expires_at: {
      type: 'timestamp',
      notNull: false,
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('users', ['verification_token', 'verification_token_expires_at']);
};