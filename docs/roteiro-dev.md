# Roteiro da fatia 1 em dev (tarefa 6.6)

O mesmo roteiro da validação local (tarefa 5.8), agora contra a AWS: site no Amplify Hosting, Cognito de verdade (código por e-mail, login SRP), API Gateway, BFF e users-service em `dev`.

## Pré-requisitos

1. Infra-base com as stacks `gestor-gastos-dev-web` e `gestor-gastos-dev-api` implantadas (o CORS libera o site), e users-service e BFF implantados pela esteira (tarefa 6.5).
2. Este repositório com o merge na `main`: a esteira faz o `expo export -p web` com as variáveis lidas do SSM e publica no Amplify. A URL aparece no resumo do job "Deploy em dev" e no SSM:

   ```sh
   aws ssm get-parameter --name /gestor-gastos/dev/frontend/url --region us-east-1 --query Parameter.Value --output text
   # https://main.<app-id>.amplifyapp.com
   ```

3. Primeiro admin criado pelo CLI, como em `docs/primeiro-admin.md` do infra-base (opcional para este roteiro, necessário para o passo 10).

Use um navegador comum (de preferência uma janela anônima, para começar sem nada em cache).

## Passos

| #   | Ação                                                                      | Esperado                                                                                                |
| --- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | Abrir a URL do site                                                       | Tela de login. Recarregar em `/login` ou abrir direto `<url>/cadastro` também funciona (rewrite de SPA) |
| 2   | Cadastro com **e-mail real**, nome e senha fraca (ex.: `abc`)             | A regra de senha não atendida aparece; nada é enviado                                                   |
| 3   | Cadastro com senha válida (8+, maiúscula, minúscula e número)             | Vai para "Confirmar e-mail"                                                                             |
| 4   | Abrir o e-mail "Gestor de Gastos: código de verificação" (confira o spam) | Código de 6 números                                                                                     |
| 5   | Digitar um código errado                                                  | "Código incorreto"                                                                                      |
| 6   | Digitar o código certo                                                    | Volta para o login com a conta confirmada                                                               |
| 7   | Login com senha errada                                                    | "E-mail ou senha incorretos." (sem dizer se o e-mail existe)                                            |
| 8   | Login com a senha certa                                                   | Abre o **Perfil**: nome, e-mail, papel **cliente**, data de criação                                     |
| 9   | "Sair"                                                                    | Volta para o login; voltar no navegador não reabre o Perfil                                             |
| 10  | (Admin) login com a conta criada pelo CLI                                 | Perfil com papel **admin**                                                                              |
| 11  | Recarregar a página logado                                                | Pede login de novo (na web o token fica só em memória, decisão da 5.7)                                  |

## Onde olhar se algo falhar

- **Erro de rede no login ou no Perfil:** DevTools → Network. Um `OPTIONS` sem `access-control-allow-origin` é CORS: confira se a stack api foi implantada depois da web (`infra/README.md` do infra-base, "Só a web e o CORS").
- **Perfil com erro 5xx:** logs do BFF e do users-service no CloudWatch (`/aws/lambda/gestor-gastos-dev-*`).
- **Código não chega:** o Cognito sem SES envia ~50 e-mails/dia. Use "Reenviar código" uma vez e confira o spam.
- **Papel cliente na conta admin:** o grupo `admin` foi adicionado depois do primeiro login. Veja "Se o perfil nasceu como cliente" no `docs/primeiro-admin.md` do infra-base.

## Antes do merge: o mesmo roteiro no localhost contra dev

O login SRP não roda no cognito-local. Para validá-lo antes do merge, aponte o `expo start --web` para a AWS (o CORS da API já libera `http://localhost:8081`):

```sh
npm run env:dev   # lê /gestor-gastos/dev/* do SSM (AWS CLI, só leitura) e grava o .env.local
npm run web       # http://localhost:8081, falando com o Cognito e a API de dev
npm run env:local # volta para o ambiente local
```
