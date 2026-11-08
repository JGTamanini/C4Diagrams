import {
  C4_ELEMENTS,
  DESCRIPTION_MAX_LENGTH,
  LEVELS,
  MAX_EDGES,
  MAX_NODES,
  TECHNOLOGY_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  elementMatchKey,
  isAllowedInLevel,
} from '../constants/c4Notation';

// Palavras do texto → tipo C4. Em português e as do C4-PlantUML, para quem já conhece o formato colar trechos prontos
const KEYWORD_TYPES = {
  Pessoa: 'c4-person',
  Person: 'c4-person',
  Sistema: 'c4-system',
  System: 'c4-system',
  SistemaExterno: 'c4-system-external',
  System_Ext: 'c4-system-external',
  Container: 'c4-container',
  BancoDeDados: 'c4-container-db',
  ContainerDb: 'c4-container-db',
  Componente: 'c4-component',
  Component: 'c4-component',
};
// Palavra usada ao escrever o texto a partir do diagrama
const TYPE_KEYWORDS = {
  'c4-person': 'Pessoa',
  'c4-system': 'Sistema',
  'c4-system-external': 'SistemaExterno',
  'c4-container': 'Container',
  'c4-container-db': 'BancoDeDados',
  'c4-component': 'Componente',
};
const WITH_TECHNOLOGY = new Set(['c4-container', 'c4-container-db', 'c4-component']);
// Rel_U/D/L/R do C4-PlantUML só sugerem a direção do desenho: aqui a posição é automática
const RELATION_KEYWORD = /^Rel(_(U|D|L|R|Up|Down|Left|Right))?$/;
const ALIAS = /^[A-Za-z_]\w*$/;
// Linhas do PlantUML que não descrevem elementos (colar um arquivo inteiro funciona)
const IGNORED_LINE = /^('|\/\/|@startuml|@enduml|!|title\b|LAYOUT_|SHOW_|HIDE_|skinparam\b)/;
const ELEMENT_ORDER = Object.keys(C4_ELEMENTS);
const KNOWN_TYPES = 'Pessoa, Sistema, SistemaExterno, Container, BancoDeDados, Componente ou Rel';

// Grade dos elementos novos: pessoas em cima, o sistema/containers/componentes no meio, externos e bancos embaixo
const ROW_OF_TYPE = {
  'c4-person': 0,
  'c4-system': 1,
  'c4-container': 1,
  'c4-component': 1,
  'c4-container-db': 2,
  'c4-system-external': 2,
};
const COLUMN_WIDTH = 300;
const ROW_HEIGHT = 240;
const GAP_FROM_EXISTING = 320;

const ARTICLE = {
  'c4-person': 'uma',
  'c4-system': 'um',
  'c4-system-external': 'um',
  'c4-container': 'um',
  'c4-container-db': 'um',
  'c4-component': 'um',
};

function levelLabel(level) {
  return LEVELS.find((candidate) => candidate.id === level).label;
}

function quote(text) {
  return `"${text.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
}

function aliasFrom(label, used) {
  let base = label
    .normalize('NFD')
    .replaceAll(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '_')
    .replaceAll(/^_+|_+$/g, '');
  if (!base) base = 'elemento';
  if (/^\d/.test(base)) base = `e_${base}`;

  let alias = base;
  for (let index = 2; used.has(alias); index++) alias = `${base}_${index}`;
  used.add(alias);
  return alias;
}

// Nota: RF19 — o painel abre com o nível atual em texto (geração única: mexer no canvas depois não reescreve o texto).
// Cada elemento ganha um apelido legível, que liga a linha ao elemento do canvas ao aplicar.
export function diagramToText(level, nodes, edges) {
  const used = new Set();
  const aliases = {};
  const aliasById = new Map();
  const ordered = [...nodes].sort((a, b) => ELEMENT_ORDER.indexOf(a.type) - ELEMENT_ORDER.indexOf(b.type));

  const elementLines = ordered.map((node) => {
    const alias = aliasFrom(node.data.label, used);
    aliases[alias] = node.id;
    aliasById.set(node.id, alias);

    const texts = WITH_TECHNOLOGY.has(node.type)
      ? [node.data.technology ?? '', node.data.description ?? '']
      : [node.data.description ?? ''];
    while (texts.length > 0 && !texts.at(-1)) texts.pop();
    return `${TYPE_KEYWORDS[node.type]}(${[alias, quote(node.data.label), ...texts.map(quote)].join(', ')})`;
  });

  const relationLines = edges
    .filter((edge) => aliasById.has(edge.source) && aliasById.has(edge.target))
    .map((edge) => {
      const parts = [aliasById.get(edge.source), aliasById.get(edge.target), quote(edge.label)];
      if (edge.data?.technology) parts.push(quote(edge.data.technology));
      return `Rel(${parts.join(', ')})`;
    });

  const header = `' Nível ${levelLabel(level)}: edite e clique em "Aplicar ao canvas". Apagar uma linha não exclui nada do canvas.`;
  const blocks = [header, elementLines.join('\n'), relationLines.join('\n')].filter(Boolean);
  return { text: blocks.join('\n\n'), aliases };
}

// Argumentos separados por vírgula: apelidos sem aspas ou textos entre aspas (com \" e \\ dentro)
function splitArguments(raw) {
  const args = [];
  let index = 0;
  while (index < raw.length) {
    while (raw[index] === ' ' || raw[index] === '\t') index++;
    if (index >= raw.length) break;

    if (raw[index] === '"') {
      let value = '';
      index++;
      while (index < raw.length && raw[index] !== '"') {
        if (raw[index] === '\\' && index + 1 < raw.length) index++;
        value += raw[index];
        index++;
      }
      if (index >= raw.length) return { error: 'aspas sem fechar.' };
      args.push({ quoted: true, value });
      index++;
    } else {
      let value = '';
      while (index < raw.length && raw[index] !== ',') value += raw[index++];
      args.push({ quoted: false, value: value.trim() });
    }

    while (raw[index] === ' ' || raw[index] === '\t') index++;
    if (index < raw.length && raw[index] !== ',') return { error: 'esperado uma vírgula entre os argumentos.' };
    index++;
  }
  return { args };
}

function checkText(arg, what, max) {
  if (!arg) return { value: null };
  if (!arg.quoted) return { error: 'os textos devem estar entre aspas.' };
  const value = arg.value.trim();
  if (value.length > max) return { error: `${what} pode ter no máximo ${max} caracteres.` };
  return { value: value || null };
}

function parseElement(keyword, type, args) {
  const [aliasArg, nameArg, ...rest] = args;
  const maxArgs = WITH_TECHNOLOGY.has(type) ? 4 : 3;
  if (args.length > maxArgs) return { error: `argumentos demais para ${keyword}.` };
  if (!aliasArg || aliasArg.quoted || !ALIAS.test(aliasArg.value)) {
    return { error: `o apelido "${aliasArg?.value ?? ''}" é inválido (use letras, números e _, começando por letra).` };
  }
  if (!nameArg?.quoted) return { error: 'o nome deve estar entre aspas.' };
  const label = nameArg.value.trim();
  if (!label) return { error: 'o nome é obrigatório.' };
  if (label.length > TITLE_MAX_LENGTH) return { error: `o nome pode ter no máximo ${TITLE_MAX_LENGTH} caracteres.` };

  const [technologyArg, descriptionArg] = WITH_TECHNOLOGY.has(type) ? rest : [undefined, rest[0]];
  const technology = checkText(technologyArg, 'a tecnologia', TECHNOLOGY_MAX_LENGTH);
  const description = checkText(descriptionArg, 'a descrição', DESCRIPTION_MAX_LENGTH);
  const failed = technology.error ?? description.error;
  if (failed) return { error: failed };

  return { element: { alias: aliasArg.value, type, label, description: description.value, technology: technology.value } };
}

function parseRelation(args) {
  const [fromArg, toArg, labelArg, technologyArg, ...extra] = args;
  if (extra.length > 0) return { error: 'argumentos demais para Rel.' };
  if (!fromArg || !toArg || fromArg.quoted || toArg.quoted) return { error: 'a relação liga dois apelidos: Rel(origem, destino, "Rótulo").' };
  if (!labelArg?.quoted || !labelArg.value.trim()) return { error: 'a relação precisa de um rótulo entre aspas.' };
  const label = labelArg.value.trim();
  if (label.length > TITLE_MAX_LENGTH) return { error: `o rótulo pode ter no máximo ${TITLE_MAX_LENGTH} caracteres.` };
  const technology = checkText(technologyArg, 'a tecnologia', TECHNOLOGY_MAX_LENGTH);
  if (technology.error) return { error: technology.error };
  return { relation: { from: fromArg.value, to: toArg.value, label, technology: technology.value } };
}

function parseLine(line) {
  const word = line.match(/^(\w+)/)?.[1];
  if (word?.endsWith('Boundary')) return { error: 'fronteiras não são escritas no texto — o foco do nível é escolhido no editor.' };

  const call = line.match(/^(\w+)\s*\((.*)\)\s*;?$/);
  if (!call) return { error: 'esperado Tipo(apelido, "Nome", ...).' };
  const [, keyword, inner] = call;

  const isRelation = RELATION_KEYWORD.test(keyword);
  const type = KEYWORD_TYPES[keyword];
  if (!isRelation && !type) return { error: `"${keyword}" não é um tipo conhecido. Use ${KNOWN_TYPES}.` };

  const { args, error } = splitArguments(inner);
  if (error) return { error };
  return isRelation ? parseRelation(args) : parseElement(keyword, type, args);
}

// Lê o texto linha a linha. Comentários (' ou //) e linhas do PlantUML que não descrevem elementos são ignorados
export function parseText(text) {
  const elements = [];
  const relations = [];
  const errors = [];

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line || IGNORED_LINE.test(line)) return;

    const lineNumber = index + 1;
    const result = parseLine(line);
    if (result.error) errors.push({ line: lineNumber, message: `Linha ${lineNumber}: ${result.error}` });
    else if (result.element) elements.push({ line: lineNumber, ...result.element });
    else relations.push({ line: lineNumber, ...result.relation });
  });

  return { elements, relations, errors };
}

