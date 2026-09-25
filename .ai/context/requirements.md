---
owner: spec-analyst
sources:
  - docs/RFC-segmented/**
  - docs/revision/**
  - docs/schema.dbml
verified_at: 9fc266b
---
# Requirements — context card

## What it is
Index of the RFC (Portuguese). Agents read this card, then only the RFC section they need.

## Where things are
| Section | File |
|---|---|
| Product vision, personas | docs/RFC-segmented/01-visao-do-produto.md |
| Functional reqs (RF), business rules (RN), use cases | docs/RFC-segmented/02-engenharia-de-requisitos.md |
| Flows & behavior | docs/RFC-segmented/03-fluxos-e-comportamento.md |
| Mockups / UX (links to Figma, docs/img/fluxo) | docs/RFC-segmented/04-mockups-e-ux.md |
| Architecture (C4) | docs/RFC-segmented/05-arquitetura-do-sistema.md |
| Security, LGPD | docs/RFC-segmented/06-seguranca-e-privacidade.md |
| Planning | docs/RFC-segmented/07-planejamento-do-projeto.md |
| Target data model | docs/schema.dbml |

## MVP scope (from docs/revision/LLM_RFC_CHANGE_PLAN.md, canonical table RFC §2.7)
Auth · tenant creation · clients · services · agenda · manual booking · public booking link ·
manual payment per appointment · basic financial view · accessibility · TDD + coverage · public deploy.
Everything else is post-MVP (RN/RF items tagged `[Pós-MVP]` below).

## Status
- Done: auth (register/login/Google/email code/refresh/reset), consent, `tenants` table (DB only, no
  onboarding flow/API yet).
- Next (docs/history/to-do.md): single-node DB, read-after-write, overbooking concurrency,
  `tenant_id` → RLS propagation (RFC §5.3.2), S3.
- Not started: tenant onboarding flow, `tenant_memberships`/`roles` tables, clients, services, plans,
  agenda/availability, appointments, payments, financial view.

## RF/RN → implemented?
Legend: y = implemented, n = not implemented, partial = some pieces exist.

| ID | One-line summary | Implemented? |
|---|---|---|
| RF-01 | Cadastro por e-mail e senha | y |
| RF-02 | Login via Google OAuth | y |
| RF-03 | Recuperação de senha por e-mail | y |
| RF-04 | Editar perfil (nome, foto, contato, negócio) | n |
| RF-04a | Criar/selecionar tenant no onboarding | n (só a tabela `tenants` existe) |
| RF-05 | Multiusuário por tenant (convite) | n `[Pós-MVP]` |
| RF-06 | Permissões de colaborador | n `[Pós-MVP]` |
| RF-07 | Criar cliente | n |
| RF-08 | Editar / inativar / excluir cliente | n |
| RF-09 | Buscar/filtrar clientes | n |
| RF-10 | Histórico de atendimentos do cliente | n |
| RF-11 | Criar procedimento/serviço | n |
| RF-12 | Editar / inativar / excluir procedimento | n |
| RF-13 | Listar procedimentos | n |
| RF-14 | Criar plano | n `[Pós-MVP]` |
| RF-15 | Associar serviços a um plano | n `[Pós-MVP]` |
| RF-16 | Editar / inativar / excluir plano | n `[Pós-MVP]` |
| RF-17 | Listar planos | n `[Pós-MVP]` |
| RF-18 | Disponibilidade fixa | n |
| RF-19 | Disponibilidade livre | n |
| RF-20 | Criar agendamento manual | n |
| RF-21 | Editar / cancelar agendamento | n |
| RF-22 | Visualizar agenda dia/semana | n |
| RF-23 | Link público de agendamento | n |
| RF-24 | Confirmar/recusar solicitação | n |
| RF-25 | Bloquear horário | n |
| RF-26 | Registrar pagamento | n |
| RF-27 | Editar pagamento | n |
| RF-28 | Status de pagamento por atendimento | n |
| RF-29 | Resumo de receitas por período | n |
| RF-30 | Comparativo entre períodos | n `[Pós-MVP]` |
| RF-31 | Ranking de procedimentos | n `[Pós-MVP]` |
| RF-32 | Exportação de relatório | n `[Pós-MVP]` |
| RF-33–RF-36 | Notificações (confirmação/lembrete/cancelamento/config) | n `[Pós-MVP]` |
| RF-37–RF-42 | Formulários personalizados | n `[Pós-MVP]` |
| RF-43 | Ocupação e labels customizadas | n `[Pós-MVP]` |
| RN-01 | Acesso autenticado a recursos internos | partial (guard de auth existe; falta guard por tenant) |
| RN-02 | Isolamento por tenant (RLS) | n (tabela existe; RLS/`SET LOCAL app.current_tenant` pendente) |
| RN-03 | Permissões de colaboradores | n `[Pós-MVP]` |
| RN-04 | Cadastro de clientes (nome/e-mail obrigatórios, e-mail único por tenant) | n |
| RN-05 | Exclusão de clientes (soft delete com histórico) | n |
| RN-06 | Cadastro de procedimentos (valor ≥ 0) | n |
| RN-07 | Cadastro de planos | n `[Pós-MVP]` |
| RN-08 | Exclusão de planos | n `[Pós-MVP]` |
| RN-09 | Disponibilidade da agenda (precedência livre > fixa > bloqueio) | n |
| RN-10 | Criação de agendamentos (sem conflito/bloqueio) | n |
| RN-11 | Agendamentos via link público (status pendente até confirmação) | n |
| RN-12 | Alteração/cancelamento de agendamentos | n |
| RN-13 | Status de pagamento (valor ≥ 0, data não futura) | n |
| RN-14 | Edição de pagamentos | n |
| RN-15 | Relatórios financeiros (só pagamentos pagos) | n |
| RN-16 | Ranking de procedimentos | n `[Pós-MVP]` |
| RN-17–RN-19 | Notificações/lembretes/config de canais | n `[Pós-MVP]` |
| RN-20–RN-21 | Formulários personalizados | n `[Pós-MVP]` |
| RN-22 | Personalização de labels | n `[Pós-MVP]` |
| RN-23 | Configuração de ocupação profissional | n `[Pós-MVP]` |
| RN-24 | Integridade do histórico (preferir inativação) | n |
| RN-25 | Validação de operações críticas (dialog / texto de confirmação) | n |
| RN-26 | Política de senha (8+ chars, 1 número, 1 símbolo) | y |
