<h1 align="center">RFC: Request for Comments - Planici</h1>
<p align="center"><strong>Engenharia de Software - Catolica SC</strong></p>

<!-- #region IDENTIFICAÇÃO -->

<h1>Identificação</h1>

<div align="center">
  <table>
    <thead>
      <tr>
        <th>Título do Projeto</th>
        <th>Linha de Projeto</th>
        <th>Autor</th>
        <th>Data da Proposta</th>
        <th>Versão</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td align="center">Planici</td>
        <td align="center">Aplicação Web</td>
        <td align="center">João Pedro Medeiros Izidoro</td>
        <td align="center">10/03/2026</td>
        <td align="center">v1.0</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- #endregion -->

<h1 style="color:#D89F0F">1. Visão do Produto</h1>
O Planici resolve o problema encontrado em softwares complicados, incompletos ou caros de agenda e gestão de negócio, utilizando uma interface intuitiva para gerenciar os compromissos, gastos e lucros, e clientes de um micro e pequeno negócio.


<h2 style="color:#770404">1.1. Contexto e Problema</h2>
Profissionais de atendimento personalizado (terapeutas, nutricionistas, personal trainers) costumam trabalhar sozinhos ou com equipes pequenas e acabam concentrando agenda, cadastro de clientes, procedimentos, preços e finanças.
Isso aumenta a complexidade da rotina e o risco de desorganização e perda de informações. Sem uma ferramenta unificada, recorrem a planilhas, agendas físicas e apps genéricos.
<br/> <br/>
Exemplo: uma terapeuta com CNPJ usa Excel para agenda e financeiro, mas sente falta de calendário, vínculo estruturado entre clientes e procedimentos, controle de pagamentos e personalização.
<br/> <br/>
A solução atual é parcial e consome tempo, enquanto apps especializados são caros ou pouco flexíveis.

<!-- #region 1.2 ORIGEM DA DEMANDA E SOLUÇÃO -->

<h2 style="color:#770404">1.2. Origem da Demanda e Evidências </h2>
A demanda foi identificada a partir de contato direto com uma profissional autônoma da área de terapia. A evidência principal é o relato detalhado da própria usuária sobre suas dificuldades operacionais, combinado com a observação do fluxo de trabalho atual, como o uso de planilhas Excel para agenda e controle financeiro, sem integração entre as informações.
A partir dessa demanda pontual, identificou-se um padrão recorrente no perfil de micro-empreendedores de serviços personalizados: atuação individual, baixo suporte técnico e necessidade de ferramentas acessíveis e simples. Essa percepção motivou o escopo expandido do projeto para além da demanda original.
<h3 style="color:#C90606">Projeto solicitado por:</h3>
<ul>
  <li><strong>Profissional autônoma:</strong> Terapeuta com CNPJ: 62.551.135\0001-00, atuando de forma individual.</li>
  <li><strong>Contexto:</strong> Necessidade de substituir controle manual em planilhas por ferramenta integrada e personalizada.</li>
  <li><strong>Problema relatado:</strong> Os aplicativos especializados disponíveis no mercado são caros e não permitem a customização necessária o modelo de negócio da profissional.</li>
</ul>

<!-- #endregion -->

<!-- #region 1.3 ANÁLISE DE SOLUÇÕES EXISTENTES -->

<h2>1.3. Análise de Soluções Existentes</h2>

<!-- #region PRIMEIRA SOLUÇÃO: ACUITY SCHEDULING -->

<h3>Primeira Solução: Acuity Scheduling</h3>

<a href="https://pt-br.acuityscheduling.com/">Link</a><br/>

<p><strong>Público alvo: </strong>Coaches, Consultores, Terapeutas, Personal Trainers</p>

<strong>Principais Funcionalidades:</strong>
<ul>
  <li>Agendamento Online</li>
  <li>Formulários Customizáveis</li>
  <li>Integração com Stripe, Paypal</li>
  <li>Rastreamento de Serviços prestados</li>
  <li>Notificação por email e SMS</li>
  <li>Sincronização Bidirecional com Google Calendar</li>
  <li>Personalização Visual</li>
  <li>API para integração</li>
</ul>

<strong>Principais Limitações:</strong>
<ul>
  <li>Versão Starter limitada com custo alto (USD 20/mes)</li>
  <li>Versão completa (Premium) USD 61/mes</li>
  <li>Interface complexa, muitas opções</li>
  <li>Voltada para booking online (cliente agendando sozinho)</li>
  <li>Requer conhecimento técnico para setup avançado</li>
</ul>
<details open>
  <summary><h4>Image<h4/></summary>
  <img alt=" img" src="/docs/img/acuity.png" />
</details>
<br/>

<!-- #endregion -->

<!-- #region SEGUNDA SOLUÇÃO: MINHAAGENDA -->

<h3>Segunda Solução: MinhaAgenda</h3>

<a href="https://minhaagendaapp.com.br/">Link</a><br/>

<p><strong>Público alvo: </strong>Coaches, Consultores, Terapeutas, Personal Trainers</p>

<strong>Principais Funcionalidades:</strong>
<ul>
  <li>Calendario Visual com agendamento online</li>
  <li>App mobile nativo</li>
  <li>Integração com Stripe</li>
  <li>Gestão Básica de clientes</li>
  <li>Notificação por SMS</li>
  <li>Relatório de receita (versão premium)</li>
</ul>

<strong>Principais Limitações:</strong>
<ul>
  <li>Versão gratuita limitada (max 50 agendamentos/mes)</li>
  <li>Sem customização personalizada de campos de cliente e agenda</li>
  <li>Interface web confusa</li>
  <li>Somente SMS, sem integração com WhatsApp</li>
  <li>Focado para mobile, não permite nem criação de conta via web</li>
  <li>Sem aplicativo desktop</li>
</ul>
<details open>
  <summary><h4>Image<h4/></summary>
  <img alt="img" src="/docs/img/minhaAgenda.png" />
</details>
<br/> <br />

<!-- #endregion -->

<!-- #region TERCEIRA SOLUÇÃO: GOOGLE CALENDAR -->

<h3>Segunda Solução: Google Calendar</h3>

<a href="https://calendar.google.com/calendar/u/0/r?pli=1">Link</a><br/>

<p><strong>Público alvo: </strong>Usuários gerais, profissionais, empresas, qualquer pessoa com conta Google</p>

<strong>Principais Funcionalidades:</strong>
<ul>
  <li>Calendario Visual com agendamento online</li>
  <li>Calendário com views de dia, semana e mês</li>
  <li>Criação e edição de eventos</li>
  <li>Notificações por email</li>
  <li>Compartilhamento de agenda com outras pessoas</li>
  <li>Sincronização entre dispositivos</li>
  <li>Busca por disponibilidade</li>
</ul>

