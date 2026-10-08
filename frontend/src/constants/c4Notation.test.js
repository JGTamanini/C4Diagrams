import { describe, it, expect } from 'vitest';
import { C4_ELEMENTS, typeLabel, withTechnologyLabel } from './c4Notation';

describe('notação C4', () => {
  it.each([
    ['c4-person', undefined, '[Person]'],
    ['c4-system', undefined, '[Software System]'],
    ['c4-system-external', undefined, '[Software System]'],
    ['c4-container', 'Node.js', '[Container: Node.js]'],
    ['c4-container', undefined, '[Container]'],
    ['c4-container-db', 'PostgreSQL', '[Container: PostgreSQL]'],
    ['c4-component', 'Express Router', '[Component: Express Router]'],
  ])('deve rotular %s (tecnologia %s) como %s', (type, technology, expected) => {
    expect(typeLabel(type, technology)).toBe(expected);
  });

  it('deve usar as cores oficiais (C4-PlantUML) e as formas de cada tipo', () => {
    expect(C4_ELEMENTS['c4-person']).toMatchObject({ background: '#08427B', border: '#073B6F', color: '#FFFFFF', shape: 'person' });
    expect(C4_ELEMENTS['c4-system']).toMatchObject({ background: '#1168BD', border: '#3C7FC0', shape: 'box' });
    expect(C4_ELEMENTS['c4-system-external']).toMatchObject({ background: '#999999', border: '#8A8A8A', shape: 'box' });
    expect(C4_ELEMENTS['c4-container']).toMatchObject({ background: '#438DD5', border: '#3C7FC0', shape: 'box' });
    expect(C4_ELEMENTS['c4-container-db']).toMatchObject({ background: '#438DD5', border: '#3C7FC0', shape: 'database' });
    expect(C4_ELEMENTS['c4-component']).toMatchObject({ background: '#85BBF0', border: '#78A8D8', color: '#000000', shape: 'box' });
  });

  it('deve mostrar a tecnologia junto ao rótulo da conexão', () => {
    expect(withTechnologyLabel({ id: 'e1', label: 'Usa', data: { technology: 'JSON/HTTPS' } }).label).toBe('Usa [JSON/HTTPS]');
    expect(withTechnologyLabel({ id: 'e2', label: 'Usa', data: {} }).label).toBe('Usa');
  });
});
