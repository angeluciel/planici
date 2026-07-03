# Brief para LLM — Planejamento de Revisão do RFC do Planici

## 1. Objetivo

Você é uma LLM atuando como revisora técnica e planejadora de mudanças no documento `docs/RFC.md` do repositório `angeluciel/planici`.

Sua tarefa é **planejar e orientar a revisão do RFC**, sem aumentar o escopo do projeto. O foco é adequar o documento à revisão recebida, tornando o MVP mais realista para a linha **Web Apps** e separando claramente o que será entregue no Portfólio II do que ficará para evolução futura.

> Arquivo-alvo principal: `docs/RFC.md`  
> Escopo desta tarefa: documentação do RFC, planejamento, critérios de aceite, matriz de rastreabilidade, testes, deploy e priorização de requisitos.  
> Fora do escopo desta tarefa: implementação de código de produto, criação real de telas, deploy real, integração real com serviços externos.

---

## 2. Diretriz central da mudança

O RFC atual deve ser reorientado para um **MVP enxuto, validável e entregável academicamente**.

O documento deve deixar claro que o MVP obrigatório inclui apenas:

1. Autenticação.
2. Criação de tenant / espaço de trabalho.
3. Cadastro e gestão básica de clientes.
4. Cadastro e gestão básica de serviços/procedimentos.
5. Agenda.
6. Agendamento manual pelo profissional.
7. Link público simples para solicitação de agendamento.
8. Pagamento manual por atendimento.
9. Visão financeira básica.
10. Acessibilidade nos fluxos principais do MVP.
11. Testes com TDD e cobertura mínima exigida.
12. Deploy público documentado.

Tudo que não for essencial para esse fluxo deve ser tratado como **Pós-MVP**, **WANTS** ou **evolução comercial futura**.

---

## 3. Mudanças obrigatórias a refletir no RFC

### 3.1 Reduzir e priorizar o MVP realista

Revisar todas as seções do RFC para que o MVP obrigatório fique limitado ao fluxo central:

```text
Conta criada → tenant criado → serviço cadastrado → cliente cadastrado → agenda configurada → agendamento criado manualmente ou solicitado pelo link público → pagamento registrado manualmente → visão financeira básica consultada.
```

Atualizar principalmente:

- Identificação / índice, se necessário.
- `1.5 Objetivos do Projeto`.
- `1.6 Métricas de Sucesso (KPIs)`.
- `2.2 Casos de Uso Principais`.
- `2.3 Requisitos Funcionais`.
- `2.4 Requisitos Não Funcionais`.
- `3 Fluxos e Comportamento do Sistema`.
- `4 Mockups e UX`.
- `5 Arquitetura do Sistema`.
- `7 Planejamento do Projeto`.

### 3.2 Mover para Pós-MVP / evolução futura

Mover explicitamente para fase posterior:

- RabbitMQ.
- Arquitetura distribuída.
- Microservices.
- CQRS/event-driven como obrigação arquitetural.
- Multiusuário por tenant.
- RBAC avançado.
- Convites de colaboradores.
- Formulários personalizados completos.
- Uploads/anexos em formulários personalizados.
- WhatsApp.
- Integrações externas complexas de notificação.
- Exportação avançada de relatórios.
- Scheduler complexo de lembretes.
- Planos comerciais avançados.
- Permissões por papel além de Owner único.

Atenção: não basta mover um item em uma tabela. É necessário remover contradições em objetivos, requisitos, regras, arquitetura, segurança, cronograma e KPIs.

### 3.3 Ampliar validação com usuários

Adicionar ou revisar seção de validação para contemplar:

- Entrevistas ou testes com pelo menos **3 a 5 profissionais autônomos**.
- Perfis diferentes, por exemplo:
  - terapeuta;
  - nutricionista;
  - personal trainer;
  - esteticista;
  - consultor/prestador de serviço autônomo.
- Tarefas do teste:
  - criar conta;
  - criar tenant;
  - cadastrar cliente;
  - cadastrar serviço;
  - configurar agenda;
  - criar agendamento manual;
  - solicitar horário pelo link público;
  - registrar pagamento;
  - consultar visão financeira básica.
- Métricas:
  - taxa de sucesso por tarefa;
  - tempo de execução por tarefa;
  - dúvidas ou bloqueios observados;
  - feedback qualitativo;
  - intenção de uso.