<strong>Principais Limitações:</strong>
<ul>
  <li>Sem sistema de gestão de clientes</li>
  <li>Não há forma de armazenar dados</li>
  <li>Sem histórico de serviços prestados</li>
  <li>Interface não permite personalização</li>
  <li>Pensado para calendário pessoal, não negócio</li>
</ul>

<details open>
  <summary><h4>Image<h4/></summary>
  <img alt="img" src="/docs/img/Captura de tela 2026-04-11 192041.png"/>
</details>

<br/><br />

<!-- #endregion -->

<!-- #region TODO:COMPARAÇÃO TABELA -->
<!--
<h3 style="color:#C90606">Comparação</h3>
| Solução | Pontos Fortes | Limitações |
| ------- | ------------- | ---------- |
| a       | a             | a          |

-->
<!-- #endregion -->

<!-- #region TODO:DIFERENCIAL DO PROJETO-->
<h3 style="color:#C90606">Diferencial do Projeto</h3>

<h4>Por que criar algo novo?</h4>

<ul>
  <li>Versão paga mais barata que as soluções existentes.</li>
  <li>Versão gratuita mantém todas as funcionalidades padrão, sem limitação de tempo.</li>
  <li>Customização de tema completa, inspirada em aplicações como Notion e Jira</li>
  <li>Interface montada com foco em UX e intuitividade</li>
</ul>

<h4>Lacunas não resolvidas pelas soluções existentes</h4>
Nenhuma solução existente combina TODOS os seguintes requisitos:

<strong>Integração completa.</strong>
<ul>
  <li><strong>MinhaAgenda</strong>: Tem agenda. Falta personalização customizada.</li>
  <li><strong>Acuity</strong>: Tem personalização completa. Falta plano gratuito.</li>
  <li><strong>Google Calendar</strong>: Tem agenda completa, falta o restante da lógica completo (clientes, pagamentos).</li>
</ul>

<strong>Preço Acessível</strong>
<ul>
  <li><strong>MinhaAgenda</strong>: Plano grátis aceitável</li>
  <li><strong>Acuity</strong>: Sem plano grátis, plano mais barato à R$100, incompleto.</li>
  <li><strong>Google Calendar</strong>: Grátis, porém o mais incompleto da lista em questão de features.</li>
</ul>

<strong>Personalização da Marca.</strong>
<ul>
  <li><strong>MinhaAgenda</strong>: Sem personalização.</li>
  <li><strong>Acuity</strong>: Permite personalização de tema avançado.</li>
  <li><strong>Google Calendar</strong>: Sem personalização.</li>
</ul>

<strong>Simplicidade</strong>
<ul>
  <li><strong>MinhaAgenda</strong>: Simples, mas features limitadas.</li>
  <li><strong>Acuity</strong>: Complexa, muitas interfaces.</li>
  <li><strong>Google Calendar</strong>: Simples, mas features limitadas.</li>
</ul>

<h4>Nicho Atendido</h4>
Profissionais autonomos com foco em serviços personalizados que atuem individualmente.
O nicho principal é no modelo de negócio individual, e não venda de produtos, e de faturamento baixo-médio.

<!-- #endregion-->

<!-- #endregion -->

<!-- #region 1.4 PUBLICO ALVO -->

<h2 style="color:#770404">1.4. Público Alvo</h2>

O sistema é voltado para profissionais autônomos, empresários individuais e profissionais de MEI que prestam serviços personalizados de forma individual, sem equipe de suporte administrativo. O perfil principal inclui terapeutas, esteticistas, nutricionistas, personal trainers, consultores, entre outros.

<strong>Perfil do usuário:</strong>
<ul>
  <li>Atua de forma independente, sem funcionários ou suporte administrativo.</li>
  <li>Faixa etária ampla (25 a 60+ anos), reforçando a necessidade de interface simples e sem curva de aprendizado.</li>
  <li>Já teve contato com outras ferramentas de gestão ou calendário, mas abandonou por complexidade ou custo.</li>
  <li>Não possui conhecimento técnico em tecnologia, mas sabe usar smartphone e navegador no dia-a-dia.</li>
</ul>

<strong>Contexto de Uso:</strong>
<ul>
  <li>O sistema será acessado tanto pelo celular quanto pelo computador, com design mobile-first</li>
  <li>O momento típico de uso é imediatamente após fechar um atendimento ou novo plano com o cliente. O fluxo esperado é: <i>fechou o acordo -> abriu o app -> registrou a consulta</i>, em menos de 5 minutos</li>
  <li>Não há tolerância para interfaces lentas ou fluxos longos: O usuário precisa concluir ações essenciais com poucos cliques.</li>
</ul>

<strong>Nível técnico esperado:</strong>
Nenhum conhecimento técnico necessário, o sistema deve funcionar sem manual, tutorial obrigatório ou configuração inicial complexa.

<!-- #endregion -->

<!-- #region 1.5 OBJETIVOS DO PROJETO -->

<h2 style="color:#770404">1.5. Objetivos do Projeto</h2>
<h3 style="color:#C90606">Objetivo Geral</h3>
Oferecer aos profissionais autônomos de serviços personalizados uma ferramenta integrada, intuitiva e acessível para gestão de agenda, clientes e finanças, eliminando a dependência de planilhas e reduzindo a sobrecarga administrativa do dia a dia.

Qual transformação o projeto pretende gerar
<h4 style="color:#C90606">Objetivos Específicos</h4>

<!-- #endregion -->

<!-- #region 1.6 Métricas de Sucesso (KPIs) -->

<h3 style="color:#770404">1.6. Métricas de Sucesso (KPIs)</h3>

<ul>
  <li>
  A usuária principal consegue realizar as tarefas do dia-a-dia (agendamento, registro de cliente, lançamento financeiro) sem precisar de auxílio de outras ferramentas.
  Tempo para
  </li>
  <li>Tempo para completar um agendamento completo inferior a 2 minutos.</li>
  <li>Tempo de resposta das principais telas inferior a 300ms</li>
  <li>Zero perda de dados registrados pela usuária durante o período de uso do MVP.</li>
  <li>Pelo menos 80% das funcionalidades do plano gratuito utilizadas ativamente pela usuária após 30 dias.</li>
</ul>

<!-- #endregion -->

<h1>2. Engenharia de Requisitos</h1>

<!-- #region 2.1 PERSONAS -->

<h2>2.1 Personas</h2>
<a href="/docs/img/persona-carlos.pdf" download>PDF Persona Carlos</a>
<details>
  <summary><h4>Persona Carlos - Imagem<h4/></summary>
  <img alt=" img" src="/docs/img/persona-carlos.png" />
</details>

<!-- #endregion -->

<!-- #region 2.2 USE CASES -->

<h2>2.2 Casos de Uso Principais</h2>

