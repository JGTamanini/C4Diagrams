// Utilitário de teste: APIs de navegador que o React Flow usa e que o jsdom não implementa
// (recomendação da documentação do React Flow para testes)
export function mockReactFlowBrowserApis() {
  class ResizeObserverMock {
    constructor(callback) {
      this.callback = callback;
    }
    observe(target) {
      this.callback([{ target, contentRect: { width: target.offsetWidth, height: target.offsetHeight } }]);
    }
    unobserve() {}
    disconnect() {}
  }

  class DOMMatrixReadOnlyMock {
    constructor(transform) {
      const scale = transform?.match(/scale\(([1-9.])\)/)?.[1];
      this.m22 = scale === undefined ? 1 : Number(scale);
    }
  }

  globalThis.ResizeObserver = ResizeObserverMock;
  globalThis.DOMMatrixReadOnly = DOMMatrixReadOnlyMock;
  Object.defineProperties(globalThis.HTMLElement.prototype, {
    offsetHeight: { configurable: true, get() { return Number.parseFloat(this.style.height) || 1; } },
    offsetWidth: { configurable: true, get() { return Number.parseFloat(this.style.width) || 1; } },
  });
  globalThis.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0 });
}