Incluir uma tabela de evidências de validação, mesmo que inicialmente preenchida como plano:

| Participante | Perfil | Tarefas testadas | Taxa de sucesso | Principais dificuldades | Ajustes gerados |
|---|---|---:|---:|---|---|
| P1 | Terapeuta | MVP completo | A preencher | A preencher | A preencher |
| P2 | Nutricionista | MVP completo | A preencher | A preencher | A preencher |
| P3 | Personal trainer | MVP completo | A preencher | A preencher | A preencher |

### 3.4 Ajustar estratégia de testes

Alterar o RNF de testes para atender à linha Web Apps:

- Backend: **mínimo de 75% de cobertura**.
- Frontend: **mínimo de 25% de cobertura**.
- Estratégia: **TDD** nos fluxos críticos.
- Testes obrigatórios:
  - unitários no backend;
  - integração no backend para autenticação, tenant, clientes, serviços, agenda, link público e pagamentos;
  - testes de componentes ou fluxos principais no frontend;
  - pelo menos um teste E2E do fluxo principal do MVP.

Substituir qualquer meta genérica como “70% nos módulos críticos” pela regra acima.

### 3.5 Indicar ferramenta de análise estática e segurança

Adicionar ferramenta explícita de qualidade e segurança.

Recomendação para o RFC:

```text
SonarCloud será utilizado como ferramenta de análise estática de código, code smells, bugs, duplicações, cobertura de testes e vulnerabilidades. O pipeline de CI deverá executar análise automatizada e bloquear merge/deploy quando o quality gate mínimo não for atendido.
```

Atualizar o RNF de CI/CD, qualidade e segurança para citar a ferramenta nominalmente.

### 3.6 Detalhar plano de deploy público

Adicionar uma seção específica de deploy público com, no mínimo:

- Provedor escolhido.
- URL/domínio planejado.
- Estratégia de build.
- Estratégia de deploy do frontend.
- Estratégia de deploy do backend.
- Banco de dados.
- Política de backup.
- Variáveis de ambiente.
- Como rodar migrations.
- Como validar o deploy.
- Como rollback será tratado.

Exemplo de estrutura a incluir no RFC:

