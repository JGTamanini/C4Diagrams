const { useAzureMonitor } = require('@azure/monitor-opentelemetry');

// Nota: monitoramento em produção (Application Insights) — requisições, tempo de resposta, falhas e dependências.
// Precisa ser iniciado antes de carregar o Express para instrumentá-lo; sem a connection string, nada é ligado.
function startTelemetry(env = process.env) {
  const connectionString = env.APPLICATIONINSIGHTS_CONNECTION_STRING;
  if (!connectionString) return false;

  useAzureMonitor({ azureMonitorExporterOptions: { connectionString } });
  return true;
}

module.exports = { startTelemetry };