<table>
  <tr>
    <th colspan="2">Atores Principais</th>
  </tr>
  <tr>
    <th>Ator</th>
    <th>Descrição</th>
  </tr>
  <tr>
    <td>Profissional</td>
    <td>Usuário principal do sistema. Gerencia clientes, agenda, procedimentos, planos, pagamentos e relatórios.</td>
  </tr>
  <tr>
    <td>Cliente</td>
    <td>Pessoa atentidade pelo profissional. Interage principalmente pelo link público de agendamento.</td>
  </tr>
  <tr>
    <td>Administrador de tenant</td>
    <td>Pessoa atendidade pelo profissional. Interage principalmente pelo link público de agendamento.</td>
  </tr>
  <tr>
    <td>Sistema</td>
    <td>Executa ações automáticas, como envio de lembretes, notificações e geração de relatórios.</td>
  </tr>
</table>

## Casos de uso por módulo

### 1. Autenticação e conta
| Código | Caso de uso                                    | Ator principal          | Requisitos relacionados |
| ------ | ---------------------------------------------- | ----------------------- | ----------------------- |
| UC-01  | Criar conta com e-mail e senha                 | Profissional            | RF-01                   |
| UC-02  | Entrar com conta Google                        | Profissional            | RF-02                   |
| UC-03  | Recuperar senha                                | Profissional            | RF-03                   |
| UC-04  | Gerenciar perfil e dados do negócio            | Profissional            | RF-04                   |
| UC-05  | Convidar colaborador para o espaço de trabalho | Administrador do tenant | RF-05                   |
| UC-06  | Definir permissões de colaborador              | Administrador do tenant | RF-06                   |

### 2. Clientes
| Código | Caso de uso                             | Ator principal | Requisitos relacionados |
| ------ | --------------------------------------- | -------------- | ----------------------- |
| UC-07  | Cadastrar cliente                       | Profissional   | RF-07                   |
| UC-08  | Editar cliente                          | Profissional   | RF-08                   |
| UC-09  | Inativar cliente             | Profissional   | RF-08                   |
| UC-10  | Buscar e filtrar clientes               | Profissional   | RF-09                   |
| UC-11  | Visualizar ficha e histórico do cliente | Profissional   | RF-10                   |

### 3. Procedimentos e serviços
| Código | Caso de uso                      | Ator principal | Requisitos relacionados |
| ------ | -------------------------------- | -------------- | ----------------------- |
| UC-12  | Cadastrar procedimento           | Profissional   | RF-11                   |
| UC-13  | Editar procedimento              | Profissional   | RF-12                   |
| UC-14  | Excluir ou inativar procedimento | Profissional   | RF-12                   |
| UC-15  | Listar procedimentos cadastrados | Profissional   | RF-13                   |

### 4. Pacotes e planos
| Código | Caso de uso                  | Ator principal | Requisitos relacionados |
| ------ | ---------------------------- | -------------- | ----------------------- |
| UC-16  | Criar plano ou pacote        | Profissional   | RF-14                   |
| UC-17  | Associar serviços a um plano | Profissional   | RF-15                   |
| UC-18  | Editar plano                 | Profissional   | RF-16                   |
| UC-19  | Excluir ou inativar plano    | Profissional   | RF-16                   |
| UC-20  | Listar planos cadastrados    | Profissional   | RF-17                   |

### 5. Agenda e agendamentos
| Código | Caso de uso                                     | Ator principal       | Requisitos relacionados |
| ------ | ----------------------------------------------- | -------------------- | ----------------------- |
| UC-21  | Configurar disponibilidade fixa                 | Profissional         | RF-18                   |
| UC-22  | Configurar disponibilidade livre                | Profissional         | RF-19                   |
| UC-23  | Criar agendamento manual                        | Profissional         | RF-20                   |
| UC-24  | Editar agendamento                              | Profissional         | RF-21                   |
| UC-25  | Cancelar agendamento                            | Profissional         | RF-21                   |
| UC-26  | Visualizar agenda diária ou semanal             | Profissional         | RF-22                   |
| UC-27  | Gerar link público de agendamento               | Profissional/Sistema | RF-23                   |
| UC-28  | Solicitar agendamento por link público          | Cliente              | RF-23                   |
| UC-29  | Confirmar ou recusar solicitação de agendamento | Profissional         | RF-24                   |
| UC-30  | Bloquear horário na agenda                      | Profissional         | RF-25                   |

### 6. Pagamentos
| Código | Caso de uso                                   | Ator principal | Requisitos relacionados |
| ------ | --------------------------------------------- | -------------- | ----------------------- |
| UC-31  | Registrar pagamento de atendimento            | Profissional   | RF-26                   |
| UC-32  | Editar pagamento registrado                   | Profissional   | RF-27                   |
| UC-33  | Visualizar status de pagamento do atendimento | Profissional   | RF-28                   |

### 7. Visão financeira e relatórios.
| Código | Caso de uso                               | Ator principal | Requisitos relacionados |
| ------ | ----------------------------------------- | -------------- | ----------------------- |
| UC-34  | Visualizar resumo de receitas por período | Profissional   | RF-29                   |
| UC-35  | Comparar receitas entre períodos          | Profissional   | RF-30                   |
| UC-36  | Visualizar ranking de procedimentos       | Profissional   | RF-31                   |
| UC-37  | Exportar relatório financeiro             | Profissional   | RF-32                   |

### 8. Notificações
| Código | Caso de uso                                | Ator principal | Requisitos relacionados |
| ------ | ------------------------------------------ | -------------- | ----------------------- |
| UC-38  | Enviar confirmação de agendamento          | Sistema        | RF-33                   |
| UC-39  | Enviar lembrete antes do atendimento       | Sistema        | RF-34                   |
| UC-40  | Notificar cancelamento ou remarcação       | Sistema        | RF-35                   |
| UC-41  | Configurar canais e eventos de notificação | Profissional   | RF-36                   |

### 9. Formulários personalizados
| Código | Caso de uso                                     | Ator principal | Requisitos relacionados |
| ------ | ----------------------------------------------- | -------------- | ----------------------- |
| UC-42  | Criar modelo de formulário                      | Profissional   | RF-37                   |
| UC-43  | Adicionar e ordenar campos do formulário        | Profissional   | RF-38                   |
| UC-44  | Editar modelo de formulário                     | Profissional   | RF-39                   |
| UC-45  | Excluir modelo de formulário                    | Profissional   | RF-39                   |
| UC-46  | Aplicar formulário a cliente, serviço ou plano  | Profissional   | RF-40                   |
| UC-47  | Editar respostas de formulário aplicado         | Profissional   | RF-41                   |
| UC-48  | Visualizar formulários aplicados a uma entidade | Profissional   | RF-42                   |

### 10. Configuração do espaço de trabalho
| Código | Caso de uso                      | Ator principal | Requisitos relacionados |
| ------ | -------------------------------- | -------------- | ----------------------- |
| UC-49  | Configurar ocupação profissional | Profissional   | RF-43                   |
| UC-50  | Personalizar labels do sistema   | Profissional   | RF-43                   |


