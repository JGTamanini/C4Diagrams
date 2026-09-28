class ProjectNotFoundError extends Error {
  constructor() {
    super('Projeto não encontrado. Volte à lista de projetos e tente novamente.');
    this.name = 'ProjectNotFoundError';
  }
}

class FieldTooLongError extends Error {
  constructor(field, maxLength) {
    super(`O campo "${field}" deve ter no máximo ${maxLength} caracteres.`);
    this.name = 'FieldTooLongError';
  }
}

module.exports = { ProjectNotFoundError, FieldTooLongError };
