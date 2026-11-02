# Refactor do console para Feature-Sliced Design

## Objetivo

Reorganizar todo o `frontend/` em Feature-Sliced Design (FSD) e adotar axios, zod e TanStack Query, sem mudar o comportamento nem o visual do console.

O React Hook Form é instalado junto com `@hookform/resolvers`, mas fica sem uso até a primeira tela com formulário. O console não tem formulários hoje, porque a tela de login é renderizada pelo backend.

## Fora do escopo

- Telas, formulários ou funcionalidades novas.
- `react-router`: continuam só `/` e `/callback`, e a sessão trata o callback.
- Testes de componente e Testing Library.
- Mudanças no backend, no `Dockerfile` ou no `compose.yaml`.

## Estrutura

```
src/
  app/       App, setup (QueryClient, sessão, providers), styles
  pages/     realms/
  widgets/   app-header/, realms-table/
  features/  sign-out/
  entities/  session/ (AuthSession, useSession, interceptors, config do client admin-console)
             realm/   (schema zod, API, useRealmsQuery)
  shared/    api/ (instâncias axios)
             config/ (env validado com zod)
             lib/oidc/ (pkce, transação, client, config)
```

| Código atual | Destino |
|---|---|
| `auth/pkce.ts` | `shared/lib/oidc` |
| `auth/login-transaction.ts` | `shared/lib/oidc` |
| `auth/oidc-client.ts` | `shared/lib/oidc` |
| `auth/oidc-config.ts` | Tipo `OidcConfig` em `shared/lib/oidc`; `consoleOidcConfig` em `entities/session` |
| `auth/testing/*` | `shared/lib/oidc/testing` |
| `auth/auth-session.ts` | `entities/session` |
| `api/admin-api.ts` | `entities/realm` (request) e `entities/session` (interceptors) |
| `realms/RealmsPage.tsx` | `widgets/realms-table` e `pages/realms` |
| Cabeçalho em `App.tsx` | `widgets/app-header` |
| Botão de sair em `App.tsx` | `features/sign-out` |
| `App.tsx`, `main.tsx`, `index.css` | `app` (`main.tsx` continua em `src/` e só inicia o `app`) |

### Regras do FSD

- Cada slice expõe um `index.ts`, e o restante do código só importa por ele.
- Uma camada só importa das camadas abaixo dela.
- O alias `@/` aponta para `src/`, configurado no Vite e no TypeScript.
- Nos segmentos `api`, `config`, `model` e `lib`, cada unidade tem uma pasta própria com o código e a spec, como `entities/session/api/session-interceptors/`. Essas pastas não têm `index.ts`. O `testing/` fica no nível do segmento porque é compartilhado, e o `ui` continua sem subpastas até ter testes.
- O Steiger, linter oficial do FSD, entra no `npm run lint`, e assim também no CI, com duas exceções:
  - `fsd/insignificant-slice` fica desligada, porque com poucas telas cada slice tem um único consumidor e a regra pediria para fundir tudo. Vale reavaliar quando o console crescer.
  - `fsd/no-public-api-sidestep` fica desligada só em `*.spec.ts` e `testing/`, porque helpers de teste não fazem parte da API pública.
- O Steiger detecta `import` proibido, mas não `export … from`. Reexports entre camadas dependem de revisão.

## Bibliotecas

### axios

- `shared/api` expõe uma instância para a API admin, sem conhecer a sessão.
- `shared/lib/oidc` usa uma instância própria, sem interceptors, para discovery e `/token`. Assim, renovar o token nunca passa pelo interceptor que renova o token.
- `entities/session` exporta a função que instala os interceptors, e o `app` a chama na inicialização.
- O retry após 401 sai do `AdminApi` e vai para o interceptor de resposta. O refresh único entre chamadas simultâneas continua na `AuthSession`.

### zod

Valida tudo que vem de fora:

- variáveis de ambiente;
- documento de discovery;
- resposta do `/token`;
- claims do id token;
- transação do `sessionStorage`;
- lista de realms.

### TanStack Query

- A lista de realms vira `useRealmsQuery`, substituindo o `useEffect` e o estado manual.
- No `QueryClient`, `retry` e `refetchOnWindowFocus` ficam desligados, para manter o comportamento atual. O botão "Try again" chama `refetch`.

### Tailwind

- Tailwind v4 pelo plugin do Vite, sem arquivo de configuração. As cores ficam no `@theme` de `app/styles/index.css`, com `light-dark()` para seguir o tema do sistema.
- O reset do Tailwind foi ajustado para manter a aparência anterior: o `line-height` padrão continua `normal`, e os `max-width` somam o padding por causa do `border-box`.
- O botão fica em `shared/ui`, para as classes não se repetirem em cada tela.

## Fluxo de dados

1. `main.tsx` inicia o `app`, que cria a `AuthSession` e instala os interceptors. Os providers entregam a sessão pelo hook `useSession` e o `QueryClient` pelo TanStack.
2. O `App` chama `session.start()`, que continua memorizado para o StrictMode não trocar o code duas vezes.
3. `pages/realms` usa `widgets/realms-table`, que chama `useRealmsQuery`. A query usa a instância axios e valida a resposta com zod.
4. Em cada request, o interceptor adiciona o token válido. Se vier 401, renova uma vez e repete.

## Erros

| Situação | O que acontece |
|---|---|
| Sessão expirada | O interceptor redireciona para o login, e a tela continua em "carregando" até a página trocar |
| 403 | Mensagem de falta de permissão, verificando o status do `AxiosError` |
| Rede, 5xx ou zod inválido | Mensagem de erro com "Try again" |
| Falha de rede no refresh | A sessão continua viva |
| Erro OAuth no `/token` | Vira `OidcError`, com o mesmo código de hoje |
| Discovery, token ou claims fora do formato | Tela "Could not sign in" |
| Transação malformada no `sessionStorage` | É descartada e o callback é recusado como `state_mismatch`, como hoje |

## Testes

- As specs atuais mudam de lugar junto com o código. As que usam `fetch` falso passam a usar um adapter falso do axios.
- `admin-api.spec.ts` vira a spec do interceptor, com os mesmos casos.
- Cada schema zod ganha casos de resposta fora do formato.
- Ao final, os cenários são repetidos no navegador contra o backend real, em banco descartável: login, reload sem senha, logout, callback forjado, 401 forçado e 403.

## Critérios de aceite

- `npm run lint` (com Steiger), `npm test` e `npm run build` passam.
- Os seis cenários no navegador têm o mesmo resultado do PR #21, sem erros novos no console.
- A aparência do console não muda.
- O build da imagem Docker continua funcionando.

## Entrega

- Branch `refactor/frontend-fsd`, criada a partir de `feat/login-session`. O PR é aberto depois do merge do PR #21.
- Um commit por arquivo, com `git mv` para preservar o histórico. Arquivos que só funcionam juntos ficam no mesmo commit.
- `tsc` e testes conferidos em cada commit.
