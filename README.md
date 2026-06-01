# Planici v1

![GitHub repo size](https://img.shields.io/github/repo-size/angeluciel/planici?style=for-the-badge)
![GitHub language count](https://img.shields.io/github/languages/count/angeluciel/planici?style=for-the-badge)
![GitHub forks](https://img.shields.io/github/forks/angeluciel/planici?style=for-the-badge)
![Github open issues](https://img.shields.io/github/issues/angeluciel/planici?style=for-the-badge)
![Github open pull requests](https://img.shields.io/github/issues-pr/angeluciel/planici?style=for-the-badge)

![hero](https://randomimgs.blob.core.windows.net/random-imgs/background.png)

<p align="center">
  <b align="center">
    GESTÃO DE AGENDAS E NEGÓCIOS PARA PROFISSIONAIS INDEPENDENTES
    <br /> <br />
    <a href="https://www.figma.com/design/rWWne0gLS6YsVEuz4c7Amg/Planici?node-id=0-1&t=J5LLtwXO2fQxcF8H-1"><strong>Figma</strong></a> ·
    <a href="#pré-requisitos"><strong>Como Usar</strong></a>
    <br />
  </b>
</p>
    
> Planici é um sistema de gestão de negócios intuitivo e personalizado, projetado para profissionais autônomos e microempreendedores que necessitam gerenciar compromissos, clientes, pagamentos e acompanhamento financeiro em um único lugar

### Ajustes e melhorias

- [] Melhorar linting time
- [x] Testar Biome

## Pré-Requisitos

Antes de começar, verifique se você atende os seguintes requisitos:

- Você instalou a versão LTS de `nodejs`.
- Você leu o [Documento de RFC]('./docs/RFC.md').

## Instalando o Planici

Para instalar o Planici, siga estas etapas:

```bash
pnpm install
```

## Rodando o Planici

Para usar o Planici, siga estas etapas:

```bash
pnpm build
```

## Contribuindo para o projeto

Para contribuir com o Planici, siga estas etapas:

1. Fork este repositório
2. Crie uma branch `git switch -c <nome-da-branch>` seguindo as regras de nome de branches do repositório.
3. Faça sas alterações e confirme: `git commit -m 'sua mensagem'`
4. Envie para a branch original: `git push origin dev`
5. Crie a pull request

<br/><br/>

> [!TIP]
> Apresentação do Projeto

# Visão

Planici foi desenvolvido para profissionais que desejam gerenciar sua agenda, clientes e finanças sem pagar preço altos por softwares corporativos ou sacrificar personalização para seu modelo de negócio único.

# Principais Funcionalidades

## Agendamento Inteligente

- **Visualização em Calendário:** Gestão visual de agenda com visualizações de dia, semana e mês.
- **Gerenciamento de Compromissos:** Criar, reagendar e cancelar compromissos sem dificuldades.
- **Mapeamento de Serviços para Clientes:** Vincular procedimentos/Serviços específicos aos registros de clientes.
- **Notificações e lembretes**: Mantenha-se atualizado sobre compromissos próximos.

## Gestão de Clientes

- **Banco de Dados Unificado de Clientes:** Armazenar informacoes de clientes, dados de contato e historico de servicos
- **Perfis de Clientes:** Acompanhar historico de compromissos, preferencias e anotacoes
- **Registros de Servicos:** Associar servicos especificos a cada cliente

## Acompanhamento Financeiro

- **Gestao de Pagamentos:** Registrar e acompanhar pagamentos integrados aos compromissos
- **Registro de Receitas e Despesas:** Monitorar receita e custos do negocio
- **Painel Financeiro:** Visao geral rapida do desempenho do negocio
- **Geracao de Faturas:** Criar faturas profissionais para clientes

## Personalização

- **Marca Customizada:** Adaptar o sistema para corresponder a identidade do seu negocio
- **Personalizacao de Servicos:** Definir seus proprios tipos de servicos, duracao e precos
- **Configuracao de Fluxo de Trabalho:** Adaptar o sistema ao seu processo de negocio especifico
