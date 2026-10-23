# Contribuindo para o Planici

Obrigado por considerar uma contribuição para o Planici! Esse guia explica como preparar o ambiente, validar suas alterações e enviá-las para revisão.

## Antes de começar

- Confira o [README](README.md) e o [RFC do projeto](docs/RFC.md) para entender o escopo e a arquitetura.
- Para mudanças maiores ou que alterem o comportamento do produto, abra uma issue ou converse com os mantenedores antes de começar. Isso ajuda a alinhar a solução e evita trabalho duplicado.
- Para relatar um problema, descreva os passos para reproduzi-lo e o resultado esperado. Não inclua dados reais de clientes (por favor), credenciais ou tokens.

## Branches

| Branch         | Role |
| -------------- | ---- |
| ` main `       | Apenas releases, protegida e avança exclusivamente via PR. |
| ` dev `        | Integração; Todo trabalho é enviado aqui primeiro. |
| ` feat/* `     | Nova funcionalidade, também aceita ` features/* ` |
| ` chore/* `    | Manutenção, docs, CI ou dependências. |
| ` fix/* `      | Correção de bug. |
| ` hotfix/* `   | Correção urgente em produção; branch a partir da ` main `. |
| ` refactor/* ` | Refatoração sem mudança de comportamento. |

Nomeie a branch a partir do **trabalho**, e referencie a spec caso tenha uma: `feat/forms-spec-001`, `fix/typo-api-dockerfile`.

Nunca adicione no nome da branch o nome da pessoa/ferramenta que trabalhou nela. Nunca `claude/*` ou `usuario/*`.

## Preparando o ambiente

O repositório usa Node.js `26.5.0` e pnpm `12.3.4`, definidos em `.nvmrc`, `mise.toml` e `package.json`.

Caso tenha **mise** instalado, na raiz do repositório rode:

```bash
mise install
pnpm install
```

Se não usar mise, instale as versões indicadas nos arquivos do repositório e depois rode `pnpm install`. A instalação configura os hooks do Husky.

## Estrutura do repositório

- `apps/api`: API en NestJS.
- `apps/web`: Aplicação web em Nextjs.
- `packages/`: pacotes compartilhados entre as aplicações.

## Desenvolvimento e verificações

Os comandos abaixo devem ser executados na raiz do repositório. Para iniciar iniciar a aplicação web e a API, configure as **variáveis locais** e o banco de dados conforme o `.env.example` e os arquivos de execução do projeto.
Antes de executar as aplicações em si, é necessário fazer a build dos pacotes compartilhados:

```bash
pnpm --filter @planici/schemas build
pnpm --filter @planici/i18n build
pnpm --filter @planici/utils build
```

Então, rode cada aplicação em um terminal:

```bash
pnpm dev:web

pnpm --filter api start:dev
```

Para validar o projeto:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

A API também tem testes end-to-end. Para executá-los localmente, use Docker e rode:

```bash
pnpm --filter api test:e2e
```

A CI executa lint, verificação de tipos, testes, testes end-to-end da API e build nos pull requests para `dev`e `main`.

O hook de `pre-commit` configurado atualmente executa `lint-stages`, que aplica a verificação do Biome aos arquivos preparados que correspondem à configuração do projeto.

O hook de `commit-msg` previne (ou tenta, pelo menos) que agentes de IA se adicionem como co-autores do repositório.

O hook de `pre-push` roda `pnpm test`.

> Caso um hook falhe, corrija o problema e tente o commit novamente.

## Fluxo de contribuição

1. Faça um fork do repositório no GitHub, caso ainda não tenha permissão para criar branches nele.
2. Clone seu fork e adicione o repositório original como upstream:
```bash
git clone https://github.com/<seu-usuario>/planici.git
cd planici

git remote add upstream https://github.com/angeluciel/planici.git
git fetch upstream dev

git switch -c dev --track upstream/dev
```

Se você já clonou o repositório original, atualize sua branch local `dev` com `git pull --ff-only origin dev`.

3. Crie uma branch a partir da `dev`. Use um nome curto que descreva a mudança, por exemplo:
```bash
git switch -c feat/filtro-de-agendamentos
```
4. Faça a alteração em commits pequenos e com mensagens claras. Não há formato de commit obrigatório definido no repositório.
5. Rode as verificações relacionados à mudança e confirme que os hooks locais passam.
6. Envie sua branch para o seu fork:
```bash
git push -u origin feat/filtro-de-agendamentos
```
7. Abra um pull request de sua branch para `dev` no repositório `angeluciel/planici`. Não envie alterações diretamente para `dev` ou `main`.

## Pull Requests
Inclua no pull request:
- O que mudou e por que a mudança é necessária.
- Como validar o comportamento alterado, incluindo os comandos de teste executados.
- Capturas de tela ou gravações curtas quando a mudança afetar a interface.
- A issue relacionada, caso haja uma.

Mantenha o pull request focado em uma mudança que possa ser revisada de forma independente. Atualize testes e documentação quando o comportamento ou as instruções do projeto mudarem. Aguarda a revisão e a CI antes do merge.