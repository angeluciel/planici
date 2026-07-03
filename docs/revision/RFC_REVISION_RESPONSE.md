# Resposta da Revisão — Planejamento de Mudanças do RFC do Planici

> Documento gerado conforme o formato exigido em `revision/LLM_RFC_CHANGE_PLAN.md`, seção 8.
> Arquivo-alvo: `docs/RFC.md` (v1.0, 2373 linhas).

---

## Parte 1 — Diagnóstico

Foco principal: Simplificar a arquitetura inicial para reduzir risco: NestJS modular, PostgreSQL, RLS e scheduler simples já seriam suficientes para uma entrega forte.

Principais conflitos entre o RFC atual e a revisão recebida, em ordem de gravidade:

### C1. Notificações e-mail/WhatsApp classificadas como MVP (conflito mais grave)
RF-33 a RF-36 estão marcados como **MVP** (linhas ~714–733), incluindo WhatsApp via Evolution API e configuração de credenciais de integração. A revisão exige que WhatsApp, integrações externas de notificação e scheduler complexo de lembretes sejam **Pós-MVP**. O conflito se propaga por: objetivos específicos (1.5), RN-17/RN-18/RN-19, arquitetura (Notification module, RabbitMQ, cron worker + tabela `reminders` em 5.3.2/5.3.3/5.4), segurança (webhooks Evolution/SSRF, tokens em links acionáveis em 6.1), LGPD (compartilhamento com suboperador WhatsApp em 6.2) e cronograma (M7 inteiro).

### C2. Formulários personalizados completos como MVP
RF-37 a RF-42 estão como **MVP**, incluindo campos de imagem/arquivo (RF-38) que puxam o object storage para o MVP. A revisão exige formulários personalizados completos e uploads/anexos como **Pós-MVP**. Propagação: RF-07/RF-11/RF-14 contêm a expressão "ou utilizar um formulário personalizado" (que a revisão manda remover dos RFs de MVP), UC-42 a UC-48, RN-20/RN-21, arquitetura (object storage em 5.1/5.3.3), LGPD (dados sensíveis em formulários), cronograma (M8).

### C3. Arquitetura superdimensionada para o MVP
A seção 5 declara DDD + arquitetura hexagonal **orientada a eventos com CQRS** como obrigação (5.3.2), RabbitMQ como componente da stack (5.3.3, 5.4, índice), cron worker de lembretes, object storage e preparação para microservices. A revisão exige: NestJS modular + Next.js + PostgreSQL + RLS no MVP; RabbitMQ, event-driven, CQRS obrigatório, workers e microservices → Pós-MVP. O próprio RFC já hedgeia ("a fila pode ser implementada no próprio PostgreSQL"), mas mantém RabbitMQ como compromisso.

### C4. Estratégia de testes incompatível com a linha Web Apps
RNF-19 define "Cobertura ≥ 70% (unitários + integração) nos módulos críticos". A revisão exige: **backend ≥ 75%**, **frontend ≥ 25%**, **TDD nos fluxos críticos**, integração nos módulos do MVP e **ao menos 1 teste E2E** do fluxo principal. Não há menção a TDD nem a cobertura de frontend no RFC atual.

### C5. Acessibilidade como WANTS
RNF-18 (WCAG 2.1 AA) está como **WANTS**. A revisão exige acessibilidade como **MVP** nos fluxos principais, com critérios mínimos (teclado, foco visível, contraste, labels, erro textual, estados vazios, nome acessível de botões, link público mobile).

### C6. Ausência de ferramenta de análise estática nomeada
RNF-20 (CI/CD) não cita SonarCloud/SonarQube/CodeClimate. A revisão exige ferramenta nomeada com quality gate bloqueando merge/deploy.

### C7. Ausência de plano de deploy público
Não existe seção de deploy com provedor, URL/domínio, estratégia de build/deploy, banco, backup, variáveis de ambiente, migrations, validação e rollback. Hoje há apenas fragmentos (RNF-04/05/06, "Topologia de deploy do MVP" em 5.3.3) sem provedor nem URL.

### C8. Ausência de plano de validação com usuários
O RFC valida apenas com a "usuária principal" (KPI 1.6, M9). A revisão exige validação com **3 a 5 profissionais autônomos** de perfis diferentes, com tarefas, métricas e tabela de evidências, além de plano de validação pós-MVP com a usuária principal.

### C9. Financeiro além do básico como MVP
RF-30 (comparativo entre períodos), RF-31 (ranking de procedimentos) e RF-32 (exportação PDF/Excel) estão como **MVP**. A revisão manda mover comparativo avançado, ranking e exportação para **Pós-MVP** (visão financeira do MVP = resumo básico por período). Propagação: UC-35/36/37, RN-16, Finance module (5.3.2), objetivos específicos (1.5, "ranking de procedimentos"), controle de exportação (6.1).

### C10. Planos/pacotes complexos como MVP
RF-14 a RF-17 (planos com ciclo de cobrança, moeda, override de preço por item) estão como **MVP**. A revisão classifica planos/pacotes complexos como **Pós-MVP**, salvo vínculo básico estritamente necessário. Propagação: UC-16–20, RN-07/RN-08, RF-20/RN-10 ("cliente, plano ou serviço"), fluxo de navegação 4.1 (seção `planos`), M3.

### C11. Personalização de labels/ocupação como MVP
RF-43, UC-49/50, RN-22/RN-23 e todo o passo 2 do onboarding de tenant (4.2 "Personalização dos Nomes") tratam labels/ocupação como MVP. A revisão classifica como "Pós-MVP ou desejável, não core". Também é promessa central em 1.5 e no diferencial (1.3).

