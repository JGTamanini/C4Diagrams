# Imagem de produção do C4Diagrams: a API (Express) serve também o frontend compilado, no mesmo endereço.

# 1) Frontend: build de produção do Vite, com a API no mesmo endereço (/api)
FROM node:24.15.0-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ENV VITE_API_URL=/api
RUN npm run build

# 2) Backend: só as dependências de produção
FROM node:24.15.0-alpine AS backend-deps
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

# 3) Imagem final: sem ferramentas de build, rodando com usuário sem privilégios
FROM node:24.15.0-alpine
ENV NODE_ENV=production \
    PORT=8080 \
    STATIC_DIR=/app/public
WORKDIR /app
COPY --from=backend-deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node backend/package.json ./
COPY --chown=node:node backend/src ./src
COPY --chown=node:node backend/migrations ./migrations
COPY --from=frontend --chown=node:node /app/frontend/dist ./public
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD wget -qO- http://localhost:8080/api/health || exit 1
# Migrações antes de subir: o node-pg-migrate usa trava no banco, então reinícios simultâneos não aplicam duas vezes
CMD ["npm", "run", "start:prod"]
