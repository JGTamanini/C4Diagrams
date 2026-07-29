/* eslint-disable camelcase */

exports.shorthands = undefined;

/**
 * Tabela DIAGRAM — RF12-RF14 (níveis C4) e RF08-RF11 (dados do canvas).
 *
 * `level` é VARCHAR (não ENUM) de propósito: o MVP suporta apenas
 * context/container/component (C4 Nível 4 "code" foi retirado do escopo do MVP,
 * ver capítulo 2.6 do RFC). Usar VARCHAR permite adicionar o nível "code" no
 * futuro sem precisar de uma migration para alterar um tipo ENUM. A validação
 * dos valores permitidos hoje fica na camada de aplicação (services), não no banco.
 *
 * `data` é jsonb contendo o estado do canvas do React Flow (nodes + edges).
 */
exports.up = (pgm) => {
  pgm.createTable('diagrams', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    project_id: {
      type: 'uuid',
      notNull: true,
      references: 'projects',
      onDelete: 'CASCADE',
    },
    level: {
      type: 'varchar(50)',
      notNull: true,
    },
    data: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func("'{\"nodes\": [], \"edges\": []}'::jsonb"),
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

  pgm.createIndex('diagrams', 'project_id');
};

exports.down = (pgm) => {
  pgm.dropTable('diagrams');
};
