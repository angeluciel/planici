# Revisão de Lógica e Arquitetura — RFC Planici

Documento revisado: `docs/RFC.md`
Seções analisadas: 2.6 (Fora de Escopo), 3 (Fluxos), 4 (UX), 5 (Arquitetura), 6 (Segurança/LGPD), 7 (Planejamento).
Foco: consistência entre arquitetura (5) e requisitos (2), conflitos de tecnologia vs. RNFs, vazamentos de escopo (2.6), dependências de UX em RFs inexistentes, subestimação de cronograma e lacunas de segurança.

---

## Inconsistências entre Arquitetura (Seção 5) e Requisitos (Seção 2)

[ARQUIT-001] Banco master-slave (replicação assíncrona) conflita com RNF-06 (RPO) e consistência de escrita/leitura
Seção: 5.3.3 / 5.4 / 2.4 (RNF-06)

Problema: A arquitetura adota PostgreSQL master-slave com replicação assíncrona por streaming, em que a réplica atende todas as leituras. Em replicação assíncrona há lag de replicação: uma escrita confirmada no master pode ainda não estar visível na réplica. Fluxos críticos do RFC dependem de leitura imediata após escrita — por exemplo, criação de agendamento (RF-20) seguida da verificação de conflito de horário (RN-10) e da visualização da agenda (RF-22), ou registro de pagamento (RF-26) seguido do resumo financeiro (RF-29/RN-15). Se a leitura cair na réplica desatualizada, o usuário pode ver agenda inconsistente ou financeiro errado. Além disso, a seção 5.4 afirma que o master-slave "implementa na infraestrutura o mesmo princípio do CQRS"; isso é uma analogia imprecisa: CQRS separa modelos, não exige réplica física e não tolera, por si só, leitura desatualizada em fluxos transacionais.

Impacto: Alto

Sugestão: Definir explicitamente uma política de roteamento read-after-write (ler do master quando a consistência for necessária — agenda, pagamentos, detecção de conflito) ou começar com instância única e tratar réplica como otimização futura. Remover a equivalência "master-slave = CQRS".

[ARQUIT-002] Detecção de conflito de agendamento (RN-10) sem garantia de concorrência na arquitetura
Seção: 5.3.2 (Scheduling module) / 2.5 (RN-10) / 3.2 (Fluxo 1 — overbooking)

Problema: O RN-10 e o Fluxo 1 da seção 3.2 exigem proteção contra overbooking ("dois agendamentos no mesmo horário"), inclusive em corrida entre o link público e o profissional. A arquitetura descreve o Scheduling module com "detecção de conflitos", mas não especifica o mecanismo de concorrência (lock pessimista, constraint de exclusão no banco, transação serializável). Com RNF-22 exigindo API stateless e escalonamento horizontal (múltiplas instâncias), duas requisições simultâneas em instâncias diferentes podem passar pela validação de aplicação e gravar o mesmo horário.

Impacto: Alto

Sugestão: Especificar garantia no nível do banco (ex.: constraint `EXCLUDE USING gist` em range de tempo por profissional, ou transação com `SELECT ... FOR UPDATE`). Documentar que a validação de conflito não pode depender apenas da camada de aplicação stateless.

[ARQUIT-003] Papéis de autorização divergem entre RFs/RNs e Seção 6
Seção: 6.1 (Autorização) / 2.3 (RF-06) / 2.5 (RN-03)

Problema: A seção 6.1 define quatro papéis (Owner, Admin, Member, Viewer) com modelo de permissões granular por recurso:ação (`clients:create`, `payments:read` etc.). Já os RFs (RF-05, RF-06) e RNs (RN-03) falam de forma genérica em "administrador do tenant" e "colaborador com acesso apenas à agenda", sem definir os quatro papéis nem o catálogo de permissões. Há descompasso de granularidade: a arquitetura promete RBAC fino, mas os requisitos não o especificam, dificultando validar a entrega.

Impacto: Médio

