const path = require('node:path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const diagramRoutes = require('./routes/diagramRoutes');
const errorHandler = require('./middlewares/errorHandler');

// Arquivos gerados pelo Vite com hash no nome: o conteúdo nunca muda, então podem ficar em cache por um ano
const HASHED_ASSETS_PREFIX = `${path.sep}assets${path.sep}`;
const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';
// index.html sempre revalidado: aponta para os arquivos do deploy mais recente
const NO_CACHE = 'no-cache';
// HEAD também: monitores de disponibilidade costumam checar a página assim
const PAGE_METHODS = new Set(['GET', 'HEAD']);

function setStaticCacheHeaders(res, filePath) {
  res.setHeader('Cache-Control', filePath.includes(HASHED_ASSETS_PREFIX) ? IMMUTABLE_CACHE : NO_CACHE);
}

// Nota: em produção a API também serve o frontend compilado — mesmo endereço, sem CORS entre eles, e qualquer
// rota do React (recarregar /projetos/:id, links dos e-mails) recebe o index.html. Caminho com extensão é pedido
// de arquivo: se não existir (ex.: /favicon.ico, arquivo de um deploy antigo), segue para o 404, não vira página.
function serveFrontend(app, staticDir) {
  const indexFile = path.join(staticDir, 'index.html');

  app.use(express.static(staticDir, { index: false, setHeaders: setStaticCacheHeaders }));
  app.use((req, res, next) => {
    if (!PAGE_METHODS.has(req.method) || path.extname(req.path)) return next();
    res.setHeader('Cache-Control', NO_CACHE);
    return res.sendFile(indexFile);
  });
}

function createApp({ staticDir, corsOrigin } = {}) {
  const app = express();

  app.use(helmet());
  // Nota: só a origem do frontend recebe o cabeçalho de CORS; em produção, frontend e API têm o mesmo endereço
  app.use(cors({ origin: corsOrigin ? [corsOrigin] : false }));
  // Nota: um diagrama com até 200 elementos e descrições passa do limite padrão de 100 KB do Express
  app.use(express.json({ limit: '1mb' }));

  app.use('/api', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/projects/:projectId/diagrams', diagramRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api', (req, res) => res.status(404).json({ message: 'Rota não encontrada.' }));

  if (staticDir) serveFrontend(app, staticDir);

  // Nota: Sempre última chamada antes de modules.exports é do errorHandler
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