### C12. Resíduos de multiusuário fora dos RFs
RF-05/RF-06 já estão como WANTS (correto), mas o multiusuário vaza em: fluxo 3.1/4.3 ("ingressar em uma empresa existente por convite", passos 10), tela "Empresas — Estado Vazio" (4.2), RN-02 ("salvo se possuir vínculo autorizado"), RN-03, seção 6.1 (papéis Owner/Admin/Member/Viewer e permissões granulares como se fossem do sistema), e "configurar adequadamente permissões de colaboradores" (6.2).

### C13. KPIs desalinhados (1.6)
KPI de "80% das funcionalidades do plano gratuito utilizadas" pressupõe plano comercial (não existe na entrega acadêmica). Faltam KPIs do fluxo central e KPI de validação com usuários (taxa de sucesso por tarefa).

### C14. Objetivos específicos com promessas amplas (1.5)
Prometem notificações e-mail/WhatsApp, formulários personalizados, personalização por ocupação e ranking — tudo adiado pela revisão.

### C15. Mistura entre produto comercial e entrega acadêmica
1.3 "Diferencial do Projeto" promete versão paga mais barata e versão gratuita completa; 6.2 lista "plano contratado" como dado do tenant. Falta nota separando MVP acadêmico (Portfólio II) de evolução comercial.

### C16. Ausência de artefatos exigidos
Não existem: tabela MVP × Pós-MVP; matriz de rastreabilidade; critérios de aceite (Gherkin) do fluxo central; tabela de telas × estados × mobile/desktop; evidências visuais de link público, pagamento e financeiro (mockups 4.2 cobrem apenas onboarding/tenant e uma visão geral).

### C17. Contradições internas menores
- RNF-13/RNF-14 são WANTS, mas 6.2 "Direitos do Titular" afirma que o atendimento é "obrigatório do MVP, e não um item WANTS" (resolvido via canal manual DPO — precisa ficar explícito que a *tela automatizada* é WANTS e o *atendimento manual* é MVP).
- RNF-01 "@ 500 usuários simultâneos" e RNF-22 "5.000 tenants" são metas de escala incompatíveis com MVP acadêmico de baixo custo.
- Mockup "Definição de Senha" referencia RNF-15 onde deveria ser RNF-08/RN-26.
- 4.2 é declarado mobile-first sem cobertura desktop/web, contrariando a exigência de equilíbrio mobile/desktop.

---

## Parte 2 — Plano de alteração

