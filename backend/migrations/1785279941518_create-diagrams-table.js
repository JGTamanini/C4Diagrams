exports.shorthands = undefined;

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
