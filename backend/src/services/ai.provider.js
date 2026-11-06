const Anthropic = require('@anthropic-ai/sdk').default;
const { AI_TIERS, costOf } = require('../config/ai');
const { SUGGESTIONS_SCHEMA } = require('./ai.prompt');
const { AiUnavailableError } = require('../errors/ai.errors');

// Chave inválida (401), sem créditos (402), sem permissão (403) ou modelo indisponível para a conta (404): não
// adianta tentar de novo nem escalar — a IA está indisponível até alguém resolver no Console da Anthropic
const UNAVAILABLE_STATUSES = new Set([401, 402, 403, 404]);
// O Opus refaz uma recusa dos filtros de segurança no modelo que a própria API escolher, na mesma chamada
const SERVER_SIDE_FALLBACK_BETA = 'server-side-fallback-2026-07-01';

// Resposta da API → sugestões (ainda não conferidas pelo motor). Recusa, resposta cortada ou texto fora do formato
// viram falha sem exceção, com o custo do que foi gasto: o serviço decide se escala para o Opus
function readResponse(response, requestedModel) {
  const cost = costOf(requestedModel, response.usage);
  const failure = (reason) => ({ ok: false, reason, model: requestedModel, cost });

  // Recusa antes de ler o conteúdo: ele pode vir vazio ou fora do formato pedido
  if (response.stop_reason === 'refusal') return failure('refused');
  if (response.stop_reason === 'max_tokens') return failure('truncated');

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return failure('invalid');
  }
  if (!Array.isArray(parsed?.suggestions)) return failure('invalid');

  return { ok: true, suggestions: parsed.suggestions, model: response.model ?? requestedModel, cost };
}

// Nota: RF16 — provedor real (Anthropic). Haiku pelo endpoint comum; Opus pelo endpoint beta, que aceita o fallback
// de recusas. A resposta vem em JSON no formato fechado (structured outputs). Uma retentativa automática do SDK
// para falhas passageiras; o tempo máximo por pedido vem do nível (RNF03 revisto).
function createAnthropicProvider({ apiKey, client = new Anthropic({ apiKey }) } = {}) {
  async function generate({ tier, system, user }) {
    const config = AI_TIERS[tier];
    const params = {
      model: config.model,
      max_tokens: config.maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { effort: config.effort, format: { type: 'json_schema', schema: SUGGESTIONS_SCHEMA } },
    };
    const options = { timeout: config.timeoutMs, maxRetries: 1 };

    let response;
    try {
      response = config.fallback
        ? await client.beta.messages.create({ ...params, betas: [SERVER_SIDE_FALLBACK_BETA], fallbacks: 'default' }, options)
        : await client.messages.create(params, options);
    } catch (error) {
      if (!(error instanceof Anthropic.APIError)) throw error;
      if (UNAVAILABLE_STATUSES.has(error.status)) {
        console.error(`IA indisponível: ${error.status} ${error.type} — ${error.message}`);
        throw new AiUnavailableError();
      }
      console.warn(`Falha passageira da IA (${error.status ?? 'conexão'}): ${error.message}`);
      return { ok: false, reason: 'api_error', model: config.model, cost: 0 };
    }

    return readResponse(response, config.model);
  }

  return { mode: 'anthropic', generate };
}

const EMPTY_FIELDS = {
  elementType: null,
  name: null,
  description: null,
  technology: null,
  source: null,
  target: null,
  targetName: null,
};

function demo(fields) {
  return { ...EMPTY_FIELDS, ...fields };
}

function element(elementType, name, title, reason, extra = {}) {
  return demo({ kind: 'add_element', elementType, name, title, reason, ...extra });
}

function relationship(source, target, label, title, reason) {
  return demo({ kind: 'add_relationship', source, target, description: label, title, reason });
}

