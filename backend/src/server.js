require('dotenv').config({ quiet: true });

// Nota: a telemetria precisa vir antes do Express (e do app) para instrumentar as requisições
const { startTelemetry } = require('./config/telemetry');
startTelemetry();

const { validateEnv } = require('./config/env');
validateEnv();

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
