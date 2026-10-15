import { describe, it, expect } from 'vitest';
import { borderPointToward, floatingEdgePath, parallelOffsets, PARALLEL_SPACING } from './edgeGeometry';

const box = { x: 0, y: 0, width: 200, height: 100 };

describe('edgeGeometry', () => {
  describe('borderPointToward', () => {
    it.each([
      ['à direita', { x: 500, y: 50 }, { x: 200, y: 50 }],
      ['à esquerda', { x: -300, y: 50 }, { x: 0, y: 50 }],
      ['abaixo', { x: 100, y: 400 }, { x: 100, y: 100 }],
      ['acima', { x: 100, y: -400 }, { x: 100, y: 0 }],
    ])('deve encostar na borda virada para o outro elemento (%s)', (_, point, expected) => {
      const result = borderPointToward(box, point);

      expect(result.x).toBeCloseTo(expected.x);
      expect(result.y).toBeCloseTo(expected.y);
    });

    it('deve devolver o centro quando o outro ponto coincide com ele (sem NaN)', () => {
      expect(borderPointToward(box, { x: 100, y: 50 })).toEqual({ x: 100, y: 50 });
    });
  });

  describe('floatingEdgePath', () => {
    const source = { x: 0, y: 0, width: 200, height: 100 };
    const target = { x: 400, y: 0, width: 200, height: 100 };

    it('deve ligar as bordas que se encaram, com o rótulo no meio da linha', () => {
      expect(floatingEdgePath(source, target, 0)).toEqual({ path: 'M 200 50 Q 300 50 400 50', labelX: 300, labelY: 50 });
    });

    it('deve curvar a linha e levar o rótulo junto quando houver deslocamento', () => {
      expect(floatingEdgePath(source, target, 25)).toEqual({ path: 'M 200 50 Q 300 100 400 50', labelX: 300, labelY: 75 });
    });
  });

  describe('parallelOffsets', () => {
    it('não deve deslocar uma relação única entre dois elementos', () => {
      const offsets = parallelOffsets([
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'd', target: 'c' },
      ]);

      expect(offsets.get('e1')).toBe(0);
      expect(offsets.get('e2')).toBe(0);
    });

    it('deve afastar relações do mesmo par, inclusive em sentidos opostos', () => {
      const offsets = parallelOffsets([
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'a', target: 'b' },
        { id: 'e3', source: 'b', target: 'a' },
        { id: 'e4', source: 'a', target: 'c' },
      ]);

      // O deslocamento é relativo ao sentido da linha: no sentido b → a, o sinal se inverte
      // para que as três fiquem em posições distintas no desenho
      expect(offsets.get('e1')).toBe(-PARALLEL_SPACING);
      expect(offsets.get('e2')).toBe(0);
      expect(offsets.get('e3')).toBe(-PARALLEL_SPACING);
      expect(offsets.get('e4')).toBe(0);
    });
  });
});
