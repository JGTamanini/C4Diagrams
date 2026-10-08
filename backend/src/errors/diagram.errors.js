class InvalidDiagramLevelError extends Error {
  constructor(level) {
    super(`Nível "${level}" inválido. Use "context", "container" ou "component".`);
    this.name = 'InvalidDiagramLevelError';
  }
}

class InvalidDiagramDataError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidDiagramDataError';
  }
}

module.exports = { InvalidDiagramLevelError, InvalidDiagramDataError };