Sugestão: Alinhar a nomenclatura. Ou elevar os quatro papéis e a matriz recurso:ação para os RFs (RF-06), ou rebaixar a seção 6.1 para o que os RFs realmente exigem. Garantir rastreabilidade RF -> papel -> permissão.

[ARQUIT-004] Multiusuário/RBAC marcado como WANTS no RF mas tratado como MVP na arquitetura e segurança
Seção: 5.3.2 (Auth/Tenant module) / 6.1 / 2.3 (RF-05, RF-06 = WANTS)

Problema: RF-05 (multiusuário) e RF-06 (controle de permissões) têm prioridade "WANTS" (fora do MVP). Porém a arquitetura (5.3.2 Auth module com RBAC, Tenant module com "permissões granulares") e a seção 6.1 inteira de Autorização tratam RBAC completo como parte central do desenho. Isso gera ambiguidade sobre o que entra no MVP. O cronograma (M2) também cita "estrutura inicial de permissões" sem deixar claro se é o RBAC completo.

Impacto: Médio

Sugestão: Declarar explicitamente que no MVP existe apenas o papel Owner (tenant single-user) e que o RBAC multi-papel é WANTS. Marcar as partes correspondentes da seção 6.1 como evolução futura, evitando expectativa de entrega no MVP.

[ARQUIT-005] Upload de arquivos/imagens implícito em vários pontos, sem componente de armazenamento na arquitetura
Seção: 5.3 / 5.4 / 2.3 (RF-04, RF-38) / 6.2

Problema: Vários requisitos pressupõem armazenamento de binários: RF-04 (foto de perfil), RF-38 (campos de formulário do tipo "imagem, arquivo"), e a seção 6.2 lista "arquivos ou imagens anexadas" entre os dados de cliente. A arquitetura (5.3 e 5.4) só menciona PostgreSQL e RabbitMQ — não há serviço de object storage (S3/MinIO/blob), nem estratégia de upload, limites de tamanho, antivírus ou CDN. Guardar binários no Postgres conflita com RNF-01/RNF-02 (performance) e backup (RNF-06).

Impacto: Alto

Sugestão: Adicionar à seção 5.3.3 um componente de armazenamento de objetos (ex.: S3-compatível) com URLs assinadas, limites de tamanho/tipo e varredura de malware. Incluir no modelo de dados e no cronograma.

[ARQUIT-006] Verificação de e-mail é fluxo de UX/segurança mas não tem RF próprio
Seção: 4.2 (Passo 2) / 4.3 / 6.1 / 2.3 (RF-01)

Problema: O fluxo de onboarding (4.2 Passo 2, 4.3 item 4) e a seção 6.1 ("verificação de e-mail durante o fluxo de criação de conta") tratam a verificação de e-mail como etapa obrigatória. Entretanto RF-01 menciona apenas "criar conta informando nome, e-mail e senha", sem requisito explícito de verificação de e-mail. Funcionalidade central de segurança sem RF rastreável.

Impacto: Médio

Sugestão: Criar RF específico para verificação de e-mail (token temporário, expiração, reenvio) e vincular ao UC-01 e à seção 6.1.

[ARQUIT-007] Diagrama C4 nível 3 e modelo de dados não verificáveis no texto
Seção: 5.1 / 5.2

Problema: As seções 5.1 (C4) e 5.2 (modelo de dados) são compostas apenas por imagens/SVG e referência ao `schema.dbml`, sem descrição textual dos containers, componentes ou entidades-chave. Não é possível, pela leitura do RFC, confirmar se a arquitetura cobre todos os módulos/RFs (ex.: se o modelo de dados contempla formulários polimórficos, respostas, labels customizadas, consentimento LGPD). Cria risco de lacunas não detectáveis em revisão textual.

Impacto: Médio

Sugestão: Acrescentar legendas/descrições textuais dos elementos dos diagramas C4 e uma tabela-resumo das principais entidades do modelo de dados, com rastreabilidade aos RFs.

---

## Tecnologias (Seção 5.4) que conflitam com RNFs

