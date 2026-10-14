exports.shorthands = undefined;

// Nota: um diagrama por nível em cada projeto (RN06) — também permite o upsert atômico com ON CONFLICT
exports.up = (pgm) => {
  pgm.addConstraint('diagrams', 'diagrams_project_id_level_unique', {
    unique: ['project_id', 'level'],
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint('diagrams', 'diagrams_project_id_level_unique');
};
