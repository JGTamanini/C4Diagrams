const { createApp } = require('./createApp');

// Nota: STATIC_DIR só é definido na imagem de produção (frontend compilado); em desenvolvimento o Vite serve o frontend
module.exports = createApp({
  staticDir: process.env.STATIC_DIR,
  corsOrigin: process.env.FRONTEND_URL,
});
