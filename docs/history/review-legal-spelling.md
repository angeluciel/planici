# Revisão Jurídica (LGPD) e Linguística — RFC Planici

Documento revisado: `docs/RFC.md` (v1.0, 10/03/2026)
Revisor: análise de conformidade com a LGPD (Lei nº 13.709/2018) e de ortografia/gramática (português do Brasil).

---

## Parte A — LGPD e Conformidade Legal

### [LGPD-001] — Ausência de definição da base legal para tratamento (art. 7)
Localização: Seção 6.2 / "Finalidade do Tratamento" (linhas ~2019-2033)

Texto original: "Os dados serão tratados para permitir que o profissional utilize as funcionalidades principais do Planici, incluindo: criação e acesso à conta; gerenciamento de tenants; (...)"

Problema: O documento descreve a finalidade do tratamento, mas não identifica em nenhum momento a base legal específica (hipótese do art. 7 da LGPD) que autoriza cada operação. O art. 7 exige que todo tratamento esteja amparado em uma das dez hipóteses legais (consentimento, execução de contrato, legítimo interesse, cumprimento de obrigação legal, etc.). Apenas mencionar "consentimento ou base legal adequada" de forma genérica (linha 2033) não atende ao princípio da transparência (art. 6, VI) nem permite avaliar a adequação do tratamento.

Correção sugerida: Adicionar subseção "Bases Legais do Tratamento" mapeando cada categoria de dado/finalidade à hipótese do art. 7 — por exemplo: execução de contrato (art. 7, V) para dados do profissional titular da conta; legítimo interesse (art. 7, IX) para logs de auditoria e segurança; consentimento (art. 7, I) quando aplicável a comunicações de marketing.

---

### [LGPD-002] — Dados de clientes finais (terceiros) sem base legal definida e papel do controlador omisso
Localização: Seção 6.2 / "Dados de clientes cadastrados pelo profissional" e "Responsabilidades do Usuário" (linhas ~1989-1998 e ~2116-2125)

Texto original: "O profissional que utiliza o Planici também é responsável pelos dados que decide cadastrar sobre seus próprios clientes."

Problema: Os clientes finais cadastrados pelo profissional são titulares de dados (terceiros) cujo tratamento ocorre dentro do Planici, mas o documento não define a base legal aplicável a esses dados nem esclarece formalmente os papéis de controlador e operador (arts. 5, VI e VII, e 39 da LGPD). A frase indica responsabilidade do profissional, mas não há cláusula contratual de operador (art. 39) regulando a relação Planici (operador) x profissional (controlador). Sem isso, a alocação de responsabilidades é juridicamente frágil.

Correção sugerida: Definir explicitamente que o profissional atua como controlador dos dados de seus clientes e o Planici como operador, com cláusula de tratamento conforme art. 39, e indicar a base legal aplicável (geralmente execução de contrato/legítimo interesse do profissional-controlador).

---

### [LGPD-003] — Dados sensíveis sem tratamento diferenciado exigido pelo art. 11
Localização: Seção 6.2 / "Dados Potencialmente Sensíveis" (linhas ~2046-2056)

Texto original: "existe a possibilidade de o usuário inserir informações potencialmente sensíveis em campos livres, observações ou formulários personalizados. Por isso, o sistema deverá: evitar solicitar dados sensíveis por padrão; (...)"

Problema: O público-alvo inclui terapeutas, nutricionistas e psicólogos (linhas 82, 273, 772, 2048), o que torna o tratamento de dados sensíveis de saúde (art. 5, II) altamente provável, não apenas "potencial". O art. 11 da LGPD exige tratamento diferenciado para dados sensíveis: consentimento específico e destacado ou hipóteses específicas do art. 11, II. O documento apenas recomenda "evitar" e "indicar", sem prever consentimento específico, criptografia reforçada obrigatória para esses campos, ou avaliação de impacto (RIPD/DPIA, art. 38). O tratamento de dados de saúde recebe proteção mais rígida e o RFC não a endereça.

Correção sugerida: Reconhecer expressamente o tratamento de dados sensíveis de saúde, prever consentimento específico e destacado (art. 11, I) para esses campos quando aplicável, exigir criptografia em repouso obrigatória para observações/formulários, e mencionar elaboração de Relatório de Impacto à Proteção de Dados Pessoais (RIPD).

