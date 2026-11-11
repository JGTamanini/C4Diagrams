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

// Issue #74: outra aba (ou outro dispositivo) gravou o nível depois da versão que esta aba conhece.
// currentVersion: a versão atual, ou null se o nível foi esvaziado; com ela, a aba pode gravar por cima de propósito.
class DiagramVersionConflictError extends Error {
  constructor(currentVersion) {
    super('Este nível foi alterado em outra aba ou dispositivo.');
    this.name = 'DiagramVersionConflictError';
    this.currentVersion = currentVersion;
  }
}

module.exports = { InvalidDiagramLevelError, InvalidDiagramDataError, DiagramVersionConflictError };
