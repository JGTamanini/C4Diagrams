# C4Diagrams — Backend

Node.js + Express, organizado em camadas (Controllers → Services → Repositories), com PostgreSQL.

## Setup

```bash
cp .env.example .env   # preencher DATABASE_URL, GEMINI_API_KEY, JWT_SECRET
npm install
npm run dev             # nodemon (hot reload)
npm start                # produção
```

## Estrutura

```
src/
├── controllers/    # recebem a requisição e retornam a resposta
├── services/        # regras de negócio
├── repositories/    # acesso ao banco de dados (PostgreSQL)
├── routes/
├── config/           # conexão com banco, variáveis de ambiente
└── middlewares/
```

## Endpoints

- `GET /api/health` — verifica se a API e a conexão com o banco estão ok

## Banco de dados (migrations)

Schema versionado com [node-pg-migrate](https://github.com/salsita/node-pg-migrate). Tabelas atuais: `users`, `projects`, `diagrams` (ver `migrations/`).

```bash
npm run migrate:up              # aplica todas as migrations pendentes
npm run migrate:down             # desfaz a última migration
npm run migrate:create nome-da-migration   # cria uma nova migration
```

> Requer `DATABASE_URL` configurado no `.env`. Pra rodar localmente sem depender do Railway, instale o PostgreSQL na máquina (`sudo apt install postgresql`) e aponte o `.env` para `postgresql://usuario:senha@localhost:5432/c4diagrams_dev`.

### Modelo de dados

- **users**: `id` (uuid), `name`, `email` (único), `password_hash`, `email_verified`
- **projects**: `id`, `user_id` (FK → users, cascade), `name`, `description`
- **diagrams**: `id`, `project_id` (FK → projects, cascade), `level` (varchar — ver comentário na migration sobre por que não é ENUM), `data` (jsonb com nodes/edges do React Flow)

> Status atual: schema completo das 3 entidades do MVP, testado com insert/delete em cascata. Autenticação (RF01-03) e os endpoints de CRUD (services/repositories) virão nas próximas fases — hoje só existe a estrutura de tabelas, sem lógica de negócio ainda.
