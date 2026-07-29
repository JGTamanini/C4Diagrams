# C4Diagrams — Frontend

React + [React Flow (@xyflow/react)](https://reactflow.dev/) para o editor visual de diagramas C4.

## Setup

```bash
npm install
npm run dev      # ambiente de desenvolvimento
npm run build    # build de produção
```

## Estrutura

```
src/
├── components/
│   └── Canvas/     # POC do canvas com React Flow
├── pages/
├── services/        # chamadas à API do backend
```

> Status atual: prova de conceito do canvas validada com elementos C4 de exemplo (nível Context). Implementação dos elementos reais, drag & drop da sidebar e modais de edição virão nas próximas fases.
