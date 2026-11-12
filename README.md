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

## Na AWS (dev)

O site é publicado no **Amplify Hosting** a cada push na `main`, pela esteira (`.github/workflows/ci.yml`, que chama o `frontend.yml` do infra-base):

1. Em todo PR: `tsc`, ESLint, Prettier, fronteiras, client gerado em dia, Jest e `expo export -p web`. PR de funcionalidade ou correção precisa de `- [x] Validado localmente` no corpo.
2. Na `main`: as mesmas verificações e o deploy em `dev` (GitHub Environment `dev`, role `gh-deploy-gestor-gastos-frontend-dev` por OIDC). O build lê do SSM a URL da API, o client id e o id do User Pool, e envia o `dist/` ao Amplify por deploy manual (`create-deployment` + `start-deployment`).

| Variável                           | dev (lida do SSM pela esteira)                |
| ---------------------------------- | --------------------------------------------- |
| `EXPO_PUBLIC_APP_ENV`              | `dev`                                         |
| `EXPO_PUBLIC_API_URL`              | `/gestor-gastos/dev/api/url`                  |
| `EXPO_PUBLIC_COGNITO_REGION`       | `us-east-1`                                   |
| `EXPO_PUBLIC_COGNITO_CLIENT_ID`    | `/gestor-gastos/dev/auth/user-pool-client-id` |
| `EXPO_PUBLIC_COGNITO_USER_POOL_ID` | `/gestor-gastos/dev/auth/user-pool-id` (SRP)  |

- **App do Amplify:** criado pela stack `gestor-gastos-dev-web` do infra-base (sem repositório conectado, então sem minutos de build). Ela publica o id em `/gestor-gastos/dev/frontend/amplify-app-id` e a URL (`https://main.<app-id>.amplifyapp.com`) em `/gestor-gastos/dev/frontend/url`.
- **Rewrite de SPA:** rotas sem extensão (`/login`, `/perfil`) recebem o `index.html`; arquivos com extensão de estático (`.js`, `.css`, `.png`, `.ico`, `.ttf`, `.json`, `.webmanifest` etc.) são servidos como estão. É o que manterá o `sw.js` e o `manifest.json` da PWA (tarefa 11.1) funcionando, sem virar HTML.
- **Cache:** `index.html`, `sw.js` e `manifest.json` com `no-cache`; bundles em `/_expo/static` imutáveis (têm hash no nome). Configurado no app do Amplify, porque em deploy manual ele não lê `customHttp.yml`.
- **Testar no localhost contra dev:** `npm run env:dev` gera o `.env.local` a partir do SSM (AWS CLI, só leitura) e `npm run web` sobe o app falando com o Cognito e a API de dev. `npm run env:local` volta ao ambiente local.
- **Roteiro de validação em dev:** [`docs/roteiro-dev.md`](docs/roteiro-dev.md). O primeiro admin é criado pelo CLI: `docs/primeiro-admin.md` do infra-base.

## Estrutura

```
src/
├── app/        rotas do Expo Router, finas: só compõem features
├── features/   um módulo por contexto (auth, gastos, ...), exposto só pelo index.ts
└── shared/     config, api, ui, platform e lib; não conhece features nem app
```

As fronteiras `app → features → shared` são verificadas pelo ESLint (`no-restricted-imports`) e pelo `scripts/check_boundaries.py`, que também pega imports relativos que atravessam camadas.

## Design system (`src/shared/ui`)

As telas usam só os componentes e os `tokens` de `shared/ui`; nenhuma cor ou medida literal fora dali.

| Componente                 | Figma                                                                             |
| -------------------------- | --------------------------------------------------------------------------------- |
| `Button`                   | Button: Primary, Secondary, Ghost e Danger, com Disabled e estado de carregamento |
| `TextField`                | Input: Default, Focused, Error e Disabled, com mostrar/ocultar senha              |
| `Header`, `Screen`         | Header: Title e Back; `Screen` é a moldura da tela                                |
| `Banner`                   | Banner: Error, Offline e Success                                                  |
| `Badge`                    | Badge: Neutral, Brand, Success, Danger, Warning, Cartao e Fixo                    |
| `MenuItem`, `Icon`, `Text` | MenuItem, ícones (nomes do Feather) e escala tipográfica                          |

> **Tokens provisórios.** O Figma MCP atingiu o limite do plano Starter antes da leitura das variáveis. Os valores em `src/shared/ui/tokens.ts` usam a mesma família de cores do seed das categorias. Quando o Figma liberar, troca-se só esse arquivo.

## Client do BFF (`src/shared/api`)

