const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../../src/createApp');

function createFrontendBuild() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'c4-frontend-'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><div id="root"></div>');
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.writeFileSync(path.join(dir, 'assets', 'index-abc123.js'), 'console.log("app")');
  fs.writeFileSync(path.join(dir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  return dir;
}

describe('createApp', () => {
  describe('cabeçalhos de segurança (helmet)', () => {
    it('deve enviar os cabeçalhos de proteção e esconder o Express', async () => {
      const response = await request(createApp()).get('/api/rota-inexistente');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['content-security-policy']).toContain("default-src 'self'");
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('CORS', () => {
    it('deve liberar só a origem do frontend configurada', async () => {
      const app = createApp({ corsOrigin: 'http://localhost:5173' });

      const allowed = await request(app).get('/api/rota-inexistente').set('Origin', 'http://localhost:5173');
      const other = await request(app).get('/api/rota-inexistente').set('Origin', 'https://site-qualquer.com');

      expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(other.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('rota de API inexistente', () => {
    it('deve responder 404 em JSON, nunca a página do frontend', async () => {
      const response = await request(createApp({ staticDir: createFrontendBuild() })).get('/api/rota-inexistente');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ message: 'Rota não encontrada.' });
    });
  });

  describe('frontend compilado (mesmo endereço da API)', () => {
    let app;

    beforeAll(() => {
      app = createApp({ staticDir: createFrontendBuild() });
    });

    it('deve servir a página inicial sem cache, para cada deploy chegar na hora', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.text).toContain('id="root"');
      expect(response.headers['cache-control']).toBe('no-cache');
    });

    it('deve servir os arquivos com hash com cache longo e imutável', async () => {
      const response = await request(app).get('/assets/index-abc123.js');

      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    });

    it('deve revalidar arquivos sem hash no nome (ex.: favicon), que podem mudar entre deploys', async () => {
      const response = await request(app).get('/favicon.svg');

      expect(response.status).toBe(200);
      expect(response.headers['cache-control']).toBe('no-cache');
    });

    it('deve devolver a página do app para rotas do React (recarregar /projetos/:id e links de e-mail)', async () => {
      const response = await request(app).get('/projetos/3b241101-e2bb-4255-8caf-4136c566a962');

      expect(response.status).toBe(200);
      expect(response.text).toContain('id="root"');
      expect(response.headers['cache-control']).toBe('no-cache');
    });

    it('deve responder também a HEAD (usado por monitores de disponibilidade)', async () => {
      const response = await request(app).head('/projetos');

      expect(response.status).toBe(200);
    });

    it('não deve devolver a página do app para métodos de escrita', async () => {
      const response = await request(app).post('/projetos');

      expect(response.status).toBe(404);
    });
  });

  it('não deve servir frontend quando nenhum diretório for informado (desenvolvimento e testes)', async () => {
    const response = await request(createApp()).get('/');

    expect(response.status).toBe(404);
  });
});