<!-- #endregion -->

<!-- #region 2.3 RFs -->

<h2>2.3 Requisitos Funcionais (RF)</h2>

<table>
  <tr>
    <th colspan="3">Autenticação e conta</th>
  </tr>
  <tr>
    <th>Requisito</th>
    <th>Descrição</th>
    <th>Prioridade</th>
  </tr>
  <tr>
    <td>RF-01</td>
    <td><strong>Cadastro por e-mail e senha</strong><br>O profissional pode criar uma conta informando nome, e-mail e senha.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-02</td>
    <td><strong>Login via Google (OAuth)</strong><br>O profissional pode autenticar com a conta Google.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-03</td>
    <td><strong>Recuperação de senha</strong><br>O sistema envia link de redefinição de senha por e-mail.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-04</td>
    <td><strong>Gerenciamento de perfil</strong><br>O profissional pode editar nome, foto, dados de contato e informações do negócio.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-05</td>
    <td><strong>Multiusuário por tenant</strong><br>Contas nos planos Basic ou superior podem convidar colaboradores com acesso ao mesmo espaço de trabalho.</td>
    <td>WANTS</td>
  </tr>
  <tr>
    <td>RF-06</td>
    <td><strong>Controle de permissões</strong><br>O administrador do tenant define o nível de acesso de cada colaborador, como somente agenda ou acesso financeiro.</td>
    <td>WANTS</td>
  </tr>
</table>

<table>
  <tr>
    <th colspan="3">Cadastro de clientes</th>
  </tr>
  <tr>
    <th>Requisito</th>
    <th>Descrição</th>
    <th>Prioridade</th>
  </tr>
  <tr>
    <td>RF-07</td>
    <td><strong>Criar cliente</strong><br>O profissional pode cadastrar um cliente com nome, telefone, e-mail e observações, ou utilizar um formulário personalizado.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-08</td>
    <td><strong>Editar e excluir cliente</strong><br>O profissional pode atualizar ou remover um cadastro de cliente.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-09</td>
    <td><strong>Busca e filtro de clientes</strong><br>O profissional pode buscar clientes por nome ou e-mail.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-10</td>
    <td><strong>Histórico de atendimentos do cliente</strong><br>Na ficha do cliente, o profissional visualiza todos os atendimentos anteriores, procedimentos realizados, planos ativos e valores pagos.</td>
    <td>MVP</td>
  </tr>
</table>

<table>
  <tr>
    <th colspan="3">Procedimentos e serviços</th>
  </tr>
  <tr>
    <th>Requisito</th>
    <th>Descrição</th>
    <th>Prioridade</th>
  </tr>
  <tr>
    <td>RF-11</td>
    <td><strong>Criar procedimento</strong><br>O profissional cadastra procedimentos com nome, duração estimada, valor padrão, ou utiliza um formulário personalizado.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-12</td>
    <td><strong>Editar e excluir procedimento</strong><br>O profissional pode atualizar ou remover um procedimento do catálogo.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-13</td>
    <td><strong>Listagem de procedimentos</strong><br>O profissional visualiza todos os procedimentos cadastrados em uma lista.</td>
    <td>MVP</td>
  </tr>
</table>

<table>
  <tr>
    <th colspan="3">Pacotes e planos</th>
  </tr>
  <tr>
    <th>Requisito</th>
    <th>Descrição</th>
    <th>Prioridade</th>
  </tr>
  <tr>
    <td>RF-14</td>
    <td><strong>Criar plano</strong><br>O profissional cadastra um pacote de serviços com nome, descrição, preço, moeda, ciclo de cobrança (mensal, semanal, avulso etc.), ou utiliza um formulário personalizado.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-15</td>
    <td><strong>Associar serviços a um plano</strong><br>O profissional define quais serviços fazem parte de um plano, com quantidade e possibilidade de substituir o preço individual do serviço dentro do pacote.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-16</td>
    <td><strong>Editar e excluir plano</strong><br>O profissional pode atualizar ou remover um plano do catálogo.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-17</td>
    <td><strong>Listagem de planos</strong><br>O profissional visualiza todos os planos cadastrados em uma lista.</td>
    <td>MVP</td>
  </tr>
</table>

<table>
  <tr>
    <th colspan="3">Agendas e Agendamentos</th>
  </tr>
  <tr>
    <th>Requisito</th>
    <th>Descrição</th>
    <th>Prioridade</th>
  </tr>
  <tr>
    <td>RF-18</td>
    <td><strong>Definir disponibilidade fixa</strong><br>O profissional configura blocos de horário fixos por dia da semana (ex: seg–sex 09h–18h com intervalos de 30 min).</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-19</td>
    <td><strong>Definir disponibilidade livre</strong><br>O profissional pode criar manualmente janelas de horário disponíveis para datas específicas.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-20</td>
    <td><strong>Criar agendamento pelo profissional</strong><br>O profissional agenda um atendimento escolhendo cliente, plano ou serviço, data e horário.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-21</td>
    <td><strong>Editar e cancelar agendamento</strong><br>O profissional pode alterar data, horário, plano/serviço ou cancelar um agendamento existente.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-22</td>
    <td><strong>Visualização de agenda (dia/semana)</strong><br>O profissional visualiza os agendamentos em formato de agenda diária ou semanal.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-23</td>
    <td><strong>Link público de agendamento</strong><br>O sistema gera um link único por tenant que permite ao cliente visualizar horários disponíveis e solicitar um agendamento sem criar conta.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-24</td>
    <td><strong>Confirmação de agendamento pelo profissional</strong><br>Agendamentos feitos pelo link público ficam como "pendentes" até o profissional confirmar ou recusar.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-25</td>
    <td><strong>Bloqueio de horário</strong><br>O profissional pode bloquear horários específicos para impedi-los de aparecer como disponíveis no link público.</td>
    <td>MVP</td>
  </tr>
</table>

<table>
  <tr>
    <th colspan="3">Pagamentos</th>
  </tr>
  <tr>
    <th>Requisito</th>
    <th>Descrição</th>
    <th>Prioridade</th>
  </tr>
  <tr>
    <td>RF-26</td>
    <td><strong>Registrar pagamento no agendamento</strong><br>O profissional registra se o atendimento foi pago, informando valor, forma de pagamento (dinheiro, PIX, cartão, etc.) e data.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-27</td>
    <td><strong>Editar registro de pagamento</strong><br>O profissional pode corrigir os dados de pagamento de um atendimento já registrado.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-28</td>
    <td><strong>Status de pagamento por atendimento</strong><br>Cada agendamento exibe claramente se está pago, pendente ou cancelado.</td>
    <td>MVP</td>
  </tr>
</table>

