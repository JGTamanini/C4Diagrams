exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.addColumns('users', {
    password_reset_token: {
      type: 'varchar(255)',
      notNull: false,
    },
    password_reset_token_expires_at: {
      type: 'timestamp',
      notNull: false,
    },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('users', ['password_reset_token', 'password_reset_token_expires_at']);
};