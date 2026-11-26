---
id: SPEC-0009
title: Endereço IP do cliente nas requisições à API
status: Approved # Draft | Review | Approved | Implemented | Superseded
plan_status: Draft # Draft | Approved
version: 1.0
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
  (Cloudflare → load balancer → web app) and the self-hosted one (Cloudflare → reverse proxy → web app).
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

## 3. Domain rules

- **R1 — One client address per request.** Each browser request has exactly one client address: the address of the
  device that opened the connection to the platform's first hop. The first hop is Cloudflare in the normal case, or
  the entry point (load balancer or reverse proxy) when Cloudflare is bypassed (R3) (RNF-10, RNF-11; RFC §6 aceite).
- **R2 — Only the platform's own hops may state it.** An address is believed only when a hop of the platform's
  entry chain states it: the CDN (Cloudflare) when the connection to the entry point came from one of the CDN's
  published addresses, or the entry point itself (load balancer or reverse proxy) for the address that connected
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
2. The load balancer (production) or the reverse proxy (self-hosted) receives the request from a Cloudflare address
   and records the address that connected to it.
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
| 3 | R2 depends on Cloudflare's published address ranges. How are they kept current? | A fixed list in configuration, taken from Cloudflare's published list (cloudflare.com/ips), reviewed when Cloudflare announces a change. No fetch at start-up (no network dependency). | Plan |
| 4 | RFC §5.5 describes the MVP deploy as AWS Amplify (web) and AWS Lambda (API). Production actually runs Cloudflare → load balancer → one container task with web and API side by side (verified 2026-11-26). | This spec states behavior independent of hosting, and is written against the actual chain. Update RFC §5.5 to the actual topology (owner). | No |
| 5 | Cloudflare may report IPv6 addresses. Limit per full IPv6 address, or per network prefix (a device can rotate addresses within its /64)? | Per address as reported (R8) for the MVP; revisit if abuse shows up. | No |
| 6 | ~~Which callers count as "the web app" for R5? In production the web app reaches the API on the same host; self-hosted, over a private container network that the reverse proxy shares.~~ | **Decided (owner, 2026-11-26):** The web app alone. Production: the same host only. Self-hosted: the web app's own container address, set by configuration; the reverse proxy and any other container on that network are not the web app. The default is the same host only. | — |
| 7 | When the entry chain gives no usable address (for example a malformed header from a hop), what is the client address? | The address that connected to the web app, as in §4.4. The request is not refused. | No |
| 8 | Records stored before this change hold the web app's address (`127.0.0.1` in production). Rewrite them? | No: the real addresses cannot be recovered. Leave them; note the cut-over date in the changelog when implemented. | No |
| 9 | RNF-11 also asks for an audit of data changes and deletions with the IP; no such log exists. | Out of scope (§2). The future audit spec reuses this client address. | No |
| 10 | ~~How does the web app recognize a connection from the entry point (R10)? In production the load balancer connects from addresses inside the deployment's private network, and they change over time; self-hosted, the reverse proxy connects over the container network.~~ | **Decided (owner, 2026-11-26):** Address ranges set by configuration: production, the load balancer's private subnets; self-hosted, the reverse proxy's container address. With nothing configured, no connection counts as coming from the entry point (§4.4). | — |

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

```gherkin
AC-0009-12
Given the self-hosted entry chain (Cloudflare, then the reverse proxy, then the web app)
And   a request from device 203.0.113.7 through Cloudflare
When  the person completes registration with that request
Then  the account's three acceptance records each store the address "203.0.113.7"
```

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

Written by `/plan` after the spec is Approved. Empty until then.

```scope
```

## 12. Changelog

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | 2026-11-26 | Draft. Production chain verified the same day: Cloudflare (proxied CNAME) → internet-facing load balancer (open to any address, appends `X-Forwarded-For`) → web app, which calls the API on the same host. |
| 0.2 | 2026-11-26 | Spec review fixes, blocking items. R1 places the client address at the first hop: Cloudflare, or the entry point when Cloudflare is bypassed. New R10: the web app believes the entry chain only on connections from the entry point; §4.4 now covers every connection that skips it; new AC-0009-17 and Q10 (how the entry point is recognized). R8 stores IPv6-mapped IPv4 in IPv4 form and keeps `::1` as it arrives. §2: per-slug limits for RF-23 are MVP, deferred to the public booking link spec. Q6 proposed answer narrowed to the web app alone; Q6 now blocks R5 and AC-0009-15. |
| 1.0 | 2026-11-26 | Approved by Joao Izidoro, 2026-11-26, after the spec review and its re-check (both 2026-11-26), with all 17 criteria agreed and the proposed answers to §9 Q6 and Q10 accepted. R5 and R10 cite those decisions. Q1–Q5 and Q7–Q9 keep their proposed answers and block nothing. The review's should-fix items and the re-check's cosmetic notes stay follow-ups. `plan_status` stays Draft until `/plan`. |