[ARQUIT-008] RabbitMQ não cobre o agendamento temporal de lembretes (RF-34 / RN-18)
Seção: 5.3.2 (Notification module) / 5.4 (RabbitMQ) / 2.3 (RF-34) / 2.5 (RN-18)

Problema: RF-34 e RN-18 exigem lembretes automáticos disparados com antecedência configurável (ex.: 24h ou 1h antes do atendimento). RabbitMQ é um broker de mensagens para processamento assíncrono imediato; ele não é, por padrão, um agendador temporal de jobs futuros (delayed/scheduled messages exigem plugin específico e têm limitações de precisão/escala para horizontes longos). A arquitetura não descreve scheduler/cron, tabela de jobs ou worker de varredura para lembretes.

Impacto: Alto

Sugestão: Definir um mecanismo de agendamento temporal (cron worker varrendo agendamentos confirmados, ou plugin de delayed messages, ou tabela de "reminders" com job recorrente). Documentar idempotência para evitar lembrete duplicado em ambiente escalado.

[ARQUIT-009] WhatsApp via Evolution API não-oficial pode conflitar com disponibilidade (RNF-04) e LGPD
Seção: 5.3.2 / 5.4 / 2.3 (RF-33, RF-36) / 6.2

Problema: A arquitetura define notificações por WhatsApp via Evolution API (solução não-oficial baseada em automação do WhatsApp Web). Isso traz risco de instabilidade e bloqueio de número, o que afeta a confiabilidade de RF-33/RF-34/RF-35 e pode entrar em conflito com a expectativa de SLA (RNF-04). Há também risco de compliance (termos do WhatsApp/Meta) e LGPD (transferência de dados de cliente a canal não-oficial), não tratado na seção 6.2 de compartilhamento com terceiros.

Impacto: Médio

Sugestão: Registrar o risco explicitamente, definir fallback (e-mail) quando o canal WhatsApp falhar, e avaliar API oficial (WhatsApp Cloud API) como caminho de produção. Incluir o canal no item de compartilhamento com terceiros da Política de Privacidade.

[ARQUIT-010] Performance do link público (RNF-03 < 3s sem cache) vs. SSR/NestJS sob réplica
Seção: 5.4 (Next.js SSR / PostgreSQL réplica) / 2.4 (RNF-03)

Problema: RNF-03 exige first load < 3s sem cache para o link público, acessado por clientes externos em dispositivos variados. A página depende de SSR (Next.js) consultando a API (NestJS) e a réplica para computar disponibilidade em tempo real (RF-23, RN-09) — cálculo de slots a partir de disponibilidade fixa + livre + bloqueios + agendamentos existentes pode ser custoso. Não há menção a cache de slots, CDN ou pré-cálculo. Sob carga, o objetivo de 3s fica em risco.

Impacto: Médio

Sugestão: Especificar estratégia de cache/edge para a página pública e de pré-cálculo/cache de disponibilidade com invalidação ao criar/cancelar agendamento. Tratar a página pública como rota com geração estática incremental ou cache de borda quando possível.

[ARQUIT-011] Stack distribuída (NestJS + RabbitMQ + master-slave) conflita com infra "de baixo custo" e RNF-04/RNF-05
Seção: 5.4 / 2.4 (RNF-04, RNF-05)

Problema: RNF-04 declara "infraestrutura de baixo custo" e RNF-05 prevê recuperação via "process manager + health checks" (sugerindo deploy simples, possivelmente VM única). A stack descrita (frontend Next.js + backend NestJS + PostgreSQL master + réplica + RabbitMQ + worker de notificações + observabilidade) é multi-serviço e operacionalmente pesada. Manter master-slave, broker e múltiplas instâncias stateless com SLA de 98.9% e RTO <= 2h em infra de baixo custo é tensão arquitetural real, ainda mais para um projeto individual.

Impacto: Médio

Sugestão: Reconciliar ambição da stack com o orçamento/SLA declarado. Para o MVP, considerar Postgres single-node + broker gerenciado/leve (ou fila no próprio banco) e introduzir réplica/cluster só quando a carga justificar. Documentar topologia de deploy alvo.

