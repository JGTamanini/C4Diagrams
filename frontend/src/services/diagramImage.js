import { getNodesBounds, getViewportForBounds } from '@xyflow/react';
import { C4_ELEMENTS, RELATIONSHIP_COLOR } from '../constants/c4Notation';

// Classes aplicadas ao canvas só durante a captura: esconder os marcadores da validação e, no fundo claro, escurecer
// as relações (claras no editor, sumiriam no branco) — ver index.css
const EXPORTING_CLASS = 'c4-exporting';
export const EXPORT_LIGHT_CLASS = 'c4-export-light';

const THEMES = {
  dark: { background: '#070A10', title: '#EEF2FA', text: '#9DA9C0', relationship: RELATIONSHIP_COLOR },
  light: { background: '#FFFFFF', title: '#111826', text: '#4B5563', relationship: '#4B5563', className: EXPORT_LIGHT_CLASS },
};

// Imagem em dobro da resolução, para ficar nítida em documentos
const PIXEL_RATIO = 2;
// Folga em volta dos elementos no "diagrama inteiro": rótulos das relações e a fronteira tracejada
const CONTENT_MARGIN = 90;
const BASE_WIDTH = 1600;
const MAX_SIDE = 2400;
// Largura mínima da imagem final (em pixels de tela): título e legenda têm fonte fixa, e um diagrama alto e estreito
// (ex.: componentes em coluna) deixaria a imagem estreita demais para eles
const MIN_COMPOSED_WIDTH = 560;
const ELEMENT_ORDER = Object.keys(C4_ELEMENTS);
const RELATIONSHIP_LEGEND = 'Relacionamento (rótulo [tecnologia])';

function slug(text) {
  return text
    .normalize('NFD')
    .replaceAll(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
}

export function exportFileName(projectName, levelLabel, format) {
  return `${slug(projectName) || 'diagrama'}-${slug(levelLabel)}.${format}`;
}

// A legenda que a notação C4 pede em todo diagrama: os tipos usados, na ordem da notação, e a leitura das relações
export function legendItems(nodes, edges) {
  const elements = ELEMENT_ORDER.filter((type) => nodes.some((node) => node.type === type)).map((type) => ({
    kind: 'element',
    label: C4_ELEMENTS[type].name,
    color: C4_ELEMENTS[type].background,
    round: C4_ELEMENTS[type].shape === 'person',
  }));
  return edges.length > 0 ? [...elements, { kind: 'relationship', label: RELATIONSHIP_LEGEND }] : elements;
}

// Tamanho da imagem e enquadramento: o diagrama inteiro (ajustado ao conteúdo) ou a área visível, como está na tela
function frameFor({ flowElement, nodes, viewport, area }) {
  if (area === 'visible') return { width: flowElement.clientWidth, height: flowElement.clientHeight, transform: viewport };

  const bounds = getNodesBounds(nodes);
  const box = {
    x: bounds.x - CONTENT_MARGIN,
    y: bounds.y - CONTENT_MARGIN,
    width: bounds.width + 2 * CONTENT_MARGIN,
    height: bounds.height + 2 * CONTENT_MARGIN,
  };
  let width = BASE_WIDTH;
  let height = Math.round((width * box.height) / box.width);
  if (height > MAX_SIDE) {
    height = MAX_SIDE;
    width = Math.round((height * box.width) / box.height);
  }
  return { width, height, transform: getViewportForBounds(box, width, height, 0.05, 4, 0) };
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Não foi possível gerar a imagem.'));
    image.src = src;
  });
}

// Itens da legenda em linhas que cabem na largura da imagem
function layoutLegend(context, items, maxWidth, scale) {
  const rows = [[]];
  let x = 0;
  for (const item of items) {
    const width = 22 * scale + 8 * scale + context.measureText(item.label).width + 24 * scale;
    if (x + width > maxWidth && rows.at(-1).length > 0) {
      rows.push([]);
      x = 0;
    }
    rows.at(-1).push({ ...item, x });
    x += width;
  }
  return rows;
}

function drawLegendItem(context, item, x, y, theme, scale) {
  if (item.kind === 'relationship') {
    context.strokeStyle = theme.relationship;
    context.lineWidth = 1.5 * scale;
    context.setLineDash([5 * scale, 3 * scale]);
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + 22 * scale, y);
    context.stroke();
    context.setLineDash([]);
  } else {
    context.fillStyle = item.color;
    context.beginPath();
    context.roundRect(x, y - 6 * scale, 22 * scale, 12 * scale, item.round ? 6 * scale : 2 * scale);
    context.fill();
  }
  context.fillStyle = theme.text;
  context.fillText(item.label, x + 30 * scale, y + 4.5 * scale);
}

