# Sumário

## Capítulo 1 — Visão do Produto e Impacto

| Seção | Descrição |
|-------|-----------|
| [1.1 Contextualização e Problema](capitulo-1/1.1-contextualizacao-e-problema.md) | Motivação do projeto, cenário atual e proposta de solução |
| [1.2 Origem da Demanda e Evidências](capitulo-1/1.2-origem-da-demanda-e-evidencias.md) | Pesquisa realizada com usuários e dados quantitativos coletados |
| [1.3 Análise de Soluções Existentes](capitulo-1/1.3-analise-de-solucoes-existentes.md) | Comparativo das ferramentas atuais e lacunas identificadas |
| [1.4 Público-Alvo](capitulo-1/1.4-publico-alvo.md) | Perfil dos usuários da ferramenta |
| [1.5 Objetivos do Projeto](capitulo-1/1.5-objetivos-do-projeto.md) | Objetivo geral e objetivos específicos |
| [1.6 Métricas de Sucesso (KPIs)](capitulo-1/1.6-metricas-de-sucesso.md) | Indicadores de desempenho para avaliação do projeto |

---

## Capítulo 2 — Engenharia de Requisitos

| Seção | Descrição |
|-------|-----------|
| [2.1 Personas](capitulo-2/2.1-personas.md) | Perfis de usuários que orientam os requisitos do sistema |
| [2.2 Casos de Uso Principais](capitulo-2/2.2-casos-de-uso.md) | Fluxos de interação entre usuário e sistema |
| [2.3 Requisitos Funcionais](capitulo-2/2.3-requisitos-funcionais.md) | Funcionalidades que o sistema deve oferecer |
| [2.4 Requisitos Não Funcionais](capitulo-2/2.4-requisitos-nao-funcionais.md) | Critérios de qualidade, desempenho e segurança |
| [2.5 Regras de Negócio](capitulo-2/2.5-regras-de-negocio.md) | Regras e restrições do domínio da aplicação |
| [2.6 Fora do Escopo](capitulo-2/2.6-fora-do-escopo.md) | O que o projeto não cobre intencionalmente |

---

## Capítulo 3 — Fluxos e Comportamento do Sistema

| Seção | Descrição |
|-------|-----------|
| [3.1 Fluxo Principal do Usuário](capitulo-3/3.1-fluxos-e-comportamento.md) | Cadastro, criação de projeto, edição, assistência inteligente e exportação |
| [3.2 Fluxos Alternativos](capitulo-3/3.1-fluxos-e-comportamento.md#32-fluxos-alternativos) | Tratamento de erros e cancelamentos *(em elaboração)* |

---

## Capítulo 4 — Mockups e Experiência do Usuário (UX)
 
| Seção | Descrição |
|-------|-----------|
| [4.1 Fluxo de Navegação](capitulo-4/4.1-fluxo-de-navegacao.md) | Mapa de navegação entre as telas da aplicação |
| [4.2 Wireframes das Telas](capitulo-4/4.2-wireframes.md) | Wireframes das principais telas do sistema |
| [4.3 Fluxo de Interação](capitulo-4/4.3-fluxo-de-interacao.md) | Fluxos passo a passo dos principais cenários de uso |

---

## Capítulo 5 — Arquitetura do Sistema
 
| Seção | Descrição |
|-------|-----------|
| [5.1 Diagrama C4](capitulo-5/5.1-diagrama-c4.md) | Diagramas de Contexto, Container e Componentes |
| [5.2 Modelo de Dados](capitulo-5/5.2-modelo-de-dados.md) | DER, descrição das entidades e estrutura jsonb dos diagramas |
| [5.3 Principais Componentes](capitulo-5/5.3-principais-componentes.md) | Módulos do sistema e suas responsabilidades |
| [5.4 Stack Tecnológica](capitulo-5/5.4-stack-tecnologica.md) | Tecnologias utilizadas e justificativas |

---

## Capítulo 6 - Segurança e Privacidade

| Seção | Descrição |
|-------|-----------|
| [6.1 OWASP Top 10](capitulo-6/6.1-seguranca-e-privacidade.md#61-owasp-top-10) | Categorias do OWASP Top 10 aplicáveis ao sistema, com tabela de contramedidas e detalhamento das vulnerabilidades de maior risco: Broken Access Control, Cryptographic Failures e Injection. |
| [6.2 Autenticação e Autorização](capitulo-6/6.1-seguranca-e-privacidade.md#62-autenticação-e-autorização) | Fluxo de autenticação baseado em JWT, justificativa para não adoção de OAuth2 no MVP e estratégia de autorização por isolamento de tenant na camada de repositório. |
| [6.3 Criptografia de Dados em Repouso](capitulo-6/6.1-seguranca-e-privacidade.md#63-criptografia-de-dados-em-repouso) | Implementação de encryption at rest via Railway (AES-256) e encryption in transit via HTTPS/TLS, com distinção entre as duas camadas de proteção. |
| [6.4 Privacidade e LGPD](capitulo-6/6.1-seguranca-e-privacidade.md#64-privacidade-e-lgpd) | Dados coletados, finalidades, política de retenção e direitos do usuário conforme a Lei nº 13.709/2018, com nota sobre o contexto acadêmico do projeto. |

---
 
## Capítulo 7 — Planejamento do Projeto
 
| Seção | Descrição |
|-------|-----------|
| [7.1 Marcos de Desenvolvimento](capitulo-7/7.1-planejamento.md) | Fases incrementais de desenvolvimento alinhadas aos requisitos funcionais, com infraestrutura de qualidade, TDD, CI/CD e ferramentas de processo |
 
---
 
## Capítulo 8 — Referências
 
| Seção | Descrição |
|-------|-----------|
| [8.1 Referências](capitulo-8/8.1-referencias.md) | Modelo C4, segurança, tecnologias, ferramentas de design e repositório do projeto |
 
---
 
## Capítulo 9 — Apêndices
 
| Seção | Descrição |
|-------|-----------|
| [Apêndice A — Wireframes](capitulo-9/9.1-apendices.md#apêndice-a--wireframes) | 10 wireframes exportados das principais telas do sistema (home, login, cadastro, dashboard, editor, modal, IA, exportação) |
| [Apêndice B — Figuras de Referência](capitulo-9/9.1-apendices.md#apêndice-b--figuras-de-referência) | Imagens utilizadas no documento: pesquisa com usuários, análise de ferramentas e diagramas C4 do sistema |
| [Apêndice C — Resultados da Pesquisa com Usuários](capitulo-9/9.1-apendices.md#apêndice-c--resultados-da-pesquisa-com-usuários) | Formulário e dados coletados na pesquisa de validação com 42 respondentes |
| [Apêndice D — Repositório e Protótipo](capitulo-9/9.1-apendices.md#apêndice-d--repositório-e-protótipo) | Links para o repositório GitHub e protótipo da aplicação |
 
---
 
## Capítulo 10 — Parecer do Comitê de Avaliação
 
| Seção | Descrição |
|-------|-----------|
| [10.1 Avaliador 1](capitulo-10/10.1-avaliador-1.md) | Parecer, status e observações do primeiro avaliador |
| [10.2 Avaliador 2](capitulo-10/10.2-avaliador-2.md) | Parecer, status e observações do segundo avaliador |
| [10.3 Avaliador 3](capitulo-10/10.3-avaliador-3.md) | Parecer, status e observações do terceiro avaliador |
 
---

[← Voltar ao README](../README.md)
