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

module.exports = { InvalidCredentialsError, AccountLockedError };