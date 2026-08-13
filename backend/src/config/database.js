require('dotenv').config({ quiet: true });
const { Pool } = require('pg');

// Configuração da conexão com PostgreSQL (hospedado no Railway em produção).
// Todas as credenciais vêm de variáveis de ambiente — nunca hardcoded.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
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

module.exports = { pool, testConnection };
