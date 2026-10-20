// Nota: monitoramento em produção com o New Relic (plano gratuito, fora da Azure — não consome créditos):
// requisições, tempo de resposta por rota, erros e consultas ao banco.
// Configurado só por variáveis de ambiente; os valores padrão abaixo valem quando não vierem do ambiente.
const AGENT_DEFAULTS = {
  NEW_RELIC_APP_NAME: 'C4Diagrams',
  NEW_RELIC_NO_CONFIG_FILE: 'true',
  // No container, o usuário sem privilégios não escreve na pasta da aplicação; o App Service coleta a saída padrão
  NEW_RELIC_LOG: 'stdout',
};

function loadNewRelicAgent() {
  require('newrelic');
}

// Precisa rodar antes de carregar o Express para instrumentá-lo; sem a chave de licença, nada é ligado
function startTelemetry(env = process.env, loadAgent = loadNewRelicAgent) {
  if (!env.NEW_RELIC_LICENSE_KEY) return false;

  Object.entries(AGENT_DEFAULTS).forEach(([name, value]) => {
    env[name] ??= value;
  });
  loadAgent();
  return true;
}

module.exports = { startTelemetry };
