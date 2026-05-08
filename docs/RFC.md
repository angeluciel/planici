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

<h2>2.1 Personas</h2>
<a href="/docs/img/persona-carlos.pdf" download>PDF Persona Carlos</a>
<details>
  <summary><h4>Persona Carlos - Imagem<h4/></summary>
  <img alt=" img" src="/docs/img/persona-carlos.png" />
</details>

<h2>2.2 Casos de Uso Principais</h2>

```diff
- to-do                                   
```

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
    <td><strong>Criar cliente</strong><br>O profissional pode cadastrar um cliente com nome, telefone, e-mail e observações.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-08</td>
    <td><strong>Editar e excluir cliente</strong><br>O profissional pode atualizar ou remover um cadastro de cliente.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-09</td>
    <td><strong>Busca e filtro de clientes</strong><br>O profissional pode buscar clientes por nome, telefone ou e-mail.</td>
    <td>MVP</td>
  </tr>
  <tr>
    <td>RF-10</td>
    <td><strong>Histórico de atendimentos do cliente</strong><br>Na ficha do cliente, o profissional visualiza todos os atendimentos anteriores, procedimentos realizados e valores pagos.</td>
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
    <td><strong>Criar procedimento</strong><br>O profissional cadastra procedimentos com nome, duração estimada e valor padrão.</td>
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

<!---
```diff
+ RF01 (MVP): Cadastro por email                      
       O sistema deve permitir que Carlos crie uma conta informando nome, email e senha.
+ RF02 (MVP): Login Via Google (OAuth)                
       O profissional pode autenticar com a conta Google.
+ RF03 (MVP): Recuperação de senha                    
       O sistema envia link de redefinição de senha por e-mail
+ RF04 (MVP): Gerenciamento de Perfil                 
       O profissional pode editar nome, foto, dados de contato e informações de negócio
+ RF05 (WANTS): Multiusuário por Tenant               
       Consultas nos planos Basic ou superior podem convidar colaboradores com acesso ao mesmo espaço de trabalho.

```

 [ ] **RF01 - Cadastro por email**
> O sistema deve permitir que Carlos crie uma conta informando nome, email e senha.
- [ ] **RF02 - Login Via Google (OAuth)**
- [ ] **RF03 - Recuperação de senha**
- [ ] **RF04 - Gerenciamento de Perfil**
- [ ] **RF05 - Multiusuário por Tenant**
- [ ] **RF06 - Controle de permissões**
-->

<h2>2.4 Requisitos Não Funcionais (RNF)</h2>

```diff
- to-do                                   
```

<!-- Deve ter:: desempenho, segurança, disponibilidade, escalabilidade, usabilidade.
RNF01 - O sistema deve suportar 100 usuários simultâneos. -->

<h2>2.5 Regras de Negócio</h2>

```diff
- to-do                                   
```

<h2>2.6 Fora de Escopo</h2>
1. O sistema não permitirá interação entre usuários do sistema, nem nenhun tipo de visualização de perfil (usuário A vê clientes do usuário B).
<br>
