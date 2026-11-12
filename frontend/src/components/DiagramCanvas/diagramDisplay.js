import { MarkerType } from '@xyflow/react';
import C4Node from '../C4Node/C4Node';
import FloatingEdge from '../FloatingEdge/FloatingEdge';
import { parallelOffsets } from '../FloatingEdge/edgeGeometry';
import { C4_ELEMENTS, RELATIONSHIP_COLOR, withTechnologyLabel } from '../../constants/c4Notation';

// Nota: como o diagrama é desenhado — compartilhado pelo editor (DiagramCanvas) e pela visualização só leitura do link
// (DiagramViewer), para os dois mostrarem a mesma notação C4
export const NODE_TYPES = Object.fromEntries(Object.keys(C4_ELEMENTS).map((type) => [type, C4Node]));
export const EDGE_TYPES = { floating: FloatingEdge };

// Relação pontilhada com seta, como pede a notação C4
export const RELATIONSHIP_STYLE = {
  markerEnd: { type: MarkerType.ArrowClosed, color: RELATIONSHIP_COLOR },
  style: { stroke: RELATIONSHIP_COLOR, strokeDasharray: '6 4' },
};

// Espaço entre os pontos da grade do fundo; o "alinhar à grade" do editor encaixa os elementos nesses mesmos pontos
export const GRID_GAP = 22;
// Enquadramento: mostra o diagrama inteiro, mas sem aproximar além do tamanho real quando há poucos elementos
export const FIT_VIEW_OPTIONS = { maxZoom: 1, padding: 0.25 };
// Zoom pelos botões da barra: animado, sem ser lento
export const ZOOM_ANIMATION = { duration: 200 };

// Relações prontas para desenhar: rótulo com a tecnologia, estilo da notação e deslocamento das relações paralelas
// (entre o mesmo par de elementos). Só para exibição: nada disso vai para a API.
export function displayEdges(edges) {
  const offsets = parallelOffsets(edges);
  return edges.map((edge) => ({
    ...withTechnologyLabel(edge),
    ...RELATIONSHIP_STYLE,
    type: 'floating',
    data: { ...edge.data, offset: offsets.get(edge.id) },
  }));
}
