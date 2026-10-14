const express = require('express');
const cors = require('cors');
const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const diagramRoutes = require('./routes/diagramRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
// Nota: um diagrama com até 200 elementos e descrições passa do limite padrão de 100 KB do Express
app.use(express.json({ limit: '1mb' }));

app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects/:projectId/diagrams', diagramRoutes);
app.use('/api/projects', projectRoutes);

// Nota: Sempre última chamada antes de modules.exports é do errorHandler
app.use(errorHandler);

module.exports = app;