function nodeData({ label, description, technology }) {
  return { label, ...(description ? { description } : {}), ...(technology ? { technology } : {}) };
}

function sameData(node, element) {
  return (
    node.data.label === element.label &&
    (node.data.description ?? null) === element.description &&
    (node.data.technology ?? null) === element.technology
  );
}

const pairKey = (a, b) => (a < b ? `${a}<->${b}` : `${b}<->${a}`);

function positionsFor(existing) {
  const startX = existing.length > 0 ? Math.max(...existing.map((node) => node.position.x)) + GAP_FROM_EXISTING : 0;
  const baseY = existing.length > 0 ? Math.min(...existing.map((node) => node.position.y)) : 0;
  const used = [0, 0, 0];
  return (type) => {
    const row = ROW_OF_TYPE[type];
    const position = { x: startX + used[row] * COLUMN_WIDTH, y: baseY + row * ROW_HEIGHT };
    used[row] += 1;
    return position;
  };
}

function emptyPlan(errors) {
  return { errors, addNodes: [], addEdges: [], updateNodes: [], updateEdges: [], untouched: 0 };
}

// Nota: RF19 — o que aplicar o texto faz no nível aberto: linha nova adiciona; linha de um elemento ou relação que já
// existe e foi alterada atualiza; linha apagada não exclui nada (só conta o que ficou de fora). Com qualquer erro,
// nada é aplicado. Elemento com o mesmo tipo e nome de um existente é reaproveitado, não duplicado.
export function planTextChanges({ level, text, aliases, nodes, edges }) {
  const parsed = parseText(text);
  const errors = [...parsed.errors];
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const nodesByKey = new Map(nodes.map((node) => [elementMatchKey(node), node]));
  const firstLineOfAlias = new Map();
  const idOfAlias = new Map();
  const placeNew = positionsFor(nodes);
  const addNodes = [];
  const updateNodes = [];
  const touched = new Set();

  for (const element of parsed.elements) {
    if (firstLineOfAlias.has(element.alias)) {
      errors.push({ line: element.line, message: `Linha ${element.line}: o apelido "${element.alias}" já foi usado na linha ${firstLineOfAlias.get(element.alias)}.` });
      continue;
    }
    firstLineOfAlias.set(element.alias, element.line);

    const linked = nodesById.get(aliases[element.alias]);
    const existing = linked ?? nodesByKey.get(elementMatchKey({ type: element.type, data: { label: element.label } }));
    if (linked && linked.type !== element.type) {
      const typeName = C4_ELEMENTS[linked.type].name;
      errors.push({
        line: element.line,
        message: `Linha ${element.line}: "${linked.data.label}" já é ${ARTICLE[linked.type]} ${typeName}. Para trocar o tipo, exclua no canvas e crie de novo.`,
      });
      continue;
    }
    if (existing) {
      idOfAlias.set(element.alias, existing.id);
      touched.add(existing.id);
      if (!sameData(existing, element)) updateNodes.push({ id: existing.id, data: nodeData(element) });
      continue;
    }
    if (!isAllowedInLevel(level, element.type)) {
      errors.push({ line: element.line, message: `Linha ${element.line}: ${C4_ELEMENTS[element.type].name} não pertence ao nível ${levelLabel(level)}.` });
      continue;
    }

    const added = { id: crypto.randomUUID(), type: element.type, position: placeNew(element.type), data: nodeData(element) };
    idOfAlias.set(element.alias, added.id);
    addNodes.push(added);
  }

  const edgesByPair = new Map(edges.map((edge) => [pairKey(edge.source, edge.target), edge]));
  const pairsInText = new Map();
  const addEdges = [];
  const updateEdges = [];

  // Apelidos gerados ao abrir o painel continuam valendo nas relações mesmo sem a linha do elemento (que segue no canvas)
  for (const [alias, nodeId] of Object.entries(aliases)) {
    if (!firstLineOfAlias.has(alias) && nodesById.has(nodeId)) idOfAlias.set(alias, nodeId);
  }

  for (const relation of parsed.relations) {
    const missing = [relation.from, relation.to].find((alias) => !idOfAlias.has(alias));
    if (missing) {
      // Apelido com erro na própria linha já foi apontado; os demais não foram definidos
      if (!firstLineOfAlias.has(missing)) errors.push({ line: relation.line, message: `Linha ${relation.line}: "${missing}" não foi definido.` });
      continue;
    }
    const source = idOfAlias.get(relation.from);
    const target = idOfAlias.get(relation.to);
    if (source === target) {
      errors.push({ line: relation.line, message: `Linha ${relation.line}: uma relação liga dois elementos diferentes.` });
      continue;
    }

    const key = pairKey(source, target);
    if (pairsInText.has(key)) {
      const first = pairsInText.get(key);
      errors.push({
        line: relation.line,
        message: `Linha ${relation.line}: já existe uma relação entre "${first.from}" e "${first.to}" no texto (uma por par).`,
      });
      continue;
    }
    pairsInText.set(key, relation);

    const existing = edgesByPair.get(key);
    if (existing) {
      const reversed = existing.source !== source;
      if (reversed || existing.label !== relation.label || (existing.data?.technology ?? null) !== relation.technology) {
        updateEdges.push({
          id: existing.id,
          label: relation.label,
          technology: relation.technology ?? '',
          ...(reversed ? { source, target } : {}),
        });
      }
      continue;
    }
    addEdges.push({
      id: crypto.randomUUID(),
      source,
      target,
      label: relation.label,
      data: relation.technology ? { technology: relation.technology } : {},
    });
  }

  if (nodes.length + addNodes.length > MAX_NODES) errors.push({ line: 0, message: `O diagrama pode ter no máximo ${MAX_NODES} elementos.` });
  if (edges.length + addEdges.length > MAX_EDGES) errors.push({ line: 0, message: `O diagrama pode ter no máximo ${MAX_EDGES} relações.` });
  if (errors.length > 0) return emptyPlan(errors.sort((a, b) => a.line - b.line));

  return { errors, addNodes, addEdges, updateNodes, updateEdges, untouched: nodes.filter((node) => !touched.has(node.id)).length };
}

