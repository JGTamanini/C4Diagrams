jest.mock('newrelic', () => {
  globalThis.newRelicAgentLoaded = true;
  return {};
});

const { startTelemetry } = require('../../src/config/telemetry');

describe('startTelemetry (New Relic)', () => {
  it('deve carregar o agente quando a chave de licença existir', () => {
    const loadAgent = jest.fn();

    const started = startTelemetry({ NEW_RELIC_LICENSE_KEY: 'chave' }, loadAgent);

    expect(started).toBe(true);
    expect(loadAgent).toHaveBeenCalledTimes(1);
  });

  it('deve configurar o agente por variáveis: nome da aplicação, sem arquivo de configuração e log na saída padrão', () => {
    const env = { NEW_RELIC_LICENSE_KEY: 'chave' };

    startTelemetry(env, jest.fn());

    expect(env).toMatchObject({
      NEW_RELIC_APP_NAME: 'C4Diagrams',
      NEW_RELIC_NO_CONFIG_FILE: 'true',
      NEW_RELIC_LOG: 'stdout',
    });
  });

  it('deve respeitar valores já definidos no ambiente', () => {
    const env = { NEW_RELIC_LICENSE_KEY: 'chave', NEW_RELIC_APP_NAME: 'C4Diagrams (homologação)' };

    startTelemetry(env, jest.fn());

    expect(env.NEW_RELIC_APP_NAME).toBe('C4Diagrams (homologação)');
  });

  it('deve carregar o pacote newrelic por padrão (como no server.js)', () => {
    startTelemetry({ NEW_RELIC_LICENSE_KEY: 'chave' });

    expect(globalThis.newRelicAgentLoaded).toBe(true);
  });

  it('não deve carregar nada sem a chave (desenvolvimento, testes e CI)', () => {
    const loadAgent = jest.fn();

    expect(startTelemetry({}, loadAgent)).toBe(false);
    expect(startTelemetry(undefined, loadAgent)).toBe(false);
    expect(loadAgent).not.toHaveBeenCalled();
  });
});
