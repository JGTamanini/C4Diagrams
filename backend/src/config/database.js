require('dotenv').config({ quiet: true });
const { Pool } = require('pg');

// Nota: SSL é uma decisão explícita (DATABASE_SSL=true), e não consequência do NODE_ENV. Ligado, valida o certificado
// do servidor — o Azure Database for PostgreSQL usa certificado de CA pública, já confiável pelo Node.
function buildSslConfig(env = process.env) {
  return env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : false;
}

// Configuração da conexão com PostgreSQL (Azure Database for PostgreSQL em produção).
// Todas as credenciais vêm de variáveis de ambiente — nunca hardcoded.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: buildSslConfig(),
});

pool.on('error', (err) => {
  console.error('Erro inesperado no pool de conexões do PostgreSQL:', err);
  process.exit(-1);
});

async function testConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Conexão com o banco de dados estabelecida com sucesso.');
    return true;
  } catch (err) {
    console.error('❌ Falha ao conectar com o banco de dados:', err.message);
    return false;
  }
}

module.exports = { pool, testConnection, buildSslConfig };
