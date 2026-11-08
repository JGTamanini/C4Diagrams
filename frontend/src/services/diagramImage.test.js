import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { exportDiagramImage, legendItems, exportFileName, EXPORT_LIGHT_CLASS } from './diagramImage';

vi.mock('html-to-image', () => ({ toPng: vi.fn() }));
vi.mock('jspdf', () => {
  const instances = [];
  class FakePdf {
    constructor(options) {
      this.options = options;
      this.addImage = vi.fn();
      this.save = vi.fn();
      instances.push(this);
    }
  }
  FakePdf.instances = instances;
  return { jsPDF: FakePdf };
});

const node = (id, type, x, y) => ({ id, type, position: { x, y }, measured: { width: 200, height: 100 }, data: { label: id } });
const nodes = [node('p1', 'c4-person', 0, 0), node('s1', 'c4-system', 400, 300), node('x1', 'c4-system-external', 0, 300)];
const edges = [{ id: 'e1', source: 'p1', target: 's1', label: 'Usa' }];

// Canvas 2D de mentira (o jsdom não desenha): registra o que foi pedido
function fakeContext() {
  return new Proxy(
    {
      font: '14px sans-serif',
      calls: [],
      // Largura aproximada: metade do tamanho da fonte por caractere
      measureText(text) {
        return { width: text.length * Number(/(\d+)px/.exec(this.font)[1]) * 0.5 };
      },
    },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        return (...args) => target.calls.push([prop, ...args]);
      },
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
    }
  );
}

function flowElement() {
  const flow = document.createElement('div');
  flow.className = 'react-flow';
  Object.defineProperty(flow, 'clientWidth', { value: 1200 });
  Object.defineProperty(flow, 'clientHeight', { value: 700 });
  const viewport = document.createElement('div');
  viewport.className = 'react-flow__viewport';
  flow.append(viewport);
  document.body.append(flow);
  return { flow, viewport };
}

const baseOptions = { projectName: 'Loja Online', levelLabel: 'Contexto', nodes, edges, viewport: { x: 10, y: 20, zoom: 0.5 } };

