jest.mock('@azure/monitor-opentelemetry', () => ({ useAzureMonitor: jest.fn() }));

const { useAzureMonitor } = require('@azure/monitor-opentelemetry');
const { startTelemetry } = require('../../src/config/telemetry');

describe('startTelemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve ligar o Application Insights quando a connection string existir', () => {
    const started = startTelemetry({ APPLICATIONINSIGHTS_CONNECTION_STRING: 'InstrumentationKey=abc' });

    expect(started).toBe(true);
    expect(useAzureMonitor).toHaveBeenCalledWith({
      azureMonitorExporterOptions: { connectionString: 'InstrumentationKey=abc' },
    });
  });

  it('não deve ligar nada sem a connection string (desenvolvimento, testes e CI)', () => {
    expect(startTelemetry({})).toBe(false);
    expect(startTelemetry()).toBe(false);
    expect(useAzureMonitor).not.toHaveBeenCalled();
  });
});
