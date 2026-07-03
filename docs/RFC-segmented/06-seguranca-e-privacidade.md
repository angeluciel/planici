# 6. Segurança e Privacidade

> [!NOTE]
> A segurança do Planici é um requisito essencial, pois o sistema armazena informações de profissionais autônomos, clientes, agenda, serviços, pagamentos e configurações do espaço de trabalho (e, no Pós-MVP, planos e formulários personalizados). Como o sistema opera em modelo multi-tenant, a principal preocupação de segurança é garantir que cada profissional ou empresa acesse somente os dados do seu próprio tenant.

As medidas de segurança do sistema serão organizadas em cinco frentes principais:

1. autenticação segura;
2. autorização e controle de permissões;
3. isolamento de dados por tenant;
4. proteção contra vulnerabilidades comuns em aplicações web;
5. privacidade e conformidade com a LGPD.

<!-- 6.1 Segurança da Aplicação -->

## 6.1 Segurança da Aplicação

### Autenticação

O Planici permitirá autenticação por e-mail e senha, além de autenticação externa por Google. Para contas criadas com senha, a senha não será armazenada em texto puro. O sistema deverá armazenar apenas o hash da senha, utilizando bcrypt com fator de custo adequado.

Medidas previstas:

- armazenamento de senhas com hash seguro;
- validação de senha forte no cadastro;
- verificação de e-mail durante o fluxo de criação de conta;
- recuperação de senha por link temporário enviado por e-mail;
- uso de tokens de autenticação com tempo de expiração;
- invalidação de sessões ou tokens em caso de logout ou troca de senha.

#### Proteção contra força bruta e credential stuffing

Para reduzir o risco de comprometimento de contas, além do rate limit por IP (RNF-10), o sistema deverá adotar:

- **lockout progressivo por conta:** após um número limitado de tentativas de login malsucedidas, o sistema aplica atraso crescente e, no limite, bloqueio temporário da conta, independentemente do IP de origem;
- **proteção contra credential stuffing distribuído:** combinação de limite por conta **e** por IP, com monitoramento de picos de falhas de autenticação (rate limit por IP isolado é insuficiente contra ataques distribuídos);
- **MFA/2FA opcional (TOTP):** segundo fator de autenticação baseado em TOTP, disponível de forma opcional ao menos para o papel **Owner**, dada a sensibilidade dos dados de clientes tratados no tenant.

### Autorização e Permissões

**No MVP**, cada tenant possui um único usuário — o profissional, com papel **Owner** e acesso total ao seu espaço de trabalho. A autorização se resume a duas verificações: usuário autenticado (RN-01) e vínculo com o tenant dos dados acessados (RN-02), reforçado por RLS no banco.

**[Pós-MVP]** Quando o multiusuário (RF-05/RF-06) for implementado, o sistema passará a ter controle de acesso baseado em papéis e permissões:

- **Owner:** responsável principal pelo tenant, com acesso total;
- **Admin:** gerencia configurações, usuários e dados operacionais;
- **Member:** acessa funcionalidades operacionais permitidas;
- **Viewer:** possui acesso limitado para consulta.

As permissões poderão ser definidas por recurso e ação (ex.: `clients:create`, `payments:read`, `settings:manage`), permitindo perfis como “acesso somente à agenda” ou “acesso a clientes e serviços, mas sem acesso financeiro”.

### Isolamento por Tenant

O Planici utiliza arquitetura multi-tenant. Portanto, clientes, serviços, planos, agendamentos, pagamentos, formulários, configurações e colaboradores devem estar vinculados a um tenant.

A regra principal é:

> um usuário só pode acessar dados de um tenant se possuir vínculo autorizado com esse tenant.

Para reforçar esse isolamento, todas as consultas e operações sensíveis deverão considerar o `tenant_id`. Além da validação na aplicação, o banco de dados deverá aplicar Row-Level Security (RLS) nas tabelas que possuem `tenant_id`, reduzindo o risco de vazamento entre tenants mesmo em caso de erro de implementação na API.

### Proteção contra OWASP Top 10

O desenvolvimento do Planici deverá considerar as principais categorias de risco do OWASP Top 10, especialmente:

