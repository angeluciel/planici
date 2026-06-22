# Changelog de edições do RFC

## Lote A — Requisitos (seções 1–2.5)

| Item alterado | Achado(s) resolvido(s) | Resumo da mudança |
|---|---|---|
| RF-08 | LÓGICA-001 | Renomeado para "Editar, inativar e excluir cliente"; exclusão definitiva só sem histórico, com histórico → inativação (soft delete); referencia RN-05/RN-24. |
| RF-12 | LÓGICA-002 | Renomeado para "Editar, inativar e excluir procedimento"; exclusão só sem vínculo, com vínculo → inativação; referencia RN-06/RN-24. |
| RF-16 | LÓGICA-003 | Renomeado para "Editar, inativar e excluir plano"; exclusão só sem uso, com uso → inativação; referencia RN-08/RN-24. |
| RF-33 | LÓGICA-029 | Envio de confirmação condicionado a canal configurado/habilitado; removida garantia absoluta ("o cliente recebe"); alinha RN-17/RN-19. |
| RF-34 | LÓGICA-029 | Lembrete condicionado a agendamento confirmado e canal configurado; alinha RN-17/RN-18/RN-19. |
| RF-35 | LÓGICA-029 | Notificação de cancelamento/remarcação condicionada a canal configurado; alinha RN-17/RN-19. |
| RF-04a (novo) | LÓGICA-031 | Novo RF MVP "Criar e selecionar tenant (espaço de trabalho)" como passo obrigatório do onboarding; referencia RN-02. Numerado com sufixo para evitar renumeração em cascata. |
| UC-04a (novo) | LÓGICA-031 | Novo caso de uso de criação/seleção de tenant na tabela 2.2.1, mapeado a RF-04a (rastreabilidade). |
| RF-05 | LÓGICA-020 | Anotado explicitamente que RBAC/convite é WANTS (fora do MVP); no MVP o tenant tem usuário único. |
| RF-06 | LÓGICA-020 | Anotado explicitamente que controle de permissões é WANTS, só aplicável quando RF-05 estiver disponível. |
| Seção 1.6 (KPI de agendamento) | LÓGICA-024 | Unificado o alvo do fluxo essencial em "< 5 minutos e < 5 cliques" (valor canônico), alinhado às seções 1.4/1.5; removido o conflito do "4 minutos". |
| Seção 1.6 (KPI de tempo de resposta) | LÓGICA-023 | Qualificado leitura (< 500ms) vs escrita (< 1s) conforme RNF-02 e page load (P95 < 2s) conforme RNF-01. |
| Seção 1.6 (KPI zero perda) | LÓGICA-025 | Ajustado para "zero perda em operação normal; em desastre, RPO ≤ 24h conforme RNF-06". |
| RNF-08 (metric) | LÓGICA-007 | Adicionada política de senha aos critérios de aceitação (mín. 8 caracteres, 1 número, 1 símbolo), com remissão à nova RN-26. |
| RN-26 (nova) | LÓGICA-007 | Nova regra de negócio definindo política de senha mensurável para RF-01 e RF-03, dando respaldo ao mockup da seção 4.2. |
| RN-13 | LÓGICA-010 | Fixada regra determinística: pagamentos com data futura (previsão) não são permitidos no MVP; removido o "salvo se o sistema permitir". |
| RN-25 | LÓGICA-012 | Especificado o mecanismo de "validação adicional": diálogo de confirmação para operações reversíveis; digitação de confirmação para ações irreversíveis. |
| RN-09 | LÓGICA-013 | Adicionada regra de precedência: disponibilidade livre substitui a fixa na data específica; bloqueios prevalecem sobre ambas. |
| Seção 2.1 (Personas) | LÓGICA-027 | Adicionada persona primária "Mariana" (terapeuta autônoma) alinhada à usuária-origem; Carlos passa a persona secundária. Índice atualizado. |

### Notas
- Para evitar renumeração em cascata de RF-05 em diante, o novo requisito de tenant foi numerado como **RF-04a** (e o caso de uso correspondente como **UC-04a**).
- Edições restritas às seções 1–2.5 (escopo do Lote A). Seções 3–8 não foram alteradas.

## Lote B — Arquitetura e Cronograma (seções 5, 7)