<table>
  <tr>
    <th colspan="3">Visão Financeira e Relatórios</th>
  </tr>
  <tr>
    <th>Requisito</th>
    <th>Descrição</th>
    <th>Prioridade</th>
  </tr>
  <tr>
    <td>RF-29</td>
    <td><strong>Resumo de receitas por período</strong><br>O profissional visualiza o total recebido em um intervalo de datas selecionado.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-30</td>
    <td><strong>Comparativo entre períodos</strong><br>O sistema apresenta a comparação de receita entre dois períodos (ex: mês atual vs. mês anterior).</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-31</td>
    <td><strong>Ranking de procedimentos</strong><br>O sistema exibe os procedimentos mais realizados e os que mais geraram receita no período.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-32</td>
    <td><strong>Exportação de relatório</strong><br>O profissional pode exportar o relatório financeiro em PDF ou Excel.</td>
    <td>MVP</td>
  </tr>
</table>

<table>
  <tr>
    <th colspan="3">Notificações</th>
  </tr>
  <tr>
    <th>Requisito</th>
    <th>Descrição</th>
    <th>Prioridade</th>
  </tr>
  <tr>
    <td>RF-33</td>
    <td><strong>Notificação de confirmação de agendamento</strong><br>Ao confirmar um agendamento, o cliente recebe uma notificação por e-mail e/ou WhatsApp com os detalhes.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-34</td>
    <td><strong>Lembrete antes do horário</strong><br>O sistema envia um lembrete automático ao cliente com antecedência configurável (ex: 24h ou 1h antes).</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-35</td>
    <td><strong>Notificação de cancelamento ou remarcação</strong><br>O cliente é notificado automaticamente quando o profissional cancela ou altera um agendamento.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-36</td>
    <td><strong>Configuração de canais de notificação</strong><br>O profissional configura as credenciais e canais de envio (e-mail, WhatsApp via Evolution API) e escolhe quais eventos disparam cada canal. As preferências são armazenadas nas configurações do tenant.</td>
    <td>MVP</td>
  </tr>
</table>

<table>
  <tr>
    <th colspan="3">Formulários personalizados</th>
  </tr>
  <tr>
    <th>Requisito</th>
    <th>Descrição</th>
    <th>Prioridade</th>
  </tr>
  <tr>
    <td>RF-37</td>
    <td><strong>Criar modelo de formulário</strong><br>O profissional cria um modelo de formulário com nome, descrição e tipo de entidade-alvo sugerida (cliente, serviço ou plano).</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-38</td>
    <td><strong>Adicionar e ordenar campos</strong><br>O profissional adiciona campos ao formulário (texto, número, data, seleção, imagem, arquivo, etc.), define rótulo, obrigatoriedade e ordem de exibição.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-39</td>
    <td><strong>Editar e excluir modelo de formulário</strong><br>O profissional pode atualizar ou remover um modelo de formulário e seus campos.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-40</td>
    <td><strong>Aplicar formulário a uma entidade</strong><br>O profissional aplica um modelo de formulário a um cliente, serviço ou plano específico e preenche as respostas.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-41</td>
    <td><strong>Editar respostas de formulário aplicado</strong><br>O profissional pode atualizar as respostas de um formulário já aplicado a uma entidade.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-42</td>
    <td><strong>Visualizar formulários de uma entidade</strong><br>Na ficha de um cliente, serviço ou plano, o profissional visualiza todos os formulários aplicados e suas respostas.</td>
    <td>MVP</td>
  </tr>
</table>

<table>
  <tr>
    <th colspan="3">Configuração do espaço de trabalho</th>
  </tr>
  <tr>
    <th>Requisito</th>
    <th>Descrição</th>
    <th>Prioridade</th>
  </tr>
  <tr>
    <td>RF-43</td>
    <td><strong>Configurar ocupação e labels</strong><br>O profissional seleciona sua ocupação (ex: psicólogo, personal trainer, advogado) e pode personalizar os nomes exibidos para clientes, serviços e planos no sistema (ex: "Pacientes", "Consultas", "Mensalidades").</td>
    <td>MVP</td>
  </tr>
</table>

<!-- #endregion-->

<!-- #region 2.4 RNFs -->

<h2>2.4 Requisitos Não Funcionais (RNF)</h2>

### Desempenho
 
<table>
  <tr>
    <th>Requisito</th>
    <th>Quality Attribute</th>
    <th>Description</th>
    <th>Metric / Acceptance Criteria</th>
    <th>Priority</th>
  </tr>
  <tr>
    <td>RNF-01</td>
    <td><strong>Page Load Performance</strong></td>
    <td>As principais páginas do sistema (agenda, clientes, financeiro) devem carregar rapidamente em conexões móveis para garantir boa experiência ao profissional em campo. O impacto direto é na adoção e retenção do produto.</td>
    <td>P95 &lt; 2s em conexão 4G @ 500 usuários simultâneos</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RNF-02</td>
    <td><strong>API Response Time</strong></td>
    <td>As chamadas de API devem responder dentro de limites aceitáveis para operações de leitura e escrita, assegurando fluidez nas interações do usuário com o sistema sob carga normal.</td>
    <td>Leitura &lt; 500ms | Escrita &lt; 1s em carga normal</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RNF-03</td>
    <td><strong>Public Booking Link Performance</strong></td>
    <td>O link público de agendamento é acessado por clientes externos em dispositivos variados, muitas vezes sem sessão em cache. O carregamento lento representa perda direta de agendamentos para o profissional.</td>
    <td>&lt; 3s em first load (sem cache)</td>
    <td>MVP</td>
  </tr>
</table>
---
 
### Disponibilidade e Escalabilidade
 
<table>
  <tr>
    <th>Requisito</th>
    <th>Quality Attribute</th>
    <th>Description</th>
    <th>Metric / Acceptance Criteria</th>
    <th>Priority</th>
  </tr>
  <tr>
    <td>RNF-04</td>
    <td><strong>Availability</strong></td>
    <td>O sistema deve garantir disponibilidade mínima mensal compatível com infraestrutura de baixo custo. Indisponibilidade impacta diretamente agendamentos e receita do profissional.</td>
    <td>SLA ≥ 99% (~7h downtime/mês)</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RNF-05</td>
    <td><strong>Disaster Recovery – RTO</strong></td>
    <td>Em caso de queda do servidor, o sistema deve retornar ao ar em tempo hábil de forma automatizada, minimizando intervenção manual e impacto nos profissionais durante o horário de atendimento.</td>
    <td>RTO ≤ 30 min | Reinicialização automatizada (process manager + health checks)</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RNF-06</td>
    <td><strong>Disaster Recovery – RPO / Backup</strong></td>
    <td>O banco de dados deve ser copiado automaticamente uma vez ao dia para proteger os dados de clientes e agendamentos contra perda acidental ou falha de infraestrutura.</td>
    <td>RPO ≤ 24h | Backup diário automático | Retenção ≥ 7 dias | Restaurável em produção</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RNF-07</td>
    <td><strong>Data Isolation (Multi-tenancy)</strong></td>
    <td>Todos os dados devem ser isolados por tenant para garantir que nenhum profissional acesse dados de outro, mesmo em caso de erro de aplicação. O modelo multi-tenant exige que o isolamento seja garantido na camada de banco de dados.</td>
    <td>Row-Level Security (RLS) obrigatório em todas as tabelas com <code>tenant_id</code> | Zero vazamento entre tenants</td>
    <td>MVP</td>
  </tr>