- **Broken Access Control:** mitigado por validação de permissões, vínculo com tenant e RLS no banco;
- **Cryptographic Failures:** mitigado por TLS, hash de senha e armazenamento seguro de credenciais;
- **Injection:** mitigado pelo uso de ORM/query builder com queries parametrizadas;
- **Security Misconfiguration:** mitigado por variáveis de ambiente, CORS restrito, headers de segurança e separação entre ambientes;
- **Authentication Failures:** mitigado por senhas fortes, tokens com expiração e recuperação de senha segura;
- **Security Logging and Monitoring Failures:** mitigado por logs de ações críticas e alertas de falhas.

### Segurança de Transporte

Todo tráfego entre cliente e servidor deverá ocorrer via HTTPS, utilizando TLS 1.2 ou superior. Isso protege dados sensíveis contra interceptação durante login, cadastro de clientes, envio de formulários, registro de pagamentos e uso do link público de agendamento.

Também devem ser configurados headers de segurança, como:

- CORS restrito aos domínios permitidos;
- Content Security Policy (CSP);
- X-Frame-Options ou equivalente;
- proteção contra MIME sniffing;
- cookies seguros, caso cookies sejam utilizados.

### Proteção da API

A API deverá implementar mecanismos de proteção contra abuso e ataques automatizados.

Medidas previstas:

- rate limit por IP e/ou por usuário;
- validação de entrada em todos os endpoints;
- paginação obrigatória em listagens com muitos registros;
- bloqueio ou limitação de tentativas repetidas de login;
- tratamento seguro de erros, sem exposição de stack trace ao usuário final;
- logs internos para falhas críticas e tentativas suspeitas.

### Dados Sensíveis e Credenciais de Integração

Algumas informações exigem cuidado especial, como:

- hash de senha;
- tokens de sessão;
- tokens de recuperação de senha;
- dados pessoais de clientes;
- observações em campos livres;
- **[Pós-MVP]** credenciais de integração com WhatsApp e respostas de formulários personalizados.

Credenciais de integração, quando existirem (Pós-MVP), não devem ser exibidas integralmente após o cadastro e devem ser criptografadas em repouso ou armazenadas em serviço seguro de secrets. Tokens temporários, como recuperação de senha ou verificação de e-mail, devem possuir expiração e não devem ser reutilizáveis após o uso.

### Segurança do Link Público de Agendamento

O link público de agendamento (RF-23) é um endpoint **não autenticado** que expõe disponibilidade do profissional e aceita solicitações de agendamento de pessoas sem conta (RN-11). Por isso, além do rate limit genérico por IP (RNF-10) — facilmente contornável e que pode bloquear clientes legítimos atrás de NAT —, esse endpoint deverá possuir controles dedicados:

- **CAPTCHA/challenge** antes de submeter uma solicitação de agendamento, para conter automação e spam de pendências;
- **verificação de contato** (confirmação de e-mail ou telefone) antes de a solicitação ser efetivada;
- **limites por slug/janela de tempo:** restrição do número de solicitações por slug de tenant e por janela temporal, complementando o limite por IP;
- **slugs não enumeráveis:** o identificador público do tenant não deve ser sequencial nem facilmente adivinhável, dificultando enumeração e scraping de disponibilidade;
- **expiração automática de solicitações pendentes:** solicitações não confirmadas pelo profissional expiram após prazo definido, evitando poluição da fila de pendentes.

### Tokens em Links Acionáveis de Notificação [Pós-MVP]

**O MVP não implementa notificações de agendamento nem links acionáveis** (RF-33 a RF-35 são Pós-MVP); os controles abaixo ficam dispensados até que tais links sejam introduzidos.

Quando as notificações de confirmação, cancelamento e remarcação forem implementadas e incluírem links acionáveis enviados ao cliente (ex.: "confirmar" ou "cancelar" agendamento), esses links representam superfície de ataque (IDOR/manipulação de agendamento alheio) e deverão usar tokens:

- **assinados** (verificáveis pelo servidor, não adivinháveis);
- **de uso único** (invalidados após a primeira ação);
- **com expiração** compatível com a janela do atendimento;
- **com escopo restrito a um único agendamento**, sem permitir acesso a outros recursos do tenant ou do cliente.

### Controle de Exportação de Dados [Pós-MVP]

