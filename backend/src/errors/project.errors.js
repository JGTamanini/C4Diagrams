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

class NoFieldsToUpdateError extends Error {
  constructor() {
    super('Informe ao menos um campo para atualizar: "name" ou "description".');
    this.name = 'NoFieldsToUpdateError';
  }
}

module.exports = { ProjectNotFoundError, FieldTooLongError, NoFieldsToUpdateError };