[ARQUIT-012] Observabilidade cita Sentry "com Azure Standard Tests" — incoerência de ferramentas
Seção: 5.3.3 / 2.4 (RNF-21)

Problema: RNF-21 especifica "Sentry com Azure Standard Tests" para alerta em <= 5 min. Sentry é APM/error tracking; "Azure Standard Tests" (availability tests do Azure Application Insights) é produto separado e de outro ecossistema. A combinação é incoerente e não há menção a provedor de nuvem Azure em nenhum outro ponto da arquitetura (5.4 não cita cloud). Risco de RNF não implementável como escrito.

Impacto: Baixo

Sugestão: Padronizar a stack de observabilidade (ex.: Sentry para erros + uptime monitor dedicado como UptimeRobot/Better Stack/Grafana). Remover a menção avulsa a Azure ou definir o provedor de nuvem de forma consistente em 5.4.

[ARQUIT-013] Uso de zod citado junto a class-validator sem definir o contrato de validação
Seção: 5.4 (NestJS) / 2.4 (RNF-10)

Problema: A seção 5.4 lista `class-validator`, `class-transformer` e `zod` como ferramentas de validação simultaneamente. São abordagens concorrentes (decorator-based vs. schema-based) e misturá-las sem critério gera inconsistência de contratos e duplicação. RNF-10 exige "validação de entrada em todos os endpoints"; sem padrão único, há risco de cobertura desigual.

Impacto: Baixo

Sugestão: Escolher uma estratégia primária de validação e justificar exceções. Documentar onde cada ferramenta atua (ex.: zod no boundary HTTP, class-validator em DTOs internos) se a coexistência for intencional.

---

## Itens Fora de Escopo (2.6) que reaparecem implicitamente

[ARQUIT-014] "Plano contratado" e planos Basic/superior reintroduzem cobrança/billing fora de escopo
Seção: 2.6.3 / 2.3 (RF-05) / 6.2 ("plano contratado") / 1.3

Problema: 2.6.3 declara fora de escopo o processamento de pagamentos online e cobrança. Porém RF-05 condiciona o multiusuário a "planos Basic ou superior", a seção 6.2 lista "plano contratado" entre os dados do tenant, e a seção 1.3 fala de versão paga/gratuita. Isso pressupõe um sistema de planos/assinatura (billing) que não tem RF, não está na arquitetura e contradiz parcialmente o "fora de escopo" de pagamentos. Há ambiguidade sobre como o plano é atribuído/cobrado.

Impacto: Médio

Sugestão: Esclarecer que a diferenciação de planos no MVP é apenas um atributo manual/administrativo (sem cobrança automática), ou criar RF/escopo de billing. Alinhar 2.6.3, RF-05 e 6.2.

[ARQUIT-015] Anexos em formulários/clientes aproximam o sistema de prontuário (fora de escopo 2.6.7)
Seção: 2.6.7 / 2.3 (RF-38) / 6.2 (dados sensíveis)

Problema: 2.6.7 exclui integração com prontuários e ressalva que formulários "sem valor legal ou clínico". Contudo RF-38 permite campos de imagem/arquivo e a seção 6.2 reconhece coleta de "dados potencialmente sensíveis" (terapeutas/nutricionistas). Na prática, o produto habilita o armazenamento de informações clínicas em campos livres/anexos, o que reintroduz, de fato, características de prontuário e o ônus de dados sensíveis da LGPD (art. 11), mesmo que formalmente "fora de escopo".

Impacto: Médio

Sugestão: Reforçar controles para dado sensível de fato existente: criptografia em repouso para respostas/anexos, base legal específica e avisos na UI. Não tratar como "fora de escopo" um risco que a funcionalidade efetivamente cria.

[ARQUIT-016] Múltiplos tenants por usuário tangencia "múltiplas unidades/filiais" (2.6.6)
Seção: 2.6.6 / 4.1 / 4.3 (item 16) / 5.3.1