---

### [LGPD-004] — Prazos de retenção indefinidos
Localização: Seção 6.2 / "Armazenamento e Retenção" (linhas ~2088-2098)

Texto original: "dados operacionais ficam armazenados enquanto a conta ou tenant estiver ativo; (...) logs de auditoria devem possuir retenção mínima definida; backups devem seguir política de retenção própria; dados excluídos da aplicação poderão permanecer em backups por tempo limitado, até expiração do ciclo de retenção."

Problema: Os prazos de retenção estão indefinidos ("retenção mínima definida", "política de retenção própria", "tempo limitado") sem valores concretos. O art. 15 e o art. 16 da LGPD exigem que os dados sejam eliminados após o término do tratamento, e o princípio da necessidade (art. 6, III) requer prazos delimitados. A ausência de prazo concreto após o encerramento da conta/tenant é uma lacuna relevante. (Observa-se que o RNF-11 fixa logs ≥ 90 dias e o RNF-06 fixa backups ≥ 7 dias, mas a seção de privacidade não os referencia e não define prazo de retenção após o fim do contrato.)

Correção sugerida: Definir prazos concretos, por exemplo: "dados pessoais eliminados ou anonimizados em até X dias após o encerramento da conta, ressalvadas obrigações legais; logs de auditoria retidos por 90 dias (RNF-11); backups com retenção de 7 dias (RNF-06), após o que os dados excluídos são purgados".

---

### [LGPD-005] — Direitos do titular previstos apenas como "Wants" e sem canal/prazo no MVP
Localização: Seção 2.4 RNF-13/RNF-14 (linhas ~920-932) e Seção 6.2 / "Solicitação de Acesso, Exportação e Remoção de Dados" (linhas ~2100-2114)

Texto original: "No MVP, caso ainda não exista uma tela automatizada para isso, essas solicitações poderão ser feitas por canal de suporte definido pelo projeto."

Problema: Os direitos de acesso, portabilidade e eliminação (RNF-13 e RNF-14) estão classificados como prioridade "Wants" (não MVP), enquanto o art. 18 da LGPD garante esses direitos de forma incondicional ao titular, independentemente do estágio do produto. O texto admite que no MVP pode não haver canal automatizado e remete a um "canal de suporte definido pelo projeto" que não está especificado (sem e-mail/formulário e sem prazo de resposta concreto — o art. 19 prevê resposta em até 15 dias para confirmação/acesso). Direito de correção é mencionado, mas oposição (art. 18, §2) e revogação de consentimento (art. 8, §5) não são endereçados.

Correção sugerida: Garantir, já no MVP, um canal explícito (ex.: e-mail dpo@planici...) com prazos compatíveis com o art. 19 (15 dias). Reclassificar o atendimento aos direitos do titular como requisito obrigatório e incluir os direitos de oposição e de revogação de consentimento.

---

### [LGPD-006] — Compartilhamento com terceiros sem cláusulas de responsabilidade nem identificação dos operadores
Localização: Seção 6.2 / "Compartilhamento com Terceiros" (linhas ~2076-2086)

Texto original: "O Planici poderá se comunicar com serviços externos apenas quando necessário (...) envio de e-mails; envio de notificações por WhatsApp; autenticação via Google; (...) infraestrutura de hospedagem, banco de dados, backup e monitoramento."

Problema: O documento lista categorias de terceiros (suboperadores), mas não prevê cláusulas de responsabilidade/contratos de tratamento (art. 39) com esses operadores, nem trata da hipótese de transferência internacional de dados (arts. 33 a 36) — relevante porque Google, WhatsApp/Meta, Sentry e infraestrutura de nuvem frequentemente armazenam/processam dados fora do Brasil. O envio de dados de clientes via WhatsApp (Evolution API) e o uso do Sentry (RNF-21, que pode capturar dados pessoais em logs de erro) não têm salvaguardas descritas.

Correção sugerida: Adicionar que todo suboperador será regido por contrato de tratamento (art. 39); identificar nominalmente os operadores principais; e incluir cláusula sobre transferência internacional de dados com as salvaguardas dos arts. 33-35 (cláusulas-padrão/garantias adequadas).