| Seção do RFC | Problema encontrado | Alteração planejada | Prioridade |
|---|---|---|---|
| Identificação / Índice | Índice cita "RF-01 a RF-43" e "Next.js, NestJS, PostgreSQL e RabbitMQ" (5.4); não lista novas seções | Atualizar descrições do índice; remover RabbitMQ do título de 5.4; adicionar entradas para novas seções (Validação com Usuários, Plano de Deploy Público, Critérios de Aceite, Matriz de Rastreabilidade, tabela MVP × Pós-MVP); subir versão para v1.1 com data da revisão | Média |
| 1.3 Diferencial | Promessas comerciais (versão paga/gratuita) como se fossem entrega | Manter análise competitiva, mas adicionar nota de escopo acadêmico (texto 4.6 do brief) logo após o diferencial | Alta |
| 1.5 Objetivos | Objetivos específicos prometem notificações, formulários personalizados, labels/ocupação, ranking | Reescrever objetivos específicos limitados ao fluxo central; mover promessas adiadas para novo parágrafo "Evolução futura" | Alta |
| 1.6 KPIs | KPI de plano gratuito; falta KPI de validação | Substituir por KPIs do fluxo central + KPI de validação com 3–5 profissionais (taxa de sucesso ≥ 80% por tarefa) | Alta |
| 2.2 Casos de Uso | UC-05/06, UC-16–20, UC-35–37, UC-38–41, UC-42–48, UC-49/50 apresentados sem distinção de fase | Adicionar coluna "Fase" (MVP / Pós-MVP) às tabelas de UC; marcar módulos 2.2.4 (planos), 2.2.7 parcial (UC-35/36/37), 2.2.8 (notificações), 2.2.9 (formulários), 2.2.10 (labels) e UC-05/06 como Pós-MVP | Alta |
| 2.3 RFs | RF-14–17, RF-30–32, RF-33–36, RF-37–42, RF-43 como MVP; RF-07/11/14 citam formulário personalizado | Reclassificar prioridades conforme tabela 5.2 do brief; remover "ou utilizar um formulário personalizado" de RF-07/RF-11/RF-14; trocar rótulo "WANTS" → "Pós-MVP" (ou definir legenda MVP / Pós-MVP / WANTS) | **Crítica** |
| 2.4 RNFs | RNF-18 WANTS; RNF-19 "70% módulos críticos"; RNF-20 sem SonarCloud; RNF-01/22 metas de escala irreais; RNF-11 auditoria WANTS mas exigida em 6.1/M2 | RNF-18 → MVP com critérios mínimos; RNF-19 → 75% backend / 25% frontend / TDD / E2E; RNF-20 → citar SonarCloud com quality gate bloqueante; ajustar RNF-01 (remover "@500 usuários"), RNF-22 (meta "stateless", sem número de tenants); RNF-11 → logs mínimos de ações críticas como MVP, retenção/relatórios avançados Pós-MVP | **Crítica** |
| 2.5 RNs | RN-03 (colaboradores), RN-16 (ranking), RN-17/18/19 (notificações), RN-20/21 (formulários), RN-22/23 (labels/ocupação) pressupõem funcionalidades adiadas | Marcar RN-03, RN-16, RN-17, RN-18, RN-19, RN-20, RN-21, RN-22, RN-23 como "[Pós-MVP]" no título; RN-07/RN-08 condicionar à fase dos planos; manter demais | Alta |
| 2.6 Fora de Escopo | OK em si | Sem mudança estrutural; opcionalmente referenciar nova tabela MVP × Pós-MVP para distinguir "fora de escopo" de "adiado" | Baixa |
| 3 Fluxos | Onboarding inclui "ingressar por convite"; faltam fluxos MVP (cliente, serviço, agenda, pagamento, financeiro) e critérios de aceite | Remover convite do fluxo 3.1 (nota: convite é Pós-MVP); listar os 9 fluxos MVP do brief (item 5.3) com referência à nova seção de critérios de aceite; atualizar diagramas que mostrem convite/notificação (tarefa pendente de imagem) | Alta |
| 4 Mockups e UX | Só onboarding/tenant tem evidência; sem desktop; sem estados; sem telas de link público/pagamento/financeiro; personalização de labels apresentada como MVP | Adicionar tabela Fluxo × Mobile × Desktop × Estados × Status; marcar telas de personalização de labels como Pós-MVP; adicionar tarefas pendentes de mockup (link público, pagamento, financeiro, agenda, serviços) com pasta `docs/img/fluxo/` a completar; incluir plano de revisão do Figma | Alta |
| 5 Arquitetura | CQRS/hexagonal/event-driven como obrigação; RabbitMQ na stack; cron worker; object storage; microservices-ready | Reescrever 5.3/5.4 com texto-base do brief (4.4): Next.js + NestJS modular + PostgreSQL + RLS; mover RabbitMQ, CQRS, event-driven, workers, object storage e microservices para subseção "Evolução Pós-MVP"; remover RabbitMQ de 5.4 como compromisso (manter como candidato futuro); atualizar diagramas C4 (tarefa pendente) | **Crítica** |
| 6 Segurança/LGPD | RBAC 4 papéis, webhooks WhatsApp/SSRF, tokens de links acionáveis, controle de exportação — dependem de features adiadas; direitos do titular vs RNF-13/14 ambíguo | Manter núcleo MVP (hash, JWT/refresh, RLS, rate limit, CORS, LGPD do link público, logs mínimos); marcar como "[Pós-MVP]" os blocos: Autorização RBAC além de Owner, Webhooks/Evolution, Tokens em links de notificação, Controle de exportação, MFA; explicitar: atendimento manual a direitos do titular = MVP, tela automatizada/exportação self-service = Pós-MVP; remover "plano contratado" dos dados do tenant | Alta |
| 7 Planejamento | M7 (notificações) e M8 (formulários) entregam features adiadas; sem marco de validação com usuários; sem SonarCloud/deploy explícitos | Substituir cronograma pelo M1–M9 do brief (5.7): M1 fundação+SonarCloud+deploy inicial; M2 auth+tenant; M3 clientes+serviços; M4 agenda; M5 link público; M6 pagamento+financeiro; M7 UX/acessibilidade; M8 validação 3–5 usuários; M9 hardening+E2E+deploy final | **Crítica** |
| (nova) Validação com Usuários | Inexistente | Criar seção com plano de teste (3–5 perfis, 9 tarefas, métricas) + tabela de evidências + plano de validação pós-MVP com usuária principal | **Crítica** |
| (nova) Plano de Deploy Público | Inexistente | Criar seção com tabela provedor/URL/banco/backup/rollback + env vars mínimas + migrations + validação de deploy | **Crítica** |
| (nova) Critérios de Aceite | Inexistente | Criar seção com os 5 cenários Gherkin do brief (cliente, serviço, agenda, link público, pagamento) | **Crítica** |
| (nova) Tabela MVP × Pós-MVP | Inexistente | Inserir tabela do brief (4.1) — sugerido no início da seção 2 ou como 2.7 | **Crítica** |
| (nova) Matriz de Rastreabilidade | Inexistente | Inserir matriz do brief (4.2) ligando problema → RF → fluxo → tela → RN → KPI → teste — sugerido como 2.8 | Alta |
| 8 Referências | RabbitMQ referenciado como stack | Manter referência ou mover para nota de evolução futura; adicionar referência do SonarCloud e do provedor de deploy escolhido | Baixa |

---

## Parte 3 — Patch textual sugerido

Para cada seção: **novo texto**, **texto a remover/reclassificar** e **notas de consistência**.

### 3.1 Seção 1.3 - Nota de escopo acadêmico (inserir após "Diferencial do Projeto")

**Novo texto:**

> **Nota de escopo: entrega acadêmica vs. produto comercial**
>
> O Portfólio II entregará um MVP acadêmico funcional focado no fluxo essencial de gestão de agenda, clientes, serviços, pagamentos manuais e visão financeira básica. Funcionalidades comerciais mais amplas, como planos pagos, múltiplos usuários, integrações com WhatsApp, formulários avançados, automações e arquitetura distribuída, são tratadas como evolução futura e não compõem o escopo obrigatório da entrega acadêmica.

**Remover/reclassificar:** manter os bullets de "Por que criar algo novo?" como visão de produto, mas condicionados pela nota (não são promessas do MVP).

**Consistência:** essa nota é a âncora citada por 1.5, 1.6, 2.3, 5 e 7.

---

### 3.2 Seção 1.5 — Objetivos do Projeto

**Novo texto (objetivos específicos):**

- Implementar autenticação segura com cadastro por e-mail/senha (e login Google OAuth, se mantido), com isolamento completo de dados por tenant.
- Permitir a criação de um espaço de trabalho (tenant) por profissional no onboarding, com um único usuário (Owner) no MVP.
- Desenvolver o cadastro e a gestão básica de clientes (criar, editar, buscar, inativar com histórico).
- Desenvolver o cadastro e a gestão básica de serviços/procedimentos (nome, duração, valor padrão; inativação preservando histórico).
- Construir a agenda com disponibilidade básica, visualização diária/semanal, agendamento manual e prevenção de conflito de horário.
- Disponibilizar um link público simples por tenant para solicitação de agendamento sem conta, com confirmação ou recusa pelo profissional.
- Implementar registro manual de pagamento por atendimento, com status (pago, pendente, cancelado) e visão financeira básica (resumo por período).
- Garantir acessibilidade (WCAG 2.1 AA) nos fluxos principais do MVP.
- Garantir conformidade com a LGPD: consentimento, minimização de dados e aviso de privacidade no link público.
- Aplicar TDD nos fluxos críticos, com cobertura mínima de 75% no backend e 25% no frontend, análise estática via SonarCloud e deploy público documentado.