// Pontos de partida de exemplo por nível (o do Contexto usa o nome do projeto como o sistema em foco)
const DEMO_STARTERS = {
  context: (project) => [
    element('c4-person', 'Usuário', 'Adicione quem usa o sistema', 'Todo diagrama de Contexto começa por quem se beneficia do sistema.'),
    element('c4-system', project.name, `Adicione "${project.name}" como o sistema em foco`, 'O Sistema de Software é o centro do diagrama de Contexto.'),
    element('c4-system-external', 'Serviço de e-mail', 'Adicione os sistemas externos de que ele depende', 'Mostrar dependências externas deixa claro o que não está sob o seu controle.'),
    relationship('Usuário', project.name, 'Usa', 'Ligue o usuário ao sistema', 'Toda pessoa no diagrama deve ter uma relação que explique o que ela faz.'),
  ],
  container: () => [
    element('c4-container', 'Aplicação Web', 'Adicione a interface usada pelas pessoas', 'O primeiro container costuma ser por onde o usuário entra.', { technology: 'React' }),
    element('c4-container', 'API', 'Adicione a API com as regras de negócio', 'Separar interface e regras facilita evoluir cada parte.', { technology: 'Node.js' }),
    element('c4-container-db', 'Banco de Dados', 'Adicione onde os dados ficam guardados', 'Bancos de dados também são containers no C4.', { technology: 'PostgreSQL' }),
    relationship('Aplicação Web', 'API', 'Faz chamadas para', 'Ligue a aplicação à API', 'A relação mostra como os containers conversam.'),
    relationship('API', 'Banco de Dados', 'Lê e grava em', 'Ligue a API ao banco de dados', 'Deixa claro quem é dono dos dados.'),
  ],
  component: () => [
    element('c4-component', 'Controlador de Pedidos', 'Adicione o ponto de entrada das requisições', 'Componentes mostram como um container se organiza por dentro.', { technology: 'Express' }),
    element('c4-component', 'Serviço de Pedidos', 'Adicione um componente para as regras', 'Separar regras de entrada e saída ajuda a testar.', { technology: 'Node.js' }),
    relationship('Controlador de Pedidos', 'Serviço de Pedidos', 'Usa', 'Ligue o controlador ao serviço', 'A relação mostra o caminho de uma requisição.'),
  ],
};

function demoReview(data) {
  const suggestions = [];
  const withoutDescription = data.nodes.find((node) => !node.data.description);
  if (withoutDescription) {
    suggestions.push(
      demo({
        kind: 'improve_text',
        targetName: withoutDescription.data.label,
        title: `Descreva o papel de "${withoutDescription.data.label}"`,
        reason: 'Uma frase curta sobre a responsabilidade do elemento ajuda quem lê o diagrama pela primeira vez.',
      })
    );
  }

  const connected = new Set(data.edges.flatMap((edge) => [edge.source, edge.target]));
  const isolated = data.nodes.find((node) => !connected.has(node.id));
  if (isolated) {
    suggestions.push(
      demo({
        kind: 'note',
        targetName: isolated.data.label,
        title: `Mostre com quem "${isolated.data.label}" se relaciona`,
        reason: 'Elementos soltos deixam dúvida sobre o papel deles na arquitetura.',
      })
    );
  }

  suggestions.push(
    demo({
      kind: 'note',
      title: 'Confira se cada relação diz o que acontece',
      reason: 'Rótulos como "Envia pedidos para" explicam mais do que "Usa".',
    })
  );
  return suggestions;
}

// Nota: modo demonstração (só fora de produção, AI_DEMO=true) — sugestões de exemplo montadas a partir do próprio
// diagrama, sem chamar a IA e sem custo. Serve para desenvolver e mostrar o fluxo da tela antes dos créditos.
function createDemoProvider() {
  async function generate({ context }) {
    const { level, data, project } = context;
    const suggestions = data.nodes.length === 0 ? DEMO_STARTERS[level](project) : demoReview(data);
    return { ok: true, suggestions, model: 'demo', cost: 0 };
  }

  return { mode: 'demo', generate };
}

module.exports = { createAnthropicProvider, createDemoProvider };