A exportação de relatórios financeiros (RF-32) e a exportação automatizada dos dados do tenant e de seus clientes (RNF-13) são funcionalidades Pós-MVP; os controles abaixo se aplicam quando forem implementadas. A exportação constitui um vetor de exfiltração em massa de dados pessoais: além de registrar a exportação como evento auditável, o sistema deverá adotar controles preventivos:

- **restrição por papel:** a exportação completa de dados fica restrita a papéis específicos (ex.: Owner/Admin);
- **reautenticação ou confirmação adicional** para a exportação completa (RNF-13);
- **limite de frequência** de exportações por usuário/tenant;
- **alerta de auditoria** em exportações de grande volume, para detecção de uso anômalo.

### Segurança das Integrações Externas e Webhooks [Pós-MVP]

No MVP, a única integração de envio é o AWS SES (e-mails de conta), sem webhooks de entrada configuráveis pelo tenant. Quando as integrações Pós-MVP com WhatsApp (Evolution API) e provedores de e-mail de notificação forem implementadas, elas podem envolver webhooks de entrada (status de entrega) e chamadas a instâncias configuradas pelo próprio tenant. Para reduzir a superfície de ataque, o sistema deverá:

- **validar a assinatura/origem de todo webhook recebido**, rejeitando requisições não autenticadas (proteção contra spoofing de status);
- **proteger contra SSRF** nas integrações configuráveis pelo tenant (ex.: URL de instância Evolution self-hosted), por meio de allowlist de destinos e bloqueio de endereços internos/privados;
- armazenar as credenciais de integração de forma segura, conforme já descrito em *Dados Sensíveis e Credenciais de Integração*.

### Auditoria e Monitoramento

Ações críticas devem ser registradas para fins de auditoria, rastreabilidade e investigação de incidentes. Os logs devem registrar informações suficientes para análise, mas sem armazenar dados sensíveis desnecessários.

Eventos auditáveis no MVP:

- login e logout;
- falhas repetidas de autenticação;
- criação, alteração e exclusão/inativação de clientes;
- criação, alteração e cancelamento de agendamentos;
- registro e edição de pagamentos;
- solicitação de exclusão de conta ou dados;
- alterações nas configurações do tenant.

Eventos auditáveis Pós-MVP (quando as funcionalidades existirem): alteração de permissões, exportação de relatórios e alteração de credenciais de notificação.

Os logs devem conter, quando aplicável:

- identificador do usuário;
- identificador do tenant;
- ação executada;
- data e hora;
- endereço IP;
- recurso afetado.

<!-- #endregion -->

<!-- #region 6.2 Privacidade e LGPD -->

## 6.2 Privacidade e LGPD

O Planici deverá seguir os princípios da Lei Geral de Proteção de Dados (LGPD), especialmente finalidade, necessidade, transparência, segurança e prevenção. Como o sistema lida com dados de profissionais e clientes, a coleta deve ser limitada ao necessário para executar as funcionalidades do produto.

### Dados Coletados

O sistema poderá coletar e armazenar os seguintes dados:

#### Dados do profissional

- nome;
- sobrenome;
- e-mail;
- apelido ou nome de exibição;
- foto de perfil, quando informada;
- senha em formato de hash, quando o cadastro for feito por e-mail e senha;
- preferências de interface;
- vínculo com tenants.

#### Dados do tenant / empresa

- nome do espaço de trabalho;
- slug ou identificador público;
- área de atuação;
- **[Pós-MVP]** configurações de personalização e labels customizadas (como “Pacientes” ou “Consultas”), configurações de notificações e credenciais de integração fornecidas pelo usuário.

#### Dados de clientes cadastrados pelo profissional

- nome;
- e-mail;
- telefone;
- observações;
- histórico de atendimentos;
- **[Pós-MVP]** preferências de notificação, respostas de formulários personalizados e arquivos ou imagens anexadas.

#### Dados de agenda e atendimento

- data e horário de início e fim;
- status do agendamento;
- cliente relacionado;
- serviço ou plano relacionado;
- origem do agendamento, como profissional ou link público;
- dados de convidado no link público, como nome, e-mail e telefone;
- motivo de cancelamento, quando aplicável.

#### Dados financeiros

- valor do pagamento;
- moeda;
- forma de pagamento;
- status do pagamento;
- data de pagamento;
- observações financeiras.

### Finalidade do Tratamento