Problema: 2.6.6 exclui gestão de múltiplas unidades/filiais ("escopo é o profissional autônomo individual"). Entretanto a seção 4.1 e a 4.3 afirmam que "o mesmo usuário pode gerenciar múltiplos negócios" (vários tenants) e a arquitetura suporta vínculo usuário–múltiplos tenants. Embora tecnicamente diferente de "filiais", a fronteira entre "vários tenants do mesmo dono" e "múltiplas unidades" é tênue e pode confundir o leitor sobre o escopo real.

Impacto: Baixo

Sugestão: Diferenciar claramente "múltiplos tenants independentes de um mesmo usuário" (em escopo) de "múltiplas unidades/filiais de um mesmo negócio com dados compartilhados" (fora de escopo).

---

## Fluxos de UX (Seção 4) dependentes de funcionalidades não especificadas em RFs

[ARQUIT-017] Ingressar em tenant por convite aparece na UX mas o RF correspondente é WANTS
Seção: 4.1 / 4.2 (estado vazio) / 4.3 (itens 10) / 2.3 (RF-05 = WANTS)

Problema: O fluxo de onboarding (4.1, 4.2 estado vazio, 4.3 item 10) oferece "ingressar em uma empresa existente por convite" como caminho de primeira execução. A funcionalidade de convite/colaboradores é RF-05/RF-06, ambos WANTS (fora do MVP). Logo, a UX do MVP apresenta um caminho que não terá backend no MVP, gerando fluxo "morto" ou dependência de feature não entregue.

Impacto: Médio

Sugestão: Condicionar a opção de convite à entrega de RF-05 ou marcá-la como indisponível no MVP nos mockups/fluxo. Ajustar 4.x para refletir o escopo do MVP.

[ARQUIT-018] "Apelido/nome de exibição" e "slug" do usuário sem RF que os defina
Seção: 4.2 (Passo 4 / slug) / 4.3 (item 6) / 2.3 (RF-04)

Problema: O onboarding coleta "apelido/nome de exibição" (Passo 4) e há tela `slug.png`. RF-04 cobre "nome, foto, dados de contato e informações do negócio", mas não menciona apelido nem slug de usuário. Há ambiguidade entre slug do usuário e slug do tenant (este último citado em 6.2 como "slug ou identificador público"). UX coleta dado sem RF claro e sem regra de unicidade/validação.

Impacto: Baixo

Sugestão: Incluir apelido/nome de exibição em RF-04 e definir onde o slug se aplica (usuário vs. tenant), com regra de unicidade e formato.

[ARQUIT-019] Sugestão automática de labels por ocupação (UX) excede o que RF-43/RN-23 garantem
Seção: 4.2 (Passo 2 personalização) / 4.3 (item 13) / 2.3 (RF-43) / 2.5 (RN-23)

Problema: A UX (4.2 Passo 2, 4.3 item 13) promete que "o sistema sugere nomes personalizados" automaticamente a partir da área de atuação (ex.: terapeuta -> Pacientes/Procedimentos/Consultas). RF-43 garante que o profissional "pode personalizar" labels e selecionar ocupação; RN-23 diz que a ocupação "pode influenciar sugestões" (condicional). Não há RF que especifique o catálogo de mapeamentos ocupação -> labels nem a fonte dessas sugestões. UX entrega comportamento mais forte do que o requisito assegura.

Impacto: Baixo

Sugestão: Especificar em RF/RN o conjunto de ocupações suportadas e seus mapeamentos de labels (ou declarar que sugestões são opcionais/estáticas iniciais), evitando expectativa de inteligência não especificada.

[ARQUIT-020] Dashboard mencionado na UX sem RF que defina seu conteúdo
Seção: 4.1 / 4.3 (itens 15-16) / 2.3

Problema: A navegação (4.1) e o fluxo (4.3 item 16) culminam no acesso a um "dashboard". Não há RF descrevendo o que o dashboard exibe (KPIs, agenda do dia, pendências, financeiro). Os RFs de financeiro (RF-29 a RF-31) e agenda (RF-22) existem, mas a tela-agregadora "dashboard" não tem RF próprio. Risco de escopo indefinido na tela principal.

Impacto: Baixo