| Item alterado | Achado(s) resolvido(s) | Resumo da mudança |
|---|---|---|
| 5.3.3 Infraestrutura — PostgreSQL | ARQUIT-001 | Banco passa a single-node no MVP; documentada consistência read-after-write nativa para agenda/financeiro; réplica vira evolução futura opcional (lê do primário em fluxos sensíveis). |
| 5.4 PostgreSQL (cabeçalho e subseções) | ARQUIT-001 | Removida a topologia master-slave como padrão; corrigida a analogia incorreta "master-slave = CQRS"; topologia MVP single-node + réplica como otimização futura. |
| 5.3.2 Scheduling module | ARQUIT-002 | Especificada garantia de concorrência de overbooking no banco (`EXCLUDE USING gist` + `btree_gist` / `SELECT ... FOR UPDATE`), não só na aplicação. |
| 5.4 PostgreSQL (motivo da escolha) | ARQUIT-002 | Citados `EXCLUDE USING gist` e RLS como fatores da escolha do Postgres. |
| 5.3.2 Tenant module | ARQUIT-028 / ARQUIT-004 | Propagação de `tenant_id` ao contexto de sessão via `SET LOCAL` em transação (reset por commit/rollback no pool) + teste de zero vazamento; RBAC/convites marcados como WANTS (MVP = usuário único Owner). |
| 5.3.3 Infraestrutura — Object storage (novo) | ARQUIT-005 | Adicionado componente de object storage S3-compatível para foto de perfil (RF-04) e campos imagem/arquivo (RF-38): URLs assinadas, limites de tamanho/tipo, varredura de malware; binários fora do Postgres. |
| 5.1 Nível 3 (nota descritiva) | ARQUIT-005 / ARQUIT-008 | Nota textual indicando object storage e scheduler temporal não ilustrados na imagem, com remissão a 5.3.2/5.3.3. |
| 5.3.2 Notification module | ARQUIT-008 | Adicionado scheduler temporal de lembretes (cron worker + tabela `reminders` com idempotência); RabbitMQ não agenda jobs futuros. |
| 5.4 RabbitMQ | ARQUIT-008 / ARQUIT-011 | Esclarecido que o broker só despacha (não agenda); alternativa de baixo custo via fila no Postgres (outbox / `FOR UPDATE SKIP LOCKED`). |
| 5.3.3 Infraestrutura — Topologia de deploy (novo) | ARQUIT-011 | Documentada topologia alvo do MVP coerente com baixo custo (single-node, broker leve ou fila no banco, VM única/poucos contêineres). |
| 5.3.3 Infraestrutura — Observabilidade | ARQUIT-012 | Stack de observabilidade coerente: Sentry (erros) + uptime monitor dedicado; removida a menção a "Azure Standard Tests". |
| 5.4 NestJS (validação) | ARQUIT-013 | Definida estratégia única: `class-validator`/`class-transformer` como primária (boundary HTTP); `zod` restrito a payloads sem DTO (webhooks/env). |
| Seção 7 — tabela de marcos | ARQUIT-021/022/023/024 | Cronograma repriorizado: M1 vira fundação de arquitetura (3 semanas, gate de testes e RLS desde o início); M7 sobrecarregado dividido em notificações (M7), formulários + workspace (M8); WANTS (RBAC/convites) movidos para fora do MVP; testes distribuídos por marco; entregáveis de segurança/LGPD embutidos por marco; horizonte de 13→14 semanas. |

### Notas
- Edições restritas às seções 5 (5.1–5.4) e 7 (escopo do Lote B). Seções 1–2.5 (Lote A), 6 (Lote C) e ortografia global (Lote D) não foram tocadas.
- Texto descritivo adicionado em 5.1 (imagem-only) em vez de editar o diagrama.

## Lote C — LGPD e Segurança (seções 6, 1.2)

