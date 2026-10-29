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

// Nota: senha atual errada ao confirmar uma ação sensível. Responde 403, e não 401: no frontend, todo 401 encerra
// a sessão — errar a senha não deve derrubar o usuário logado
class IncorrectPasswordError extends Error {
  constructor() {
    super('Senha incorreta.');
    this.name = 'IncorrectPasswordError';
  }
}

module.exports = { InvalidCredentialsError, AccountLockedError, UnauthorizedError, IncorrectPasswordError };