- **Contrato:** `openapi/bff.yaml` é uma cópia fixada do contrato do BFF. O `npm run api:gerar` (orval) gera em `src/shared/api/generated` as funções de fetch, os tipos e os schemas Zod. Os arquivos gerados nunca são editados à mão, e a esteira falha se estiverem desatualizados.
- **Chamadas:** passam pelo `httpMutator`, que põe o token, lança `ApiError` com o problem+json já lido (`status`, `code`, `detail`, `errors`) e trata o 401: renova a sessão uma única vez, mesmo com várias chamadas simultâneas, repete a chamada e, se não der, encerra a sessão.
- **Autenticação:** a feature de sessão se pluga com `configurarAutenticacao`, porque o `shared` não conhece features.
- **Cache:** o `queryClient` do TanStack Query não repete erros 4xx e não repete mutações.

## Autenticação (`src/features/auth`) e Perfil (`src/features/perfil`)

| Rota                | Tela                                                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `/login`            | Login. Credencial inválida recebe uma mensagem genérica; conta pendente vai para a confirmação; conta bloqueada é recusada |
| `/cadastro`         | Cadastro com a política de senha descrita regra a regra                                                                    |
| `/confirmar?email=` | Código de 6 números, com reenvio                                                                                           |
| `/perfil`           | Nome, e-mail, papel, data de criação e "Sair" (o painel chega na fatia 4)                                                  |

- **Cognito:** o app chama o Cognito direto pelo protocolo JSON da API (`X-Amz-Target`), sem o SDK da AWS.
- **Login:** na AWS, **SRP** (`USER_SRP_AUTH` + desafio `PASSWORD_VERIFIER`): a senha não sai do aparelho. O SRP, o SHA-256 e o HMAC ficam em `src/features/auth/api/srp.ts` e `sha256.ts`, sem biblioteca nova, e os testes conferem contra um vetor gerado pelo `amazon-cognito-identity-js`. No ambiente local, `USER_PASSWORD_AUTH`, porque o cognito-local não implementa SRP. Os bytes aleatórios vêm do Web Crypto (`shared/platform`); no iOS/Android isso ainda não existe e vai pedir o `expo-crypto` quando o app for para as lojas.
- **Sessão:** o estado (`carregando`, `anonimo` ou `autenticado`) fica num store mínimo da feature, e o client HTTP renova o access token no primeiro 401.
- **Credenciais:**

  | Plataforma  | Onde ficam                                                    | Efeito                             |
  | ----------- | ------------------------------------------------------------- | ---------------------------------- |
  | Web         | Só em memória (os guardrails proíbem token em `localStorage`) | Recarregar a página pede login     |
  | iOS/Android | Refresh token no `expo-secure-store`                          | A sessão é retomada ao abrir o app |

- **Guardas:** o layout de `(app)` manda quem não tem sessão para o login; o de `(auth)` manda quem já tem sessão para o app.

Usuários de teste do ambiente local: os do seed do infra-base (`docs/local.md`). Contas novas recebem o código de confirmação no log do cognito-local.

## Administração (`src/features/admin`)

| Rota        | Tela                                                                                                                               |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `/usuarios` | Lista paginada de usuários (UserRow da referência); tocar numa pessoa abre as ações: bloquear ou reativar, trocar o papel, excluir |

- **Quem vê:** o item "Usuários" do Perfil e a rota `/usuarios` só aparecem para admin, pelo papel do `/me` (`SomenteAdmin`). É só navegação: quem decide é o BFF, que responde 403 a quem não está no grupo `admin` do token.
- **Papel novo:** vale a partir do próximo login. Quem acabou de virar admin vê o item, mas a lista responde 403 até sair e entrar de novo, e a tela explica isso.
- **Regras:** a tela não oferece bloquear nem excluir a própria conta, nem ações em contas excluídas ou pendentes. O resto (último admin, transições) vem do users-service, e cada código de erro tem a sua mensagem.
- **Confirmação:** toda ação pede confirmação; bloquear e excluir com o botão vermelho. Depois de qualquer resposta, a lista e o próprio perfil são recarregados.

## Testes

```sh
npm test
```

Jest com `jest-expo`, Testing Library e MSW, que intercepta o `fetch` como um WireMock do front. Duas notas de configuração, explicadas no `jest.config.js`:

- **`EXPO_PUBLIC_USE_RN_FETCH=1`:** impede o setup do `jest-expo` de trocar o `fetch` global pelo stub do `expo/fetch`.
- **ESM do MSW 3:** o MSW 3 e parte das dependências dele são só-ESM e passam pelo Babel.

## Qualidade

```sh
npm run verify   # typecheck + lint + format:check + check:boundaries + testes
```

- **Pre-commit:** o hook do Husky roda o lint-staged, com ESLint e Prettier nos arquivos alterados.
- **Esteira:** workflow reutilizável `frontend.yml` do infra-base: em todo PR as verificações do `verify`, a checagem do client gerado e o build web; na `main`, também o deploy em dev (ver "Na AWS").
- **Fim de linha:** o `.gitattributes` força LF, inclusive no Windows, porque o Prettier exige.