// Título "Projeto · Nível" que cabe na largura (com a fonte já definida no contexto): se não couber, só o nome do
// projeto é encurtado com "…", e o nível continua visível
function fitTitle(context, projectName, levelLabel, maxWidth) {
  const suffix = ` · ${levelLabel}`;
  const full = `${projectName}${suffix}`;
  if (context.measureText(full).width <= maxWidth) return full;
  let name = projectName;
  while (name.length > 1 && context.measureText(`${name}…${suffix}`).width > maxWidth) name = name.slice(0, -1);
  return `${name.trimEnd()}…${suffix}`;
}

// Título no topo ("Projeto · Nível") e legenda embaixo, em volta do diagrama capturado. A imagem tem uma largura
// mínima, com o diagrama estreito centralizado; o título que não couber termina em "…"

async function composeWithTitleAndLegend(diagramUrl, { projectName, levelLabel, legend, theme }) {
  const diagram = await loadImage(diagramUrl);
  const scale = PIXEL_RATIO;
  const padding = 24 * scale;
  const titleHeight = 56 * scale;
  const rowHeight = 26 * scale;
  const legendFont = `${13 * scale}px Inter, sans-serif`;

  const width = Math.max(diagram.width, MIN_COMPOSED_WIDTH * scale);
  const contentWidth = width - 2 * padding;
  const titleFont = `600 ${20 * scale}px Inter, sans-serif`;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = legendFont;
  const rows = layoutLegend(context, legend, contentWidth, scale);
  const legendHeight = rows.length * rowHeight + padding;

  canvas.width = width;
  canvas.height = titleHeight + diagram.height + legendHeight;
  context.fillStyle = theme.background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = theme.title;
  context.font = titleFont;
  context.fillText(fitTitle(context, projectName, levelLabel, contentWidth), padding, 36 * scale);
  context.drawImage(diagram, Math.round((width - diagram.width) / 2), titleHeight);

  context.font = legendFont;
  rows.forEach((row, index) => {
    const y = titleHeight + diagram.height + index * rowHeight + rowHeight / 2;
    row.forEach((item) => drawLegendItem(context, item, padding + item.x, y, theme, scale));
  });

  return canvas.toDataURL('image/png');
}

// Nota: RF18 — imagem do nível aberto em PNG ou PDF. O diagrama é capturado do próprio canvas (html-to-image, como
// recomenda o React Flow), no enquadramento escolhido, e ganha título e legenda. Fundo escuro (como no editor) ou
// claro (documentos e impressão). Tudo no navegador: nada vai para o servidor. As bibliotecas de captura e de PDF só são
// carregadas ao exportar: são pesadas e entrariam no pacote de todo mundo, inclusive de quem só abre a home.
export async function exportDiagramImage({ flowElement, nodes, edges, viewport, area, background, format, projectName, levelLabel }) {
  if (nodes.length === 0) throw new Error('Este nível ainda não tem elementos para exportar.');

  const theme = THEMES[background];
  const frame = frameFor({ flowElement, nodes, viewport, area });
  const { x, y, zoom } = frame.transform;
  const classes = [EXPORTING_CLASS, theme.className].filter(Boolean);
  const { toPng } = await import('html-to-image');

  flowElement.classList.add(...classes);
  let diagramUrl;
  try {
    diagramUrl = await toPng(flowElement.querySelector('.react-flow__viewport'), {
      backgroundColor: theme.background,
      width: frame.width,
      height: frame.height,
      pixelRatio: PIXEL_RATIO,
      style: { width: `${frame.width}px`, height: `${frame.height}px`, transform: `translate(${x}px, ${y}px) scale(${zoom})` },
    });
  } finally {
    flowElement.classList.remove(...classes);
  }

  const imageUrl = await composeWithTitleAndLegend(diagramUrl, {
    projectName,
    levelLabel,
    legend: legendItems(nodes, edges),
    theme,
  });
  const fileName = exportFileName(projectName, levelLabel, format);

  if (format === 'pdf') {
    const { jsPDF } = await import('jspdf');
    const image = await loadImage(imageUrl);
    const width = image.width / PIXEL_RATIO;
    const height = image.height / PIXEL_RATIO;
    const pdf = new jsPDF({ orientation: width >= height ? 'landscape' : 'portrait', unit: 'px', format: [width, height], hotfixes: ['px_scaling'] });
    // FAST: comprime a imagem dentro do PDF (sem compressão, um diagrama passa de 15 MB)
    pdf.addImage(imageUrl, 'PNG', 0, 0, width, height, undefined, 'FAST');
    pdf.save(fileName);
    return;
  }

  const anchor = document.createElement('a');
  anchor.href = imageUrl;
  anchor.download = fileName;
  anchor.click();
}