---

### [LGPD-007] — Ausência de figura do Encarregado (DPO) e de procedimento para incidentes
Localização: Documento inteiro — Seção 6 (Segurança e Privacidade)

Texto original: (não há trecho — ausência)

Problema: O art. 41 da LGPD exige a indicação de um Encarregado pelo Tratamento de Dados (DPO) e o art. 48 obriga a comunicação de incidentes de segurança à ANPD e aos titulares. Nenhum dos dois é mencionado no RFC. Embora haja seção de auditoria/monitoramento (6.1), não há plano de resposta e notificação de incidente de violação de dados pessoais.

Correção sugerida: Incluir a indicação de um Encarregado (ou canal de contato do Encarregado) e um procedimento de notificação de incidentes à ANPD e aos titulares afetados conforme o art. 48.

---

### [LGPD-008] — Erro material na descrição da base legal de consentimento (RNF-12)
Localização: Seção 2.4 / RNF-12 (linhas ~913-918)

Texto original: "O sistema deve exigir aceite explícito dos termos de uso e política de privacidade no cadastro, com registro rastreável, atendendo à legal de consentimento exigida pela LGPD."

Problema: Além do erro gramatical ("atendendo à legal" — falta substantivo, ver [ORTOG]), há imprecisão jurídica: o aceite de Termos de Uso/Política de Privacidade no cadastro corresponde, em regra, à base de execução de contrato (art. 7, V), e não a "consentimento" no sentido técnico do art. 5, XII e art. 8 (que exige manifestação livre, informada, inequívoca e para finalidade determinada). Tratar aceite contratual como "consentimento" pode invalidar a base legal, pois consentimento deve ser destacado e revogável.

Correção sugerida: "(...) atendendo aos requisitos de transparência e às bases legais exigidas pela LGPD, registrando o aceite contratual (art. 7, V) e, quando houver tratamento que dependa de consentimento (art. 7, I), coletando-o de forma destacada e revogável."

---

### [LGPD-009] — CNPJ de pessoa identificável exposto em texto plano no documento
Localização: Seção 1.2 / "Projeto solicitado por" (linha ~96)

Texto original: "Profissional autônoma: Terapeuta com CNPJ: 62.551.135\0001-00, atuando de forma individual."

Problema: O documento expõe o CNPJ de uma profissional autônoma individual identificável (titular real, conforme seção 1.2). Em um RFC público (o README referencia o documento), isso representa exposição desnecessária de dado de pessoa identificável, contrariando o princípio da minimização que o próprio RFC defende. Há ainda erro de formatação no separador ("\0001" usando barra invertida em vez de barra/"/0001"). Recomenda-se anonimizar.

Correção sugerida: Remover ou mascarar o CNPJ (ex.: "CNPJ informado em sigilo" ou "62.XXX.XXX/0001-00").

---

### [LGPD-010] — Dados de convidado no link público sem aviso de privacidade ao titular
Localização: Seção 6.2 / "Dados de agenda e atendimento" (linha ~2007) e RF-23 (linhas ~616-619)

Texto original: "dados de convidado no link público, como nome, e-mail e telefone;"

Problema: O cliente externo que usa o link público para solicitar agendamento (sem criar conta) tem seus dados coletados, mas o RFC não prevê apresentação de aviso de privacidade/base legal a esse titular no momento da coleta (art. 9 — direito à informação clara sobre o tratamento). Como esse titular não passa pelo onboarding onde os termos são aceitos (RNF-12), há coleta de dados sem informação ao titular.

Correção sugerida: Prever exibição de aviso de privacidade resumido e identificação da finalidade/base legal na própria página do link público de agendamento, antes do envio dos dados.

---

## Parte B — Ortografia e Gramática (Português do Brasil)

### [ORTOG-001] — Erro de digitação: "ldiar"
Localização: Seção 3.2 (linha ~1367)

Texto original: "o sistema precisa ldiar de forma resiliente com cenários de erro"

Problema: "ldiar" não existe; é erro de digitação de "lidar".

Correção sugerida: "o sistema precisa lidar de forma resiliente com cenários de erro"

---

### [ORTOG-002] — Regência/preposição faltando: "necessária o modelo"
Localização: Seção 1.2 (linha ~98)