**Novo parágrafo final:**

> **Evolução futura (fora do MVP):** notificações automáticas por e-mail/WhatsApp, formulários personalizados, personalização de labels por ocupação, planos/pacotes, comparativos e rankings financeiros, exportação de relatórios, multiusuário por tenant e arquitetura distribuída serão avaliados em fases posteriores, caso a necessidade seja validada.

**Remover:** os objetivos atuais sobre "planos", "notificações automáticas via e-mail e WhatsApp", "formulários personalizados" e "personalização da interface por ocupação" como compromissos do MVP.

**Consistência:** o objetivo de performance (< 2s / 5 cliques) pode ser mantido; ele já é coerente com RNF-01/1.4.

---

### 3.3 Seção 1.6 — KPIs

**Novo texto:**

- A usuária principal executa o fluxo central completo (conta → tenant → serviço → cliente → agenda → agendamento → pagamento → consulta financeira) sem auxílio externo.
- Agendamento completo criado em menos de 5 minutos e menos de 5 cliques (valor canônico, seções 1.4/1.5).
- Cliente e serviço cadastrados sem auxílio, em menos de 2 minutos cada.
- Solicitação pelo link público concluída por um cliente externo sem instruções.
- **Validação com usuários:** taxa de sucesso ≥ 80% por tarefa nos testes com 3 a 5 profissionais autônomos (ver seção de Validação com Usuários).
- Tempo de resposta (RNF-02) e page load (RNF-01) mantidos.
- Zero perda de dados em operação normal; RPO ≤ 24h em desastre (RNF-06).

**Remover:** "Pelo menos 80% das funcionalidades do plano gratuito utilizadas ativamente pela usuária após 30 dias" (pressupõe plano comercial).

**Consistência:** o novo KPI de validação referencia a seção nova (3.9 deste patch); a matriz de rastreabilidade usa esses KPIs.

---

### 3.4 Seção 2.2 — Casos de Uso

**Alteração:** adicionar coluna **Fase** a todas as tabelas de UC.

| Grupo | Fase |
|---|---|
| UC-01 a UC-04a (auth, perfil, tenant) | MVP |
| UC-05, UC-06 (convite, permissões) | Pós-MVP |
| UC-07 a UC-11 (clientes) | MVP |
| UC-12 a UC-15 (serviços) | MVP |
| UC-16 a UC-20 (planos/pacotes) | Pós-MVP |
| UC-21 a UC-30 (agenda, link público, confirmação, bloqueio) | MVP |
| UC-31 a UC-33 (pagamentos) | MVP |
| UC-34 (resumo por período) | MVP |
| UC-35 a UC-37 (comparativo, ranking, exportação) | Pós-MVP |
| UC-38 a UC-41 (notificações) | Pós-MVP |
| UC-42 a UC-48 (formulários) | Pós-MVP |
| UC-49, UC-50 (ocupação/labels) | Pós-MVP |

**Consistência:** o diagrama `use-case.png` precisará de revisão (tarefa pendente de imagem — não inventar; registrar como pendência).

---

### 3.5 Seção 2.3 — Requisitos Funcionais

**Reclassificações de prioridade:**

| RF | De | Para |
|---|---|---|
| RF-01, RF-03, RF-04, RF-04a | MVP | MVP (mantém) |
| RF-02 (Google OAuth) | MVP | MVP (mantém — env vars já previstas; alternativa aceitável: Desejável) |
| RF-05, RF-06 | WANTS | Pós-MVP |
| RF-07 a RF-13 | MVP | MVP (mantém, com edição de texto abaixo) |
| RF-14 a RF-17 (planos) | MVP | Pós-MVP |
| RF-18 a RF-25 (agenda/link público) | MVP | MVP (mantém) |
| RF-26 a RF-28 (pagamentos) | MVP | MVP (mantém) |
| RF-29 (resumo por período) | MVP | MVP (mantém) |
| RF-30 (comparativo) | MVP | Pós-MVP |
| RF-31 (ranking) | MVP | Pós-MVP |
| RF-32 (exportação PDF/Excel) | MVP | Pós-MVP |
| RF-33 a RF-36 (notificações) | MVP | Pós-MVP |
| RF-37 a RF-42 (formulários) | MVP | Pós-MVP |
| RF-43 (ocupação/labels) | MVP | Pós-MVP |

**Edições de texto:**

- RF-07: remover ", ou utilizar um formulário personalizado" → "O profissional pode cadastrar um cliente com nome, telefone, e-mail e observações."
- RF-11: remover ", ou utiliza um formulário personalizado" → "O profissional cadastra procedimentos com nome, duração estimada e valor padrão."
- RF-14: remover ", ou utilizar um formulário personalizado" (o RF inteiro vai para Pós-MVP).
- RF-08: remover "planos ou formulários aplicados" da lista de vínculos de histórico do MVP (manter atendimentos e pagamentos), ou anotar que planos/formulários só se aplicam Pós-MVP.
- RF-10: remover "planos ativos" da ficha do cliente no MVP (manter atendimentos, procedimentos e valores pagos).
- RF-20: "escolhendo cliente, plano ou serviço" → "escolhendo cliente, serviço, data e horário" (plano é Pós-MVP).

**Consistência:** trocar o rótulo "WANTS" por "Pós-MVP" em RF-05/RF-06 ou incluir legenda única (MVP / Pós-MVP) usada em RFs, RNFs e UCs. A menção "planos Basic ou superior" em RF-05 deve sair (plano comercial não existe na entrega acadêmica).

---