Sugestão: Criar RF para o dashboard especificando widgets/indicadores ou esclarecer que "dashboard" é apenas o contêiner de navegação para os módulos existentes.

---

## Cronograma (Seção 7) — milestones aparentemente subestimados

[ARQUIT-021] 13 semanas para todo o escopo MVP, com vários módulos comprimidos em 1 semana cada
Seção: 7 (M5, M6, M7) / 2.3 (RFs MVP)

Problema: A maioria dos módulos críticos recebe apenas 1 semana: M5 (link público + fluxo de confirmação, RF-23/RF-24/RN-09/RN-11, incluindo overbooking), M6 (pagamentos + visão financeira: RF-26 a RF-32, com export PDF/Excel), M7 (formulários personalizados + configuração de workspace + personalização de labels + notificações e-mail/WhatsApp). Cada um desses é, isoladamente, um módulo substancial. Notavelmente, formulários dinâmicos polimórficos (RF-37 a RF-42), notificações multicanal com lembrete agendado (RF-33 a RF-36) e exportação de relatórios (RF-32) estão todos comprimidos em M7 (1 semana), o que é fortemente subestimado.

Impacto: Alto

Sugestão: Repriorizar — mover RFs WANTS e itens não essenciais para fora do MVP, dividir M7 em pelo menos dois marcos, e dar à infraestrutura distribuída (master-slave, RabbitMQ, observabilidade) tempo realista. Considerar reduzir o MVP a um núcleo (agenda + clientes + pagamentos manuais).

[ARQUIT-022] M1 (2 semanas) subestima a montagem da arquitetura descrita na Seção 5
Seção: 7 (M1) / 5.3 / 5.4

Problema: M1 prevê em 2 semanas: repositórios, estrutura front e back, banco, env, autenticação base e PoC de integração. Mas a arquitetura escolhida (DDD + hexagonal + CQRS no NestJS, RLS no Postgres, master-slave, RabbitMQ, CI/CD com gate de testes, observabilidade) tem custo de setup inicial alto. Montar hexagonal+CQRS, RLS funcional e replicação em 2 semanas, sozinho, é otimista.

Impacto: Médio

Sugestão: Ou simplificar a arquitetura inicial (introduzir CQRS/réplica/broker incrementalmente), ou estender M1, ou separar um marco de "fundação de arquitetura" antes dos módulos de negócio.

[ARQUIT-023] Testes (RNF-19, cobertura >= 70% em módulos críticos) concentrados só em M8
Seção: 7 (M8) / 2.4 (RNF-19, RNF-20)

Problema: M8 ("Testes, validação e melhorias") aparece como fase única no fim, sugerindo testes deixados para o final. RNF-19 exige >= 70% de cobertura nos módulos críticos (agendamento, pagamentos, autenticação) e RNF-20 exige gate de testes obrigatório no CI/CD desde o início. Tratar testes como fase final contraria RNF-20 e torna a meta de cobertura difícil de atingir retroativamente.

Impacto: Médio

Sugestão: Distribuir testes ao longo de M2–M7 (testes junto a cada módulo) e usar M8 para hardening/E2E. Tornar o gate de CI obrigatório a partir de M1.

[ARQUIT-024] LGPD e segurança sem marco dedicado apesar do peso da Seção 6
Seção: 7 / 6.1 / 6.2 / 2.4 (RNF-11 a RNF-15)

Problema: A seção 6 dedica grande esforço a segurança e LGPD (consentimento RNF-12, exportação RNF-13, exclusão RNF-14, auditoria RNF-11, RLS RNF-07). No cronograma, isso só aparece diluído em M2 (permissões) e M8 ("revisão de segurança"). Itens como registro de consentimento versionado, logs de auditoria e RLS em todas as tabelas precisam ser construídos junto com cada módulo, não revisados ao final.

Impacto: Médio

Sugestão: Adicionar entregáveis de segurança/LGPD a cada marco relevante (ex.: consentimento em M2; auditoria/RLS conforme cada módulo surge) e não apenas concentrar em M8.

---