Texto original: "não permitem a customização necessária o modelo de negócio da profissional"

Problema: Falta a preposição "para" (ou "ao") ligando "necessária" ao complemento.

Correção sugerida: "não permitem a customização necessária para o modelo de negócio da profissional"

---

### [ORTOG-003] — Título duplicado/errado: "Segunda Solução: Google Calendar"
Localização: Seção 1.3 (linha ~182)

Texto original: "<h3>Segunda Solução: Google Calendar</h3>"

Problema: Erro de numeração — esta é a terceira solução (a segunda é MinhaAgenda, linha 146). O comentário de região na linha 180 já indica "TERCEIRA SOLUÇÃO".

Correção sugerida: "<h3>Terceira Solução: Google Calendar</h3>"

---

### [ORTOG-004] — Erro de crase: "plano mais barato à R$100"
Localização: Seção 1.3 / Diferencial do Projeto (linha ~243)

Texto original: "Acuity: Sem plano grátis, plano mais barato à R$100, incompleto."

Problema: Uso indevido de crase antes de valor monetário/numeral; o correto é "a" sem acento (não há artigo feminino a fundir com preposição).

Correção sugerida: "plano mais barato a R$ 100"

---

### [ORTOG-005] — Falta de acento: "autonomos"
Localização: Seção 1.3 / Nicho Atendido (linha ~262)

Texto original: "Profissionais autonomos com foco em serviços personalizados"

Problema: "autonomos" deve ser "autônomos" (proparoxítona acentuada).

Correção sugerida: "Profissionais autônomos com foco em serviços personalizados"

---

### [ORTOG-006] — Padronização "dia-a-dia" vs "dia a dia"
Localização: Seção 1.4 (linha ~280), Seção 1.6 (linha ~324); cf. Seção 1.5 (linha ~299) que usa "dia a dia"

Texto original: "sabe usar smartphone e navegador no dia-a-dia." / "tarefas do dia-a-dia"

Problema: Pelo Acordo Ortográfico vigente, a forma correta é "dia a dia" (sem hifens). O documento usa as duas formas, gerando inconsistência.

Correção sugerida: Padronizar para "dia a dia" em todas as ocorrências.

---

### [ORTOG-007] — Concordância/preposição: "crescimento da de tenants"
Localização: Seção 2.4 / RNF-22 Description (linha ~1027)

Texto original: "suportando o crescimento da de tenants sem degradação de performance."

Problema: Há palavra faltando entre "da" e "de" (provavelmente "base"); construção sem sentido.

Correção sugerida: "suportando o crescimento da base de tenants sem degradação de performance."

---

### [ORTOG-008] — Erro de digitação técnica: "Disaster Recover (RTO)"
Localização: Seção 2.4 / RNF-05 (linha ~837)

Texto original: "<strong>Disaster Recover (RTO)</strong>"

Problema: O termo correto é "Disaster Recovery" (RNF-06 na linha 844 já grafa corretamente). Inconsistência terminológica entre RNF-05 e RNF-06.

Correção sugerida: "Disaster Recovery (RTO)"

---

### [ORTOG-009] — Frase truncada / termo faltando: "atendendo à legal de consentimento"
Localização: Seção 2.4 / RNF-12 (linha ~915)

Texto original: "atendendo à legal de consentimento exigida pela LGPD."

Problema: Falta o substantivo após "à legal" (provavelmente "à exigência legal" ou "à base legal"). Também há a questão jurídica em [LGPD-008].

Correção sugerida: "atendendo à exigência legal de consentimento prevista na LGPD."

---

### [ORTOG-010] — Erro de digitação: "Domain-Driver Design"
Localização: Seção 5.4 / NestJS, subtítulo 1 (linha ~1790)

Texto original: "Compatibilidade com Domain-Driver Design e Arquitetura Hexagonal"

Problema: O correto é "Domain-Driven Design" (DDD). "Driver" está errado. Também o link na linha 1791 usa "domain-drive-hexagon" (deveria ser "domain-driven-hexagon", como no link real da seção 8, linha 2168).

Correção sugerida: "Compatibilidade com Domain-Driven Design e Arquitetura Hexagonal"

---