### 3.6 Seção 2.4 — Requisitos Não Funcionais

**RNF-18 (Acessibilidade) — novo texto:**

> Prioridade: **MVP**. Os fluxos principais do MVP (login, criação de tenant, cadastro de cliente, cadastro de serviço, agenda, agendamento manual, link público, registro de pagamento e visão financeira básica) devem atender WCAG 2.1 AA com, no mínimo: navegação por teclado, foco visível, contraste adequado, labels acessíveis nos campos, feedback de erro textual (não apenas visual), estados vazios compreensíveis, botões com nome acessível e fluxo público utilizável em mobile.

**RNF-19 (Test Coverage) — novo texto:**

> A estratégia de testes adota **TDD nos fluxos críticos** (autenticação, tenant, agenda/conflito, link público, pagamentos). Cobertura mínima: **backend ≥ 75%** e **frontend ≥ 25%**. Testes obrigatórios: unitários no backend; integração no backend para autenticação, tenant, clientes, serviços, agenda, link público e pagamentos; testes de componentes/fluxos principais no frontend; e **pelo menos um teste E2E** cobrindo o fluxo principal do MVP (conta → tenant → serviço → cliente → agenda → agendamento → pagamento → visão financeira).

**Remover:** "Cobertura ≥ 70% (unitários + integração) nos módulos críticos".

**RNF-20 (CI/CD) — acrescentar:**

> **SonarCloud** será utilizado como ferramenta de análise estática de código, code smells, bugs, duplicações, cobertura de testes e vulnerabilidades. O pipeline de CI deverá executar análise automatizada e bloquear merge/deploy quando o quality gate mínimo não for atendido.

**Ajustes de escala:**

- RNF-01: remover "@ 500 usuários simultâneos" (manter P95 < 2s em 4G).
- RNF-22: manter API stateless como princípio; remover a meta "até 5.000 tenants sem refatoração" (mover para evolução futura).
- RNF-11 (Audit Logging): dividir — logs mínimos de ações críticas (login, alterações, exclusões) = **MVP**; retenção ≥ 90 dias e trilha completa de auditoria = Pós-MVP. (Resolve a contradição com 6.1 e M2, que exigem auditoria desde já.)
- RNF-13/RNF-14: manter como Pós-MVP a *automação* (tela/exportação self-service), anotando que o atendimento **manual** via DPO é obrigação legal já no MVP (alinha com 6.2).
- RNF-21 (Observability): manter Sentry + uptime monitor; corrigir "Azure Standard Tests" (resíduo) — já corrigido em 5.3.3, alinhar o texto do RNF.

**Consistência:** o M1 do novo cronograma referencia SonarCloud; a seção de deploy referencia o gate de testes.

---

### 3.7 Seção 2.5 — Regras de Negócio

**Reclassificar (adicionar marcador "[Pós-MVP]" ao título):** RN-03 (colaboradores), RN-07 e RN-08 (planos), RN-16 (ranking), RN-17, RN-18, RN-19 (notificações), RN-20, RN-21 (formulários), RN-22, RN-23 (labels/ocupação).

**Editar:**
- RN-05: remover "planos ou formulários aplicados" dos vínculos de histórico no MVP.
- RN-10: "cliente, serviço ou plano" → "cliente, serviço" no MVP (nota: plano quando disponível).
- RN-12: idem ("serviço ou plano").
- RN-25: remover "alterar permissões de colaborador" e "alterar configurações de notificação" dos exemplos de operações críticas do MVP (ou marcar como Pós-MVP).

**Manter sem mudança:** RN-01, RN-02 (a ressalva "salvo vínculo autorizado" pode ficar, com nota de que só se materializa no Pós-MVP), RN-04, RN-06, RN-09, RN-11, RN-13, RN-14, RN-15 (remover a frase sobre ranking se RN-16 sair), RN-24, RN-26.

---

### 3.8 Seção 3 — Fluxos

**Novo texto (introdução de 3.1):**

> O fluxo principal descreve a primeira interação do profissional com o sistema: do acesso inicial até a entrada no espaço de trabalho. No MVP, cada profissional cria seu próprio tenant no onboarding; o ingresso em tenant existente por convite é evolução Pós-MVP.

**Adicionar (novo bloco em 3.1 ou 3.3):** lista dos fluxos cobertos pelo MVP, com referência à seção de critérios de aceite:

1. Primeiro acesso e criação de tenant.
2. Cadastro de cliente.
3. Cadastro de serviço.
4. Configuração de agenda.
5. Agendamento manual.
6. Solicitação pelo link público.
7. Confirmação/recusa da solicitação.
8. Registro de pagamento manual.
9. Consulta da visão financeira básica.

**Remover/ajustar:** menções a convite no fluxo principal; no Fluxo 2 (cancelamento), trocar "o cliente seja notificado (caso os canais estejam ativos)" por "o cliente pode ser comunicado pelo profissional por canal externo; notificação automática é Pós-MVP".

**Consistência:** diagramas `main-flow.svg`, `secondary-flow.svg`, `thirtiary-flow.svg` e `use-case.png` que exibam convite/notificação automática precisam de atualização — **tarefa pendente de imagem** (não inventar).

---

### 3.9 (Nova) Seção — Validação com Usuários

Sugestão: nova subseção **2.7 Validação com Usuários** (ou 4.4).

**Novo texto:**

