class EmailAlreadyExistsError extends Error {
  constructor(email) {
    super(`O e-mail "${email}" já está cadastrado.`);
    this.name = 'EmailAlreadyExistsError';
  }
}

class WeakPasswordError extends Error {
  constructor() {
    super('A senha deve ter no mínimo 8 caracteres, incluindo letra maiúscula, minúscula e caractere especial.');
    this.name = 'WeakPasswordError';
  }
}

class MissingFieldError extends Error {
  constructor(field) {
    super(`O campo "${field}" é obrigatório.`);
    this.name = 'MissingFieldError';
  }
}

module.exports = { EmailAlreadyExistsError, WeakPasswordError, MissingFieldError };