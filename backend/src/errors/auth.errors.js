class InvalidCredentialsError extends Error {
  constructor() {
    super('E-mail ou senha inválidos.');
    this.name = 'InvalidCredentialsError';
  }
}

class AccountLockedError extends Error {
  constructor(minutesRemaining) {
    super(`Conta bloqueada por excesso de tentativas. Tente novamente em ${minutesRemaining} minuto(s).`);
    this.name = 'AccountLockedError';
    this.minutesRemaining = minutesRemaining;
  }
}

class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

module.exports = { InvalidCredentialsError, AccountLockedError, UnauthorizedError };