| Item alterado | Achado(s) resolvido(s) | Resumo da mudança |
|---|---|---|
| 1.2 "Projeto solicitado por" (CNPJ) | LGPD-009 | CNPJ real mascarado ("informado em sigilo; ex.: 62.XXX.XXX/0001-00") e separador "\0001" corrigido para "/0001". |
| 6.1 Autenticação — nova subseção "Proteção contra força bruta e credential stuffing" | ARQUIT-029 | Lockout progressivo por conta, proteção por conta+IP contra credential stuffing distribuído e MFA/2FA opcional (TOTP) ao menos para Owner. |
| 6.1 nova subseção "Segurança do Link Público de Agendamento" | ARQUIT-025 | CAPTCHA/challenge, verificação de contato, limites por slug/janela, slugs não enumeráveis e expiração de solicitações pendentes no endpoint não autenticado (RF-23). |
| 6.1 nova subseção "Tokens em Links Acionáveis de Notificação" | ARQUIT-027 | Tokens assinados, de uso único, com expiração e escopo a um único agendamento para links de confirmar/cancelar (RF-33–35); ou declaração explícita caso não existam. |
| 6.1 nova subseção "Controle de Exportação de Dados" | ARQUIT-030 | Exportação (RF-32/RNF-13) restrita por papel, reautenticação para export completo, limite de frequência e alerta de auditoria em export volumoso. |
| 6.1 nova subseção "Segurança das Integrações Externas e Webhooks" | ARQUIT-031 | Validação de assinatura/origem de webhooks de entrada (Evolution API/e-mail) e proteção contra SSRF (allowlist) nas integrações configuráveis pelo tenant. |
| 6.2 nova subseção "Bases Legais do Tratamento" | LGPD-001, LGPD-008 | Tabela finalidade→hipótese art. 7 (execução de contrato V; legítimo interesse IX; consentimento I); aceite de Termos classificado como execução de contrato, não consentimento. |
| 6.2 nova subseção "Papéis: Controlador e Operador" | LGPD-002 | Profissional = controlador dos dados dos clientes; Planici = operador; cláusula de tratamento conforme art. 39. |
| 6.2 "Dados Sensíveis (art. 11)" (reescrita de "Dados Potencialmente Sensíveis") | LGPD-003 | Reconhecimento expresso de dados sensíveis de saúde; consentimento específico/destacado, criptografia em repouso obrigatória para observações/formulários e menção a RIPD/DPIA (art. 38). |
| 6.2 "Aceite Contratual, Consentimento e Transparência" | LGPD-008 | Esclarecida a base de execução de contrato (art. 7, V) vs. consentimento (art. 7, I; revogável, art. 8, §5); complementa o RNF-12 sem editar a seção 2.4. |
| 6.2 "Compartilhamento com Terceiros" | LGPD-006 | Suboperadores sob contrato de tratamento (art. 39); operadores principais identificados; cláusula de transferência internacional (arts. 33-35). |
| 6.2 "Armazenamento e Retenção" | LGPD-004 | Prazos concretos: eliminação/anonimização em até 30 dias após encerramento; logs 90 dias (RNF-11); backups 7 dias (RNF-06). |
| 6.2 "Direitos do Titular" (reescrita de "Solicitação de Acesso...") | LGPD-005 | Direitos garantidos no MVP (acesso, correção, exclusão, portabilidade, oposição art.18§2, revogação art.8§5); canal do Encarregado e prazo de 15 dias (art. 19); deixa de ser "WANTS". |
| 6.2 nova subseção "Aviso de Privacidade no Link Público" | LGPD-010, ARQUIT-026 | Aviso de privacidade e base legal/consentimento ao cliente final na página do link público, no momento da coleta (art. 9). |
| 6.2 nova subseção "Encarregado pelo Tratamento (DPO) e Resposta a Incidentes" | LGPD-007 | Indicação de Encarregado/DPO com canal de contato (art. 41) e plano de resposta a incidentes com notificação à ANPD e titulares (art. 48). |
| 6.2 "Responsabilidades do Usuário" | LGPD-002 | Reforçado o papel do profissional como controlador e do Planici como operador (remissão à cláusula do art. 39). |

### Notas
- Edições restritas à seção 6 (6.1 e 6.2) e à correção pontual do CNPJ na seção 1.2 (escopo do Lote C). Não foram tocadas as seções 1.x (exceto CNPJ), 2.x, 5, 7 nem a ortografia global (Lote D).
- ARQUIT-024 (marco dedicado de LGPD/segurança no cronograma) foi endereçado no Lote B (seção 7), não no Lote C.

## Lote D — Ortografia, Gramática e Terminologia (global)

