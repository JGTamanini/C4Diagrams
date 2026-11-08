exports.shorthands = undefined;

// Nota: RF16 — cada pedido à IA (sugestões, análise aprofundada ou escalada automática) com o custo estimado pelos
// tokens que a API informa. Serve aos limites diários por usuário e ao teto de gasto do sistema; fica no banco para
// não zerar quando o servidor reinicia. Apagado junto com a conta (LGPD).
exports.up = (pgm) => {
  pgm.createTable('ai_usage', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    kind: {
      type: 'varchar(20)',
      notNull: true,
      check: "kind IN ('suggestion', 'deep', 'escalation')",
    },
    cost_usd: {
      type: 'numeric(10, 6)',
      notNull: true,
      default: 0,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.createIndex('ai_usage', ['user_id', 'created_at']);
  pgm.createIndex('ai_usage', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('ai_usage');
};