> #### Plano de validação do MVP
>
> O MVP será validado com **3 a 5 profissionais autônomos** de perfis distintos (ex.: terapeuta, nutricionista, personal trainer, esteticista, consultor autônomo). Cada participante executará as tarefas do fluxo central: criar conta; criar tenant; cadastrar cliente; cadastrar serviço; configurar agenda; criar agendamento manual; solicitar horário pelo link público; registrar pagamento; consultar a visão financeira básica.
>
> Métricas coletadas: taxa de sucesso por tarefa; tempo de execução por tarefa; dúvidas ou bloqueios observados; feedback qualitativo; intenção de uso.
>
> | Participante | Perfil | Tarefas testadas | Taxa de sucesso | Principais dificuldades | Ajustes gerados |
> |---|---|---:|---:|---|---|
> | P1 | Terapeuta | MVP completo | A preencher | A preencher | A preencher |
> | P2 | Nutricionista | MVP completo | A preencher | A preencher | A preencher |
> | P3 | Personal trainer | MVP completo | A preencher | A preencher | A preencher |
> | P4 (opcional) | Esteticista | MVP completo | A preencher | A preencher | A preencher |
>
> #### Validação pós-MVP com a usuária principal
>
> | Etapa | Descrição | Métrica |
> |---|---|---|
> | Teste guiado | Usuária executa fluxo completo sem intervenção | Taxa de sucesso por tarefa |
> | Medição de tempo | Cronometrar cliente → serviço → agenda → pagamento | Tempo total e tempo por etapa |
> | Feedback qualitativo | Registrar dúvidas, termos confusos e fricções | Lista de ajustes priorizados |
> | Reteste | Repetir fluxo após correções | Redução de erros e tempo |

**Consistência:** referenciada pelo KPI de validação (1.6) e pelo marco M8 do novo cronograma.

---

### 3.10 Seção 4 — Mockups e UX

**Adicionar tabela de cobertura de telas:**

| Fluxo | Mobile | Desktop/Web | Estados necessários | Status |
|---|---|---|---|---|
| Login | Sim | Sim | erro/loading/sucesso | A validar |
| Onboarding / criação de tenant | Sim | Sim | vazio/erro/sucesso | A validar |
| Cadastro de cliente | Sim | Sim | vazio/erro/sucesso | Pendente (mockup) |
| Cadastro de serviço | Sim | Sim | vazio/erro/sucesso | Pendente (mockup) |
| Agenda | Sim | Sim | vazio/conflito/loading | Pendente (mockup) |
| Agendamento manual | Sim | Sim | erro/confirmação | Pendente (mockup) |
| Link público | Sim | Sim | vazio/erro/confirmação | Pendente (mockup) |
| Pagamento manual | Sim | Sim | erro/sucesso | Pendente (mockup) |
| Financeiro básico | Sim | Sim | vazio/loading | Pendente (mockup) |

**Tarefas pendentes (não inventar imagens):**

- Criar/atualizar no Figma e exportar para `docs/img/fluxo/` (estrutura existente) ou `docs/assets/mockups/`: cadastro de cliente, cadastro de serviço, agenda, agendamento manual, link público, pagamento manual, financeiro básico — em mobile **e** desktop.
- Revisar o Figma: equilibrar mobile/desktop; organizar fluxos navegáveis; nomear telas; incluir estados de erro, vazios, loading, confirmação de ações críticas.

**Reclassificar:** telas "Novo Tenant — Passo 2: Personalização dos Nomes" (e Passo 1b) → marcar como Pós-MVP (RF-43 adiado); tela "Empresas — Estado Vazio" → remover a ação "Ingressar em uma empresa existente por convite" do texto (convite é Pós-MVP); em 4.3, ajustar passos 10, 13 e 14 (remover convite e personalização de labels do fluxo obrigatório) e passo 16 (remover "formulários e planos" da navegação do MVP).

**Consistência:** corrigir referência do mockup de senha: RNF-15 → RNF-08/RN-26. A tabela alimenta a matriz de rastreabilidade.

---

### 3.11 Seção 5 — Arquitetura

**Novo texto (abertura de 5.3, substituindo a promessa hexagonal/CQRS/event-driven):**

> No MVP, o Planici será implementado como uma aplicação web com frontend Next.js, backend NestJS modular e PostgreSQL como banco relacional. O isolamento entre tenants será garantido por `tenant_id` e Row-Level Security no banco. A arquitetura evita dependências distribuídas no MVP, reduzindo risco de entrega. Mensageria dedicada, workers complexos, RabbitMQ e integrações externas serão avaliados em fase Pós-MVP, caso a necessidade seja validada.

**Manter no MVP:** módulos NestJS por domínio (Auth, Tenant, Scheduling, Domain, Finance); mecânica de RLS com `SET LOCAL` (5.3.2 — texto atual está bom); constraint anti-overbooking `EXCLUDE USING gist` (texto atual está bom); PostgreSQL single-node com backup diário; Sentry + uptime monitor; CI/CD com gate de testes + SonarCloud; deploy enxuto.

**Mover para subseção nova "Evolução Pós-MVP" (remover do corpo do MVP):**

- "arquitetura hexagonal orientada a eventos com CQRS" como obrigação (manter DDD/módulos como estilo, CQRS como opção futura);
- **Notification module** inteiro (consome eventos, filas, e-mail/WhatsApp);
- **RabbitMQ** (5.3.3 e bloco dedicado em 5.4) — deixa de ser componente da stack do MVP;
- **scheduler temporal / cron worker + tabela `reminders`** (depende de lembretes, que são Pós-MVP);
- **object storage S3-compatível** (depende de RF-38 uploads; foto de perfil RF-04 pode usar armazenamento simples ou ficar sem upload no MVP — decidir e registrar);
- nota do diagrama de componentes (5.1) sobre object storage + scheduler;
- réplica de leitura (já está como evolução futura — manter);
- item "3. Preparado para padrões de sistemas distribuídos" de 5.4 (reduzir a uma frase: NestJS suporta decomposição futura, sem compromisso).

**Consistência:** diagramas C4 (context, container, componentes) mostram RabbitMQ/filas — **tarefa pendente de imagem**: atualizar diagramas para a topologia MVP (frontend, backend, banco) com nota de evolução. Índice 5.4 deixa de citar RabbitMQ. Referência bibliográfica do RabbitMQ pode permanecer como evolução futura.

---