describe('exportar imagem do diagrama (RF18)', () => {
  let context;
  let anchorClicks;
  // Tamanho da imagem capturada pelo html-to-image (2x a largura lógica)
  let capturedSize;
  // Largura de cada canvas final, no momento em que vira imagem
  let finalWidths;

  beforeEach(() => {
    vi.clearAllMocks();
    jsPDF.instances.length = 0;
    toPng.mockResolvedValue('data:image/png;base64,DIAGRAMA');
    context = fakeContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
    capturedSize = { width: 2400, height: 1600 };
    finalWidths = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function toDataURL() {
      finalWidths.push(this.width);
      return 'data:image/png;base64,FINAL';
    });
    anchorClicks = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    // Imagens carregam na hora, com o tamanho pedido
    vi.stubGlobal(
      'Image',
      class {
        width = capturedSize.width;
        height = capturedSize.height;
        set src(value) {
          this.loaded = value;
          queueMicrotask(() => this.onload());
        }
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('deve montar a legenda com os tipos usados, na ordem da notação, e a relação quando houver', () => {
    expect(legendItems(nodes, edges).map((item) => item.label)).toEqual([
      'Pessoa',
      'Sistema de Software',
      'Sistema Externo',
      'Relacionamento (rótulo [tecnologia])',
    ]);
    expect(legendItems(nodes, []).map((item) => item.label)).not.toContain('Relacionamento (rótulo [tecnologia])');
  });

  it.each([
    ['Loja Online', 'Contexto', 'png', 'loja-online-contexto.png'],
    ['Café & Pão', 'Componente', 'pdf', 'cafe-pao-componente.pdf'],
    ['???', 'Container', 'png', 'diagrama-container.png'],
  ])('deve dar um nome seguro ao arquivo (%s, %s)', (project, level, format, name) => {
    expect(exportFileName(project, level, format)).toBe(name);
  });

  it('deve exportar o diagrama inteiro em PNG, ajustado ao conteúdo, com título e legenda', async () => {
    const { flow, viewport } = flowElement();

    await exportDiagramImage({ ...baseOptions, flowElement: flow, format: 'png', area: 'content', background: 'dark' });

    const [element, options] = toPng.mock.calls[0];
    expect(element).toBe(viewport);
    expect(options).toEqual(
      expect.objectContaining({ backgroundColor: '#070A10', pixelRatio: 2, width: expect.any(Number), height: expect.any(Number) })
    );
    expect(options.width / options.height).toBeCloseTo((600 + 180) / (400 + 180), 1);
    expect(options.style.transform).toMatch(/^translate\(.+px, .+px\) scale\(.+\)$/);

    const texts = context.calls.filter(([call]) => call === 'fillText').map(([, text]) => text);
    expect(texts).toEqual(expect.arrayContaining(['Loja Online · Contexto', 'Pessoa', 'Relacionamento (rótulo [tecnologia])']));
    const download = anchorClicks.mock.contexts[0];
    expect(download.download).toBe('loja-online-contexto.png');
    expect(download.href).toBe('data:image/png;base64,FINAL');
  });

  // Diagrama alto e estreito (ex.: 20 componentes em coluna): a imagem não pode ficar mais estreita que o título e a
  // legenda, que têm fonte fixa
  it('deve garantir uma largura mínima, centralizando o diagrama estreito, e encurtar o título que não couber', async () => {
    capturedSize = { width: 612, height: 4800 };
    const { flow } = flowElement();
    const longName = 'Plataforma de Gestão Integrada de Pedidos, Estoque, Faturamento e Logística da Loja Online de Livros Usados';

    await exportDiagramImage({ ...baseOptions, projectName: longName, flowElement: flow, format: 'png', area: 'content', background: 'dark' });

    const [width] = finalWidths;
    expect(width).toBe(1120);
    const draw = context.calls.find(([call]) => call === 'drawImage');
    expect(draw[2]).toBe((1120 - 612) / 2);

    const texts = context.calls.filter(([call]) => call === 'fillText');
    const [, title, titleX] = texts[0];
    // Só o nome do projeto é encurtado: o nível continua visível
    expect(title).toMatch(/… · Contexto$/);
    expect(title.startsWith('Plataforma de Gestão')).toBe(true);
    for (const [, text, x] of texts) {
      expect(x + context.measureText(text).width).toBeLessThanOrEqual(width);
    }
    expect(titleX).toBeGreaterThan(0);
  });

  it('deve manter a largura do diagrama quando ele já é mais largo que o mínimo, sem encurtar o título', async () => {
    const { flow } = flowElement();

    await exportDiagramImage({ ...baseOptions, flowElement: flow, format: 'png', area: 'content', background: 'dark' });

    expect(finalWidths[0]).toBe(2400);
    expect(context.calls.find(([call]) => call === 'drawImage')[2]).toBe(0);
    expect(context.calls.find(([call]) => call === 'fillText')[1]).toBe('Loja Online · Contexto');
  });

  it('deve exportar só a área visível na tela, como ela está', async () => {
    const { flow } = flowElement();

    await exportDiagramImage({ ...baseOptions, flowElement: flow, format: 'png', area: 'visible', background: 'dark' });

    expect(toPng.mock.calls[0][1]).toEqual(
      expect.objectContaining({ width: 1200, height: 700, style: expect.objectContaining({ transform: 'translate(10px, 20px) scale(0.5)' }) })
    );
  });

  it('deve usar o fundo claro só durante a captura (relações escurecidas para aparecer no branco)', async () => {
    const { flow } = flowElement();
    let classDuringCapture;
    toPng.mockImplementation(async () => {
      classDuringCapture = flow.classList.contains(EXPORT_LIGHT_CLASS);
      return 'data:image/png;base64,DIAGRAMA';
    });

    await exportDiagramImage({ ...baseOptions, flowElement: flow, format: 'png', area: 'content', background: 'light' });

    expect(classDuringCapture).toBe(true);
    expect(flow.classList.contains(EXPORT_LIGHT_CLASS)).toBe(false);
    expect(toPng.mock.calls[0][1].backgroundColor).toBe('#FFFFFF');
  });

  it('deve tirar o fundo claro mesmo se a captura falhar', async () => {
    const { flow } = flowElement();
    toPng.mockRejectedValue(new Error('falhou'));

    await expect(
      exportDiagramImage({ ...baseOptions, flowElement: flow, format: 'png', area: 'content', background: 'light' })
    ).rejects.toThrow('falhou');
    expect(flow.classList.contains(EXPORT_LIGHT_CLASS)).toBe(false);
  });

  it('deve gerar o PDF com uma página do tamanho da imagem', async () => {
    const { flow } = flowElement();

    await exportDiagramImage({ ...baseOptions, flowElement: flow, format: 'pdf', area: 'content', background: 'light' });

    const [pdf] = jsPDF.instances;
    expect(pdf.options).toEqual(expect.objectContaining({ orientation: 'landscape', unit: 'px', format: [1200, 800] }));
    expect(pdf.addImage).toHaveBeenCalledWith('data:image/png;base64,FINAL', 'PNG', 0, 0, 1200, 800, undefined, 'FAST');
    expect(pdf.save).toHaveBeenCalledWith('loja-online-contexto.pdf');
    expect(anchorClicks).not.toHaveBeenCalled();
  });

  it('deve recusar exportar um nível vazio', async () => {
    const { flow } = flowElement();

    await expect(
      exportDiagramImage({ ...baseOptions, nodes: [], flowElement: flow, format: 'png', area: 'content', background: 'dark' })
    ).rejects.toThrow('Este nível ainda não tem elementos para exportar.');
    expect(toPng).not.toHaveBeenCalled();
  });
});