</table>
---
 
### Segurança
 
<table>
  <tr>
    <th>Requisito</th>
    <th>Quality Attribute</th>
    <th>Description</th>
    <th>Metric / Acceptance Criteria</th>
    <th>Priority</th>
  </tr>
  <tr>
    <td>RNF-08</td>
    <td><strong>Authentication Security</strong></td>
    <td>O sistema deve armazenar senhas com hash seguro e utilizar tokens de curta duração com rotação, reduzindo a superfície de ataque em caso de comprometimento de credenciais.</td>
    <td>bcrypt cost ≥ 12 | JWT exp ≤ 24h | Refresh tokens rotativos e invalidados no logout</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RNF-09</td>
    <td><strong>Transport Security</strong></td>
    <td>Todo o tráfego entre cliente e servidor deve ser criptografado para proteger dados sensíveis de clientes e profissionais contra interceptação.</td>
    <td>TLS ≥ 1.2 em todos os endpoints | Renovação automática de certificados (ex: Let's Encrypt)</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RNF-10</td>
    <td><strong>API Security / Attack Protection</strong></td>
    <td>A API deve implementar múltiplas camadas de proteção contra ataques comuns (injeção, força bruta, abuso de recursos), garantindo integridade dos dados e disponibilidade do serviço.</td>
    <td>Rate limit: 100 req/min por IP | ORM parametrizado (anti SQL injection) | Headers: CORS restrito, CSP, X-Frame-Options</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RNF-11</td>
    <td><strong>Audit Logging</strong></td>
    <td>Ações críticas devem ser registradas para fins de auditoria, rastreabilidade e detecção de uso indevido. Os logs devem incluir contexto suficiente para investigação de incidentes.</td>
    <td>Registro de: login, alteração de dados, exclusões e exportações — com timestamp, usuário e IP | Retenção ≥ 90 dias</td>
    <td>Wants</td>
  </tr>
</table>
---
 
### LGPD e Privacidade
 
<table>
  <tr>
    <th>Requisito</th>
    <th>Quality Attribute</th>
    <th>Description</th>
    <th>Metric / Acceptance Criteria</th>
    <th>Priority</th>
  </tr>
  <tr>
    <td>RNF-12</td>
    <td><strong>Consent & Legal Basis</strong></td>
    <td>O sistema deve exigir aceite explícito dos termos de uso e política de privacidade no cadastro, com registro rastreável, atendendo à base legal de consentimento exigida pela LGPD.</td>
    <td>Aceite registrado com timestamp e versão do documento | Exibição obrigatória no onboarding</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RNF-13</td>
    <td><strong>Right of Access & Data Portability</strong></td>
    <td>O profissional deve poder exportar todos os seus dados e os dados dos seus clientes em formato legível, exercendo o direito de portabilidade previsto na LGPD.</td>
    <td>Exportação disponível em JSON ou CSV | Entrega em ≤ 72h após solicitação</td>
    <td>Wants</td>
  </tr>
  <tr>
    <td>RNF-14</td>
    <td><strong>Right to Erasure</strong></td>
    <td>O profissional deve poder solicitar a exclusão permanente da conta e de todos os dados associados (clientes, agendamentos, arquivos), exercendo o direito ao esquecimento previsto na LGPD.</td>
    <td>Remoção completa de todos os dados associados em ≤ 30 dias após solicitação</td>
    <td>Wants</td>
  </tr>
  <tr>
    <td>RNF-15</td>
    <td><strong>Data Minimization</strong></td>
    <td>O sistema deve coletar apenas os dados estritamente necessários para o funcionamento das funcionalidades, sem compartilhamento com terceiros sem consentimento, seguindo o princípio de minimização da LGPD.</td>
    <td>Nenhum campo obrigatório além do mínimo funcional | Campos opcionais claramente identificados | Zero compartilhamento com terceiros sem consentimento</td>
    <td>MVP</td>
  </tr>
</table>
---
 
### Usabilidade e Acessibilidade
 
<table>
  <tr>
    <th>Requisito</th>
    <th>Quality Attribute</th>
    <th>Description</th>
    <th>Metric / Acceptance Criteria</th>
    <th>Priority</th>
  </tr>
  <tr>
    <td>RNF-16</td>
    <td><strong>Responsive Design</strong></td>
    <td>O sistema deve funcionar corretamente em smartphones e desktops, dado que profissionais frequentemente gerenciam sua agenda pelo celular. O link público de agendamento deve ser otimizado para mobile, pois é acessado majoritariamente por clientes em dispositivos móveis.</td>
    <td>Layout funcional em breakpoints: 320px, 768px e 1280px</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RNF-17</td>
    <td><strong>Browser Compatibility</strong></td>
    <td>O sistema deve funcionar sem degradação nas principais versões dos navegadores utilizados pelo público-alvo, evitando fricção no acesso por parte de profissionais e clientes.</td>
    <td>Suporte às 2 últimas versões de: Chrome, Firefox, Safari e Edge</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RNF-18</td>
    <td><strong>Accessibility</strong></td>
    <td>Os componentes principais do sistema devem atender às diretrizes de acessibilidade WCAG 2.1 nível AA, garantindo que usuários com deficiências visuais ou motoras consigam utilizar os fluxos essenciais.</td>
    <td>WCAG 2.1 AA nos fluxos principais: contraste de cores, navegação por teclado e atributos ARIA</td>
    <td>Wants</td>
  </tr>
</table>
---
 
### Manutenibilidade e Qualidade
 
<table>
  <tr>
    <th>Requisito</th>
    <th>Quality Attribute</th>
    <th>Description</th>
    <th>Metric / Acceptance Criteria</th>
    <th>Priority</th>
  </tr>
  <tr>
    <td>RNF-19</td>
    <td><strong>Test Coverage</strong></td>
    <td>Os módulos de maior criticidade de negócio (agendamento, pagamentos e autenticação) devem ter cobertura de testes automatizados suficiente para garantir regressão segura a cada deploy.</td>
    <td>Cobertura ≥ 70% (unitários + integração) nos módulos críticos</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RNF-20</td>
    <td><strong>CI/CD & Version Control</strong></td>
    <td>O processo de deploy deve ser automatizado com etapa obrigatória de testes, reduzindo risco de regressões em produção e garantindo rastreabilidade de mudanças via controle de versão.</td>
    <td>Git com branches protegidas | Pipeline CI/CD com gate de testes obrigatório antes do deploy em produção</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RNF-21</td>
    <td><strong>Observability & Alerting</strong></td>
    <td>O sistema deve ter monitoramento de uptime e alertas automáticos em caso de indisponibilidade ou erros críticos, permitindo resposta rápida a incidentes antes que impactem os profissionais.</td>
    <td>Alerta disparado em ≤ 5 min após falha detectada (ex: Uptime Robot, Sentry ou equivalente)</td>
    <td>MVP</td>
  </tr>
</table>
---
 
### Escalabilidade
 
<table>
  <tr>
    <th>Requisito</th>
    <th>Quality Attribute</th>
    <th>Description</th>
    <th>Metric / Acceptance Criteria</th>
    <th>Priority</th>
  </tr>
  <tr>
    <td>RNF-22</td>
    <td><strong>Horizontal Scalability</strong></td>
    <td>A camada de aplicação deve ser stateless para permitir escalonamento horizontal sem refatoração estrutural, suportando o crescimento da base de tenants sem degradação de performance.</td>
    <td>API stateless (sem sessão server-side) | Suporte a escalonamento horizontal até 5.000 tenants sem refatoração</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RNF-23</td>
    <td><strong>Pagination & Memory Efficiency</strong></td>
    <td>Todas as listagens com potencial de crescimento ilimitado devem usar paginação ou scroll infinito para evitar sobrecarga de memória e lentidão na interface conforme o volume de dados aumenta.</td>
    <td>Máximo 50 registros por página/request em todas as listagens (clientes, agendamentos, formulários)</td>
    <td>MVP</td>
  </tr>
</table>

<!-- #endregion -->

<!-- #region 2.5 Regras de Negócio -->

<h2>2.5 Regras de Negócio</h2>

As regras de negócio definem condições, restrições e comportamentos obrigatórios do sistema Planici para garantir consistência, segurança e coerência entre clientes, agenda, procedimentos, planos, pagamentos e configurações do espaço de trabalho.

### RN-01: Acesso autenticado

Apenas usuários autenticados podem acessar os recursos internos do sistema, como cadastro de clientes, agenda, procedimentos, planos, pagamentos, relatórios, formulários e configurações do espaço de trabalho.

Recursos públicos, como o link de agendamento disponibilizado ao cliente, podem ser acessados sem autenticação, desde que estejam vinculados a um tenant válido.

---

### RN-02: Isolamento por tenant

Todos os dados operacionais do sistema devem pertencer a um tenant, incluindo clientes, procedimentos, planos, agendamentos, pagamentos, formulários, configurações e colaboradores.

Um usuário não pode visualizar, editar ou excluir dados pertencentes a outro tenant, salvo se possuir vínculo autorizado com esse espaço de trabalho.

---

### RN-03: Permissões de colaboradores

Quando o recurso de múltiplos usuários estiver disponível, somente administradores do tenant poderão convidar colaboradores e alterar suas permissões.

Colaboradores só poderão executar ações compatíveis com seu nível de acesso. Por exemplo, um colaborador com acesso apenas à agenda não poderá visualizar relatórios financeiros ou alterar configurações do tenant.

---

### RN-04: Cadastro de clientes

Todo cliente deve estar vinculado a um tenant.

O nome do cliente é obrigatório. Telefone, e-mail e observações podem ser opcionais, mas, quando informados, devem respeitar formatos válidos.

Não deve ser permitido cadastrar dois clientes com o mesmo e-mail dentro do mesmo tenant, caso o e-mail tenha sido informado.

---

### RN-05: Exclusão de clientes

Clientes que possuam histórico de atendimentos, pagamentos, planos ou formulários aplicados não devem ser removidos definitivamente do sistema.

Nesses casos, o cliente deve ser apenas inativado, preservando o histórico necessário para consultas futuras, relatórios e controle financeiro.

---

### RN-06: Cadastro de procedimentos

Todo procedimento deve estar vinculado a um tenant.

Um procedimento deve possuir, no mínimo, nome, duração estimada e valor padrão.

O valor padrão de um procedimento não pode ser negativo.

Procedimentos vinculados a agendamentos, planos ou histórico financeiro não devem ser excluídos definitivamente; devem ser inativados.

---

### RN-07: Cadastro de planos

Todo plano deve estar vinculado a um tenant.

Um plano deve possuir nome, preço, moeda e ciclo de cobrança.

O preço de um plano não pode ser negativo.

Um plano pode conter um ou mais procedimentos associados.

Quando um procedimento for associado a um plano, o sistema deve permitir definir a quantidade incluída e, se necessário, um preço específico para aquele procedimento dentro do pacote.

---

### RN-08: Exclusão de planos

Planos já utilizados em agendamentos, histórico de clientes ou registros financeiros não devem ser removidos definitivamente.

Nesses casos, o plano deve ser inativado para impedir novos usos, mantendo o histórico anterior preservado.

---

### RN-09: Disponibilidade da agenda

O profissional pode configurar disponibilidades fixas por dia da semana ou janelas de disponibilidade específicas para datas determinadas.

Horários fora da disponibilidade configurada não devem aparecer como disponíveis no link público de agendamento.

Horários bloqueados manualmente pelo profissional também não devem aparecer como disponíveis.

---

### RN-10: Criação de agendamentos

Todo agendamento deve estar vinculado a um tenant.

Um agendamento criado pelo profissional deve possuir cliente, serviço ou plano, data e horário.

Não deve ser permitido criar dois agendamentos no mesmo horário para o mesmo profissional quando houver conflito de disponibilidade.

Não deve ser permitido criar agendamento em horário bloqueado.

---

### RN-11: Agendamentos pelo link público

Agendamentos solicitados por meio do link público devem ser criados inicialmente com status pendente.

O cliente não precisa possuir conta no sistema para solicitar um agendamento pelo link público.

O agendamento só passa a ser confirmado após aprovação do profissional.

O profissional pode confirmar ou recusar solicitações recebidas pelo link público.

---

### RN-12: Alteração e cancelamento de agendamentos

O profissional pode alterar data, horário, cliente, serviço ou plano de um agendamento existente, desde que o novo horário esteja disponível.

Agendamentos cancelados devem manter o registro histórico no sistema.

Um agendamento cancelado não deve ser considerado como receita recebida, exceto se houver pagamento registrado e mantido pelo profissional.

---

### RN-13: Status de pagamento

Cada agendamento deve possuir um status de pagamento claramente identificado, como pago, pendente ou cancelado.

Um pagamento registrado deve conter valor, forma de pagamento e data de pagamento.

O valor pago não pode ser negativo.

A data de pagamento não pode ser posterior à data atual, salvo se o sistema permitir registro de pagamentos futuros como previsão.

---

### RN-14: Edição de pagamentos

O profissional pode corrigir dados de pagamento já registrados.

Alterações em pagamentos devem atualizar os valores utilizados nos relatórios financeiros.

Pagamentos associados a agendamentos cancelados devem ser tratados conforme a regra definida pelo profissional, podendo ser mantidos, estornados ou desconsiderados dos relatórios.

---

### RN-15: Relatórios financeiros

Os relatórios financeiros devem considerar apenas dados pertencentes ao tenant do usuário autenticado.

O resumo de receitas deve considerar somente pagamentos registrados como pagos.

Pagamentos pendentes não devem ser somados como receita recebida.

Agendamentos cancelados não devem gerar receita, salvo quando houver pagamento confirmado vinculado ao agendamento.

---

### RN-16: Ranking de procedimentos

O ranking de procedimentos deve considerar os procedimentos realizados dentro do período selecionado pelo profissional.

O sistema pode ordenar o ranking por quantidade de realizações ou por receita gerada.

Procedimentos inativados devem continuar aparecendo em relatórios históricos quando tiverem sido utilizados no período consultado.

---

### RN-17: Notificações de agendamento

Ao confirmar um agendamento, o sistema deve enviar uma notificação ao cliente quando houver canal de envio configurado.

Quando um agendamento for cancelado ou remarcado, o cliente deve ser notificado automaticamente, se o canal estiver habilitado.

Se nenhum canal de notificação estiver configurado, o sistema deve permitir a operação normalmente, mas não deve tentar enviar mensagens.

---

### RN-18: Lembretes automáticos

O sistema deve enviar lembretes automáticos antes do horário do atendimento conforme a antecedência configurada pelo profissional.

Lembretes só devem ser enviados para agendamentos confirmados.

Agendamentos pendentes, recusados ou cancelados não devem receber lembretes automáticos.

---

### RN-19: Configuração de notificações

As configurações de canais de notificação pertencem ao tenant.

O profissional pode escolher quais eventos disparam notificações, como confirmação, cancelamento, remarcação e lembrete.

Credenciais de integração, quando utilizadas, devem ser armazenadas de forma segura e não devem ser exibidas integralmente após o cadastro.

---

### RN-20: Formulários personalizados

Todo modelo de formulário deve pertencer a um tenant.

Um modelo de formulário deve possuir nome e uma entidade-alvo sugerida, como cliente, serviço ou plano.

Campos obrigatórios definidos em um formulário devem ser preenchidos antes que o formulário aplicado seja salvo.

A ordem dos campos definida pelo profissional deve ser preservada na exibição do formulário.

---

### RN-21: Aplicação de formulários

Um formulário personalizado pode ser aplicado a uma entidade compatível, como cliente, serviço ou plano.

As respostas preenchidas devem permanecer vinculadas à entidade em que o formulário foi aplicado.

Alterações futuras no modelo do formulário não devem apagar automaticamente respostas já registradas.

---

### RN-22: Personalização de labels

O profissional pode personalizar os nomes exibidos para entidades do sistema, como clientes, serviços e planos.

A personalização de labels altera apenas a exibição na interface, sem modificar a estrutura interna dos dados.

Por exemplo, o sistema pode exibir "Pacientes" no lugar de "Clientes", mas a entidade continua representando o cadastro de clientes no domínio do sistema.

---

### RN-23: Configuração de ocupação profissional

O profissional deve poder selecionar sua ocupação para adaptar a linguagem e a experiência do sistema ao seu contexto de uso.

A ocupação selecionada pode influenciar sugestões de labels, modelos de formulário e termos exibidos na interface.

---

### RN-24: Integridade do histórico

Dados utilizados em histórico de atendimentos, relatórios financeiros ou registros de pagamento não devem ser excluídos fisicamente sem validação adicional.

Quando necessário, o sistema deve preferir inativação, cancelamento ou arquivamento em vez de exclusão definitiva.

---

### RN-25: Validação de operações críticas

Operações que afetam agenda, pagamentos, permissões, exclusão de dados ou configurações do tenant devem passar por validação adicional antes de serem concluídas.

Exemplos de operações críticas:

- excluir ou inativar cliente;
- cancelar agendamento;
- editar pagamento;
- alterar permissões de colaborador;
- alterar configurações de notificação;
- remover procedimentos ou planos já utilizados.

<!-- #endregion -->

<!-- #region 2.6 Fora de Escopo -->
<h2>2.6 Fora de Escopo</h2>

Os itens abaixo não fazem parte do escopo do Planici e não serão implementados no contexto deste projeto.

1. **Interação cruzada entre tenants:** O sistema não permite que um profissional visualize, edite ou acesse dados de outro tenant. Não há marketplace, listagem pública de profissionais nem nenhum tipo de visualização de perfil entre usuários distintos.

2. **Aplicativo mobile nativo:** O Planici é uma aplicação web com design responsivo e mobile-first. Não será desenvolvido app nativo para iOS ou Android.

3. **Processamento de pagamentos online:** O sistema registra pagamentos manualmente informados pelo profissional. Não há integração com gateways de pagamento (ex: Stripe, PagSeguro, Mercado Pago) nem cobrança automática de clientes.

4. **Emissão de documentos fiscais:** O sistema não emite notas fiscais, NFS-e, NF-e nem qualquer documento fiscal regulamentado.

5. **Gestão de estoque ou venda de produtos:** O sistema é voltado exclusivamente para gestão de serviços. Não há suporte a controle de estoque, catálogo de produtos físicos ou e-commerce.

6. **Múltiplas unidades ou filiais:** O escopo é o profissional autônomo individual. Não há suporte a gestão de múltiplas unidades, franquias ou redes de atendimento.

7. **Integração com prontuários eletrônicos ou sistemas de saúde regulamentados:** O sistema não se integra a prontuários eletrônicos, sistemas do CFM, TISS ou qualquer plataforma de saúde regulamentada. Formulários personalizados podem ser utilizados para registros internos, mas sem valor legal ou clínico.

8. **Funcionalidades de marketing:** O sistema não oferece email marketing, campanhas promocionais, cupons de desconto, automações de vendas ou ferramentas de CRM voltadas a captação de novos clientes.

<!-- #endregion -->

<h1>3. Fluxos e Comportamento do Sistema</h1>

> [!NOTE]
> Esta seção apresenta os principais fluxos de uso do sistema Planici, demonstrando como o usuário interage com as funcionalidades principais, desde a autenticação até o gerenciamento de clientes, serviços, planos, agendamentos e informações financeiras.

## 3.1 Fluxo principal de Usuário (OnBoarding)
O fluxo principal descreve a primeira interação do profissional com o sistema: desde o acesso inicial até a entrada no espaço de trabalho configurado. O sistema permite criar um novo ambiente (Tenant) ou ingressar em um existente via convite.

<details open>
  <summary>Flowchart</summary>
  <img src="./img/main-flow.svg"/>
</details>
