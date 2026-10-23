# Planici

Gestão de agenda e negócios para profissionais independentes.

[![CI](https://img.shields.io/github/actions/workflow/status/angeluciel/planici/ci.yml?style=for-the-badge)](https://github.com/angeluciel/planici/actions)
[![License](https://img.shields.io/github/license/angeluciel/planici?style=for-the-badge)](LICENSE)
![GitHub repo size](https://img.shields.io/github/repo-size/angeluciel/planici?style=for-the-badge)
![GitHub language count](https://img.shields.io/github/languages/count/angeluciel/planici?style=for-the-badge)
![GitHub forks](https://img.shields.io/github/forks/angeluciel/planici?style=for-the-badge)
![Github open issues](https://img.shields.io/github/issues/angeluciel/planici?style=for-the-badge)
![Github open pull requests](https://img.shields.io/github/issues-pr/angeluciel/planici?style=for-the-badge)

![Planici](/docs/assets/hero.png)
 
O Planici ajuda profissionais autônomos e microempreendedores a organizar compromissos, clientes, serviços e finanças em um só lugar.

[Protótipo no Figma](https://www.figma.com/design/rWWne0gLS6YsVEuz4c7Amg/Planici?node-id=0-1&t=J5LLtwXO2fQxcF8H-1) · [RFC do projeto](docs/RFC.md)


## Funcionalidades

- **Agenda:** Visualizações de dia, semana e mês; criação e gerenciamento de compromissos.
- **Clientes:** Cadastro, perfis e histórico de serviços e compromissos.
- **Serviços:** Configuração de tipos de serviço, duração e preços.
- **Financeiro:** Acompanhamento de pagamentos, receitas e despesas.

> Consulte o [RFC](docs/RFC.md) para conhecer o escopo e as decisões do projeto.

## Tecnologias

- **Monorepo:** pnpm workspaces e Turborepo
- **Web:** Nextjs e React
- **API:** NestJS
- **Banco de dados:** PostgreSQL

## Requisitos

- Node.js `26.5.0`
- pnpm `12.3.4`

As versões também estão especificadas em `.nvmrc`, `mise.toml` e `package.json`.

## Desenvolvimento

Clone o repositório e instale as dependências:
```bash
git clone https://github.com/angeluciel/planici.git
cd planici
pnpm install
```

Para iniciar a aplicação localmente, configure as variáveis de ambiente e o banco de dados conforme as instruções em [CONTRIBUTING](CONTRIBUTING.md). Depois, inicie a web e a API em terminais separados:

```bash
pnpm dev:web
pnpm --filter api start:dev
```

> [!WARNING]
> Os pacotes compartilhados precisam ser buildados antes de iniciar as aplicações. Consulte o guida de contribuição para ver a sequência completa.

## Verificações

Execute na raiz do repositório:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Contribuindo

Leia [CONTRIBUTING](CONTRIBUTING.md) para preparar o ambiente, validar alterações e abrir um pull request. As contribuições devem ser enviadas para abranch `dev` por pull request.

## Licença

Consulte o arquivo [LICENSE](LICENSE).