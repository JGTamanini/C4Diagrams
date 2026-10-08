import { describe, it, expect, beforeEach, vi } from 'vitest';
import api from './api';
import { listDiagrams, saveDiagram } from './diagrams';
import { InvalidProjectIdError } from './projects';

vi.mock('./api');

const PROJECT_ID = '3b241101-e2bb-4255-8caf-4136c566a962';
const data = { nodes: [{ id: 'n1', type: 'c4-person', position: { x: 0, y: 0 }, data: { label: 'Cliente' } }], edges: [] };

describe('diagrams service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve listar os diagramas salvos do projeto', async () => {
    api.get.mockResolvedValue({ data: [{ level: 'context', data }] });

    const result = await listDiagrams(PROJECT_ID);

    expect(api.get).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/diagrams`);
    expect(result).toEqual([{ level: 'context', data }]);
  });

  it('deve salvar o diagrama do nível e devolver o diagrama salvo', async () => {
    api.put.mockResolvedValue({ status: 200, data: { level: 'context', data } });

    const result = await saveDiagram(PROJECT_ID, 'context', data);

    expect(api.put).toHaveBeenCalledWith(`/projects/${PROJECT_ID}/diagrams/context`, data);
    expect(result).toEqual({ level: 'context', data });
  });

  it('deve devolver null quando o nível for salvo vazio (204)', async () => {
    api.put.mockResolvedValue({ status: 204, data: '' });

    const result = await saveDiagram(PROJECT_ID, 'container', { nodes: [], edges: [] });

    expect(result).toBeNull();
  });

  it('deve recusar id de projeto fora do formato UUID, sem fazer requisição', async () => {
    await expect(listDiagrams('../auth/x')).rejects.toBeInstanceOf(InvalidProjectIdError);
    await expect(saveDiagram('../auth/x', 'context', data)).rejects.toBeInstanceOf(InvalidProjectIdError);
    expect(api.get).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('deve recusar nível fora de context, container e component, sem fazer requisição', async () => {
    await expect(saveDiagram(PROJECT_ID, 'code', data)).rejects.toThrow('Nível de diagrama inválido: code');
    expect(api.put).not.toHaveBeenCalled();
  });
});