### [ORTOG-011] — Erro de digitação: "móudlo"
Localização: Seção 5.4 / NestJS, subtítulo 2 (linha ~1796)

Texto original: "O NestJS oferece o móudlo `@nestjs/cqrs`"

Problema: "móudlo" é erro de digitação de "módulo".

Correção sugerida: "O NestJS oferece o módulo `@nestjs/cqrs`"

---

### [ORTOG-012] — Crase indevida: "via à `class-validator`"
Localização: Seção 5.4 / NestJS, subtítulo 2 (linha ~1794)

Texto original: "validação robusta de entrada (via à `class-validator`, `class-transformer` e `zod`"

Problema: "via à" está incorreto; não cabe crase aqui (não há artigo feminino a fundir). O correto seria "via" ou "por meio de".

Correção sugerida: "validação robusta de entrada (via `class-validator`, `class-transformer` e `zod`"

---

### [ORTOG-013] — Erro de digitação: "confirmidade ACID"
Localização: Seção 5.4 / PostgreSQL (linha ~1803)

Texto original: "combinando confirmidade ACID, suporte nativo a JSON/JSONB"

Problema: "confirmidade" é erro de digitação de "conformidade".

Correção sugerida: "combinando conformidade ACID, suporte nativo a JSON/JSONB"

---

### [ORTOG-014] — Erro de digitação: "mesom princípio"
Localização: Seção 5.4 / PostgreSQL master-slave (linha ~1810)

Texto original: "Essa separação implementa na infraestrutura o mesom princípio que o padrão CQRS implementa no código"

Problema: "mesom" é erro de digitação de "mesmo".

Correção sugerida: "(...) implementa na infraestrutura o mesmo princípio que o padrão CQRS implementa no código"

---

### [ORTOG-015] — Erro de digitação: "clico de vida"
Localização: Seção 5.4 / RabbitMQ (linha ~1815)

Texto original: "desacoplar os fluxos que não precisam de resposta imediata do clico de vida da requisição HTTP principal"

Problema: "clico" é erro de digitação de "ciclo".

Correção sugerida: "(...) do ciclo de vida da requisição HTTP principal"

---

### [ORTOG-016] — Inconsistência de capitalização: "whatsapp"
Localização: Seção 5.4 / RabbitMQ (linha ~1815)

Texto original: "logs de auditoria, notificações via whatsapp e notificações via e-mail"

Problema: "whatsapp" deveria ser "WhatsApp" (nome próprio), como grafado no restante do documento (ex.: linhas 308, 715, 1765).

Correção sugerida: "(...) notificações via WhatsApp e notificações via e-mail"

---

### [ORTOG-017] — Frase incompleta: "com nos mockups"
Localização: Seção 4 / nota inicial (linha ~1398)

Texto original: "apresenta a visualização inicial do Planici antes da implementação, com nos mockups desenvolvidos no Figma"

Problema: "com nos mockups" está agramatical; falta termo (provavelmente "com base nos mockups").

Correção sugerida: "(...) antes da implementação, com base nos mockups desenvolvidos no Figma"

---

### [ORTOG-018] — Referência cortada: "modelo de organizações do Sup."
Localização: Seção 4.1 (linha ~1418)

Texto original: "semelhante ao modelo de organizações do Sup."

Problema: A palavra parece truncada ("Sup."). Provavelmente "Supabase" ou outro produto. Referência incompleta/ambígua.

Correção sugerida: Completar o nome do produto, ex.: "semelhante ao modelo de organizações do Supabase."

---

### [ORTOG-019] — Inconsistência terminológica: "Procedimentos" vs "Serviços"
Localização: Documento inteiro (ex.: seções 2.2.3, 5.3.2 "serviços/procedimentos", 4.2)

Texto original: "Procedimentos e serviços" / "serviços/procedimentos, planos/pacotes"

Problema: Os conceitos "procedimento" e "serviço" são usados ora como sinônimos ("serviços/procedimentos"), ora como entidades distintas (UC-12 "Cadastrar procedimento" vs RF-20 "cliente, plano ou serviço"). O mesmo ocorre com "plano" vs "pacote". Embora a RN-22 explique que labels podem variar, o documento técnico deveria fixar um termo canônico interno. A ambiguidade dificulta o mapeamento RF/RN/modelo de dados.