```md
## Plano de Deploy Público

| Item | Definição |
|---|---|
| Frontend | A definir explicitamente no RFC: ex. Vercel, Render ou outro provedor escolhido |
| Backend | A definir explicitamente no RFC: ex. Render, Fly.io, Railway, VM ou outro provedor escolhido |
| Banco de dados | PostgreSQL gerenciado ou instância PostgreSQL documentada |
| URL pública | `https://planici.<provedor-ou-dominio>` |
| Ambiente | Produção pública para avaliação acadêmica |
| Backup | Backup diário com RPO máximo de 24h |
| Deploy | Pipeline CI/CD com testes obrigatórios antes da publicação |
| Rollback | Reverter para último build estável e restaurar backup quando necessário |
```

Variáveis mínimas a documentar:

```env
DATABASE_URL=
JWT_SECRET=
JWT_REFRESH_SECRET=
NEXT_PUBLIC_API_URL=
CORS_ORIGIN=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SONAR_TOKEN=
SENTRY_DSN=
NODE_ENV=production
```

Se algum item não for usado no MVP, remover da lista ou marcar como Pós-MVP. Não manter variáveis de WhatsApp, RabbitMQ ou integrações futuras como obrigatórias do MVP.

### 3.7 Elevar acessibilidade para requisito do MVP

Alterar acessibilidade de WANTS para MVP nos fluxos principais:

- Login.
- Criação de tenant / onboarding essencial.
- Agenda.
- Cadastro de cliente.
- Cadastro de serviço, se fizer parte do fluxo principal.
- Link público de agendamento.
- Registro de pagamento manual.
- Visão financeira básica.

Critérios mínimos:

- Navegação por teclado.
- Foco visível.
- Contraste adequado.
- Labels acessíveis nos campos.
- Feedback de erro textual, não apenas visual.
- Estados vazios compreensíveis.
- Botões com nome acessível.
- Fluxo público utilizável em mobile.

### 3.8 Definir critérios de aceite para o fluxo mais importante

Adicionar critérios de aceite para o fluxo central:

1. Criação de cliente.
2. Criação de serviço.
3. Configuração de agenda.
4. Solicitação de agendamento pelo link público.

Usar formato claro, preferencialmente Gherkin.

Exemplo:

```gherkin
Cenário: Profissional cadastra um cliente com dados mínimos
Dado que o profissional está autenticado e possui um tenant ativo
Quando informa nome e ao menos um contato válido do cliente
E confirma o cadastro
Então o cliente deve ser salvo vinculado ao tenant ativo
E deve aparecer na listagem de clientes
E não deve ser visível para nenhum outro tenant
```

---

## 4. Recomendações de melhoria a incorporar

### 4.1 Criar tabela “MVP x Pós-MVP”

Adicionar ao RFC uma tabela objetiva como esta:

| Área | MVP / Portfólio II | Pós-MVP / Evolução futura |
|---|---|---|
| Autenticação | Cadastro, login, recuperação de senha e tenant único por usuário | Login social adicional, políticas avançadas de sessão |
| Tenant | Criação de um espaço de trabalho por profissional | Múltiplos usuários por tenant, convites, papéis e permissões |
| Clientes | CRUD básico, busca e inativação quando houver histórico | Campos avançados, segmentações e importação/exportação |
| Serviços | CRUD básico de serviços/procedimentos | Pacotes complexos, regras avançadas de preço |
| Agenda | Disponibilidade básica, visualização diária/semanal e agendamento manual | Scheduler avançado, lembretes automáticos, integrações de calendário |
| Link público | Solicitação simples de horário sem conta | Confirmações automáticas, antifraude avançado, personalização profunda |
| Pagamentos | Registro manual de pagamento e status | Integração com gateways, cobrança online, conciliação automática |
| Financeiro | Resumo básico por período | Exportações avançadas, comparativos, rankings e dashboards completos |
| Notificações | Feedbacks internos simples da aplicação | E-mail transacional, WhatsApp, templates e webhooks |
| Formulários | Campos fixos mínimos para MVP | Formulários personalizados completos com anexos |
| Arquitetura | NestJS modular, Next.js, PostgreSQL e RLS | RabbitMQ, arquitetura distribuída, microservices, workers complexos |
| Qualidade | TDD, 75% backend, 25% frontend, SonarCloud e CI/CD | Observabilidade avançada e quality gates mais rigorosos |

### 4.2 Criar matriz de rastreabilidade

Adicionar matriz ligando problema, requisito, fluxo, tela, regra de negócio, KPI e teste.

Modelo recomendado:

| Problema / necessidade | Requisito | Fluxo / caso de uso | Tela / mockup | Regra de negócio | KPI | Teste / critério de aceite |
|---|---|---|---|---|---|---|
| Profissional perde tempo organizando clientes em planilhas | RF Cliente | Criar cliente | Tela de cadastro de cliente | Cliente pertence a um tenant | Cliente criado em menos de X min | Teste de criação de cliente |
| Profissional precisa organizar serviços ofertados | RF Serviço | Criar serviço | Tela de serviços | Serviço inativo não aparece em novos agendamentos | Serviço criado sem auxílio | Teste de criação de serviço |
| Profissional precisa controlar horários disponíveis | RF Agenda | Configurar agenda | Tela de agenda | Não permitir conflito de horário | Agendamento em menos de 5 min | Teste de configuração de agenda |
| Cliente precisa solicitar horário sem conta | RF Link público | Solicitar agendamento | Tela pública de agendamento | Solicitação inicia como pendente | Taxa de sucesso do link público | Teste E2E link público |
| Profissional precisa controlar recebimentos | RF Pagamento / Financeiro | Registrar pagamento | Tela de pagamento/financeiro | Receita considera pagamentos pagos | Consulta financeira compreendida | Teste de registro de pagamento |

### 4.3 Adicionar evidências visuais dos mockups

Na seção de UX, adicionar imagens dos fluxos principais diretamente no RFC, além do link do Figma.

Fluxos mínimos com evidência visual:

- Login.
- Onboarding / criação de tenant.
- Cadastro de cliente.
- Cadastro de serviço.
- Agenda.
- Agendamento manual.
- Link público de agendamento.
- Registro de pagamento.
- Visão financeira básica.

Também revisar o Figma para:

- equilibrar cobertura mobile e desktop/web;
- organizar fluxos navegáveis;
- nomear telas com clareza;
- incluir estados de erro;
- incluir estados vazios;
- incluir feedbacks de carregamento;
- incluir confirmação de ações críticas;
- incluir telas do link público;
- incluir telas de pagamento manual;
- incluir visão financeira básica.

Se as imagens ainda não existirem no repositório, planejar a criação de pasta, por exemplo:

```text
docs/assets/mockups/
  login-mobile.png
  login-desktop.png
  tenant-onboarding.png
  clientes-cadastro.png
  servicos-cadastro.png
  agenda.png
  agendamento-manual.png
  link-publico.png
  pagamento-manual.png
  financeiro-basico.png