| Achado | Status | Resumo da mudança |
|---|---|---|
| ORTOG-001 | corrigido | "ldiar" → "lidar" (seção 3.2). |
| ORTOG-002 | corrigido | "necessária o modelo" → "necessária para o modelo" (seção 1.2). |
| ORTOG-003 | corrigido | "Segunda Solução: Google Calendar" → "Terceira Solução: Google Calendar" (seção 1.3). |
| ORTOG-004 | corrigido | "à R$100" → "a R$ 100" (seção 1.3, Acuity). |
| ORTOG-005 | corrigido | "autonomos" → "autônomos" (seção 1.3). |
| ORTOG-006 | corrigido | Padronizado "dia-a-dia" → "dia a dia" (2 ocorrências, seções 1.4 e 1.6). |
| ORTOG-007 | corrigido | "crescimento da de tenants" → "crescimento da base de tenants" (RNF-22). |
| ORTOG-008 | corrigido | "Disaster Recover (RTO)" → "Disaster Recovery (RTO)" (RNF-05). |
| ORTOG-009 | corrigido | "atendendo à legal de consentimento exigida pela LGPD" → "atendendo à exigência legal de consentimento prevista na LGPD" (RNF-12). |
| ORTOG-010 | corrigido | "Domain-Driver Design" → "Domain-Driven Design" e link "domain-drive-hexagon" → "domain-driven-hexagon" (seção 5.4). |
| ORTOG-011 | corrigido | "móudlo" → "módulo" (seção 5.4, NestJS). |
| ORTOG-012 | já resolvido / inexistente | Trecho "via à `class-validator`" foi reescrito pelo Lote B (estratégia de validação); a crase indevida não existe mais. |
| ORTOG-013 | corrigido | "confirmidade ACID" → "conformidade ACID" (seção 5.4, PostgreSQL). |
| ORTOG-014 | já resolvido / inexistente | Trecho "mesom princípio" (analogia master-slave/CQRS) foi reescrito pelo Lote B; não existe mais. |
| ORTOG-015 | corrigido | "clico de vida" → "ciclo de vida" (seção 5.4, RabbitMQ). |
| ORTOG-016 | corrigido | "whatsapp" → "WhatsApp" na seção 5.4 (RabbitMQ); demais ocorrências do corpo já estavam corretas. |
| ORTOG-017 | corrigido | "com nos mockups" → "com base nos mockups" (nota inicial da seção 4). |
| ORTOG-018 | corrigido | "modelo de organizações do Sup." → "do Supabase." (seção 4.1). |
| ORTOG-019 | corrigido | Fixado termo canônico em RN-22: "Serviço/Procedimento = mesma entidade interna (`service`)" e "Plano/Pacote = `plan`"; variação reservada à camada de labels. Sem renomear o corpo. |
| ORTOG-020 | corrigido | Padronizada sigla para MER: índice (5.2) e alt-text do diagrama atualizados; definida na primeira ocorrência da seção 5.2 ("Modelo Entidade-Relacionamento (MER)"). |
| ORTOG-021 | corrigido | Definidas por extenso na primeira ocorrência (5.3.2): "DDD (Domain-Driven Design)" e "CQRS (Command Query Responsibility Segregation)"; "event-driven" → "orientada a eventos". |
| ORTOG-022 | corrigido | Forma extensa na primeira ocorrência: RBAC (Role-Based Access Control) em RF na seção 2.3; DI (Dependency Injection) em 5.4. RLS já vinha extensa na 1ª ocorrência (RNF-07). |
| ORTOG-023 | corrigido | Cabeçalhos das tabelas de RNF traduzidos: "Atributo de Qualidade", "Descrição", "Métrica / Critério de Aceitação", "Prioridade" (todas as tabelas da seção 2.4). |
| ORTOG-024 | corrigido | Padronizado "Wants" → "WANTS" nas células das tabelas de RNF (4 ocorrências). |
| ORTOG-025 | corrigido | "mes" → "mês" (3 ocorrências, seção 1.3); "max" → "máx." na abreviação de agendamentos/mês. |
| ORTOG-026 | já resolvido / inexistente | Referência cruzada de ORTOG-002 e ORTOG-009, ambos já corrigidos; sem trecho próprio. |
| ORTOG-027 | corrigido | Tag "<h4/>" mal fechada → "</h4>" e "Image" → "Imagem" (3 ocorrências de `<summary>` na seção 1.3). |

### Notas
- Edições restritas a linguagem, ortografia, gramática, siglas, terminologia e idioma de cabeçalhos (escopo do Lote D). Não foram alterados conteúdo técnico, requisitos nem estrutura, nem revertidas mudanças dos Lotes A/B/C.
- ORTOG-012 e ORTOG-014 já haviam sido eliminados pela reescrita da seção 5.4 no Lote B; nada a fazer.
- ORTOG-019/020/021/022 acrescentam apenas definição/canonização de termos na primeira ocorrência, sem renomear o corpo do documento.
