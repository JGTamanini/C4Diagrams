const { testConnection } = require('../config/database');

async function getHealth(req, res) {
  const dbConnected = await testConnection();

  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
}

module.exports = { getHealth };