Correção sugerida: Definir um glossário fixando o termo canônico do domínio (ex.: "Serviço/Procedimento = mesma entidade interna `service`") e usá-lo consistentemente, reservando a variação apenas para a camada de labels (RN-22).

---

### [ORTOG-020] — Sigla sem definição na primeira ocorrência: "ERM"
Localização: Índice (linha ~64) e Seção 5.2 (linhas ~64, 1724-1729)

Texto original: "Diagrama entidade-relacionamento (ERM)" / "Modelo de Dados (...) modelo er"

Problema: A sigla "ERM" aparece no índice sem padronização e a seção 5.2 não a define explicitamente. O termo usual em português é "MER" (Modelo Entidade-Relacionamento) ou, em inglês, "ERD"/"ER Model". Há inconsistência ("ERM" no índice, "modelo er" no alt-text, "ERM" na descrição da seção 64).

Correção sugerida: Padronizar a sigla e defini-la na primeira ocorrência, ex.: "Modelo Entidade-Relacionamento (MER)".

---

### [ORTOG-021] — Sigla sem definição na primeira ocorrência: "CQRS"
Localização: Seção 5.3.2 (linha ~1753); definição implícita só aparece na seção 5.4 (linha ~1794)

Texto original: "O backend segue DDD, arquitetura hexagonal event-driven com CQRS"

Problema: "CQRS" e "DDD" são usados na seção 5.3.2 antes de qualquer definição. "DDD" só é expandido na seção 5.4 ("Domain-Driven Design"), e "CQRS" só é parcialmente explicado ("comando e queries") na linha 1794. Boa prática: definir a sigla na primeira ocorrência.

Correção sugerida: Na primeira ocorrência: "(...) segue DDD (Domain-Driven Design), arquitetura hexagonal orientada a eventos com CQRS (Command Query Responsibility Segregation)".

---

### [ORTOG-022] — Sigla sem definição na primeira ocorrência: "RBAC", "RLS", "DI"
Localização: Seções 5.3.2 (linha ~1755), 2.4 RNF-07 (linha ~853), 5.4 (linha ~1791)

Texto original: "controle de acesso baseado em papéis (RBAC)" / "Row-Level Security (RLS)" / "injeção de dependência (DI Container)"

Problema: "RLS" aparece pela primeira vez no RNF-07 (linha 853) já com a forma extensa, o que é correto; porém "RBAC" só recebe a forma extensa em uma ocorrência e "DI" não é expandida. Verificar consistência: a primeira menção de cada sigla deve trazer a forma por extenso.

Correção sugerida: Garantir forma extensa na primeira ocorrência de cada sigla (RBAC = Role-Based Access Control; DI = Dependency Injection).

---

### [ORTOG-023] — Mistura de idiomas nos cabeçalhos das tabelas de RNF
Localização: Seção 2.4 (linhas ~788-790 e seguintes)

Texto original: "<th>Quality Attribute</th> <th>Description</th> <th>Metric / Acceptance Criteria</th> <th>Priority</th>"

Problema: O documento é em português do Brasil, mas os cabeçalhos das tabelas de RNF e diversos nomes de atributos (ex.: "Page Load Performance", "Authentication Security", "Right to Erasure") estão em inglês, criando inconsistência de idioma. As tabelas de RF (seção 2.3) usam cabeçalhos em português ("Requisito", "Descrição", "Prioridade").

Correção sugerida: Traduzir os cabeçalhos para português ("Atributo de Qualidade", "Descrição", "Métrica / Critério de Aceitação", "Prioridade") para uniformizar, ou registrar em glossário a opção por manter termos técnicos em inglês.

---

### [ORTOG-024] — Inconsistência de capitalização na prioridade: "Wants" vs "WANTS" vs "MVP"
Localização: Seção 2.3 (linhas ~484, 488) e Seção 2.4 (linhas ~896, 924, 930, 973)

Texto original: "WANTS" (RF-05, RF-06) vs "Wants" (RNF-11, RNF-13, RNF-14, RNF-18)

Problema: O mesmo nível de prioridade é grafado de formas diferentes ("WANTS" em maiúsculas nos RF e "Wants" capitalizado nos RNF). Inconsistência de padronização.

