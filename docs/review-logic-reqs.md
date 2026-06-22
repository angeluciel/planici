# Revisão de Lógica e Requisitos — RFC Planici

Documento revisado: `docs/RFC.md`
Escopo da revisão: Identificação, Índice, e seções 1 a 2.5 (RF-01 a RF-43, RNF-01 a RNF-23, RN-01 a RN-25), incluindo personas, casos de uso e fluxos (seção 3) que impactam a lógica de requisitos.
Data: 22/06/2026

Cada achado segue o formato:
[LÓGICA-###] Título curto
Seção / Problema / Impacto / Sugestão.

---

## Contradições entre RFs e RNs

### [LÓGICA-001] RF de exclusão de cliente contradiz a regra de inativação
Seção: RF-08 / RN-05

Problema: O RF-08 descreve "Editar e excluir cliente" e afirma que "O profissional pode atualizar ou remover um cadastro de cliente", sugerindo exclusão física livre. A RN-05, porém, determina que clientes com histórico de atendimentos, pagamentos, planos ou formulários NÃO podem ser removidos definitivamente, apenas inativados. O texto do RF-08 não menciona inativação nem a condição de existência de histórico, criando contradição direta com a regra de negócio. O caso de uso UC-09 ("Inativar cliente") aponta para RF-08, mas o texto do RF nem cita inativação.

Impacto: Alto

Sugestão: Reescrever o RF-08 para distinguir explicitamente "editar", "inativar" e "excluir", deixando claro que a exclusão definitiva só é permitida para clientes sem histórico vinculado, e que clientes com histórico são inativados (soft delete), referenciando a RN-05. Renomear o RF para "Editar, inativar e excluir cliente".

### [LÓGICA-002] RF de exclusão de procedimento contradiz a regra de inativação
Seção: RF-12 / RN-06

Problema: RF-12 ("Editar e excluir procedimento") diz que o profissional "pode atualizar ou remover um procedimento do catálogo", sem qualquer condição. A RN-06 estabelece que procedimentos vinculados a agendamentos, planos ou histórico financeiro não devem ser excluídos definitivamente, devendo ser inativados. O UC-14 ("Excluir ou inativar procedimento") aponta para RF-12, mas o texto do RF só fala em "remover".

Impacto: Alto

Sugestão: Ajustar o RF-12 para refletir a regra de soft delete condicional, alinhando com a RN-06 e com o nome do UC-14.

### [LÓGICA-003] RF de exclusão de plano contradiz a regra de inativação
Seção: RF-16 / RN-08

Problema: RF-16 ("Editar e excluir plano") afirma que o profissional "pode atualizar ou remover um plano do catálogo", sem condição. A RN-08 determina que planos usados em agendamentos, histórico de clientes ou registros financeiros não devem ser removidos definitivamente, apenas inativados. Mesma contradição estrutural do RF-08 e RF-12.

Impacto: Alto

Sugestão: Padronizar a redação dos RFs de exclusão (RF-08, RF-12, RF-16) para diferenciar exclusão definitiva (sem histórico) de inativação (com histórico), referenciando as respectivas RNs (RN-05, RN-06, RN-08) e a RN-24 (integridade do histórico).

### [LÓGICA-004] Unicidade e obrigatoriedade de e-mail do cliente não refletida no RF
Seção: RF-07 / RN-04

Problema: A RN-04 exige que nome E e-mail do cliente sejam obrigatórios e proíbe dois clientes com o mesmo e-mail dentro do mesmo tenant. O RF-07, entretanto, descreve o cadastro com "nome, telefone, e-mail e observações" sem indicar quais são obrigatórios nem mencionar a restrição de unicidade. Além disso, há um conflito potencial: clientes externos que agendam pelo link público (RF-23/RN-11) "não precisam ter conta", mas se um agendamento gera/registra um cliente, o e-mail obrigatório e único pode entrar em conflito com solicitações anônimas ou repetidas.

Impacto: Médio

Sugestão: Explicitar no RF-07 a obrigatoriedade de nome e e-mail e a regra de unicidade por tenant. Esclarecer na RN-04 e na RN-11 como clientes oriundos do link público são tratados (cliente "leve" sem e-mail? deduplicação por e-mail?).

### [LÓGICA-005] Conflito de horário/overbooking não descrito no RF de criação de agendamento
Seção: RF-20 / RN-10 / Fluxo 1 (seção 3.2)

Problema: A RN-10 proíbe dois agendamentos no mesmo horário para o mesmo profissional e proíbe agendar em horário bloqueado. O RF-20 ("Criar agendamento pelo profissional") apenas diz que o profissional escolhe "cliente, plano ou serviço, data e horário", sem mencionar a validação de conflito. O Fluxo 1 (seção 3.2) descreve proteção contra overbooking pelo link público, mas o RF-20 (criação manual pelo profissional) não declara essa validação como comportamento esperado.

Impacto: Médio

Sugestão: Incluir no RF-20 (e RF-21) o critério de aceitação de validação de conflito de horário e bloqueios, vinculando explicitamente à RN-10. Definir se o profissional pode forçar overbooking manualmente (override) ou se a regra é absoluta.

### [LÓGICA-006] "Cliente, serviço ou plano" vs. "cliente, plano ou serviço" — obrigatoriedade ambígua
Seção: RF-20 / RN-10

Problema: RN-10 diz que o agendamento "deve possuir cliente, serviço ou plano, data e horário". A conjunção "serviço ou plano" implica que um dos dois é obrigatório, mas "cliente" parece obrigatório também. Não está claro se cliente é sempre obrigatório (no link público o cliente pode ser anônimo) e se é possível agendar só com serviço sem plano ou vice-versa. A redação cria ambiguidade sobre cardinalidade.

Impacto: Médio

Sugestão: Definir formalmente os campos obrigatórios de um agendamento, distinguindo agendamento manual (cliente cadastrado) de agendamento via link público (cliente externo identificado por nome/contato). Esclarecer se "serviço OU plano" é exclusivo ou se ambos podem coexistir.

---

## Requisitos ambíguos ou incompletos

### [LÓGICA-007] Critérios de senha mencionados em mockup mas ausentes em RF/RN/RNF
Seção: RF-01 / RNF-08 / Seção 4.2 (Passo 3)

Problema: O mockup "Registro — Passo 3: Definição de Senha" (seção 4.2) cita "critérios mínimos exigidos, como quantidade mínima de caracteres, presença de número e símbolo". Nenhum RF, RN ou RNF define a política de senha (comprimento mínimo, complexidade). RNF-08 trata apenas de hash (bcrypt) e tokens, não da força da senha exigida no cadastro.

Impacto: Médio

Sugestão: Criar uma RN ou critério de aceitação no RNF-08 definindo a política de senha de forma mensurável (ex.: mínimo de 8 caracteres, 1 número, 1 símbolo), para que o mockup tenha respaldo formal.

### [LÓGICA-008] Verificação de e-mail no onboarding sem RF correspondente
Seção: Seção 4.2/4.3 (Passo 2) / RF-01

Problema: O fluxo de onboarding (mockups Passo 2 e fluxo 4.3, item 4) inclui uma etapa obrigatória de "Verificação de E-mail" com reenvio de link. Não há RF que descreva confirmação/verificação de e-mail no cadastro — o RF-01 cita apenas criação de conta com nome, e-mail e senha, e o RF-03 trata de recuperação de senha. A funcionalidade existe no fluxo, mas não há requisito formal.

Impacto: Médio

Sugestão: Adicionar um RF de "Verificação de e-mail no cadastro" (ou estender o RF-01) descrevendo envio de link de confirmação, reenvio e bloqueio/limitação de uso até confirmação.

### [LÓGICA-009] "Disponibilidade compatível com baixo custo" e SLA com cálculo inconsistente
Seção: RNF-04

Problema: O critério do RNF-04 afirma "SLA >= 98.9% (~8h downtime/mês)". O cálculo está incorreto: 98,9% de disponibilidade equivale a aproximadamente 8h de downtime por MÊS apenas se computado de forma aproximada (1,1% de 720h = ~7,9h), o que é coerente, mas 98,9% é um número atípico (o usual é 99,9%). Vale confirmar se o alvo pretendido não seria 99,9% (~43min/mês) ou 99% (~7,2h/mês). A redação "compatível com infraestrutura de baixo custo" é vaga.

Impacto: Baixo

Sugestão: Confirmar e padronizar o número de SLA pretendido e recalcular o downtime correspondente. Remover a justificativa vaga "baixo custo" do critério de aceitação (mantê-la apenas na descrição).

### [LÓGICA-010] "Data de pagamento futura como previsão" é regra opcional e ambígua
Seção: RN-13

Problema: A RN-13 afirma que "A data de pagamento não pode ser posterior à data atual, salvo se o sistema permitir registro de pagamentos futuros como previsão." Isso deixa a decisão aberta ("salvo se o sistema permitir"), o que não é uma regra de negócio determinística. Pagamentos futuros como previsão também afetariam o RN-15 (resumo considera apenas "pagos"), gerando ambiguidade contábil.

Impacto: Médio

Sugestão: Decidir e fixar a regra: ou pagamentos futuros NÃO são permitidos, ou são permitidos com um status específico (ex.: "previsto") que não conta como receita recebida no RN-15. Remover o "salvo se o sistema permitir".

### [LÓGICA-011] Tratamento de pagamento de agendamento cancelado deixado "a critério do profissional"
Seção: RN-14 / RN-12 / RN-15

Problema: RN-14 diz que pagamentos de agendamentos cancelados "devem ser tratados conforme a regra definida pelo profissional, podendo ser mantidos, estornados ou desconsiderados". RN-12 e RN-15 dizem que cancelados não geram receita "exceto se houver pagamento registrado e mantido". Não há definição de onde/como o profissional define essa "regra", nem do comportamento padrão (default). Isso é uma regra de negócio sem critério determinístico.

Impacto: Médio

Sugestão: Definir o comportamento padrão (ex.: ao cancelar, o pagamento por padrão é desconsiderado da receita, com opção explícita de manter). Especificar a interface/configuração onde o profissional decide, ou referenciar um RF correspondente (que não existe hoje).

### [LÓGICA-012] "Validação adicional" para operações críticas não definida
Seção: RN-25

Problema: A RN-25 exige "validação adicional" para operações críticas (excluir cliente, cancelar agendamento, editar pagamento, etc.), mas não define o que é essa validação (confirmação dupla? senha? modal de confirmação? autenticação re-validada?). Termo genérico sem critério mensurável ou comportamento concreto.

Impacto: Médio

Sugestão: Especificar o mecanismo concreto (ex.: diálogo de confirmação obrigatório, e para operações destrutivas irreversíveis, digitação de confirmação). Vincular a RFs ou ao fluxo da seção 3.

### [LÓGICA-013] Disponibilidade fixa vs. livre — precedência e sobreposição indefinidas
Seção: RF-18 / RF-19 / RN-09

Problema: RF-18 (disponibilidade fixa por dia da semana) e RF-19 (disponibilidade livre para datas específicas) podem se sobrepor ou conflitar (ex.: data específica que cai num dia com regra fixa). A RN-09 lista as duas formas mas não define qual prevalece em caso de conflito, nem se a janela livre soma-se ou substitui a fixa naquele dia.

Impacto: Médio

Sugestão: Adicionar à RN-09 a regra de precedência (ex.: disponibilidade livre para data específica substitui a regra fixa daquele dia; bloqueios sempre prevalecem sobre ambas).

### [LÓGICA-014] Antecedência de lembrete "configurável" sem limites nem default
Seção: RF-34 / RN-18

Problema: RF-34 cita "antecedência configurável (ex: 24h ou 1h antes)" e RN-18 confirma "conforme a antecedência configurada". Não há definição de valor padrão, limites (mínimo/máximo), nem se múltiplos lembretes são permitidos. Também não há RF para a configuração dessa antecedência separado do RF-36 (que trata de canais e eventos, não de timing).

Impacto: Baixo

Sugestão: Definir valores permitidos/default e onde a antecedência é configurada (estender RF-36 ou criar requisito específico). Esclarecer se múltiplos lembretes são suportados.

### [LÓGICA-015] Exportação de relatório (RF-32) vs. portabilidade LGPD (RNF-13) — formatos divergentes
Seção: RF-32 / RNF-13

Problema: RF-32 permite exportar relatório financeiro em "PDF ou Excel". RNF-13 (portabilidade de dados LGPD) exige exportação em "JSON ou CSV". São funcionalidades diferentes (relatório vs. portabilidade de dados), mas a coexistência de quatro formatos (PDF, Excel, JSON, CSV) sem distinção clara pode confundir. Além disso, RNF-13 é "Wants" enquanto a exportação de relatório RF-32 é "MVP" — pode haver expectativa de que a exportação cubra a portabilidade, o que não ocorre.

Impacto: Baixo

Sugestão: Esclarecer no documento a distinção entre exportação de relatório (RF-32) e exportação para portabilidade LGPD (RNF-13), evitando que o leitor assuma que uma cobre a outra.

---

## RFs sem RN correspondente ou vice-versa

### [LÓGICA-016] RF-03 (recuperação de senha) sem regra de negócio
Seção: RF-03 / Seção 2.5

Problema: A recuperação de senha (RF-03, UC-03) não tem RN correspondente que defina validade/expiração do link, uso único, invalidação após troca, ou rate limit de solicitações. Esses comportamentos são sensíveis de segurança.

Impacto: Médio

Sugestão: Criar uma RN de recuperação de senha (link de uso único, expiração curta, invalidação de sessões/tokens após redefinição), articulando com RNF-08 e RNF-10 (rate limit).

### [LÓGICA-017] RF-04 (gerenciamento de perfil) sem RN; perfil vs. tenant
Seção: RF-04 / RN-02 / Seção 4.1

Problema: RF-04 trata de editar nome, foto, dados de contato e "informações do negócio". A seção 4.1 afirma que "o perfil do usuário é independente do tenant" (um usuário pode gerenciar múltiplos negócios). Porém RF-04 mistura dados de perfil (do usuário) com "informações do negócio" (do tenant), e não há RN definindo essa separação. As RNs de tenant (RN-02, RN-22, RN-23) tratam de configuração do tenant, não do perfil pessoal.

Impacto: Médio

Sugestão: Separar no RF-04 os dados de perfil do usuário dos dados do negócio/tenant, e criar/ajustar uma RN que formalize que perfil é independente de tenant (coerente com a seção 4.1).

### [LÓGICA-018] RF-09 (busca/filtro) menciona "filtro" mas só descreve busca; sem RN
Seção: RF-09

Problema: O título do RF-09 é "Busca e filtro de clientes", mas a descrição cobre apenas busca por nome ou e-mail — não há critérios de filtro (status ativo/inativo, plano, etc.). O UC-10 também é "Buscar e filtrar". Não há RN. Incompleto: a palavra "filtro" não tem conteúdo.

Impacto: Baixo

Sugestão: Definir quais filtros existem (ex.: ativos/inativos, com/sem plano) ou remover "filtro" do título caso não esteja no escopo do MVP.

### [LÓGICA-019] RF-31/RF-29/RF-30 (relatórios) cobertos por RN, mas RF-30 sem regra de período
Seção: RF-29 / RF-30 / RN-15 / RN-16

Problema: RF-29 (resumo por período) e RF-31 (ranking) têm respaldo em RN-15 e RN-16. O RF-30 (comparativo entre dois períodos) não tem RN que defina como períodos são selecionados, se podem ter tamanhos diferentes, e como tratar pagamentos pendentes/cancelados no comparativo (a RN-15 fala de "resumo", não explicitamente de "comparativo").

Impacto: Baixo

Sugestão: Estender a RN-15 para cobrir o comparativo (RF-30), explicitando que ambos os períodos seguem a mesma regra (apenas pagamentos "pagos").

### [LÓGICA-020] RF-05/RF-06 (multiusuário/permissões) são "WANTS" mas RN-03 os trata como comportamento obrigatório
Seção: RF-05 / RF-06 / RN-03 / RNF-07

Problema: RF-05 e RF-06 são prioridade WANTS (fora do MVP). A RN-03 (permissões de colaboradores) é redigida de forma condicional ("Quando o recurso de múltiplos usuários estiver disponível"), o que é adequado. Porém, o componente backend (seção 5.3.2, Tenant module / Auth module com RBAC) e a RNF-07 tratam multi-tenancy como MVP, e os mockups de tenants (seção 4.2) referenciam RF-05/RF-06 como se fossem disponíveis. Há descompasso entre a prioridade WANTS dos RFs e a aparente presença no MVP em outras seções.

Impacto: Médio

Sugestão: Alinhar a prioridade: ou multiusuário/permissões entram no MVP (ajustando RF-05/RF-06), ou os mockups e descrição arquitetural deixam claro que RBAC/convites são preparação para fase futura (WANTS), não MVP.

### [LÓGICA-021] RF-23 (link público) — RN não cobre rate limit / anti-spam de solicitações
Seção: RF-23 / RN-11 / RNF-10

Problema: O link público permite que clientes externos sem conta solicitem agendamentos (RF-23, RN-11). Não há RN nem critério tratando abuso (spam de solicitações pendentes, agendamentos falsos). RNF-10 define rate limit de 100 req/min por IP, mas não trata especificamente da criação de solicitações de agendamento anônimas.

Impacto: Médio

Sugestão: Adicionar regra/critério anti-abuso para o link público (ex.: limite de solicitações por IP/janela, captcha, ou limite de pendentes por contato), dado que é uma superfície pública não autenticada.

### [LÓGICA-022] RN-23 (ocupação) sem efeito determinístico; "pode influenciar" é não vinculante
Seção: RF-43 / RN-23 / RN-22

Problema: A RN-23 diz que a ocupação "pode influenciar sugestões de labels, modelos de formulário e termos". O verbo "pode" torna a regra não determinística — não fica claro o que o sistema obrigatoriamente faz com a ocupação. O RF-43 combina seleção de ocupação com personalização de labels num único requisito, mas o UC-49 e UC-50 os separam.

Impacto: Baixo

Sugestão: Tornar a RN-23 determinística (ex.: "ao selecionar uma ocupação conhecida, o sistema PRÉ-PREENCHE sugestões de labels editáveis"). Considerar separar RF-43 em dois RFs alinhados a UC-49 e UC-50.

---

## Conflitos entre KPIs (1.6) e RNFs (2.4)

### [LÓGICA-023] KPI de tempo de resposta (500ms) conflita com RNF-02 (leitura <500ms / escrita <1s)
Seção: Seção 1.6 / RNF-02

Problema: O KPI da seção 1.6 estabelece "Tempo de resposta das principais telas inferior a 500ms". O RNF-02 define "Leitura < 500ms | Escrita < 1s". O KPI não distingue leitura de escrita e impõe 500ms para "telas", o que para operações de escrita conflita com o RNF-02 (que admite até 1s). Além disso, "tempo de resposta de tela" (frontend, percepção do usuário) é métrica diferente de "tempo de resposta de API" (RNF-02) e de "page load" (RNF-01, P95 < 2s). As três métricas se sobrepõem de forma confusa.

Impacto: Médio

Sugestão: Harmonizar as métricas: definir claramente (a) page load (RNF-01), (b) tempo de resposta de API leitura/escrita (RNF-02), e (c) o KPI de tela. Ajustar o KPI de 500ms para não conflitar com escrita <1s, ou qualificá-lo como "telas de leitura".

### [LÓGICA-024] KPI de agendamento (<4 min) conflita com objetivo (<5 cliques / <5 min)
Seção: Seção 1.6 / Seção 1.4 / Seção 1.5

Problema: A seção 1.6 fixa "agendamento completo inferior a 4 minutos". A seção 1.4 fala em registrar a consulta "em menos de 5 minutos" e a seção 1.5 (objetivos específicos) menciona "fluxos essenciais concluídos em menos de 5 cliques". Há três alvos distintos (4 min, 5 min, 5 cliques) para o que aparenta ser o mesmo fluxo essencial, sem amarração entre eles e sem RNF de usabilidade mensurável que os formalize (RNF-16 a RNF-18 não cobrem tempo/cliques de tarefa).

Impacto: Médio

Sugestão: Unificar a métrica de "tempo/esforço para concluir um agendamento" em um único valor canônico e refletir como RNF de usabilidade mensurável. Diferenciar claramente "agendamento" de "registro de consulta" se forem fluxos distintos.

### [LÓGICA-025] KPI "zero perda de dados" não tem RNF de durabilidade alinhado (RPO 24h permite perda)
Seção: Seção 1.6 / RNF-06

Problema: O KPI da seção 1.6 exige "Zero perda de dados registrados pela usuária durante o MVP". O RNF-06 define RPO <= 24h com backup diário, o que por definição admite até 24h de perda de dados em caso de desastre. Há conflito direto entre o KPI de "zero perda" e a estratégia de durabilidade declarada (backup diário / RPO 24h).

Impacto: Alto

Sugestão: Reconciliar: ou reduzir o RPO (ex.: replicação síncrona / backups mais frequentes / WAL archiving) para sustentar "zero perda", ou ajustar o KPI para "zero perda em operação normal; RPO <= 24h em cenário de desastre". A topologia master-slave (seção 5.3.3) é replicação assíncrona, que também admite perda da última transação no failover.

### [LÓGICA-026] KPI de carga vs. RNF-01 (500 usuários simultâneos) sem base no público-alvo
Seção: Seção 1.6 / RNF-01 / RNF-22

Problema: RNF-01 exige P95 < 2s "@ 500 usuários simultâneos" e RNF-22 fala em "até 5.000 tenants". O público-alvo (seção 1.4) e os KPIs (seção 1.6) são centrados em "a usuária principal" e no MVP de uso individual. Há descompasso de escala: os KPIs do MVP são para uma única usuária, enquanto os RNFs assumem 500 simultâneos / 5.000 tenants, sem justificativa de origem desses números.

Impacto: Baixo

Sugestão: Justificar ou ajustar os números de carga dos RNFs ao horizonte real do MVP, ou explicitar que são metas de escalabilidade pós-MVP, separando-os dos KPIs do MVP.

---

## Personas e casos de uso sem RF correspondente

### [LÓGICA-027] Persona única (Carlos) não cobre o público-alvo nem a demanda-origem
Seção: Seção 2.1 / Seção 1.2 / Seção 1.4

Problema: A persona apresentada (seção 2.1) é apenas "Carlos". A demanda-origem (seção 1.2) é uma terapeuta autônoma (mulher, com CNPJ), e a "usuária principal" é referida no feminino nos KPIs (seção 1.6). Há descompasso entre a persona masculina única e a usuária real que originou o projeto, além de não haver persona para o colaborador (administrador do tenant) que aparece em UC-05/UC-06, nem para o cliente externo (UC-28).

Impacto: Baixo

Sugestão: Incluir uma persona alinhada à usuária-origem (terapeuta) e, idealmente, personas secundárias para colaborador e cliente externo, dado que esses atores têm casos de uso próprios.

### [LÓGICA-028] UC-28 (cliente solicita agendamento) — ator "Cliente" sem persona e com RF parcial
Seção: UC-28 / RF-23 / Seção 2.1

Problema: O UC-28 ("Solicitar agendamento por link público") tem ator "Cliente", mas não há persona de cliente externo (seção 2.1 só tem Carlos). O RF-23 cobre a geração do link e a solicitação, mas a jornada do cliente (ver detalhes, escolher serviço, fornecer dados de contato) não está detalhada em RF próprio.

Impacto: Baixo

Sugestão: Detalhar em RF a jornada do cliente no link público (dados mínimos coletados, escolha de serviço/horário) e considerar uma persona de cliente.

### [LÓGICA-029] UC-38/UC-39/UC-40 têm ator "Sistema" mas dependem de configuração sem garantia
Seção: UC-38 a UC-40 / RF-33 a RF-35 / RN-17

Problema: Os casos de uso de notificação (UC-38 a UC-40) têm ator "Sistema" e mapeiam para RF-33 a RF-35, que afirmam que o cliente "recebe" notificação. A RN-17, porém, condiciona o envio à existência de canal configurado ("se o canal estiver habilitado"). Os RFs estão escritos de forma absoluta ("o cliente recebe"), enquanto a RN os torna condicionais. Há contradição entre o RF (sempre envia) e a RN (envia se houver canal).

Impacto: Médio

Sugestão: Reescrever RF-33/RF-34/RF-35 com a condicional de canal configurado, alinhando com RN-17 e RN-19, evitando a leitura de que a notificação é garantida.

### [LÓGICA-030] Onboarding (fluxo 4.3) referencia "apelido/slug" sem RF claro
Seção: Seção 4.2/4.3 (Passo 4) / RF-04

Problema: O onboarding inclui "Passo 4: Informações Pessoais — apelido/nome de exibição" e arquivo `slug.png`. Esse apelido/slug é mapeado a RF-04 (gerenciamento de perfil), mas RF-04 não menciona apelido nem slug, e não há RN sobre unicidade de slug (relevante se o slug compõe o link público por tenant — RF-23). Mistura de conceitos (apelido de exibição vs. slug de URL pública) sem requisito formal.

Impacto: Médio

Sugestão: Esclarecer se "apelido" é só display name (perfil) ou se é o slug usado no link público do tenant. Se for slug público, criar RF/RN definindo unicidade e formato (vincular a RF-23).

---

## Fluxos (seção 3) que contradizem RFs ou RNs

### [LÓGICA-031] Fluxo de onboarding cria tenant antes do dashboard, mas RFs de tenant são WANTS/ambíguos
Seção: Seção 3.1 / Seção 4.1 / RF-04/RF-05

Problema: O fluxo principal (3.1) e a navegação (4.1) tornam a criação de tenant um passo obrigatório do onboarding ("login -> register -> tenants/new -> dashboard"). Porém não há RF explícito de "criar tenant" — a criação de tenant não aparece na lista RF-01 a RF-43 (RF-05 é convidar colaborador, não criar tenant). O fluxo central do produto carece de um RF que o sustente.

Impacto: Alto

Sugestão: Criar um RF de "Criar/selecionar tenant (espaço de trabalho)" como MVP, já que é etapa obrigatória do onboarding descrito nas seções 3 e 4. Hoje há um vazio: o passo mais central do fluxo não tem requisito funcional formal.

### [LÓGICA-032] Fluxo 3 (exclusão com dependências) confirma o conflito RF x RN de soft delete
Seção: Seção 3.2 (Fluxo 3) / RF-12/RF-16 / RN-06/RN-08/RN-24

Problema: O Fluxo 3 descreve corretamente o soft delete (inativação ao tentar excluir entidade com histórico). Isso confirma que a intenção do projeto é inativar, o que reforça a contradição apontada em LÓGICA-001/002/003: os RFs (RF-08/RF-12/RF-16) falam em "remover" sem condicionar, contradizendo o fluxo e as RNs. O fluxo está alinhado às RNs, mas não aos RFs.

Impacto: Médio

Sugestão: Usar o Fluxo 3 como base para corrigir a redação dos RFs de exclusão, garantindo consistência entre RF, RN e fluxo.

### [LÓGICA-033] Fluxo 1 (overbooking via link público) não tem espelho para criação manual
Seção: Seção 3.2 (Fluxo 1) / RF-20 / RN-10

Problema: O Fluxo 1 detalha proteção contra overbooking apenas no contexto do link público. A criação manual pelo profissional (RF-20) — onde a RN-10 também proíbe conflito — não tem fluxo nem está claro se o profissional pode sobrepor (override) a regra. Lacuna de comportamento para o caminho manual.

Impacto: Baixo

Sugestão: Documentar o comportamento de conflito também para a criação manual (RF-20), definindo se há bloqueio absoluto ou override com confirmação (relacionado a RN-25).

### [LÓGICA-034] Fluxo 4.1 cita "modelo de organizações do Sup" (referência truncada/incorreta)
Seção: Seção 4.1

Problema: A seção 4.1 afirma que o perfil é independente do tenant "semelhante ao modelo de organizações do Sup." A referência "Sup" parece truncada/incompleta (provavelmente "Supabase"). Embora seja um erro de redação e não de lógica, prejudica a clareza do modelo de multi-tenancy que sustenta RN-02 e RNF-07.

Impacto: Baixo

Sugestão: Corrigir a referência (ex.: "Supabase" ou "Slack/GitHub Organizations") para deixar o modelo de tenant claro.

---

## Observações adicionais (menores, fora do escopo estrito mas relevantes à lógica)

### [LÓGICA-035] Renomeação de "Serviços" para "Procedimentos" no mockup contradiz labels da RN-22
Seção: Seção 4.2 (Passo 2 Tenant) / RN-22 / RF-43

Problema: O mockup de personalização (seção 4.2) sugere renomear "Serviços" para "Procedimentos". Porém, ao longo do RFC, "procedimentos" e "serviços" são usados como sinônimos/intercambiáveis (RF-11 a RF-13 falam de "procedimentos e serviços"; RN-06 fala de "procedimentos"; UC-12 a UC-15 de "procedimento"). A RN-22 diz que labels personalizam apenas exibição, mas a entidade base já tem nome ambíguo ("serviço" = "procedimento"?), o que confunde qual é o nome canônico interno.

Impacto: Baixo

Sugestão: Fixar um nome canônico interno para a entidade (ex.: "Serviço") e tratar "Procedimento" sempre como label personalizável, padronizando a terminologia em RFs, RNs e UCs.

### [LÓGICA-036] Numeração/duplicação de soluções no índice (não-lógico, mas afeta credibilidade)
Seção: Seção 1.3

Problema: A seção 1.3 lista "Segunda Solução: MinhaAgenda" e logo depois "Segunda Solução: Google Calendar" (deveria ser "Terceira"). Erro de numeração que não afeta requisitos, mas foi notado durante a revisão das seções iniciais.

Impacto: Baixo

Sugestão: Corrigir para "Terceira Solução: Google Calendar".

---

## Resumo

Total de achados: 36 (LÓGICA-001 a LÓGICA-036).

Distribuição por impacto:
- Alto: 6 (LÓGICA-001, 002, 003, 025, 031, e a base recorrente do soft delete)
- Médio: 17
- Baixo: 13

Temas principais:
1. Contradição sistemática entre RFs de exclusão (RF-08/12/16) e as RNs de soft delete (RN-05/06/08/24) — os RFs falam em "remover", as RNs e o Fluxo 3 exigem inativação. (LÓGICA-001/002/003/032)
2. KPI "zero perda de dados" incompatível com RPO de 24h / replicação assíncrona. (LÓGICA-025)
3. Métricas de desempenho/tempo sobrepostas e conflitantes entre KPIs (1.6) e RNFs (RNF-01/02), e entre os alvos de "agendamento rápido" (4 min vs. 5 min vs. 5 cliques). (LÓGICA-023/024)
4. Ausência de RF formal para a criação de tenant, que é o passo central do onboarding (seções 3 e 4). (LÓGICA-031)
5. RFs de notificação escritos como garantia ("o cliente recebe") versus RN-17 condicional ("se houver canal"). (LÓGICA-029)
6. Diversos requisitos ambíguos/incompletos: política de senha (LÓGICA-007), verificação de e-mail sem RF (LÓGICA-008), pagamentos futuros (LÓGICA-010), tratamento de pagamento em cancelamento (LÓGICA-011), "validação adicional" indefinida (LÓGICA-012), precedência fixa/livre (LÓGICA-013).
7. Descompasso entre prioridade WANTS de multiusuário (RF-05/06) e seu tratamento como MVP na arquitetura/mockups. (LÓGICA-020)
8. Persona única (Carlos) desalinhada do público-alvo e da usuária-origem (terapeuta). (LÓGICA-027)