### 3.12 (Nova) Seção — Plano de Deploy Público

Sugestão: nova subseção **5.5 Plano de Deploy Público** (mantém tema de arquitetura/infra).

**Novo texto:**

> ## Plano de Deploy Público
>
> | Item | Definição |
> |---|---|
> | Frontend | AWS Amplify Host |
> | Backend | AWS Lambda |
> | Banco de dados | Neon (sem orçamento para usar RDS) |
> | URL pública | `https://planici.co` |
> | Ambiente | Produção pública para avaliação acadêmica |
> | Build | Build automatizado no CI a partir da branch `main` |
> | Backup | Backup diário automático, RPO ≤ 24h, retenção ≥ 7 dias (RNF-06) |
> | Migrations | Executadas automaticamente no pipeline de deploy antes da publicação com drizzle-kit generate, com falha bloqueando o deploy |
> | Deploy | Pipeline CI/CD com testes + quality gate SonarCloud obrigatórios antes da publicação (RNF-20) |
> | Validação do deploy | Health check da API, smoke test do fluxo principal e verificação da URL pública após cada publicação |
> | Rollback | Reverter para o último build estável do provedor e restaurar backup do banco quando necessário |
>
> Variáveis de ambiente mínimas do MVP:
>
> ```env
> DATABASE_URL=
> JWT_SECRET=
> JWT_REFRESH_SECRET=
> NEXT_PUBLIC_API_URL=
> CORS_ORIGIN=
> GOOGLE_CLIENT_ID=
> GOOGLE_CLIENT_SECRET=
> SONAR_TOKEN=
> SENTRY_DSN=
> NODE_ENV=production
> ```
>
> Variáveis de WhatsApp/Evolution API, RabbitMQ, SMTP transacional e object storage **não** integram o MVP e serão documentadas quando as respectivas funcionalidades forem implementadas (Pós-MVP).

**Consistência:** provedor e URL são decisões do autor. Deixar marcadores "*definir*" é aceitável no plano, mas o checklist do brief exige definição explícita antes de finalizar o RFC. Referenciar no M1 do cronograma ("prova de deploy público mínima").

---

### 3.13 (Nova) Seção — Critérios de Aceite do Fluxo Principal

Sugestão: nova subseção **3.3 Critérios de Aceite** (junto aos fluxos) — inserir os cinco cenários Gherkin do brief, na íntegra (seção 6 do brief): criar cliente; criar serviço/procedimento; configurar disponibilidade básica; solicitar agendamento pelo link público; registrar pagamento manual.

**Consistência:** cada cenário deve referenciar seus RFs/RNs (cliente → RF-07/RN-04/RN-02; serviço → RF-11/RN-06; agenda → RF-18/RF-19/RN-09/RN-10; link público → RF-23/RF-24/RN-11 + aviso LGPD; pagamento → RF-26/RN-13/RN-15). A matriz de rastreabilidade aponta para eles.

---

### 3.14 (Novas) Tabela MVP × Pós-MVP e Matriz de Rastreabilidade

Sugestão: **2.7 Tabela MVP × Pós-MVP** e **2.8 Matriz de Rastreabilidade** (ou como anexos), inserindo as tabelas do brief (4.1 e 4.2) na íntegra, com uma adaptação: na linha "Arquitetura", o MVP é "NestJS modular, Next.js, PostgreSQL e RLS" (sem hexagonal/CQRS obrigatórios).

**Consistência:** a tabela MVP × Pós-MVP é a fonte canônica de fase; RFs, UCs, RNs e cronograma devem apontar para ela em caso de dúvida.

---

### 3.15 Seção 6 — Segurança e Privacidade

**Manter como MVP:** hash bcrypt, política de senha (RN-26), JWT/refresh com rotação, verificação de e-mail, recuperação de senha, lockout progressivo básico, RLS + `tenant_id`, rate limiting, CORS restrito + headers, TLS, tratamento seguro de erros, LGPD (consentimento, minimização, aviso no link público, papéis controlador/operador, DPO, retenção), logs mínimos de ações críticas, segurança do link público (CAPTCHA/limites/slug não enumerável/expiração de pendentes).

**Marcar como "[Pós-MVP]" (dependem de funcionalidades adiadas):**

- "Autorização e Permissões" com papéis Admin/Member/Viewer e permissões granulares → no MVP existe apenas **Owner** único; reescrever o parágrafo de abertura para dizer isso e mover o modelo RBAC para Pós-MVP;
- "Tokens em Links Acionáveis de Notificação" → ativar a cláusula final que o próprio texto já prevê: declarar que **o MVP não implementa links acionáveis** (notificações são Pós-MVP), dispensando os controles até lá;
- "Segurança das Integrações Externas e Webhooks" (Evolution/SSRF) → Pós-MVP;
- "Controle de Exportação de Dados" → Pós-MVP (RF-32 e RNF-13 adiados);
- credenciais de integração WhatsApp em "Dados Sensíveis" → Pós-MVP;
- MFA/TOTP opcional → pode permanecer como desejável, não obrigatório do MVP.

**Editar em 6.2:**

- Dados do tenant: remover "plano contratado", "configurações de notificações" e "credenciais de integração" do MVP (marcar Pós-MVP);
- Dados de clientes: remover "respostas de formulários personalizados", "arquivos ou imagens anexadas" e "preferências de notificação" do MVP;
- Finalidades: remover "envio de notificações..." do MVP;
- Suboperadores: marcar provedor de e-mail transacional e Evolution API como Pós-MVP (Google OAuth permanece se RF-02 ficar);
- "Dados Sensíveis (art. 11)": manter o princípio para campos livres/observações (que existem no MVP), removendo as menções a formulários personalizados como funcionalidade corrente;
- "Direitos do Titular": manter — e explicitar a divisão: atendimento **manual** via DPO = MVP; automação (tela/exportação) = Pós-MVP (alinha com RNF-13/14);
- "Responsabilidades do Usuário": remover "configurar adequadamente permissões de colaboradores" do MVP.