```

Não inventar imagens. Se o arquivo não existir, inserir como tarefa pendente no plano.

### 4.4 Simplificar arquitetura inicial

Reformular a arquitetura do MVP para:

- Frontend: Next.js.
- Backend: NestJS modular.
- Banco: PostgreSQL.
- Isolamento multi-tenant: Row-Level Security com `tenant_id`.
- Scheduler: simples ou ausente no MVP, dependendo do fluxo final.
- Sem RabbitMQ obrigatório no MVP.
- Sem microservices.
- Sem arquitetura distribuída como promessa de entrega.

Texto-base sugerido:

```text
No MVP, o Planici será implementado como uma aplicação web com frontend Next.js, backend NestJS modular e PostgreSQL como banco relacional. O isolamento entre tenants será garantido por `tenant_id` e Row-Level Security no banco. A arquitetura evita dependências distribuídas no MVP, reduzindo risco de entrega. Mensageria dedicada, workers complexos, RabbitMQ e integrações externas serão avaliados em fase Pós-MVP, caso a necessidade seja validada.
```

### 4.5 Definir plano de validação após o MVP

Além da validação com 3 a 5 profissionais, incluir plano de validação com a usuária principal após o MVP.

Modelo:

| Etapa | Descrição | Métrica |
|---|---|---|
| Teste guiado | Usuária executa fluxo completo sem intervenção | Taxa de sucesso por tarefa |
| Medição de tempo | Cronometrar cliente → serviço → agenda → pagamento | Tempo total e tempo por etapa |
| Feedback qualitativo | Registrar dúvidas, termos confusos e fricções | Lista de ajustes priorizados |
| Reteste | Repetir fluxo após correções | Redução de erros e tempo |

### 4.6 Separar produto comercial futuro de entrega acadêmica

Adicionar seção ou nota explícita:

```text
O Portfólio II entregará um MVP acadêmico funcional focado no fluxo essencial de gestão de agenda, clientes, serviços, pagamentos manuais e visão financeira básica. Funcionalidades comerciais mais amplas, como planos pagos, múltiplos usuários, integrações com WhatsApp, formulários avançados, automações e arquitetura distribuída, são tratadas como evolução futura e não compõem o escopo obrigatório da entrega acadêmica.
```

---

## 5. Plano de edição por seção do RFC

### 5.1 Seção 1 — Visão do Produto

Ajustar objetivos para remover promessas amplas demais.

Fazer:

- Reforçar foco em profissionais autônomos individuais.
- Declarar que o MVP cobre gestão essencial, não plataforma comercial completa.
- Atualizar KPIs para medir o fluxo central.
- Adicionar KPI de validação com usuários.

Evitar:

- Prometer WhatsApp no MVP.
- Prometer personalização avançada no MVP.
- Prometer plano gratuito/comercial como se fosse entrega acadêmica.

### 5.2 Seção 2 — Engenharia de Requisitos

Reclassificar RFs.

Sugestão de classificação:

| Requisito atual / tema | Nova classificação |
|---|---|
| Cadastro, login, recuperação de senha | MVP |
| Criação de tenant | MVP |
| Multiusuário | Pós-MVP |
| RBAC avançado | Pós-MVP |
| Clientes | MVP |
| Serviços/procedimentos | MVP |
| Planos/pacotes complexos | Pós-MVP, salvo vínculo básico se estritamente necessário |
| Agenda básica | MVP |
| Agendamento manual | MVP |
| Link público simples | MVP |
| Confirmação/recusa pelo profissional | MVP, se mantido simples |
| Pagamento manual | MVP |
| Visão financeira básica | MVP |
| Comparativo financeiro avançado | Pós-MVP |
| Ranking de procedimentos | Pós-MVP, salvo se definido como visão básica |
| Exportação PDF/Excel | Pós-MVP |
| E-mail/WhatsApp de notificação | Pós-MVP |
| Scheduler de lembretes | Pós-MVP |
| Formulários personalizados completos | Pós-MVP |
| Labels/ocupação avançada | Pós-MVP ou desejável, não core |

Atualizar RFs para remover expressões como “ou utilizar formulário personalizado” dos requisitos MVP de cliente e serviço.

### 5.3 Seção 3 — Fluxos

Manter e detalhar apenas fluxos do MVP:

1. Primeiro acesso e criação de tenant.
2. Cadastro de cliente.
3. Cadastro de serviço.
4. Configuração de agenda.
5. Agendamento manual.
6. Solicitação pelo link público.
7. Confirmação/recusa da solicitação, se aplicável.
8. Registro de pagamento manual.
9. Consulta da visão financeira básica.

Adicionar critérios de aceite ou referenciar seção específica de critérios.

### 5.4 Seção 4 — Mockups e UX

Inserir:

- Link do Figma.
- Evidências visuais no próprio RFC.
- Tabela de telas necessárias para o MVP.
- Estados obrigatórios: vazio, erro, loading, sucesso e confirmação crítica.
- Cobertura mobile e desktop/web.

Tabela recomendada:

| Fluxo | Mobile | Desktop/Web | Estados necessários | Status |
|---|---|---|---|---|
| Login | Sim | Sim | erro/loading/sucesso | A validar |
| Cadastro de cliente | Sim | Sim | vazio/erro/sucesso | A validar |
| Agenda | Sim | Sim | vazio/conflito/loading | A validar |
| Link público | Sim | Sim | vazio/erro/confirmação | A validar |
| Pagamento manual | Sim | Sim | erro/sucesso | A validar |
| Financeiro básico | Sim | Sim | vazio/loading | A validar |

### 5.5 Seção 5 — Arquitetura

Reescrever arquitetura para MVP simples.

Manter:

- Next.js.
- NestJS modular.
- PostgreSQL.
- RLS.
- CI/CD.
- Deploy público.

Mover para Pós-MVP:

- RabbitMQ.
- Filas dedicadas.
- Event-driven obrigatório.
- CQRS como obrigação.
- Workers complexos.
- Microservices.
- Integrações WhatsApp.

### 5.6 Seção 6 — Segurança e Privacidade

Ajustar segurança ao novo escopo.

Manter no MVP:

- Senhas com hash.
- JWT/refresh token ou estratégia equivalente documentada.
- Isolamento por tenant.
- RLS.
- Rate limiting básico.
- CORS restrito.
- LGPD: consentimento, minimização e aviso no link público.
- Logs mínimos de ações críticas.

Mover para Pós-MVP quando depender de funcionalidades adiadas:

- Segurança de webhooks WhatsApp.
- Segurança de exportação em massa avançada.
- Permissões por papéis avançados.
- Credenciais de integração de notificação.

### 5.7 Seção 7 — Planejamento

Revisar marcos para bater com o MVP enxuto.

Cronograma sugerido:

| Marco | Entrega | Observações |
|---|---|---|
| M1 | Fundação técnica, CI/CD, SonarCloud, banco e deploy inicial | Prova de deploy público mínima |
| M2 | Autenticação e criação de tenant | Testes backend com TDD |
| M3 | Clientes e serviços | Critérios de aceite e acessibilidade |
| M4 | Agenda e agendamento manual | Prevenir conflito de horário |
| M5 | Link público simples | Solicitação sem conta e aviso de privacidade |
| M6 | Pagamento manual e financeiro básico | Status e resumo por período |
| M7 | UX, acessibilidade e mockups finais | Mobile + desktop/web |
| M8 | Validação com 3 a 5 usuários | Evidências e ajustes |
| M9 | Hardening, E2E, deploy público e documentação final | Checklist final |

Remover marcos dedicados a WhatsApp, RabbitMQ, scheduler complexo e formulários completos do plano de entrega do MVP.

---

## 6. Critérios de aceite sugeridos para inserir no RFC

### 6.1 Criar cliente

```gherkin
Cenário: Criar cliente com dados mínimos
Dado que o profissional está autenticado
E possui um tenant ativo
Quando acessa a tela de clientes
E informa nome e ao menos um contato válido
E confirma o cadastro
Então o cliente é criado vinculado ao tenant ativo
E aparece na listagem de clientes
E pode ser selecionado em um agendamento
E não fica acessível para outros tenants
```

### 6.2 Criar serviço

```gherkin
Cenário: Criar serviço/procedimento
Dado que o profissional está autenticado
E possui um tenant ativo
Quando acessa a tela de serviços
E informa nome, duração e valor padrão
E confirma o cadastro
Então o serviço é criado vinculado ao tenant ativo
E fica disponível para seleção em agendamentos
E pode ser inativado sem apagar histórico já vinculado
```

### 6.3 Configurar agenda

```gherkin
Cenário: Configurar disponibilidade básica
Dado que o profissional está autenticado
E possui um tenant ativo
Quando define dias e horários de atendimento
E salva a configuração de agenda
Então o sistema registra a disponibilidade do tenant
E utiliza essa disponibilidade para exibir horários possíveis
E impede horários conflitantes ou fora da janela configurada
```

### 6.4 Solicitar agendamento pelo link público

```gherkin
Cenário: Cliente solicita horário pelo link público
Dado que existe um tenant com link público ativo
E há horários disponíveis configurados
Quando o cliente acessa o link público
E escolhe um serviço, data e horário disponível
E informa nome e contato
E aceita ou toma ciência do aviso de privacidade
E envia a solicitação
Então o sistema cria uma solicitação de agendamento com status pendente
E o horário não deve ser confirmado automaticamente sem ação do profissional
E o profissional consegue visualizar a solicitação na agenda
```

### 6.5 Registrar pagamento manual

```gherkin
Cenário: Registrar pagamento de um atendimento
Dado que existe um agendamento vinculado a cliente e serviço
Quando o profissional informa valor, forma de pagamento, data e status pago
E confirma o registro
Então o pagamento é associado ao agendamento
E o status financeiro do atendimento é atualizado
E o valor pago passa a compor a visão financeira básica do período correspondente
```

---

## 7. Checklist de consistência antes de finalizar

Antes de concluir a revisão do RFC, verificar:

- [ ] O MVP está limitado ao escopo obrigatório da revisão.
- [ ] Existe tabela “MVP x Pós-MVP”.
- [ ] RabbitMQ foi removido do MVP.
- [ ] WhatsApp foi removido do MVP.
- [ ] Multiusuário e RBAC avançado foram removidos do MVP.
- [ ] Formulários personalizados completos foram removidos do MVP.
- [ ] Exportação avançada foi removida do MVP.
- [ ] Scheduler complexo foi removido do MVP.
- [ ] Arquitetura distribuída foi movida para evolução futura.
- [ ] Acessibilidade dos fluxos principais está como MVP.
- [ ] Testes indicam 75% backend e 25% frontend.
- [ ] TDD está descrito como estratégia.
- [ ] SonarCloud, SonarQube ou CodeClimate está indicado explicitamente.
- [ ] Deploy público tem provedor, URL/domínio, banco, backup e env vars.
- [ ] Validação com 3 a 5 profissionais está planejada.
- [ ] Validação com a usuária principal pós-MVP está planejada.
- [ ] Critérios de aceite do fluxo principal foram adicionados.
- [ ] Matriz de rastreabilidade foi adicionada.
- [ ] Mockups aparecem no RFC ou há plano explícito para inserir evidências visuais.
- [ ] Mobile e desktop/web estão representados na seção de UX.
- [ ] Não há contradições entre RF, RNF, arquitetura, segurança, cronograma e KPIs.
- [ ] O RFC diferencia entrega acadêmica de produto comercial futuro.

---

## 8. Formato esperado da resposta da LLM

Ao executar esta tarefa, responda em três partes:

### Parte 1 — Diagnóstico

Liste os principais conflitos do RFC atual com a revisão recebida.

### Parte 2 — Plano de alteração

Crie uma tabela com:

| Seção do RFC | Problema encontrado | Alteração planejada | Prioridade |
|---|---|---|---|

### Parte 3 — Patch textual sugerido

Para cada seção relevante, forneça:

- o texto novo sugerido;
- o texto antigo que deve ser removido ou reclassificado;
- observações de consistência com outras seções.

Não finalize sem o checklist de consistência.