Os dados serão tratados para permitir que o profissional utilize as funcionalidades principais do Planici, incluindo:

- criação e acesso à conta (incluindo e-mails de verificação e recuperação de senha);
- gerenciamento de tenants;
- cadastro e consulta de clientes;
- controle de serviços e procedimentos;
- criação e acompanhamento de agendamentos;
- controle de pagamentos;
- visão financeira básica;
- **[Pós-MVP]** envio de notificações de confirmação, lembrete, cancelamento ou remarcação; planos/pacotes; relatórios avançados; personalização da experiência da aplicação.

O Planici não deverá utilizar os dados para finalidades incompatíveis com o funcionamento do sistema sem base legal adequada (art. 7 da LGPD).

### Bases Legais do Tratamento

Todo tratamento de dados pessoais deve estar amparado em uma das hipóteses do art. 7 da LGPD (princípio da transparência, art. 6, VI). O Planici mapeia cada finalidade à sua base legal:

| Finalidade / categoria de dado | Base legal (art. 7) |
|---|---|
| Dados do profissional titular da conta (criação/acesso, gerenciamento de tenant, uso das funcionalidades contratadas) | **Execução de contrato** (art. 7, V) |
| Logs de auditoria, prevenção a fraudes e segurança da plataforma | **Legítimo interesse** (art. 7, IX) |
| Comunicações que dependam de manifestação do titular (ex.: marketing) | **Consentimento** (art. 7, I), livre, informado, destacado e revogável |
| Dados de clientes finais cadastrados pelo profissional | Tratados pelo Planici na qualidade de **operador**, sob a base legal definida pelo profissional-controlador (em regra, execução de contrato/legítimo interesse do controlador) |

O aceite dos Termos de Serviço e da Política de Privacidade no cadastro constitui **execução de contrato** (art. 7, V) e não consentimento no sentido técnico do art. 8; o consentimento (art. 7, I) é coletado de forma destacada apenas quando o tratamento o exigir (ver *Consentimento e Transparência*).

### Papéis: Controlador e Operador

Em relação aos dados dos **clientes finais** cadastrados no sistema:

- o **profissional (ou empresa) usuária** atua como **controlador** desses dados, definindo finalidades e bases legais;
- o **Planici** atua como **operador**, tratando os dados em nome do controlador e segundo suas instruções.

A relação entre as partes é regida por **cláusula/contrato de tratamento de dados** nos termos do art. 39 da LGPD, integrante dos Termos de Serviço, estabelecendo as instruções do controlador, as obrigações de segurança do operador e as condições de eliminação/devolução dos dados ao fim do contrato.

### Minimização de Dados

O sistema deverá coletar apenas os dados necessários para cada funcionalidade. Campos opcionais devem ser claramente identificados na interface.

Exemplos:

- para criar uma conta, o sistema precisa de dados básicos do usuário;
- para cadastrar um cliente, o nome é obrigatório, enquanto telefone, e-mail e observações podem ser opcionais;
- para solicitar um agendamento pelo link público, o cliente deve informar apenas os dados necessários para identificação e contato;
- formulários personalizados devem ser configurados pelo próprio profissional, evitando coleta excessiva por padrão.

### Dados Sensíveis (art. 11)

Como o Planici se destina, entre outros, a terapeutas, nutricionistas, psicólogos e personal trainers, o tratamento de **dados sensíveis de saúde** (art. 5, II) — inseridos em campos livres, observações ou formulários personalizados — é **provável**, e não meramente potencial. O art. 11 da LGPD impõe regime diferenciado a esses dados.

Por isso, o sistema deverá:

- **reconhecer expressamente** que campos livres e observações (e, no Pós-MVP, respostas de formulários personalizados) podem conter dados sensíveis de saúde;
- coletar **consentimento específico e destacado** (art. 11, I) do titular para o tratamento desses dados, quando aplicável, separado do aceite geral dos Termos/Política;
- aplicar **criptografia em repouso obrigatória** às observações que possam conter dados sensíveis (e às respostas de formulários, quando existirem);
- evitar solicitar dados sensíveis por padrão e indicar que campos livres devem ser usados apenas quando necessário;
- **[Pós-MVP]** permitir que o profissional defina quais informações serão coletadas nos formulários e proteger as respostas com as mesmas regras de autenticação, autorização e isolamento por tenant;
- elaborar **Relatório de Impacto à Proteção de Dados Pessoais (RIPD/DPIA, art. 38)** antes do tratamento em larga escala de dados sensíveis;
- deixar claro que o Planici não substitui prontuários eletrônicos, sistemas médicos regulamentados ou documentos clínicos oficiais.