## Controles de Segurança (Seção 6) que não cobrem ameaças implícitas nos RFs

[ARQUIT-025] Link público (RF-23) sem proteção anti-abuso/anti-enumeração específica
Seção: 6.1 (Proteção da API) / 2.3 (RF-23, RF-24) / 2.5 (RN-11)

Problema: O link público de agendamento (RF-23) é um endpoint não autenticado que expõe disponibilidade do profissional e aceita criação de solicitações de agendamento por desconhecidos (RN-11). A seção 6 trata rate limit por IP de forma genérica (RNF-10: 100 req/min/IP), mas não trata ameaças específicas desse endpoint: spam de solicitações de agendamento (poluição da fila de pendentes), enumeração de slugs de tenant, scraping de horários/disponibilidade, e ausência de CAPTCHA/verificação para clientes sem conta. O rate limit por IP é facilmente contornável e pode bloquear clientes legítimos atrás de NAT.

Impacto: Alto

Sugestão: Especificar controles dedicados ao link público: CAPTCHA/challenge antes de solicitar agendamento, verificação de contato (e-mail/telefone), limites por slug/janela, slugs não enumeráveis, e moderação/expiração automática de solicitações pendentes.

[ARQUIT-026] Coleta de dados de "convidado" no link público sem consentimento LGPD para o cliente final
Seção: 6.2 (Consentimento) / 2.3 (RF-23) / 6.2 (dados de convidado)

Problema: A seção 6.2 registra que o link público coleta "dados de convidado: nome, e-mail e telefone". O fluxo de consentimento descrito (RNF-12, aceite de termos) está apenas no onboarding do profissional. Não há tratamento de base legal/aviso de privacidade para o titular cliente final que insere seus dados no link público sem ter conta. Isso é uma lacuna de LGPD direta (titular sem informação/consentimento).

Impacto: Médio

Sugestão: Incluir aviso de privacidade e captura de consentimento (ou base legal explícita) na página pública de agendamento, com registro do aceite do cliente final.

[ARQUIT-027] Tokens públicos de confirmação/cancelamento por link de notificação não tratados
Seção: 6.1 (Dados sensíveis/tokens) / 2.3 (RF-33 a RF-35)

Problema: Notificações de confirmação/cancelamento/remarcação (RF-33 a RF-35) tipicamente incluem links acionáveis enviados ao cliente (e-mail/WhatsApp). A seção 6 trata tokens de recuperação de senha e verificação de e-mail, mas não menciona a segurança de eventuais tokens/links em notificações ao cliente (expiração, uso único, escopo restrito a um agendamento). Se existirem, são superfície de ataque (IDOR/manipulação de agendamento alheio).

Impacto: Médio

Sugestão: Definir, caso existam links acionáveis nas notificações, tokens assinados, de uso único, com expiração e escopo a um único agendamento; caso não existam, declarar explicitamente.

[ARQUIT-028] RLS depende de propagação correta de `tenant_id`/contexto, não especificada
Seção: 6.1 (Isolamento) / 2.4 (RNF-07) / 5.3.3

Problema: RNF-07 e a seção 6.1 exigem RLS obrigatório em todas as tabelas com `tenant_id`. Porém RLS no PostgreSQL depende de definir a variável de sessão/contexto (ex.: `SET app.current_tenant`) por requisição. Com pool de conexões e API stateless escalada (RNF-22), e leitura na réplica (ARQUIT-001), há risco de vazamento se o contexto não for setado/limpo corretamente por conexão. A arquitetura não descreve como o `tenant_id` é injetado no contexto de banco a cada request nem como isso interage com o pool e a réplica.

Impacto: Alto

Sugestão: Especificar o mecanismo de propagação do tenant para o contexto da sessão de banco (middleware/interceptor que faz `SET LOCAL` em transação), garantir reset por conexão devolvida ao pool e validar RLS também na réplica de leitura. Adicionar teste automatizado de "zero vazamento entre tenants".