**Consistência:** cada bloco Pós-MVP deve citar o RF adiado que o motivará, para não parecer requisito órfão.

---

### 3.16 Seção 7 — Planejamento

**Novo cronograma (substitui a tabela atual):**

> O cronograma entrega o MVP enxuto validável. O gate de testes no CI/CD (RNF-20) e a análise SonarCloud vigoram desde M1; cada módulo entrega seus testes com TDD, mantendo backend ≥ 75% e frontend ≥ 25% (RNF-19).

| Marco | Entrega | Observações | Prazo sugerido |
|---|---|---|---|
| M1 | Fundação técnica: repositórios, Next.js + NestJS modular, PostgreSQL + RLS (`SET LOCAL`), CI/CD com gate de testes, SonarCloud e deploy inicial | Prova de deploy público mínima | Semanas 1–2 |
| M2 | Autenticação e criação de tenant | Testes backend com TDD; consentimento LGPD versionado | Semanas 3–4 |
| M3 | Clientes e serviços (CRUD, busca, inativação) | Critérios de aceite + acessibilidade dos fluxos | Semanas 5–6 |
| M4 | Agenda e agendamento manual | Prevenção de conflito garantida no banco (`EXCLUDE USING gist`); testes de concorrência | Semanas 7–8 |
| M5 | Link público simples | Solicitação sem conta, anti-abuso básico e aviso de privacidade | Semana 9 |
| M6 | Pagamento manual e financeiro básico | Status e resumo por período; módulo crítico com TDD | Semana 10 |
| M7 | UX, acessibilidade e mockups finais | Mobile + desktop/web; estados vazios/erro/loading | Semana 11 |
| M8 | Validação com 3 a 5 usuários | Preencher tabela de evidências; ajustes priorizados | Semana 12 |
| M9 | Hardening, teste E2E do fluxo principal, deploy público final e documentação | Checklist final de consistência | Semanas 13–14 |

**Remover:** M7 atual (Notificações + scheduler) e M8 atual (Formulários personalizados + labels) — funcionalidades Pós-MVP, fora do plano de entrega.

**Consistência:** nota introdutória atual cita "cobertura mínima de 70% nos módulos críticos (RNF-19)" — atualizar para 75%/25%. M9 deve referenciar tanto a usuária principal (validação pós-MVP) quanto o checklist.

---

### 3.17 Seção 8 — Referências

**Adicionar:** SonarCloud (SONARSOURCE. *SonarCloud Documentation*.) e documentação do provedor de deploy escolhido.
**Ajustar:** referência do RabbitMQ pode permanecer, anotada como evolução futura (ou removida se preferir enxugar).

---

## Checklist de consistência (estado-alvo após aplicar o plano)

- [ ] O MVP está limitado ao escopo obrigatório da revisão. *(via patches 3.2–3.7)*
- [ ] Existe tabela "MVP × Pós-MVP". *(patch 3.14)*
- [ ] RabbitMQ foi removido do MVP. *(patch 3.11 — inclui pendência de diagramas C4)*
- [ ] WhatsApp foi removido do MVP. *(patches 3.5, 3.11, 3.15)*
- [ ] Multiusuário e RBAC avançado foram removidos do MVP. *(patches 3.5, 3.8, 3.10, 3.15)*
- [ ] Formulários personalizados completos foram removidos do MVP. *(patches 3.5, 3.7, 3.10, 3.15)*
- [ ] Exportação avançada foi removida do MVP. *(patches 3.5, 3.15)*
- [ ] Scheduler complexo foi removido do MVP. *(patch 3.11)*
- [ ] Arquitetura distribuída foi movida para evolução futura. *(patch 3.11)*
- [ ] Acessibilidade dos fluxos principais está como MVP. *(patch 3.6, RNF-18)*
- [ ] Testes indicam 75% backend e 25% frontend. *(patch 3.6, RNF-19)*
- [ ] TDD está descrito como estratégia. *(patches 3.2, 3.6, 3.16)*
- [ ] SonarCloud está indicado explicitamente. *(patches 3.6, 3.12, 3.16, 3.17)*
- [ ] Deploy público tem provedor, URL/domínio, banco, backup e env vars. *(patch 3.12 — **decisão pendente do autor: provedor e URL definitivos**)*
- [ ] Validação com 3 a 5 profissionais está planejada. *(patch 3.9)*
- [ ] Validação com a usuária principal pós-MVP está planejada. *(patch 3.9)*
- [ ] Critérios de aceite do fluxo principal foram adicionados. *(patch 3.13)*
- [ ] Matriz de rastreabilidade foi adicionada. *(patch 3.14)*
- [ ] Mockups aparecem no RFC ou há plano explícito para inserir evidências visuais. *(patch 3.10 — tabela + tarefas pendentes; **não** inventar imagens)*
- [ ] Mobile e desktop/web estão representados na seção de UX. *(patch 3.10)*
- [ ] Não há contradições entre RF, RNF, arquitetura, segurança, cronograma e KPIs. *(varredura final após aplicar todos os patches — atenção às propagações mapeadas no diagnóstico C1–C17)*
- [ ] O RFC diferencia entrega acadêmica de produto comercial futuro. *(patch 3.1)*

### Decisões pendentes do autor (bloqueiam itens do checklist)

1. **Provedor e URL de deploy** — escolher (ex.: Vercel + Render + Neon) e fixar no patch 3.12.
2. **RF-02 (login Google)** — manter no MVP (env vars previstas) ou reclassificar como desejável.
3. **Foto de perfil (RF-04)** — manter com armazenamento simples ou adiar upload (evita object storage no MVP).
4. **Imagens** — atualizar diagramas (use-case, main-flow, C4) e criar mockups faltantes no Figma; exportar para `docs/img/`.