Correção sugerida: Padronizar uma única grafia (ex.: "WANTS") em todo o documento.

---

### [ORTOG-025] — Inconsistência de unidade: "mes" sem acento
Localização: Seção 1.3 (linhas ~129, 130, 164)

Texto original: "USD 20/mes", "USD 61/mes", "max 50 agendamentos/mes"

Problema: "mes" sem acento; o correto é "mês". Ocorre múltiplas vezes nas tabelas de soluções existentes.

Correção sugerida: "USD 20/mês", "USD 61/mês", "máx. 50 agendamentos/mês".

---

### [ORTOG-026] — Concordância de gênero: "à legal" e regência em "a customização"
Localização: ver [ORTOG-002] e [ORTOG-009] (consolidação)

Observação: Itens já detalhados acima; registrados aqui apenas para referência cruzada de problemas de regência/concordância na Parte B.

---

### [ORTOG-027] — Tag HTML mal fechada (afeta renderização do texto)
Localização: Seção 1.3 (linhas ~136, 172, 209)

Texto original: "<summary><h4>Image<h4/></summary>"

Problema: A tag de fechamento está incorreta: "<h4/>" deveria ser "</h4>". Embora seja erro de marcação, afeta a exibição do conteúdo textual ("Image" também poderia ser "Imagem" para manter o idioma português).

Correção sugerida: "<summary><h4>Imagem</h4></summary>"

---

## Resumo

### Achados de LGPD (10)
- [LGPD-001] Base legal do tratamento não identificada (art. 7).
- [LGPD-002] Dados de clientes terceiros sem base legal e sem cláusula controlador/operador (arts. 39, 5).
- [LGPD-003] Dados sensíveis de saúde sem tratamento diferenciado do art. 11 (consentimento específico, RIPD).
- [LGPD-004] Prazos de retenção indefinidos (arts. 15, 16).
- [LGPD-005] Direitos do titular como "Wants", sem canal/prazo no MVP (arts. 18, 19).
- [LGPD-006] Compartilhamento com terceiros sem cláusulas de responsabilidade e sem tratar transferência internacional (arts. 33-39).
- [LGPD-007] Ausência de Encarregado (DPO) e de plano de resposta a incidentes (arts. 41, 48).
- [LGPD-008] Aceite contratual tratado erroneamente como "consentimento" (arts. 7, V e 8).
- [LGPD-009] CNPJ de pessoa identificável exposto em texto plano.
- [LGPD-010] Coleta no link público sem aviso de privacidade ao titular (art. 9).

Principais (prioridade alta): LGPD-003 (dados sensíveis de saúde), LGPD-001/008 (base legal incorreta/ausente), LGPD-005 (direitos do titular não garantidos no MVP) e LGPD-002 (papéis controlador/operador indefinidos).

### Achados de Ortografia/Gramática (27, sendo ORTOG-026 referência cruzada)
- Erros de digitação claros: ldiar (001), Domain-Driver (010), móudlo (011), confirmidade (013), mesom (014), clico (015).
- Crase indevida: "à R$100" (004), "via à class-validator" (012).
- Acentuação/unidade: autonomos (005), "mes" sem acento (025).
- Frases truncadas/regência: "necessária o modelo" (002), "da de tenants" (007), "à legal de consentimento" (009), "com nos mockups" (017), "do Sup." (018).
- Numeração/títulos: "Segunda Solução: Google Calendar" (003), "Disaster Recover" (008).
- Consistência terminológica e de idioma: procedimento/serviço (019), cabeçalhos em inglês (023), WANTS/Wants (024), whatsapp (016), dia-a-dia (006).
- Siglas sem definição na 1ª ocorrência: ERM/MER (020), CQRS/DDD (021), RBAC/RLS/DI (022).
- Marcação: tag h4 mal fechada (027).

Principais (prioridade alta para correção): ORTOG-010 (Domain-Driver Design — erro conceitual visível), ORTOG-003 (numeração de seção errada), ORTOG-001/011/013/014/015 (erros de digitação que prejudicam credibilidade), ORTOG-019 (inconsistência terminológica procedimento/serviço que afeta a engenharia de requisitos).