### Aceite Contratual, Consentimento e Transparência

Durante o cadastro, o usuário deverá aceitar os Termos de Serviço e a Política de Privacidade. Esse aceite caracteriza, juridicamente, a base de **execução de contrato** (art. 7, V) — e não "consentimento" no sentido técnico do art. 8 da LGPD. O consentimento (art. 7, I) é uma base distinta, exigida apenas para tratamentos que dele dependam (ex.: comunicações de marketing ou dados sensíveis), caso em que deve ser coletado de forma livre, informada, **destacada** e **revogável** (art. 8, §5). Essa distinção esclarece e complementa o RNF-12, que trata do registro rastreável do aceite.

O aceite deve ser registrado com:

- identificador do usuário;
- data e hora do aceite;
- versão do documento aceito;
- endereço IP, quando aplicável.

A Política de Privacidade deve explicar de forma clara:

- quais dados são coletados;
- por que os dados são coletados;
- onde os dados são armazenados;
- por quanto tempo os dados são mantidos;
- com quem os dados podem ser compartilhados;
- como o usuário pode solicitar acesso, correção, exportação ou exclusão dos dados.

### Compartilhamento com Terceiros

O Planici poderá se comunicar com serviços externos apenas quando necessário para funcionamento de funcionalidades específicas, como:

- envio de e-mails transacionais de conta (AWS SES);
- autenticação via Google;
- infraestrutura de hospedagem, banco de dados, backup e monitoramento;
- **[Pós-MVP]** envio de notificações por WhatsApp e processamento de pagamentos, caso essas funcionalidades sejam implementadas no futuro.

O compartilhamento deve ser limitado ao mínimo necessário para execução da funcionalidade. O sistema não deve vender dados pessoais nem compartilhar dados com terceiros para fins de marketing sem consentimento explícito.

Sobre os **suboperadores**:

- todo terceiro que trate dados pessoais por conta do Planici (suboperador) será regido por **contrato de tratamento de dados** (art. 39 da LGPD), com obrigações de segurança e confidencialidade;
- os **operadores principais** do MVP incluem: AWS (hospedagem/infraestrutura — Amplify, Lambda, S3 — e e-mail transacional via SES), Google (autenticação OAuth), Neon (banco de dados e backup) e Sentry (monitoramento de erros, que pode capturar dados pessoais em logs de erro). No Pós-MVP, soma-se o provedor de mensageria WhatsApp (Evolution API);
- **transferência internacional de dados** (arts. 33 a 35): como parte desses operadores pode armazenar ou processar dados fora do Brasil, a transferência observará as salvaguardas dos arts. 33-35 (ex.: cláusulas-padrão contratuais ou garantias adequadas reconhecidas pela ANPD).

### Armazenamento e Retenção

Os dados serão armazenados em banco de dados relacional, com separação lógica por tenant. O sistema deverá manter backups automáticos para reduzir risco de perda de dados.

Em observância aos arts. 15 e 16 e ao princípio da necessidade (art. 6, III), os prazos de retenção são delimitados:

- dados operacionais ficam armazenados enquanto a conta ou tenant estiver ativo;
- após o **encerramento da conta/tenant**, os dados pessoais são **eliminados ou anonimizados em até 30 dias**, ressalvadas obrigações legais de guarda;
- dados inativados podem ser mantidos quando necessários para histórico, relatórios e integridade financeira, até que cesse a finalidade legal/contratual;
- **logs de auditoria** são retidos por **90 dias** (conforme RNF-11);
- **backups** seguem retenção de **7 dias** (conforme RNF-06), após o que os dados já excluídos da aplicação são definitivamente purgados ao expirar o ciclo de backup.

### Direitos do Titular (arts. 18, 19 e 8, §5)

Os direitos do titular previstos na LGPD são **incondicionais** e devem ser garantidos **já no MVP**, independentemente da existência de tela automatizada. São assegurados:

