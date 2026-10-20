const { testConnection } = require('../config/database');

async function getHealth(req, res) {
  const dbConnected = await testConnection();

  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    database: dbConnected ? 'connected' : 'disconnected',
    // Nota: commit em execução (definido pelo pipeline de deploy); o deploy confere este valor para saber que a nova versão subiu
    version: process.env.APP_VERSION || 'dev',
    timestamp: new Date().toISOString(),
  });
}

module.exports = { getHealth };
