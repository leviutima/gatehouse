# Glossário do Gatehouse

Siglas e termos que aparecem no código, nos tokens e nas respostas HTTP do Gatehouse, com o que cada um significa e onde ele aparece na aplicação.

## Sumário

- [Protocolos e especificações](#protocolos-e-especificações)
- [Conceitos do Gatehouse](#conceitos-do-gatehouse)
- [O access token por dentro](#o-access-token-por-dentro)
- [JWK e JWKS: a chave pública publicada](#jwk-e-jwks-a-chave-pública-publicada)
- [Endpoint de token](#endpoint-de-token)
- [Autenticação nas requisições HTTP](#autenticação-nas-requisições-http)
- [Códigos de erro](#códigos-de-erro)
- [Criptografia](#criptografia)
- [Banco de dados e infraestrutura](#banco-de-dados-e-infraestrutura)
- [Ainda não implementado](#ainda-não-implementado)

---

## Protocolos e especificações

| Sigla | Nome | O que é |
|---|---|---|
| **IdP** | Identity Provider | Provedor de identidade: o sistema que autentica usuários e aplicações e emite tokens dizendo quem eles são. O Gatehouse é um IdP, no mesmo estilo do Keycloak. |
| **SSO** | Single Sign-On | Login único: o usuário entra uma vez no IdP e passa a acessar várias aplicações sem logar de novo em cada uma. |
| **OAuth 2.0** | — | Protocolo de **autorização** (RFC 6749). Define como uma aplicação obtém um *access token* para acessar recursos em nome de alguém ou dela mesma. |
| **OIDC** | OpenID Connect | Camada de **autenticação** sobre o OAuth 2.0. Acrescenta o `id_token`, que diz quem o usuário é. É por isso que as rotas ficam em `/protocol/openid-connect/`. |
| **RFC** | Request for Comments | Documento que define um padrão da internet. As RFCs citadas aqui são as especificações que o Gatehouse segue. |
| **JWT** | JSON Web Token | Token no formato `header.payload.assinatura`, cada parte em base64url (RFC 7519). Os access tokens do Gatehouse são JWTs. |
| **JWS** | JSON Web Signature | O mecanismo de assinatura usado pelo JWT (RFC 7515). Garante que ninguém alterou o conteúdo. Não é criptografado: qualquer um consegue ler o payload. |
| **JWK** | JSON Web Key | Uma chave criptográfica representada em JSON (RFC 7517). |
| **JWKS** | JSON Web Key Set | Um conjunto de JWKs, no formato `{ "keys": [...] }`. É o que o Gatehouse publica para que outros serviços consigam verificar os tokens. |
| **JWA** | JSON Web Algorithms | A especificação que dá nome aos algoritmos, como `ES256` (RFC 7518). |
| **OpenAPI** | — | Formato padrão para descrever uma API HTTP. O Gatehouse gera esse documento em `/docs-json`. |
| **Swagger UI** | — | A interface web que lê o documento OpenAPI e permite testar a API pelo navegador. Fica em `/docs` e só é servida fora de produção. |

### RFCs usadas

| RFC | Assunto | Onde aparece |
|---|---|---|
| 6749 | OAuth 2.0 | Endpoint `/token`, *grants* e códigos de erro |
| 6750 | Bearer Token | Cabeçalho `Authorization: Bearer ...` e o `WWW-Authenticate` de 401 |
| 7515 | JWS | Assinatura dos tokens |
| 7517 | JWK | Chaves publicadas no JWKS |
| 7518 | JWA | Algoritmo `ES256` |
| 7519 | JWT | Formato e claims dos tokens |
| 7617 | HTTP Basic | `client_secret_basic` |
| 9068 | Perfil JWT para access tokens | `typ: at+jwt` e as claims obrigatórias do access token |
| 9106 | Argon2 | Hash das senhas dos usuários |
| 9562 | UUID | IDs do banco, na versão 7 |

---

## Conceitos do Gatehouse

| Termo | O que é |
|---|---|
| **Realm** | Um espaço isolado de identidade. Cada realm tem seus próprios usuários, clients, chaves de assinatura e regras, como o tamanho mínimo de senha e a duração do token. Um realm não enxerga nada de outro. |
| **Realm `master`** | O realm criado automaticamente no primeiro boot, com o admin vindo das variáveis de ambiente. É dele que vai sair a administração dos demais realms. |
| **Client** | Uma aplicação registrada num realm, que pode pedir tokens: um site, um app mobile ou um serviço de backend. |
| **`client_id`** | O identificador público do client dentro do realm (por exemplo, `billing`). É único por realm, não no sistema todo. |
| **`client_secret`** | A senha do client. Só clients confidenciais têm uma. É gerada pelo Gatehouse, mostrada uma única vez e guardada apenas como hash. |
| **Client confidencial** (`CONFIDENTIAL`) | Um client que roda num servidor e consegue guardar um segredo, como um backend. Tem `client_secret`. |
| **Client público** (`PUBLIC`) | Um client que roda na máquina do usuário, como uma SPA ou um app mobile, e por isso não consegue guardar segredo. Não tem `client_secret` e não pode usar `client_credentials`. |
| **Grant** / **grant type** | O "jeito" de obter um token. Cada client só pode usar os grants permitidos no cadastro dele. |
| **Redirect URI** | Endereço para onde o Gatehouse devolve o usuário depois do login. A comparação é exata, string por string, e a URI precisa ser absoluta, sem `#fragmento` e em `https` (exceto em `localhost`). |
| **Issuer** | A URL que identifica quem emitiu o token: `GATEHOUSE_ISSUER/realms/{realm}`. Cada realm é um issuer diferente. |
| **Access token** | O token que um client apresenta para acessar uma API. No Gatehouse, um JWT assinado que vale por `accessTokenLifespan` segundos (300 por padrão). |
| **Principal** | Quem está fazendo a requisição, já verificado: `subject`, `realm`, `clientId` e `scopes`. O guard monta esse objeto a partir do token e os controllers o recebem com `@CurrentUser()`. |
| **Chave de assinatura** | O par de chaves ES256 de um realm. A privada assina os tokens; a pública é publicada no JWKS. |
| **`ACTIVE`** | A chave que assina os tokens novos. Cada realm tem exatamente uma, garantido por um índice único parcial no banco. |
| **`PASSIVE`** | Uma chave que não assina mais, mas continua publicada e aceita, para que tokens emitidos antes de uma rotação de chave continuem válidos até expirar. |
| **Rotação de chave** | Trocar a chave ativa por uma nova, mantendo a antiga como passiva por um tempo. |

---

## O access token por dentro

Um access token do Gatehouse é um JWT com três partes separadas por ponto. Decodificado, fica assim:

**Header**

```json
{ "alg": "ES256", "kid": "01a17ea9-1ac1-712f-9a70-feaa2e6f6052", "typ": "at+jwt" }
```

**Payload (claims)**

```json
{
  "iss": "http://localhost:9000/realms/master",
  "sub": "01a17f52-b15d-77c0-9b25-939f173df435",
  "aud": "http://localhost:9000/realms/master",
  "client_id": "billing",
  "iat": 1793137488,
  "exp": 1793137788,
  "jti": "8qoXDQXZimXA_jwgE9MolWq0I0BROB6klL6IxPd_07I"
}
```

**Assinatura**: bytes ES256 calculados sobre `header.payload` com a chave privada ativa do realm.

### Campos do header

| Campo | Nome | Significado no Gatehouse |
|---|---|---|
| **`alg`** | Algorithm | Algoritmo da assinatura. Sempre `ES256`. Quem verifica fixa o algoritmo esperado e nunca confia no `alg` do token, o que barra ataques como `alg: none`. |
| **`kid`** | Key ID | Qual chave assinou o token. É o `id` da chave no banco e aparece igual no JWKS, para quem verifica achar a chave pública certa. |
| **`typ`** | Type | Tipo do token. `at+jwt` significa "access token em JWT" (RFC 9068). Serve para impedir que outro tipo de JWT, como um futuro `id_token`, seja aceito como access token. |

### Claims do payload

*Claim* é cada campo do payload, uma afirmação que o emissor faz sobre o token.

| Claim | Nome | Significado no Gatehouse |
|---|---|---|
| **`iss`** | Issuer | Quem emitiu: a URL do realm. O verificador usa essa claim para descobrir o realm e só aceita o valor exato que o Gatehouse geraria. |
| **`sub`** | Subject | De quem é o token. No `client_credentials` é o `id` interno (UUID) do client. Quando houver login de usuário, será o `id` do usuário. |
| **`aud`** | Audience | Para quem o token foi feito. Por enquanto é o próprio issuer do realm. Quando as APIs forem cadastradas, passa a ser a API de destino. |
| **`client_id`** | Client ID | Qual client pediu o token (RFC 9068). |
| **`iat`** | Issued At | Quando o token foi emitido, em segundos desde 1970 (Unix time). |
| **`exp`** | Expiration | Quando o token expira, também em Unix time. É sempre `iat + accessTokenLifespan` do realm e é obrigatória: token sem `exp` é rejeitado. |
| **`jti`** | JWT ID | Identificador único do token: 32 bytes aleatórios em base64url. Vai servir para revogação e para detectar reuso. |

---

## JWK e JWKS: a chave pública publicada

O JWKS de um realm fica em `GET /realms/{realm}/protocol/openid-connect/certs`:

```json
{
  "keys": [
    {
      "kty": "EC",
      "crv": "P-256",
      "x": "CmpetP7LSM2CLn0T1zK5P6qLYJ112kcIiTxcdlSEECI",
      "y": "aLQMpp_-fJXIJMZsphu9vkjz3GiUjv7n7k_WbTuoPBw",
      "kid": "01a17ea9-1ac1-712f-9a70-feaa2e6f6052",
      "alg": "ES256",
      "use": "sig"
    }
  ]
}
```

| Campo | Nome | Significado |
|---|---|---|
| **`kty`** | Key Type | Família da chave. `EC` = curva elíptica. |
| **`crv`** | Curve | Qual curva elíptica. `P-256`. |
| **`x`**, **`y`** | Coordenadas | As coordenadas do ponto da curva que formam a chave pública, em base64url. |
| **`kid`** | Key ID | O mesmo `kid` que aparece no header dos tokens assinados com essa chave. |
| **`alg`** | Algorithm | O algoritmo com que essa chave deve ser usada: `ES256`. |
| **`use`** | Public Key Use | Para que serve a chave. `sig` = assinatura. |
| **`d`** | Private key | A parte **privada** de uma JWK de curva elíptica. **Nunca é publicada**: a entidade `SigningKey` monta o JWK publicado campo por campo, então `d` não tem como vazar. |

O header `Cache-Control: public, max-age=300` desse endpoint permite que os serviços guardem o JWKS por 5 minutos, em vez de buscá-lo a cada token.

---

## Endpoint de token

`POST /realms/{realm}/protocol/openid-connect/token`

| Termo | Significado |
|---|---|
| **`application/x-www-form-urlencoded`** | O formato de corpo exigido pelo OAuth, o mesmo de um formulário HTML (`a=1&b=2`). JSON é rejeitado com `invalid_request`. |
| **`grant_type`** | Qual grant está sendo usado. Hoje só `client_credentials` é suportado. |
| **`client_credentials`** | Grant de máquina para máquina: o client se autentica com o próprio `client_id` e `client_secret` e recebe um token em nome dele mesmo, sem usuário envolvido. Exclusivo de clients confidenciais. |
| **`authorization_code`** | Grant do login de usuário: o navegador vai ao Gatehouse, o usuário faz login e o client troca o código recebido por tokens. Já pode ser cadastrado num client, mas o fluxo ainda não existe. |
| **`refresh_token`** | Grant que troca um *refresh token* por um access token novo, sem novo login. Exige `authorization_code` no mesmo client. Também ainda não implementado. |
| **`client_secret_basic`** | Autenticação do client pelo cabeçalho `Authorization: Basic base64(client_id:client_secret)` (RFC 7617). É o método preferido. |
| **`client_secret_post`** | Autenticação do client enviando `client_id` e `client_secret` no corpo do formulário. Usar os dois métodos ao mesmo tempo dá `invalid_request`. |
| **`access_token`** | O campo da resposta com o JWT. |
| **`token_type`** | Sempre `Bearer`: quem apresenta o token tem o acesso. |
| **`expires_in`** | Em quantos segundos o token expira. |
| **`Cache-Control: no-store`** / **`Pragma: no-cache`** | Cabeçalhos que proíbem navegadores e proxies de guardar a resposta, que contém um token. `Pragma` é a versão antiga, mantida para clientes HTTP/1.0. |

---

## Autenticação nas requisições HTTP

| Termo | Significado |
|---|---|
| **`Authorization`** | O cabeçalho HTTP que carrega a credencial da requisição. |
| **Basic** | Esquema em que a credencial é `usuário:senha` em base64. O Gatehouse o usa só para autenticar clients no `/token`. |
| **Bearer** | Esquema em que a credencial é um token: `Authorization: Bearer <access_token>`. As rotas protegidas exigem um access token emitido pelo próprio Gatehouse. |
| **`WWW-Authenticate`** | Cabeçalho das respostas 401 que diz ao cliente como se autenticar. `Basic realm="gatehouse"` no `/token`; `Bearer` quando falta o token; `Bearer error="invalid_token"` quando o token é inválido ou expirou. |
| **Guard** | O componente do Nest que roda antes de cada rota. O `AccessTokenGuard` deixa passar as rotas marcadas com `@Public()` e exige um Bearer válido em todas as outras. |
| **`@Public()`** | Decorator que marca uma rota ou um controller inteiro como acessível sem token, como o JWKS e o `/token`. |

---

## Códigos de erro

### Do OAuth (endpoint `/token`)

Respondem no formato `{ "error": "...", "error_description": "..." }` da RFC 6749 §5.2.

| Código | HTTP | Quando acontece |
|---|---|---|
| **`invalid_request`** | 400 | Requisição malformada: corpo que não é formulário, parâmetro repetido ou faltando, ou os dois métodos de autenticação ao mesmo tempo. |
| **`invalid_client`** | 401 | A autenticação do client falhou. Client inexistente, secret errado, client desabilitado e client público recebem **a mesma** resposta, para não revelar quais `client_id` existem. |
| **`unauthorized_client`** | 400 | O client se autenticou, mas não tem permissão para usar esse grant. |
| **`unsupported_grant_type`** | 400 | O Gatehouse não suporta o `grant_type` pedido. |

### Do Bearer (rotas protegidas)

| Código | HTTP | Quando acontece |
|---|---|---|
| **`invalid_token`** | 401 | O token está expirado, malformado, assinado por uma chave desconhecida, foi alterado ou pertence a um realm desabilitado. |

---

## Criptografia

| Sigla / termo | O que é | Onde o Gatehouse usa |
|---|---|---|
| **ES256** | ECDSA com a curva P-256 e o hash SHA-256 | Assinatura de todos os tokens |
| **ECDSA** | Elliptic Curve Digital Signature Algorithm | O algoritmo de assinatura por trás do ES256. Gera assinaturas curtas com chaves pequenas. |
| **EC** | Elliptic Curve | Família de criptografia baseada em curvas elípticas |
| **P-256** | Curva elíptica padronizada pelo NIST (também chamada secp256r1) | A curva das chaves de assinatura |
| **NIST** | National Institute of Standards and Technology | Órgão americano que padroniza algoritmos criptográficos |
| **SHA-256** | Secure Hash Algorithm, saída de 256 bits | Parte do ES256 e hash dos `client_secret`, guardados como `sha256$<base64url>` |
| **Hash** | Função de mão única: dá para calcular, mas não para desfazer | Senhas e secrets nunca são guardados, só o hash deles |
| **Argon2id** | Algoritmo de hash de senha resistente a força bruta, inclusive em GPU (RFC 9106) | Senhas dos usuários. Diferente do SHA-256, é lento de propósito. |
| **PHC string** | Formato textual de hash que carrega algoritmo, parâmetros e salt (`$argon2id$v=19$m=...`) | Como o hash da senha é guardado |
| **Salt** | Valor aleatório misturado em cada hash | Faz a mesma senha gerar hashes diferentes |
| **AES-256-GCM** | Advanced Encryption Standard, chave de 256 bits, modo Galois/Counter | Criptografa as chaves privadas de assinatura guardadas no banco |
| **GCM** | Galois/Counter Mode | Modo do AES que, além de cifrar, autentica o conteúdo: qualquer alteração faz a decifragem falhar |
| **IV** | Initialization Vector | Valor aleatório de 12 bytes, novo a cada criptografia, para o mesmo conteúdo nunca gerar o mesmo resultado |
| **Auth tag** | Authentication tag | Os 16 bytes que o GCM gera para detectar alteração. O formato salvo é `v1.<iv>.<tag>.<ciphertext>`. |
| **Ciphertext** | Texto cifrado | O conteúdo já criptografado |
| **KEK** | Key Encryption Key | Uma chave que serve para criptografar outras chaves. É a `GATEHOUSE_KEY_ENCRYPTION_KEY`; perdê-la torna ilegíveis todas as chaves de assinatura guardadas. |
| **PKCS#8** | Public-Key Cryptography Standards #8 | Formato padrão de chave privada. É como a chave privada fica antes de ser criptografada. |
| **PEM** | Privacy-Enhanced Mail | O formato texto `-----BEGIN PRIVATE KEY-----` que envolve a chave PKCS#8 |
| **base64** | Codificação de bytes em texto | Formato da `GATEHOUSE_KEY_ENCRYPTION_KEY` |
| **base64url** | Variante do base64 segura para URLs: troca `+/` por `-_` e não usa `=` (RFC 4648 §5) | As partes do JWT, as coordenadas do JWK, os secrets e o `jti` |
| **`timingSafeEqual`** | Comparação que leva o mesmo tempo dando certo ou errado | Na verificação do `client_secret`, para o tempo de resposta não revelar quantos caracteres estão certos |

---

## Banco de dados e infraestrutura

| Sigla / termo | O que é |
|---|---|
| **UUID** | Universally Unique Identifier: o formato dos IDs de todas as tabelas. |
| **UUIDv7** | Versão de UUID que começa pelo horário de criação, então os IDs saem em ordem e ficam mais eficientes em índices (RFC 9562). |
| **citext** | Tipo de texto do Postgres que compara sem diferenciar maiúsculas de minúsculas. Usado em `username` e `email`, para que `Admin` e `admin` sejam o mesmo usuário. |
| **Índice único parcial** | Índice que só vale para parte das linhas. O `signing_keys_one_active_per_realm` garante no banco no máximo uma chave `ACTIVE` por realm. |
| **Migration** | Arquivo SQL versionado que leva o banco de uma versão do schema para a próxima. |
| **ORM** | Object-Relational Mapping: a camada que traduz entre tabelas e objetos. No Gatehouse é o Prisma. |
| **ESM** | ECMAScript Modules: o sistema de módulos `import`/`export` do JavaScript, usado em todo o backend. |
| **E2E** | End-to-end: testes que sobem a aplicação de verdade e falam com o banco. Rodam no banco `gatehouse_test`. |
| **CI** | Continuous Integration: o GitHub Actions, que roda lint, build e testes a cada push e pull request. |
| **nginx** | Servidor web que entrega os arquivos estáticos do frontend no Docker. |

---

## Ainda não implementado

Termos que já aparecem em decisões ou no modelo de dados, mas cujo fluxo ainda não existe.

| Sigla / termo | O que é |
|---|---|
| **PKCE** | Proof Key for Code Exchange (RFC 7636), pronuncia-se "pixy". Proteção do `authorization_code`: o client gera um segredo aleatório (`code_verifier`), envia só o hash dele (`code_challenge`) no início do login e o segredo original na troca do código. Quem roubar o código não consegue trocá-lo. Vai ser obrigatório para todos os clients. |
| **S256** | O método de PKCE em que o `code_challenge` é o SHA-256 do `code_verifier`. O único que o Gatehouse vai aceitar. |
| **`id_token`** | O token do OIDC que diz quem é o usuário que fez login. Será emitido junto com o access token no `authorization_code`. |
| **Refresh token** | Token de longa duração usado para obter novos access tokens sem novo login. Revogável. |
| **`scope`** | Lista de permissões pedidas pelo client (por exemplo, `openid profile`). Hoje o parâmetro é aceito e ignorado, e o `Principal` sai com `scopes: []`. |
| **Revogação** | Invalidar um token antes de ele expirar. Hoje um access token vale até o `exp`. |
