# gestor-gastos-frontend

App do Gestor de Gastos: Expo + React Native + Expo Router, em TypeScript `strict`. Na web é uma SPA servida como PWA; iOS e Android vêm depois.

## Rodar localmente

Com o ambiente local no ar (infra-base: `task local:up`; users-service e BFF com `go run ./cmd/local`):

```sh
npm install
npm run env:local     # gera o .env.local a partir do local/.env.cognito do infra-base
npm run web           # http://localhost:8081
```

O `env:local` procura o infra-base em `../gestor-gastos-infra-base`. Se ele estiver em outro lugar, rode `npm run env:local -- <caminho>`.

| Variável                        | Local                                                    |
| ------------------------------- | -------------------------------------------------------- |
| `EXPO_PUBLIC_APP_ENV`           | `local` (`dev` e `prod` na AWS)                          |
| `EXPO_PUBLIC_API_URL`           | `http://127.0.0.1:8080` (BFF)                            |
| `EXPO_PUBLIC_COGNITO_REGION`    | `us-east-1`                                              |
| `EXPO_PUBLIC_COGNITO_CLIENT_ID` | App client do cognito-local                              |
| `EXPO_PUBLIC_COGNITO_ENDPOINT`  | `http://localhost:9229`. Só é aceita com `APP_ENV=local` |

As variáveis são validadas com Zod no boot (`src/shared/config`): se faltar alguma, o app falha apontando qual. **Nada aqui é segredo**, porque tudo vai para o bundle.

## Estrutura

```
src/
├── app/        rotas do Expo Router, finas: só compõem features
├── features/   um módulo por contexto (auth, gastos, ...), exposto só pelo index.ts
└── shared/     config, api, ui, platform e lib; não conhece features nem app
```

As fronteiras `app → features → shared` são verificadas pelo ESLint (`no-restricted-imports`) e pelo `scripts/check_boundaries.py`, que também pega imports relativos que atravessam camadas.

## Qualidade

```sh
npm run verify   # typecheck + lint + format:check + check:boundaries
```

- **Pre-commit:** o hook do Husky roda o lint-staged, com ESLint e Prettier nos arquivos alterados.
- **Esteira:** em todo PR roda o `verify` e o build web (`expo export -p web`).
- **Fim de linha:** o `.gitattributes` força LF, inclusive no Windows, porque o Prettier exige.
