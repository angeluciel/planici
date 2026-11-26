---
id: SPEC-0009
title: Endereço IP do cliente nas requisições à API
status: Approved # Draft | Review | Approved | Implemented | Superseded
plan_status: Approved # Draft | Approved
version: 1.4
owner: Joao Izidoro
satisfies: [RNF-10, RNF-11, RNF-12]
depends_on: []
phase: MVP
ticket: -
---

# SPEC-0009 — Endereço IP do cliente nas requisições à API

## 1. Purpose

The RFC ties several protections and records to the address of the person's device: the API rate limit is "100
req/min por IP" (RNF-10, RFC §2), login protection combines a limit "por conta **e** por IP" (RFC §6, "Proteção
contra força bruta e credential stuffing"), the MVP audit records "login ... com timestamp, usuário e IP" (RNF-11), and
the acceptance of the Terms and Privacy Policy is recorded with the "endereço IP, quando aplicável" (RFC §6, "Aceite
Contratual, Consentimento e Transparência", which complements RNF-12).

As built, none of these see the person's address. Browsers only talk to the web app; the web app calls the API on
the browser's behalf and does not pass the address on, so the API sees the web app's own address on every request
(verified 2026-11-26: in production the web app and the API run side by side and the API sees `127.0.0.1`). Every
person therefore shares one rate-limit budget, and every stored address is the web app's. This spec makes the API
see the address of the device that made the request, and makes that address impossible to forge from the browser.

This spec covers the address only. It adds no audit log (RNF-11's log of data changes does not exist yet, §2) and
changes no limit values (§9 Q1).

## 2. Scope

**In scope**
- How the platform determines the client address of a browser request, through the production entry chain
  (Cloudflare → load balancer → web app), the only one in use.
- Passing that address from the web app to the API on every API call made for a browser request.
- Which callers the API accepts a stated address from.
- The places that already store an address, which now store the client address: the acceptance records (terms,
  privacy, marketing), session (refresh token) records, failed-login records, e-mail code requests and password
  reset requests.
- The per-address rate limits, which now count per client address.

**Out of scope**
- The rate-limit values themselves (global and per route): §9 Q1.
- An audit log of data changes and deletions (RNF-11 beyond login): a future spec; it must use this client address.
- Restricting who may connect to the load balancer (infrastructure outside the repository): §9 Q2.
- Rewriting addresses already stored (they are the web app's address and cannot be recovered): §9 Q8.
- Rate limits per tenant slug for the public booking link (RFC §6, RF-23): MVP, deferred to the public booking link
  spec.
- A self-hosted chain with a reverse proxy in front of the web app: not used anywhere; the production chain is the
  only one (owner, 2026-11-26).

## 3. Domain rules

- **R1 — One client address per request.** Each browser request has exactly one client address: the address of the
  device that opened the connection to the platform's first hop. The first hop is Cloudflare in the normal case, or
  the entry point (the load balancer) when Cloudflare is bypassed (R3) (RNF-10, RNF-11; RFC §6 aceite).
- **R2 — Only the platform's own hops may state it.** An address is believed only when a hop of the platform's
  entry chain states it: the CDN (Cloudflare) when the connection to the entry point came from one of the CDN's
  published addresses, or the entry point itself (the load balancer) for the address that connected
  to it, and only on a request the web app received from the entry point (R10). Any address the browser itself puts
  in a request (for example in `X-Forwarded-For`, `X-Real-IP` or `CF-Connecting-IP`) is ignored.
  `assumption` derived from RNF-10: a limit per IP that the requester can choose is no limit (RFC §6 already notes
  that a per-IP limit alone is easy to get around).
- **R3 — Bypassing the CDN gives the connecting address.** When a request reaches the entry point without passing
  through the CDN, the client address is the address that connected to the entry point, whatever the request's
  headers say. `assumption` (follows from R2).
- **R4 — The web app passes the address on.** Every call the web app makes to the API on behalf of a browser request
  carries that request's client address, and only that one. `assumption` (needed for R1 to reach the API).
- **R5 — The API believes only the web app.** The API takes a stated client address only from the web app. For any
  other caller it uses the address that connected to it. `assumption`: the API is not reachable from outside the
  deployment today, but must not depend on that. Who counts as the web app: owner decision, 2026-11-26 (§9 Q6).
- **R6 — Rate limits count per client address.** Every per-address limit (the global one and each route's override)
  counts requests per client address (RNF-10; RFC §6 "limite por conta e por IP"). The per-account lockout stays
  independent of the address, as built (RFC §6 "independentemente do IP de origem").
- **R7 — Stored addresses are client addresses.** Wherever the platform stores the address of a request, it stores
  the client address of R1: acceptance records (RFC §6 aceite, RNF-12), session records issued at login, registration
  and refresh (RNF-11 "registro de login ... IP"), failed-login records, e-mail code requests and password reset
  requests.
- **R8 — Stored as reported.** The address is stored as IPv4 or IPv6 text, without a port. An IPv4 address that
  arrives in its IPv6-mapped form (`::ffff:203.0.113.7`) is stored in IPv4 form (`203.0.113.7`). Any other IPv6
  address, the loopback `::1` included, is stored as it arrives. `assumption` (§9 Q5).
- **R9 — Never shown back.** The client address appears in no response to a browser and in no other tenant's data.
  Unchanged from today; stated so the change does not add an exposure. `assumption` (RFC §6, data minimisation).
- **R10 — The web app believes only the entry point.** The web app takes the statements of R2 only on a connection
  that came from the platform's entry point. Any other connection to the web app (local development, or someone
  reaching the web app around the entry point) has, as its client address, the address that connected to the web
  app, whatever its headers say. `assumption` (follows from R2). How the entry point is recognized: owner decision,
  2026-11-26 (§9 Q10).

## 4. Behavior

### 4.1 Through the CDN (the normal case)

1. A person's device (say `203.0.113.7`) requests `joaoizidoro.com`. Cloudflare receives it and states the device
   address to the next hop.
2. The load balancer receives the request from a Cloudflare address and records the address that connected to it.
3. The web app determines the client address by R2 and R10: the request came to it from the entry point, and the
   entry point's connection came from Cloudflare, so the client address is the one Cloudflare stated, `203.0.113.7`.
4. Each API call the web app makes for this request carries `203.0.113.7` (R4).
5. The API, called by the web app, takes `203.0.113.7` as the request's address (R5): rate limits count against it
   (R6) and any record the request stores holds it (R7).

### 4.2 The browser tries to choose its own address

The device sends headers such as `X-Forwarded-For: 198.51.100.66` or `X-Real-IP: 198.51.100.66`. Cloudflare and the
entry point keep or extend them, but by R2 only the hops' own statements count: the client address is still
`203.0.113.7`. Changing those headers on every request does not move the device to a fresh rate-limit budget.

### 4.3 Someone connects to the load balancer directly

A request reaches the load balancer from `198.51.100.20`, which is not a Cloudflare address, carrying
`CF-Connecting-IP: 203.0.113.99`. By R3 the client address is `198.51.100.20`; the stated `203.0.113.99` is ignored.

### 4.4 Connections that skip the entry point

When the web app is reached without going through the entry point, the client address is the address that connected
to the web app, whatever the request's headers say (R10). In local development, with no entry point in front, that is
the developer's own address. A request that reaches the web app directly from `198.51.100.40` carrying
`X-Forwarded-For: 203.0.113.97, 173.245.48.10` and `CF-Connecting-IP: 203.0.113.97` has the client address
`198.51.100.40`.

### 4.5 A caller other than the web app

A request reaching the API from anything other than the web app has, as its address, the address that connected to
the API, even if it states another one (R5).

## 5. Permissions and tenant isolation

| Action | Unauthenticated | Member | Owner | Other tenant |
| --- | --- | --- | --- | --- |
| Client address determined and passed on | Yes (every request) | Yes | Yes | n/a: no tenant data involved |
| Client address returned in a response | Never (R9) | Never | Never | Never |

The address is a property of the request, not of a tenant; no tenant can read another's records through it.

## 6. Errors

No new error keys or statuses. A request over a per-address limit keeps today's answer: `429` with
`{ "error": "code.rate-limited" }` and a `Retry-After` header, passed through by the web app.

| Situation | Status | `error` key | `field` |
| --- | --- | --- | --- |
| Client address over a per-address limit (R6) | 429 | `code.rate-limited` | — |

## 7. Contract impact

No change to any request or response body in the shared contracts. The calls from the web app to the API gain the
client address as request metadata (how it is carried is decided in the plan). Breaking: no. Consumers: the web app
only; browsers see no difference.

## 8. UI states

—

## 9. Open questions

| # | Question | Proposed answer | Blocks |
| --- | --- | --- | --- |
| 1 | RNF-10 sets the rate limit at "100 req/min por IP"; `docs/architecture/api-convention.md` and the code use 60 per 60 seconds globally, with lower per-route limits (login 10, registration 5, availability 20). Which is right? | Keep the current values in this spec (it only fixes what is counted) and align the RFC or the convention in a separate change, once the owner picks. | No |
| 2 | The load balancer accepts connections from any address, so the CDN can be bypassed (§4.3). R3 keeps the address honest, but the bypass skips Cloudflare's protections. Restrict the load balancer to Cloudflare's addresses? | Yes: restrict its security group to Cloudflare's published ranges. Infrastructure change, applied by the owner outside the repository. | No |
| 3 | ~~R2 depends on Cloudflare's published address ranges. How are they kept current?~~ | **Decided (owner, 2026-11-26, with the plan):** A fixed list kept in the code (§11 P-6), taken from Cloudflare's published list (cloudflare.com/ips), reviewed when Cloudflare announces a change. No fetch at start-up (no network dependency). Changing the list needs a release. | — |
| 4 | RFC §5.5 describes the MVP deploy as AWS Amplify (web) and AWS Lambda (API). Production actually runs Cloudflare → load balancer → one container task with web and API side by side (verified 2026-11-26). | This spec states behavior independent of hosting, and is written against the actual chain. Update RFC §5.5 to the actual topology (owner). | No |
| 5 | Cloudflare may report IPv6 addresses. Limit per full IPv6 address, or per network prefix (a device can rotate addresses within its /64)? | Per address as reported (R8) for the MVP; revisit if abuse shows up. | No |
| 6 | ~~Which callers count as "the web app" for R5? In production the web app reaches the API on the same host; self-hosted, over a private container network that the reverse proxy shares.~~ | **Decided (owner, 2026-11-26):** The web app alone: the same host only, which is also the default. The self-hosted part of this answer was dropped in 1.3, because no self-hosted chain is used. | — |
| 7 | When the entry chain gives no usable address (for example a malformed header from a hop), what is the client address? | The address that connected to the web app, as in §4.4. The request is not refused. | No |
| 8 | Records stored before this change hold the web app's address (`127.0.0.1` in production). Rewrite them? | No: the real addresses cannot be recovered. Leave them; note the cut-over date in the changelog when implemented. | No |
| 9 | RNF-11 also asks for an audit of data changes and deletions with the IP; no such log exists. | Out of scope (§2). The future audit spec reuses this client address. | No |
| 10 | ~~How does the web app recognize a connection from the entry point (R10)? In production the load balancer connects from addresses inside the deployment's private network, and they change over time; self-hosted, the reverse proxy connects over the container network.~~ | **Decided (owner, 2026-11-26):** Address ranges set by configuration: the load balancer's private subnets. With nothing configured, no connection counts as coming from the entry point (§4.4). The self-hosted part of this answer was dropped in 1.3. | — |

## 10. Acceptance criteria

The addresses below come from documentation ranges (`203.0.113.0/24`, `198.51.100.0/24`, `2001:db8::/32`), except
`173.245.48.10`, which stands for an address inside Cloudflare's published ranges.

```gherkin
AC-0009-01
Given the production entry chain
And   a request from device 203.0.113.7 that reaches the load balancer through the Cloudflare address 173.245.48.10
When  the person completes registration with that request
Then  the account's three acceptance records (terms of service, privacy policy, marketing) each store the address "203.0.113.7"
```

```gherkin
AC-0009-02
Given the production entry chain and a registered account "ana@example.com"
And   a request from device 203.0.113.7 through Cloudflare
When  the person signs in successfully with that request
Then  the session record issued for that sign-in stores the address "203.0.113.7"
```

```gherkin
AC-0009-03
Given a signed-in session
And   a refresh request from device 203.0.113.8 through Cloudflare
When  the session is refreshed
Then  the new session record stores the address "203.0.113.8"
```

```gherkin
AC-0009-04
Given the production entry chain and a registered account "ana@example.com"
And   a request from device 203.0.113.7 through Cloudflare
When  the person tries to sign in with a wrong password
Then  the failed-login record for "ana@example.com" stores "203.0.113.7" as its last address
```

```gherkin
AC-0009-05
Given the production entry chain
And   a request from device 203.0.113.7 through Cloudflare
When  the person asks for an e-mail verification code for "nova@example.com"
Then  the stored code request for "nova@example.com" holds the address "203.0.113.7"
```

```gherkin
AC-0009-06
Given the production entry chain and a registered account "ana@example.com"
And   a request from device 203.0.113.7 through Cloudflare
When  the person asks for a password reset link for "ana@example.com"
Then  the stored reset request holds the address "203.0.113.7"
```

```gherkin
AC-0009-07
Given a request from device 203.0.113.7 through Cloudflare
And   the browser added "X-Forwarded-For: 198.51.100.66" and "X-Real-IP: 198.51.100.66" to it
When  the person asks for an e-mail verification code for "nova@example.com"
Then  the stored code request holds the address "203.0.113.7"
And   no stored record holds "198.51.100.66"
```

```gherkin
AC-0009-08
Given a request that reaches the load balancer directly from 198.51.100.20, which is not a Cloudflare address
And   it carries "CF-Connecting-IP: 203.0.113.99" and "X-Forwarded-For: 203.0.113.98"
When  it asks for an e-mail verification code for "nova@example.com"
Then  the stored code request holds the address "198.51.100.20"
```

```gherkin
AC-0009-09
Given devices 203.0.113.7 and 203.0.113.8, both reaching the platform through Cloudflare
And   device 203.0.113.7 has made 20 e-mail availability checks within the last minute, the route's limit
When  device 203.0.113.7 makes a 21st check
And   device 203.0.113.8 makes its first check within the same minute
Then  the 21st check from 203.0.113.7 is answered 429 with { "error": "code.rate-limited" }
And   the check from 203.0.113.8 is answered 200
```

```gherkin
AC-0009-10
Given device 203.0.113.7 reaching the platform through Cloudflare
When  it makes 21 e-mail availability checks within one minute, each with a different "X-Forwarded-For" value set by the browser
Then  the 21st check is answered 429 with { "error": "code.rate-limited" }
```

```gherkin
AC-0009-11
Given requests that reach the load balancer directly from 198.51.100.20, which is not a Cloudflare address
When  it makes 21 e-mail availability checks within one minute, each with a different "CF-Connecting-IP" value
Then  the 21st check is answered 429 with { "error": "code.rate-limited" }
```

_AC-0009-12 is withdrawn (v1.3): no self-hosted chain is used (owner, 2026-11-26; §2). Its ID is not reused._

```gherkin
AC-0009-13
Given the production entry chain
And   a request from device 2001:db8::7 through Cloudflare
When  the person asks for an e-mail verification code for "nova@example.com"
Then  the stored code request holds the address "2001:db8::7"
```

```gherkin
AC-0009-14
Given the web app running with no entry point in front of it, reached from 127.0.0.1
When  the person asks for an e-mail verification code for "nova@example.com"
Then  the stored code request holds the address "127.0.0.1"
```

```gherkin
AC-0009-15
Given a request that reaches the API from a caller other than the web app, connecting from 198.51.100.30
And   it states the client address "203.0.113.50"
When  it asks for an e-mail verification code for "nova@example.com"
Then  the stored code request holds the address "198.51.100.30"
```

```gherkin
AC-0009-16
Given a request from device 203.0.113.7 through Cloudflare
When  the person signs in, refreshes the session and reads their profile
Then  no response body or header returned to the browser contains "203.0.113.7"
```

```gherkin
AC-0009-17
Given a request that reaches the web app directly from 198.51.100.40, not through the entry point
And   it carries "X-Forwarded-For: 203.0.113.97, 173.245.48.10" and "CF-Connecting-IP: 203.0.113.97"
When  it asks for an e-mail verification code for "nova@example.com"
Then  the stored code request holds the address "198.51.100.40"
```

## 11. Implementation plan

Written by `/plan` on 2026-11-26 for spec v1.0. `plan_status` stays Draft until the owner approves it.

### Scope

```scope
apps/web/src/instrumentation.ts
apps/web/src/app/api/_lib/http.ts
apps/web/src/app/api/_lib/client-address.ts
apps/web/src/app/api/_lib/cloudflare-ranges.ts
apps/web/src/app/api/_lib/peer-address.ts
apps/web/tests/bff-http.test.ts
apps/web/tests/bff-client-address.test.ts
apps/web/tests/bff-peer-address.test.ts
apps/api/src/main.ts
apps/api/src/config/env.schema.ts
apps/api/src/shared/http/trusted-callers.ts
apps/api/src/shared/http/trusted-callers.spec.ts
apps/api/src/modules/auth/http/request-context.ts
apps/api/src/modules/auth/http/request-context.spec.ts
apps/api/test/setup/test-app.ts
apps/api/test/e2e/client-address.e2e-spec.ts
apps/api/.env.example
```

### What exists today (evidence, 2026-11-26)

- Every one of the 43 BFF handlers is wrapped in `route()` (`apps/web/src/app/api/_lib/http.ts`), and `api()` is only
  called from those handlers. `buildHeaders` sends `Accept`, `Content-Type`, `Authorization` and `X-Tenant-Id` only.
- Next.js 16.3.4 (`output: "standalone"`, started with `node apps/web/server.js`) gives route handlers no socket
  address. `base-server.js` sets `x-forwarded-for` from the socket **only when the request has none**
  (`req.headers['x-forwarded-for'] ??= socket.remoteAddress`), so a forged header hides the real peer. R10 therefore
  needs the peer captured before Next.js reads the request.
- The API sets `trust proxy` to `1` (`apps/api/src/main.ts`): any caller's last `X-Forwarded-For` entry is believed.
  The throttler (`ThrottlerGuard`, global 60/60 s, per-route overrides) tracks `req.ip`. The e2e app
  (`apps/api/test/setup/test-app.ts`) sets no `trust proxy` and runs with `THROTTLE_DISABLED=true`; `skipIf` reads the
  variable per request.
- `ipOf`/`contextOf` (`apps/api/src/modules/auth/http/request-context.ts`) feed the five stored addresses:
  `user_consents.ip`, `refresh_tokens.ip`, `login_attempts.last_ip`, `email_verifications.request_ip`,
  `password_reset_tokens.request_ip`. All are `text` columns.
- Production (AWS, us-east-2): the load balancer `planici-prod-alb-us` is IPv4-only, in subnets `10.0.0.0/24` and
  `10.0.1.0/24`. The task runs in private subnets without a public IP; its security group lets port 3000 in from the
  load balancer's group and ports 3000–3002 from one other group (`sg-053391cfaea673125`). The API port is not
  exposed: the web app reaches it on `127.0.0.1:5000`. The task definition lives in AWS; the deploy workflow copies it
  and swaps the images.
- The repository also holds a compose stack with nginx in front of the web app (`compose.yaml`, `docker/proxy/`). It
  is not used anywhere (owner, 2026-11-26), so this plan does not touch it.
- A Node 26.5 spike (scratch, not committed) confirmed that a `node:diagnostics_channel` subscriber on
  `http.server.request.start` runs before the server's `request` listener, can overwrite a forged request header with
  `socket.remoteAddress`, and that a client can connect from `127.0.0.2` with `localAddress` on Linux.

### Decisions

- **P-1 Peer capture, verifiable.** `src/instrumentation.ts` (`register`, Node.js runtime only) loads
  `peer-address.ts`. On load it creates a per-process random secret (32 bytes from `node:crypto`) and keeps it on
  `globalThis` under `Symbol.for('planici.peer-secret')`, because the instrumentation bundle and the route bundles do
  not share module state. It then subscribes to `http.server.request.start` and, on every request, overwrites the
  header `x-planici-peer` with `<secret> <socket remote address>`, replacing any value the browser sent. Next.js
  accepts connections before `register()` runs, so a request can reach a route without passing the capture; its
  header, if any, came from the browser and cannot carry the secret. The secret is never logged, forwarded to the API
  or returned. No custom server, so the standalone output stays.
- **P-2 Resolution in `route()`.** `route()` resolves the client address once per request (`client-address.ts`) and
  runs the handler inside an `AsyncLocalStorage` scope; `api()` reads it from there. No handler changes.
- **P-3 Resolution rule (R1–R3, R8, R10, Q7).**
  1. `peer` = the address in `x-planici-peer`, taken only when the process secret exists on `globalThis` and the
     header carries it (compared with `timingSafeEqual`, after checking both have the same length, since it throws
     otherwise). If the secret or the header is missing, the secret does not
     match, or the address is not an IP, there is no client address (fail closed: the API then uses its own
     connecting address, today's behavior).
  2. If `peer` is not inside `ENTRY_PROXY_RANGES` (web env, comma-separated CIDRs, empty by default), the client
     address is `peer` (§4.4, AC-0009-14, -17).
  3. Otherwise `hop` = the rightmost `X-Forwarded-For` entry, the one the entry point appended. If it is missing or
     not an IP, the client address is `peer` (Q7).
  4. If `hop` is inside Cloudflare's ranges, the client address is `CF-Connecting-IP` when that is an IP, else
     `peer` (Q7). Otherwise it is `hop` (R3, AC-0009-08).
  5. The result is normalized: `::ffff:a.b.c.d` becomes `a.b.c.d` (R8).
  `X-Real-IP` is never read. Matching uses `node:net` `BlockList` and `isIP`.
- **P-4 Web to API.** `api()` sends the resolved address as a single `X-Forwarded-For` value and nothing when there is
  none. Nothing from the browser's own forwarding headers is passed on (R4).
- **P-5 API trust (R5, Q6).** New env `TRUSTED_CALLERS` (comma-separated IPs, CIDRs or `loopback`; default
  `loopback`), validated in `env.schema.ts` and applied as Express `trust proxy` by `applyTrustedCallers` in
  `shared/http/trusted-callers.ts`, called from `main.ts` and from the e2e `createTestApp` (new option
  `trustedCallers`). `ipOf` normalizes IPv4-mapped addresses (R8). The throttler keeps tracking `req.ip`, which is now
  the client address for the web app's calls (R6).
- **P-6 Cloudflare ranges (Q3).** A code constant in `cloudflare-ranges.ts`, IPv4 and IPv6, copied from
  cloudflare.com/ips with the date it was copied. Changing it needs a release (Q3, decided with the plan).
- **P-7 Withdrawn (1.3).** No self-hosted chain is used, so `compose.yaml` is not changed.
- **P-8 Production configuration (owner, outside the repository).** Before or with the deploy, add
  `ENTRY_PROXY_RANGES=10.0.0.0/24,10.0.1.0/24` to the web container of task definition `planici-task`. The API keeps
  the default `TRUSTED_CALLERS=loopback`. Until the variable is set, every request resolves to a load balancer
  address (step 2 of P-3): no forgery, but one shared address per load balancer node.
- **P-9 How the criteria are proven.** No test runs Cloudflare, the load balancer, the web app and the API together.
  Each criterion is proven by composing a web test (the address the web app resolves and forwards) with an API e2e
  test (what the API stores or limits for a forwarded address). The whole chain is checked by hand after deploy
  (M-1, M-2). Documentation-range addresses cannot be bound locally, so the API test for "another caller" connects
  from `127.0.0.2` with `TRUSTED_CALLERS=127.0.0.1`.

### Contracts

None. No body, error key or status changes in `packages/schemas`. The web app's calls to the API gain an
`X-Forwarded-For` request header with one address. Not breaking. Consumer: the web app only.

### Persistence

None. The five address columns are `text` and keep their meaning. No migration, so a rollback loses nothing. Rows
written before the deploy keep the web app's address (Q8).

### API

No new endpoints. Changed behavior on every route: `req.ip` is the stated `X-Forwarded-For` value only when the
connection comes from `TRUSTED_CALLERS`, else the connecting address. Affected stores and limits: register
(AC-0009-01), login (-02, -04), refresh (-03), e-mail code (-05, -07, -08, -13), password reset (-06), availability
limit (-09 to -11), any caller (-15), responses (-16). Status codes unchanged; 429 stays `code.rate-limited` with
`Retry-After`.

### Web

No pages, components, states or i18n keys. BFF only: `route()`, `api()`, the three new `_lib` modules and
`instrumentation.ts`. New optional env `ENTRY_PROXY_RANGES`.

### Tests

| AC | Test file | Test name |
| --- | --- | --- |
| AC-0009-01 | `apps/web/tests/bff-client-address.test.ts` | `through Cloudflare and the load balancer, takes the address Cloudflare stated` |
| | `apps/api/test/e2e/client-address.e2e-spec.ts` | `registration stores the forwarded address on the three acceptance records` |
| AC-0009-02 | `apps/api/test/e2e/client-address.e2e-spec.ts` | `sign-in stores the forwarded address on the session record` |
| AC-0009-03 | `apps/api/test/e2e/client-address.e2e-spec.ts` | `refresh stores the forwarded address on the new session record` |
| AC-0009-04 | `apps/api/test/e2e/client-address.e2e-spec.ts` | `a failed sign-in stores the forwarded address as the last address` |
| AC-0009-05 | `apps/api/test/e2e/client-address.e2e-spec.ts` | `an e-mail code request stores the forwarded address` |
| AC-0009-06 | `apps/api/test/e2e/client-address.e2e-spec.ts` | `a password reset request stores the forwarded address` |
| AC-0009-07 | `apps/web/tests/bff-client-address.test.ts` | `ignores X-Forwarded-For and X-Real-IP entries the browser added` |
| | `apps/web/tests/bff-http.test.ts` | `sends the resolved address as the only X-Forwarded-For value` |
| AC-0009-08 | `apps/web/tests/bff-client-address.test.ts` | `when the load balancer was reached from outside Cloudflare, takes that address and ignores CF-Connecting-IP` |
| AC-0009-09 | `apps/api/test/e2e/client-address.e2e-spec.ts` | `two forwarded addresses get separate availability budgets` |
| AC-0009-10 | `apps/web/tests/bff-client-address.test.ts` | `rotating browser X-Forwarded-For values resolve to one address` |
| | `apps/api/test/e2e/client-address.e2e-spec.ts` | `the 21st availability check from one forwarded address is answered 429` |
| AC-0009-11 | `apps/web/tests/bff-client-address.test.ts` | `rotating CF-Connecting-IP values around Cloudflare resolve to the connecting address` |
| | `apps/api/test/e2e/client-address.e2e-spec.ts` | `the 21st availability check from one forwarded address is answered 429` |
| AC-0009-12 | — | withdrawn (v1.3) |
| AC-0009-13 | `apps/web/tests/bff-client-address.test.ts` | `keeps an IPv6 client address Cloudflare stated` |
| | `apps/api/test/e2e/client-address.e2e-spec.ts` | `stores a forwarded IPv6 address as received` |
| AC-0009-14 | `apps/web/tests/bff-client-address.test.ts` | `with no entry point configured, takes the connecting address in IPv4 form` |
| | `apps/web/tests/bff-peer-address.test.ts` | `replaces a forged peer header with the socket address` |
| AC-0009-15 | `apps/api/test/e2e/client-address.e2e-spec.ts` | `a caller other than the web app is stored with its own address` |
| | `apps/api/src/modules/auth/http/request-context.spec.ts` | `ignores X-Forwarded-For from an untrusted caller` |
| AC-0009-16 | `apps/api/test/e2e/client-address.e2e-spec.ts` | `sign-in, refresh and profile responses never contain the forwarded address` |
| AC-0009-17 | `apps/web/tests/bff-client-address.test.ts` | `a direct connection to the web app with forged chain headers resolves to the connecting address` |
| | `apps/web/tests/bff-peer-address.test.ts` | `replaces a forged peer header with the socket address` |
| | `apps/web/tests/bff-client-address.test.ts` | `ignores a peer header the capture did not write` |

Supporting tests, not tied to one criterion:
- `bff-client-address.test.ts`: fails closed without a peer header; falls back to the peer for a malformed
  `X-Forwarded-For` or `CF-Connecting-IP` (Q7). The `ignores a peer header the capture did not write` test covers
  both cases: no secret in the process, and a header that carries another secret of a different length.
- `bff-peer-address.test.ts`: writes the process secret with the socket address, and creates the secret only once
  per process.
- `bff-http.test.ts`: sends no `X-Forwarded-For` when no address was resolved.
- `trusted-callers.spec.ts`: parses `loopback`, IPs and CIDRs, and rejects anything else.
- `request-context.spec.ts`: rewritten for `TRUSTED_CALLERS`; normalizes `::ffff:127.0.0.1` to `127.0.0.1`. The
  current tests assume any caller is trusted and change.

Manual checks after deploy:
- **M-1 (production)**: through `joaoizidoro.com`, request an e-mail code with forged `X-Forwarded-For` and
  `X-Real-IP`; the newest `email_verifications.request_ip` is your public address.
- **M-2 (production bypass)**: the same request to the load balancer's own DNS name with a forged
  `CF-Connecting-IP`; the stored address is your public address. It stops being reachable once Q2 is done.
- **M-3**: withdrawn (1.3), no self-hosted chain.

Deferred checks: none.

### Sequence

1. **Spike, not committed.** Add `instrumentation.ts`, `peer-address.ts` and the step 1 check of P-3, then
   `next build` and run `node apps/web/server.js`.
   - Send a forged `x-planici-peer` and `X-Forwarded-For`: a route handler must find the secret and resolve the
     socket address.
   - Build again without the instrumentation file and send the same forged header: it must resolve to no address.

   If either check fails, stop and bring the alternative (a `--import` preload in the image's start command) to the
   owner.
2. **API, failing tests**: `trusted-callers.spec.ts`, `request-context.spec.ts`, `client-address.e2e-spec.ts`.
3. **API**: `env.schema.ts`, `trusted-callers.ts`, `main.ts`, `test-app.ts`, `request-context.ts`, `.env.example`.
   Commit `fix(api): trust a stated client address only from the web app [SPEC-0009]`.
4. **Web, failing tests**: `bff-client-address.test.ts`, `bff-peer-address.test.ts`, `bff-http.test.ts`.
5. **Web**: `cloudflare-ranges.ts`, `client-address.ts`, `peer-address.ts`, `instrumentation.ts`, `http.ts`.
   Commit `feat(web): forward the client address to the api [SPEC-0009]`.
6. **Owner**: P-8 task definition variable, deploy, then M-1 and M-2.

### Risks

- **The capture does not run for some requests.** Next.js listens before `register()` runs, and the instrumentation
  file might not load at all. A request that skips the capture keeps whatever `x-planici-peer` the browser sent. That
  value cannot carry the process secret, so step 1 of P-3 resolves no address, and the API uses the web app's own
  address. This is today's behavior and cannot be forged. If the capture never loads, every request falls back this
  way, and rate limits are shared again. Cheapest check: sequence step 1, both checks.
- **`globalThis` is not shared between the instrumentation and the route bundles.** Then no request finds the secret,
  and every request falls back as above. Cheapest check: sequence step 1.
- **Order of deploy and configuration.** Deploying before P-8 gives every request a load balancer address. It is not
  forgeable, but rate limits are shared again. Set the variable in the same task definition revision.
- **Other hosts in the load balancer subnets.** The group `sg-053391cfaea673125` can reach port 3000 directly. If any
  of its members sit in `10.0.0.0/24` or `10.0.1.0/24`, they would count as the entry point. Browsers cannot connect
  from there. Cheapest check: list that group's network interfaces before the deploy.
- **Cloudflare changes its ranges.** An edge outside the constant is treated as a bypass, so all its users share that
  edge's address. Reviewed when Cloudflare announces a change (Q3).
- **`127.0.0.2` on macOS.** Linux (CI) routes all of `127.0.0.0/8`; macOS needs an alias. The e2e test skips the
  "another caller" case when it cannot bind, and says so in its output.
- **Rate-limit tests.** They switch `THROTTLE_DISABLED` off inside their own `describe` and use a fresh app, so the
  in-memory counters do not leak into other suites.

### New dependencies

None. `node:diagnostics_channel`, `node:async_hooks` (`AsyncLocalStorage`) and `node:net` (`BlockList`, `isIP`) are
built into Node.

## 12. Changelog

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | 2026-11-26 | Draft. Production chain verified the same day: Cloudflare (proxied CNAME) → internet-facing load balancer (open to any address, appends `X-Forwarded-For`) → web app, which calls the API on the same host. |
| 0.2 | 2026-11-26 | Spec review fixes, blocking items. R1 places the client address at the first hop: Cloudflare, or the entry point when Cloudflare is bypassed. New R10: the web app believes the entry chain only on connections from the entry point; §4.4 now covers every connection that skips it; new AC-0009-17 and Q10 (how the entry point is recognized). R8 stores IPv6-mapped IPv4 in IPv4 form and keeps `::1` as it arrives. §2: per-slug limits for RF-23 are MVP, deferred to the public booking link spec. Q6 proposed answer narrowed to the web app alone; Q6 now blocks R5 and AC-0009-15. |
| 1.0 | 2026-11-26 | Approved by Joao Izidoro, 2026-11-26, after the spec review and its re-check (both 2026-11-26), with all 17 criteria agreed and the proposed answers to §9 Q6 and Q10 accepted. R5 and R10 cite those decisions. Q1–Q5 and Q7–Q9 keep their proposed answers and block nothing. The review's should-fix items and the re-check's cosmetic notes stay follow-ups. `plan_status` stays Draft until `/plan`. |
| 1.1 | 2026-11-26 | Implementation plan written by `/plan` (§11): API and web, no contracts or migration, 18 scope paths, every criterion mapped to a test, decisions P-1 to P-9, manual checks M-1 to M-3. `plan_status` stays Draft until the owner approves it. |
| 1.2 | 2026-11-26 | Plan review fix, blocking item. Next.js accepts connections before `register()` runs, so a browser could forge the peer header for a request the capture missed. The header now carries a per-process secret kept on `globalThis`, and a header without it resolves to no address (P-1, P-3 step 1). New test `ignores a peer header the capture did not write` (AC-0009-17) and a supporting test in `bff-peer-address.test.ts`. The spike step also checks a build without the capture. Risks rewritten. Scope unchanged. The 8 should-fix items stay follow-ups. `plan_status` stays Draft. |
| 1.3 | 2026-11-26 | Owner correction: production (Cloudflare → load balancer → web app) is the only chain; the self-hosted reverse proxy is not used anywhere. §2 drops the self-hosted chain and lists it out of scope; R1, R2 and §4.1 name only the load balancer; AC-0009-12 withdrawn (ID not reused); Q6 and Q10 keep only their production answers. §11: `compose.yaml` leaves the scope (17 paths), P-7 and M-3 withdrawn, P-6 no longer relies on nginx, the compose sequence step removed. Q3 decided with the plan: the Cloudflare list is a code constant (P-6). P-3 step 1 checks lengths before `timingSafeEqual` (plan re-check note). Plan review should-fix items 3 and 4 (self-hosted IPv6, compose subnet) no longer apply; the other 6 stay follow-ups. |
| 1.4 | 2026-11-26 | Plan approved by Joao Izidoro, 2026-11-26: §11 as revised in 1.2 and 1.3, after the plan review and its re-check (both 2026-11-26), with P-1 to P-9 decided as written (P-7 withdrawn). `plan_status` Approved. |
