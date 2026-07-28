/* eslint-disable camelcase */

exports.shorthands = undefined;

/**
 * Tabela PROJECT — RF04-RF07 (CRUD de projetos)
 * Regra de negócio: exclusão em cascata (deletar projeto remove os diagramas).
 * Regra de negócio: projeto deve ter um nome (notNull).
 */
exports.up = (pgm) => {
  pgm.createTable('projects', {
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
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    description: {
      type: 'text',
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.createIndex('projects', 'user_id');
};

exports.down = (pgm) => {
  pgm.dropTable('projects');
};