[ARQUIT-029] Brute-force/credential stuffing parcialmente coberto; falta MFA e bloqueio de conta
Seção: 6.1 (Autenticação / Proteção da API) / 2.4 (RNF-08, RNF-10)

Problema: A seção 6.1 cita "bloqueio ou limitação de tentativas repetidas de login" e RNF-10 traz rate limit por IP, mas não há política de bloqueio temporário por conta (lockout), proteção contra credential stuffing distribuído (rate limit por IP é insuficiente), nem MFA/2FA opcional. Para um sistema que guarda dados de clientes potencialmente sensíveis, a ausência de qualquer segundo fator é uma lacuna.

Impacto: Médio

Sugestão: Definir lockout progressivo por conta, detecção de credential stuffing (limite por conta + por IP + monitoramento), e oferecer MFA opcional (TOTP) ao menos para o papel Owner.

[ARQUIT-030] Exportação de relatórios e dados (RF-32, RNF-13) sem controle anti-exfiltração
Seção: 6.1 (Auditoria) / 2.3 (RF-32) / 2.4 (RNF-13)

Problema: RF-32 (exportar relatório financeiro PDF/Excel) e RNF-13 (exportar todos os dados do tenant e clientes) criam um vetor de exfiltração em massa de dados pessoais. A seção 6 registra a exportação como evento auditável, mas não define controles preventivos: limite de frequência de export, confirmação adicional, restrição por papel (apenas Owner/Admin), ou alerta em export volumoso. Exportação é justamente onde dados sensíveis saem do perímetro.

Impacto: Médio

Sugestão: Restringir export a papéis específicos, exigir reautenticação/confirmação para export completo (RNF-13), limitar frequência e gerar alerta de auditoria em exportações de grande volume.

[ARQUIT-031] Webhooks/entrada da Evolution API e callbacks externos não tratados na superfície de ataque
Seção: 6.1 / 5.3.2 (Notification) / 2.3 (RF-36)

Problema: A integração com WhatsApp (Evolution API) e provedores de e-mail normalmente envolve callbacks/webhooks de status de entrega e armazenamento de credenciais de integração (RF-36). A seção 6 cobre o armazenamento seguro de credenciais, mas não trata a validação de webhooks de entrada (assinatura/origem), que é uma superfície de ataque (spoofing de status, SSRF ao chamar instâncias Evolution self-hosted). 

Impacto: Baixo

Sugestão: Definir validação de assinatura/origem para qualquer webhook recebido, allowlist de destinos para chamadas à Evolution API e proteção contra SSRF nas integrações configuráveis pelo tenant.

---

## Resumo

Total de achados: 31 (ARQUIT-001 a ARQUIT-031).

Distribuição por impacto: Alto = 8; Médio = 16; Baixo = 7.

Principais riscos (Alto):
- ARQUIT-001: réplica master-slave assíncrona compromete read-after-write em agenda/financeiro (e analogia incorreta com CQRS).
- ARQUIT-002 / ARQUIT-028: detecção de overbooking e isolamento RLS sem garantia frente a API stateless escalada e pool de conexões.
- ARQUIT-005: requisitos de upload de arquivos/imagens (RF-04, RF-38) sem componente de armazenamento na arquitetura.
- ARQUIT-008: RabbitMQ não resolve agendamento temporal de lembretes (RF-34).
- ARQUIT-021: cronograma de 13 semanas comprime módulos pesados (formulários, notificações, financeiro) em 1 semana cada.
- ARQUIT-025: link público não autenticado sem proteção anti-abuso/anti-enumeração específica.

Temas recorrentes:
- Tensão entre stack distribuída ambiciosa (CQRS, master-slave, RabbitMQ, observabilidade) e contexto declarado de baixo custo / projeto individual / prazo curto.
- Funcionalidades de UX e segurança sem RF rastreável (verificação de e-mail, apelido/slug, dashboard, sugestão de labels).
- Itens "fora de escopo" (billing, prontuário, filiais) reaparecendo implicitamente em RFs e UX.
- Segurança e LGPD tratadas como revisão final (M8) em vez de embutidas em cada marco; lacunas no titular cliente final do link público.
