class EmailAlreadyExistsError extends Error {
  constructor(email) {
    super(`O e-mail "${email}" já está cadastrado.`);
    this.name = 'EmailAlreadyExistsError';
  }
}

class WeakPasswordError extends Error {
  constructor() {
    super('A senha deve ter no mínimo 8 caracteres.');
    this.name = 'WeakPasswordError';
  }
}

module.exports = { EmailAlreadyExistsError, WeakPasswordError };