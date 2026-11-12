exports.shorthands = undefined;

// Nota: link de visualização do projeto (só leitura). O código é aleatório e separado do id do projeto, para o dono
// poder revogar ou trocar o link sem mexer no projeto. Único: um código abre um projeto só. Nulo: projeto sem link.
exports.up = (pgm) => {
  pgm.addColumn('projects', {
    share_token: { type: 'varchar(64)', unique: true },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('projects', 'share_token');
};