const EXAMPLES = {
  context: `' Exemplo: uma loja virtual e o que está ao redor dela
Pessoa(cliente, "Cliente", "Compra livros pela loja")
Sistema(loja, "Loja Online", "Catálogo, carrinho e pedidos")
SistemaExterno(pagamento, "Gateway de Pagamento", "Processa os pagamentos com cartão")

Rel(cliente, loja, "Compra livros em")
Rel(loja, pagamento, "Cobra os pedidos via")`,
  container: `' Exemplo: os containers da loja virtual
Pessoa(cliente, "Cliente", "Compra livros pela loja")
Container(web, "Aplicação Web", "React", "Interface da loja no navegador")
Container(api, "API de Pedidos", "Node.js", "Regras de catálogo e pedidos")
BancoDeDados(banco, "Banco de Dados", "PostgreSQL", "Livros, clientes e pedidos")

Rel(cliente, web, "Navega e compra em", "HTTPS")
Rel(web, api, "Faz chamadas para", "JSON/HTTPS")
Rel(api, banco, "Lê e grava em", "SQL")`,
  component: `' Exemplo: os componentes da API de pedidos
Container(web, "Aplicação Web", "React", "Interface da loja no navegador")
Componente(controlador, "Controlador de Pedidos", "Express", "Recebe as requisições")
Componente(servico, "Serviço de Pedidos", "Node.js", "Aplica as regras do pedido")
BancoDeDados(banco, "Banco de Dados", "PostgreSQL", "Livros, clientes e pedidos")

Rel(web, controlador, "Envia pedidos para", "JSON/HTTPS")
Rel(controlador, servico, "Repassa os pedidos para", "Chamada interna")
Rel(servico, banco, "Lê e grava em", "SQL")`,
};

// Exemplo de cada nível, para quem nunca viu a sintaxe (só oferecido com o nível vazio)
export function exampleText(level) {
  return EXAMPLES[level];
}