- **acesso** aos dados (art. 18, I e II);
- **correção** de dados incompletos, inexatos ou desatualizados (art. 18, III);
- **eliminação/exclusão** de dados (art. 18, VI), respeitadas as regras de negócio e obrigações legais;
- **portabilidade** dos dados (art. 18, V);
- **oposição** a tratamento realizado com base em hipótese dispensada de consentimento (art. 18, §2);
- **revogação do consentimento** a qualquer momento, de forma facilitada e gratuita (art. 8, §5).

No MVP, enquanto não houver tela de autoatendimento, essas solicitações são atendidas por **canal explícito** — o e-mail do Encarregado/DPO (ex.: `dpo@planici.com.br`) —, com **resposta em até 15 dias** para confirmação/acesso, em conformidade com o art. 19 da LGPD. O atendimento aos direitos do titular é, portanto, requisito **obrigatório** do MVP; o que fica para o Pós-MVP (RNF-13/RNF-14) é apenas a **automação** desse atendimento (tela de autoatendimento e exportação self-service).

Em versões futuras, o sistema poderá oferecer uma área de configurações para o próprio usuário solicitar de forma automatizada:

- exportação dos dados em formato JSON ou CSV;
- alteração de dados cadastrais;
- exclusão da conta;
- exclusão ou inativação do tenant;
- exclusão de clientes cadastrados, quando não houver dependências históricas.

A exclusão de dados deve respeitar as regras de negócio do sistema. Por exemplo, clientes, serviços, planos ou pagamentos com histórico associado podem ser inativados em vez de removidos imediatamente, preservando consistência financeira, auditoria e integridade dos relatórios.

Quando a exclusão definitiva for aplicável, ela deverá remover ou anonimizar os dados pessoais associados, respeitando o prazo definido na política de privacidade e as limitações técnicas de backups.

### Responsabilidades do Usuário

O profissional que utiliza o Planici atua como **controlador** dos dados que decide cadastrar sobre seus próprios clientes (sendo o Planici **operador**, conforme *Papéis: Controlador e Operador* e a cláusula do art. 39). Cabe a ele, nessa condição, definir finalidades e bases legais e responder pelos dados que cadastra. Assim, o sistema deverá orientar o usuário a:

- cadastrar apenas informações necessárias;
- evitar inserir dados sensíveis sem necessidade;
- manter dados atualizados;
- respeitar pedidos de exclusão ou correção feitos por seus clientes;
- proteger suas credenciais de acesso;
- **[Pós-MVP]** configurar adequadamente permissões de colaboradores, quando o multiusuário existir.

### Aviso de Privacidade no Link Público

O cliente final que utiliza o link público de agendamento (RF-23) tem seus dados coletados (nome, e-mail e telefone) **sem criar conta** e, portanto, sem passar pelo onboarding em que os Termos são aceitos. Para atender ao direito à informação (art. 9 da LGPD), a própria página pública de agendamento deverá, **no momento da coleta**:

- exibir um **aviso de privacidade resumido**, identificando o controlador (o profissional/tenant), a finalidade do tratamento e a base legal aplicável;
- informar como o titular pode exercer seus direitos;
- registrar o aceite/ciência do cliente final antes do envio dos dados, quando o tratamento depender de consentimento.

### Encarregado pelo Tratamento (DPO) e Resposta a Incidentes

Em conformidade com a LGPD, o Planici deverá:

- **indicar um Encarregado pelo Tratamento de Dados (DPO, art. 41)**, com canal de contato público (ex.: `dpo@planici.com.br`) para titulares e para a ANPD;
- manter um **plano de resposta a incidentes de segurança**, incluindo detecção, contenção e avaliação do risco, e a **comunicação de incidentes à ANPD e aos titulares afetados** em prazo razoável (art. 48), quando o incidente puder acarretar risco ou dano relevante.

### Medidas de Privacidade por Design

O Planici adotará medidas de privacidade desde a concepção do sistema:

- coleta mínima de dados;
- campos opcionais claramente identificados;
- isolamento por tenant;
- acesso restrito ao Owner do tenant (permissões por papel no Pós-MVP);
- logs de auditoria para ações críticas;
- criptografia no tráfego;
- não exposição de senhas, tokens ou credenciais;
- inativação segura de registros com histórico;
- exportação e exclusão de dados conforme solicitação do usuário.

<!-- #endregion-->

