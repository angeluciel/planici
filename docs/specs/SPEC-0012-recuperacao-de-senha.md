---
id: SPEC-0012
title: Recuperação de senha
status: Draft # Draft | Review | Approved | Implemented | Superseded
plan_status: Draft # Draft | Approved
version: 0.2
owner: Joao Izidoro
satisfies: [RF-03, RN-26, RNF-08, RNF-10]
depends_on: [SPEC-0009]
phase: MVP
ticket: -
---

# SPEC-0012 — Recuperação de senha

## 1. Purpose

RF-03 (RFC §2.3, "Autenticação e conta") says: "O sistema envia link de redefinição de senha por e-mail". UC-03
"Recuperar senha" (RFC §2.2.1) makes it an MVP use case, and RFC §2.7 lists "recuperação de senha" in the MVP for
authentication and for transactional e-mail via AWS SES. RFC §6.1 ("Autenticação") asks for "recuperação de senha por
link temporário enviado por e-mail" and "invalidação de sessões ou tokens em caso de logout ou troca de senha", and
RN-26 applies the password policy "na redefinição de senha (RF-03)". This spec covers the whole flow: asking for a
link, the e-mail, the page that receives the link, and setting the new password.

As built (verified 2026-11-27), the API side exists, built without a spec: an endpoint that mails a link and an
endpoint that sets a new password with it, and the web app has endpoints that forward to both. The person cannot
use any of it. The sign-in page's "Esqueceu sua senha?" link and the e-mail's link both lead to a page that does not
exist. The e-mail is always in English. §9 lists every place where the built behavior differs from the RFC or goes
beyond it.

## 2. Scope

**In scope**
- Asking for a reset link from the web app, and the API's answer to that request (R1–R3, R10).
- The reset e-mail: recipient, language, content, link target and lifetime (R4, R11).
- The page that receives the link, and setting a new password with it (R5–R9).
- What happens to sessions, failed sign-in counts and earlier links after a reset (R6, R8, R9).
- Rate limits on both requests (R10).
- The two web pages: "Esqueci minha senha" and "Nova senha", with their states (§8).

**Out of scope**
- Changing the password while signed in: no spec covers it. RF-04 lists name, photo, contact data and business
  information, not the password, and SPEC-0011 §2 leaves it out (§9 Q24).
- Storing the client address on reset requests: already specified by SPEC-0009 (R7, AC-0009-06). This spec does not
  restate it.
- An e-mail telling the person their password was changed: not in the RFC (§9 Q14).
- An audit log of password resets (RNF-11, RFC §6.1 "Auditoria e Monitoramento" does not list them): a future audit
  spec (SPEC-0009 §2).
- A maximum password length: the same gap exists at registration (RF-01) (§9 Q17).
- Sign-in lockout rules and other sign-in protections: unchanged, except that a reset clears the count (R9).
- The language of the registration verification e-mail: same defect, separate spec (§9 Q4).
- Optional MFA/TOTP (RFC §6.1): not part of RF-03.

## 3. Domain rules

- **R1 — The link only travels by e-mail.** A reset link is sent only to the e-mail address of the account it
  belongs to. No response, to the browser or anywhere else, contains the link or its token (RF-03).
- **R2 — No account enumeration.** A well-formed reset request always gets the same answer, `202` with no body,
  whether or not an active account uses that address. Only the inbox shows whether a link was sent. `assumption`
  derived from RFC §6.1 ("recuperação de senha segura", OWASP "Authentication Failures") (§9 Q1).
- **R3 — Who gets a link.** An active account gets a link. An unknown address and an inactive account get none, and
  nothing is stored for them. An account that signs in only with Google gets a link too, so it can set a password
  (`assumption`, §9 Q6).
- **R4 — The link is temporary.** A link works for 60 minutes after it is issued (RFC §6.1 "link temporário";
  "Tokens temporários ... devem possuir expiração"). The duration is an `assumption` (§9 Q7).
- **R5 — The link works once.** A link sets a password at most once, even when it is submitted several times at the
  same moment (RFC §6.1: "não devem ser reutilizáveis após o uso"). As built, two simultaneous submissions can both
  succeed (§9 Q23).
- **R6 — Only the newest link works.** Issuing a new link to an account makes its earlier unused links stop working
  (`assumption`, as built, §9 Q8).
- **R7 — The new password follows RN-26.** At least 8 characters, at least 1 number and at least 1 symbol
  (RN-26, RNF-08). A rejected password names the first unmet criterion; the page shows all three criteria and which
  are met (RN-26: "indicação clara dos requisitos não cumpridos"). It is stored as a bcrypt hash with cost 12 or
  more, never as plain text (RNF-08). A rejected password does not use up the link.
- **R8 — A reset ends every session.** After a reset, no session of the account issued before it can be renewed, on
  any device (RFC §6.1 "invalidação de sessões ou tokens em caso de ... troca de senha"; RNF-08 "Refresh tokens
  rotativos e invalidados"). The browser where the reset happened is signed out too. The reset does not sign the
  person in (`assumption`, §9 Q11). Access tokens already issued keep working until they expire (§9 Q3).
- **R9 — A reset clears failed sign-ins.** After a reset, earlier failed sign-in attempts no longer count, and a
  locked account can sign in with the new password at once (`assumption`, as built, §9 Q10).
- **R10 — Rate limits.** Each of the two requests is limited to 5 per minute per client address, counted as SPEC-0009
  R6 defines (RNF-10; values are an `assumption`, §9 Q9). In addition, an account gets at most one reset e-mail per
  60 seconds; a request inside that window answers like any other (R2), sends nothing and leaves the earlier link
  working (`assumption`, RFC §6.1 "rate limit por IP e/ou por usuário", §9 Q2).
- **R11 — The e-mail speaks the page's language.** The e-mail (subject included) is written in the language of the
  page the request came from, pt-BR or en-US, and its link opens the reset page in that language. Without a
  language, pt-BR, the web app's default (`assumption`, §9 Q4). The e-mail states how long the link works
  (`assumption`, §9 Q5).
- **R12 — Secrets stay secret.** The token comes from a cryptographically secure random source and carries at least
  128 bits of randomness (256 as built), so it cannot be guessed. No acceptance criterion can observe randomness: the
  minimum is checked in review. What is stored about a reset request cannot be turned back into the link (RFC §6.1
  "Dados Sensíveis": "tokens de recuperação de senha"). Logs contain neither the token nor the e-mail address
  (RFC §6.1 "sem armazenar dados sensíveis desnecessários"; `assumption`, §9 Q12).
- **R13 — A link changes only its own account.** A link sets the password of the account it was issued for and
  nothing else. No tenant data is involved: RN-02 makes operational data (clients, appointments, payments and the
  like) belong to a tenant, and a reset request is account data, not operational data.
- **R14 — Inactive accounts cannot reset.** A link of an account that became inactive after it was issued does not
  work (`assumption`, §9 Q6).
- **R15 — The web app passes answers through.** The web app's two endpoints answer with the API's status, `error`
  key, `field` and `Retry-After`, validation failures (422) included (`assumption`, §9 Q13). When the API cannot be
  reached, the web app answers `502`, or `504` when the API does not answer in time, both with `unexpected` (§6).
- **R16 — The e-mail has no placeholder content.** No link in the reset e-mail points to a placeholder address
  (`example.com`), and every image in it has alternative text, in the e-mail's language, that names what it shows
  (`assumption`, §9 Q21).

## 4. Behavior

### 4.1 Asking for a link

1. A signed-out person on the sign-in page selects "Esqueceu sua senha?". The "Esqueci minha senha" page opens in
   the same language.
2. The person types an e-mail address and submits. The page checks the address first; a missing or malformed address
   shows a field error and sends nothing.
3. The web app sends the address and the page's language to the API (R11).
4. The API checks the per-address limit (R10), then the body (§6). It normalizes the address (trimmed, lower case).
   If an active account uses it (R3) and the account is outside the 60-second window (R10), the API makes earlier
   unused links of that account stop working (R6), stores the new request and sends the e-mail (§4.2). In every other
   case it does nothing. Either way it answers `202` with no body (R2).
5. The page replaces the form with a neutral "Confira seu e-mail" message that names the address typed and does not
   say whether an account exists. From there the person can go back to sign-in, or send the request again once 60
   seconds have passed since the last `202`. Until then the resend button is disabled and counts down the seconds
   left, so it is never offered inside the per-account window (R10).

### 4.2 The e-mail

- Sent to the account's address, in the request's language (R11): a subject, a greeting with the account's name, a
  button that opens the "Nova senha" page carrying the token, the link's lifetime, and a line saying the e-mail can
  be ignored if the person did not ask for it. It has no placeholder links, and every image has alternative text
  (R16).
- If sending fails, the answer of §4.1 step 4 does not change. The failure is logged by account ID, without the
  address or the link (R12). The person can ask again.

### 4.3 Setting the new password

1. The person opens the link. The "Nova senha" page shows a new password field, a confirmation field, the three
   RN-26 criteria and the submit button. The page does not check the link before the person submits (§9 Q15).
2. While the person types, each criterion shows whether it is met (R7).
3. On submit, the page checks the criteria and that the confirmation matches. A failure shows a field error and
   sends nothing.
4. The API checks the per-address limit (R10), then the body (§6), then the link: unknown, already used, replaced by a
   newer link (R6), or belonging to an account that is gone or inactive (R14) answers `401 token.invalid`; past its
   lifetime (R4) answers `401 token.expired`. Otherwise, as one step: it stores the new password (R7), marks the link
   used (R5), ends every session of the account (R8) and clears its failed sign-ins (R9). It answers `204` with no
   body.
5. The web app also ends the session of the browser it is talking to (R8), and the page shows "Senha alterada" with
   a button to the sign-in page.

### 4.4 Alternative flows

- **Unknown address, inactive account, or inside the 60-second window:** the same answer and the same page state as
  §4.1 step 5; no e-mail.
- **Several requests:** only the newest link works (R6).
- **Resend within 60 seconds of the last `202`:** the resend button stays disabled and shows the seconds left;
  nothing is sent (§4.1 step 5).
- **Link without a token:** the "Nova senha" page shows the invalid-link state at once and sends nothing.
- **Expired, used or invalid link:** the page replaces the form with the matching state and a "Pedir um novo link"
  link to the "Esqueci minha senha" page.
- **Over a rate limit:** `429`; the page shows a "wait and try again" message and keeps what the person typed.
  Nothing is stored or sent.
- **Two submissions of one link at the same moment:** one sets the password; the other gets `401 token.invalid` (R5).
- **Signed-in person:** the "Esqueci minha senha" page sends them to `/{lang}/@me` (as built). The "Nova senha" page opens
  normally (§9 Q11); after the reset that browser is signed out like every other session.
- **Google-only account:** the reset sets its first password; afterwards it can sign in with e-mail and password as
  well as with Google (R3, §9 Q6).

## 5. Permissions and tenant isolation

Both requests are account actions, not tenant actions: neither takes a bearer token or a tenant context.

| Action | Unauthenticated | Signed in | Another account | Other tenant |
| --- | --- | --- | --- | --- |
| Ask for a reset link | Allowed, `202` | Allowed, `202`; the session is not used | The link goes only to the account that owns the address (R1) | n/a: no tenant data |
| Set a password with a link | Allowed with a working link | Allowed; that browser is then signed out (R8) | A link changes only its own account (R13) | n/a: no tenant data |
| Open "Esqueci minha senha" | Opens | Sent to `/{lang}/@me` (as built) | — | — |
| Open "Nova senha" | Opens | Opens (§9 Q11) | — | — |

## 6. Errors

Checks run in this order: the per-address limit, the body (first failing field), then the link.

| Situation | Status | `error` key | `field` |
| --- | --- | --- | --- |
| Reset request: e-mail missing or blank | 422 | `email.required` | `email` |
| Reset request: e-mail malformed | 422 | `email.invalid` | `email` |
| Reset request: language not pt-BR or en-US (§9 Q4) | 422 | `locale.invalid` | `locale` |
| New password: token missing or empty | 422 | `token.invalid` | `token` |
| New password: password missing | 422 | `password.required` | `password` |
| New password: fewer than 8 characters | 422 | `password.min` | `password` |
| New password: no number | 422 | `password.number` | `password` |
| New password: no symbol | 422 | `password.symbol` | `password` |
| Link unknown, used, replaced, or of a gone or inactive account | 401 | `token.invalid` | — |
| Link past its lifetime | 401 | `token.expired` | — |
| Over the per-address limit (either request), with `Retry-After` | 429 | `code.rate-limited` | — |
| Unexpected failure | 500 | `unexpected` | — |
| Web app only: the API cannot be reached, or does not answer in time | 502, or 504 on time-out | `unexpected` | — |
| Page only: no answer from the web app | — | `network.unavailable` | — |
| Page only: confirmation differs (never sent) | — | `confirmPassword.mismatch` | `confirmPassword` |

Keys follow `docs/architecture/api-convention.md`. All exist with pt-BR and en-US copy except `locale.invalid`
(new, §9 Q4; copy proposed in §8). `password.required` is the key without the trailing space it has today (§9 Q16).

## 7. Contract impact

- `POST /auth/password/forgot` — request `{ email: string }`, plus a new optional `locale: "pt-BR" | "en-US"` (§9
  Q4). Answer `202`, no body. Not breaking: the field is optional.
- `POST /auth/password/reset` — request `{ token: string, password: string }`, unchanged. Answer `204`, no body.
  The confirmation is checked by the page only and never sent.
- The shared password rule answers `password.required` (no trailing space) for a missing password (§9 Q16). The
  rule is shared, so `POST /auth/register` (e-mail sign-up) is affected too and answers the same key. Not breaking
  for either endpoint: the current key has no copy.
- Web app endpoints mirror both and pass answers through (R15).
- New copy keys (§8) and two new e-mail keys: `emails.password-reset.subject` and
  `emails.password-reset.body.expiration`, in pt-BR and en-US.
- Breaking: no. Consumers: the web app only.

## 8. UI states

New keys need pt-BR and en-US copy. Proposed text in quotes, pt-BR / en-US; a key without quotes already exists.

| Screen | State | Behavior | Copy key |
| --- | --- | --- | --- |
| Sign-in | ready | "Esqueceu sua senha?" opens "Esqueci minha senha" | `auth.login.forgot` |
| Esqueci minha senha | ready | Title, description, e-mail field, submit, link back to sign-in | `auth.forgot-password.title` ("Esqueceu sua senha?" / "Forgot your password?"), `.description` ("Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha." / "Enter your account's e-mail and we'll send you a link to create a new password."), `common.inputs.email.label`, `.placeholder`, `auth.forgot-password.submit` ("Enviar link" / "Send link"), `auth.forgot-password.back-to-login` ("Voltar para o login" / "Back to sign-in") |
| Esqueci minha senha | invalid e-mail | Field error, nothing sent | `validation.email.required`, `validation.email.invalid` |
| Esqueci minha senha | sending | Submit disabled, label changes | `auth.forgot-password.submitting` ("Enviando…" / "Sending…") |
| Esqueci minha senha | sent | Form replaced by a neutral message naming the address; "Enviar de novo", disabled for 60 seconds after each `202` while it counts down the seconds left; link back to sign-in | `auth.forgot-password.sent.title` ("Confira seu e-mail" / "Check your e-mail"), `.sent.description` ("Se houver uma conta com {email}, você vai receber um link para criar uma nova senha. Confira também a caixa de spam." / "If there is an account with {email}, you'll receive a link to create a new password. Check your spam folder too."), `.sent.resend` ("Enviar de novo" / "Send again"), `.sent.resend-wait` ("Aguarde {seconds}s" / "Wait {seconds}s", as `auth.register.steps.verify.resend-wait`) |
| Esqueci minha senha | rate limited | Alert; form keeps the address | `auth.forgot-password.errors.rate-limited` ("Muitas tentativas. Espere um pouco e tente de novo." / "Too many attempts. Wait a moment and try again.") |
| Esqueci minha senha | network or unexpected error | Alert; form keeps the address. No answer from the web app shows `validation.network.unavailable`; `500`, `502` or `504` shows `validation.unexpected` (§6) | `validation.network.unavailable`, `validation.unexpected` |
| Nova senha | ready | Title, description, new password and confirmation (each with show/hide), the three criteria, submit | `auth.reset-password.title` ("Crie uma nova senha" / "Create a new password"), `.description` ("Escolha a nova senha da sua conta." / "Choose your account's new password."), `.password-label` ("Nova senha" / "New password"), `.confirm-label` ("Confirme a nova senha" / "Confirm the new password"), `auth.register.password-criteria.*`, `auth.reset-password.submit` ("Salvar nova senha" / "Save new password") |
| Nova senha | typing | Each criterion marked met or not met | `auth.register.password-criteria.met`, `.not-met` |
| Nova senha | invalid input | Field error, nothing sent | `validation.password.*`, `validation.confirmPassword.mismatch` |
| Nova senha | saving | Submit disabled, label changes | `auth.reset-password.submitting` ("Salvando…" / "Saving…") |
| Nova senha | success | Form replaced; "Entrar" opens the sign-in page | `auth.reset-password.success.title` ("Senha alterada" / "Password changed"), `.success.description` ("Você saiu de todos os dispositivos. Entre com a nova senha." / "You were signed out of every device. Sign in with your new password."), `.success.sign-in` ("Entrar" / "Sign in") |
| Nova senha | link expired | Form replaced; "Pedir um novo link" | `auth.reset-password.expired.title` ("Link expirado" / "Link expired"), `validation.token.expired`, `auth.reset-password.request-new` ("Pedir um novo link" / "Request a new link") |
| Nova senha | link invalid, used, or no token | Form replaced; "Pedir um novo link" | `auth.reset-password.invalid.title` ("Link inválido" / "Invalid link"), `validation.token.invalid`, `auth.reset-password.request-new` |
| Nova senha | rate limited | Alert; typed values kept | `auth.reset-password.errors.rate-limited` ("Muitas tentativas. Espere um pouco e tente de novo." / "Too many attempts. Wait a moment and try again.") |
| Nova senha | network or unexpected error | Alert; typed values kept. No answer from the web app shows `validation.network.unavailable`; `500`, `502` or `504` shows `validation.unexpected` (§6) | `validation.network.unavailable`, `validation.unexpected` |
| Reset e-mail | — | Subject, greeting, button, lifetime, "ignore if not you"; no placeholder links; every image has alternative text (R16) | `emails.password-reset.subject` ("Planici \| Redefinição de senha" / "Planici \| Password reset"), `emails.password-reset.body.*`, `emails.password-reset.body.expiration` ("Este link expira em {minutes, plural, one {# minuto} other {# minutos}}." / "This link expires in {minutes, plural, one {# minute} other {# minutes}}.", as `emails.verification-code.body.expiration`) |

`validation.locale.invalid` (§6) has no screen state, since the page always sends its own language. Proposed copy:
"Idioma não suportado." / "Unsupported language."

Layout follows the sign-in page (§9 Q18).

## 9. Open questions

| # | Question | Proposed answer | Blocks |
| --- | --- | --- | --- |
| 1 | The RFC states no rule against account enumeration for this flow (RFC §6.1 only names slugs). The built API answers `202` for every well-formed address (R2). Other public endpoints already reveal whether an address has an account (`GET /auth/availability?email=`, `409 email.taken` on registration), and a known address makes the API do more work before answering, so timing may differ. | Keep R2 as built. Accept the timing difference and the other endpoints for the MVP: R2 keeps the reset flow from being the easy probe. | R2, AC-0012-03, AC-0012-04, AC-0012-42 |
| 2 | As built, the only limit is per client address (R10). From many addresses, anyone can flood a person's inbox, and since each request replaces the previous link (R6), keep that person's links from working. Add a per-account window? | Yes: at most one e-mail per account per 60 seconds, the same window as e-mail codes. Inside it the answer is still `202` (R2), nothing is sent and the earlier link keeps working. If declined, drop that part of R10 and AC-0012-10, and the page's 60-second resend wait (§4.1 step 5, AC-0012-66, the Given of AC-0012-43). | R10, AC-0012-10, AC-0012-43, AC-0012-66 |
| 3 | RFC §6.1 asks to invalidate "sessões ou tokens" on a password change. The API ends every session (refresh) but access tokens already issued keep working until they expire (15 minutes as configured). Rejecting them would need an account lookup on every request (RNF-22: "API stateless"). | Accept the window of at most one access-token lifetime for the MVP; R8 states it. Align RFC §6.1 wording in an editorial change. | R8 |
| 4 | The e-mail is always in en-US, with a hard-coded English subject, while the web app defaults to pt-BR. No account stores a language. | The request carries the page's language (new optional `locale`, §7); the e-mail and its link use it; pt-BR without it; any other value is `422 locale.invalid`. The registration verification e-mail has the same defect: separate fix. | R11, §7, AC-0012-14, AC-0012-15, AC-0012-16, AC-0012-65 |
| 5 | The e-mail does not say how long the link works, although the API knows the lifetime. | State it (new `emails.password-reset.body.expiration`), as the verification e-mail does. | R11, AC-0012-17 |
| 6 | The RFC is silent on two account cases. (a) A Google-only account (no password) gets a link today, and the reset gives it a password. (b) An account made inactive after asking can still complete a reset today. | (a) Keep: proving control of the address is enough, and it lets a Google-only person add a password. (b) Change: the link stops working (`401 token.invalid`), as an inactive account gets no link in the first place. | R3, R14, AC-0012-13, AC-0012-34, AC-0012-36 |
| 7 | RFC §6.1 asks for an expiring link without a duration. The API uses 60 minutes, set by configuration. | 60 minutes. | R4, AC-0012-17, AC-0012-23 |
| 8 | As built, a new request makes earlier unused links stop working (R6). The RFC does not say. | Keep. | R6, AC-0012-07 |
| 9 | Both requests are limited to 5 per minute per client address. RNF-10 states "100 req/min por IP" for the API; SPEC-0009 Q1 already tracks that mismatch for the global limit. | Keep 5 per minute here; the global value follows SPEC-0009 Q1. | R10, AC-0012-09, AC-0012-35 |
| 10 | As built, a reset clears failed sign-ins, so it also lifts a lockout (R9). The RFC does not say. | Keep: whoever holds the link controls the address, and the lockout protects against guessing, not against that. | R9, AC-0012-32 |
| 11 | As built, a signed-in browser opening the reset link is sent to `/{lang}/@me` and cannot use the link. The reset does not sign the person in. | Open "Nova senha" for signed-in browsers too; the reset then signs that browser out (R8). No automatic sign-in: the person signs in with the new password. | AC-0012-55, AC-0012-61 |
| 12 | When sending fails, the API logs the e-mail address. | Log the account ID instead (R12). | R12, AC-0012-12 |
| 13 | As built, the web app's endpoints answer validation failures with `400` (a known follow-up noted in SPEC-0001 §11), not the API's `422`. | Pass the API's answer through (R15). | R15, AC-0012-63 |
| 14 | No e-mail tells the person their password was changed, although the API raises an event for it. | Out of scope for the MVP; a follow-up if the owner wants it. | No |
| 15 | No endpoint checks a link without using it, so the page shows the form even for an expired link until the person submits. | Keep: no new endpoint. The person learns on submit and gets "Pedir um novo link". | No |
| 16 | The shared password rule answers a missing password with `"password.required "` (trailing space), which has no copy. The same rule serves `POST /auth/register` (e-mail sign-up). | Fix the key (§6, §7). | §6, §7, AC-0012-30 |
| 17 | bcrypt reads only the first 72 bytes of a password and no maximum length exists, so two long passwords with the same start are interchangeable. Same at registration. | Out of scope here; a follow-up covering RF-01 and RF-03 together. | No |
| 18 | RFC §4.2 has no mockup for either page, and §4.2 "Cobertura de Telas do MVP" does not list them. | Follow the sign-in page's layout and components; the password part mirrors the registration password step (criteria list, show/hide). Owner adds mockups if wanted. | No |
| 19 | The token travels in the link's query string. Should the "Nova senha" page keep it from leaking in the `Referer` header to other sites? | Yes: the page sends no referrer. | AC-0012-62 |
| 20 | Routes. The sign-in link points to `/reset-password` without a token; the e-mail links to `/reset-password?token=…` without a language; the web app's routing already lists `/forgot-password` and `/reset-password`; neither page exists. | "Esqueci minha senha" at `/forgot-password`, "Nova senha" at `/reset-password?token=…`, both under the language prefix. The sign-in link moves to `/forgot-password`. | AC-0012-37 |
| 21 | The e-mail footer links to placeholder addresses (`example.com`) and its images have placeholder alternative text. | Remove the placeholder links; give every image alternative text in the e-mail's language (R16). | R16, AC-0012-64 |
| 22 | The new password's confirmation field is not in RF-03 or RN-26. | Keep it, checked by the page only, as in the registration password step (RFC §4.2 "Confirmar senha"). | AC-0012-50 |
| 23 | As built, the API checks that a link is unused, sets the password, then marks the link used, in separate steps. Two simultaneous submissions of one link can therefore both succeed, against RFC §6.1 ("não devem ser reutilizáveis após o uso"). | Fix: R5 and AC-0012-22 require exactly one to succeed. | R5, AC-0012-22 |
| 24 | Changing the password while signed in has no spec. RF-04 lists name, photo, contact data and business information, not the password; SPEC-0011 §2 leaves it out and points to this spec, which covers recovery (RF-03) only. RFC §6.1 still expects sessions to end "em caso de ... troca de senha". | A future account-security spec. It does not block this one. | No |

Note: `docs/architecture/api-convention.md` has no row for `502` or `504`, which the web app answers today when the
API cannot be reached or does not answer in time (§6, R15). This spec does not change the convention; aligning it is
a separate editorial change.

## 10. Acceptance criteria

Unless stated: "ana@example.com" is an active account named Ana with password "Senha-antiga1"; a "link" is the one in
the reset e-mail and its "token" is the value it carries; links are unused and issued under the 60-minute lifetime;
client addresses come from documentation ranges and count as SPEC-0009 defines. API criteria describe the API's
answer; R15 makes the web app's answer the same.

### Asking for a link (API)

```gherkin
AC-0012-01
Given the active account "ana@example.com"
When  a reset link is requested for "ana@example.com"
Then  the response is 202 with no body
And   exactly one e-mail is sent, to "ana@example.com", with a link to the "Nova senha" page carrying a token
```

```gherkin
AC-0012-02
Given the active account "ana@example.com"
When  a reset link is requested for " ANA@Example.com "
Then  the response is 202 and the e-mail is sent to "ana@example.com"
```

```gherkin
AC-0012-03
Given no account uses "ninguem@example.com"
When  a reset link is requested for "ninguem@example.com"
Then  the response is 202 with no body, as for a registered address
And   no e-mail is sent and no reset request is stored
```

```gherkin
AC-0012-04
Given an inactive account "ines@example.com"
When  a reset link is requested for "ines@example.com"
Then  the response is 202 with no body
And   no e-mail is sent and no reset request is stored
```

```gherkin
AC-0012-05
When  a reset link is requested with no e-mail
Then  the response is 422 with { "error": "email.required", "field": "email" }
And   no e-mail is sent
```

```gherkin
AC-0012-06
When  a reset link is requested for "ana@"
Then  the response is 422 with { "error": "email.invalid", "field": "email" }
```

```gherkin
AC-0012-07
Given a first link was sent to "ana@example.com" more than 60 seconds ago
And   a second link was sent to "ana@example.com" after it
When  the first link's token is used with "NovaSenha1!"
Then  the response is 401 with { "error": "token.invalid" }
And   "ana@example.com" still signs in with "Senha-antiga1"
```

```gherkin
AC-0012-08
Given a link was sent to "ana@example.com"
When  the stored reset request is read
Then  none of its values equals the link's token
```

```gherkin
AC-0012-09
Given 5 reset link requests from client address 203.0.113.7 within the last minute
When  a sixth one for "ana@example.com" comes from 203.0.113.7 within that minute
Then  the response is 429 with { "error": "code.rate-limited" } and a Retry-After header
And   no e-mail is sent for it
```

```gherkin
AC-0012-10
Given a link was sent to "ana@example.com" 30 seconds ago
When  another reset link is requested for "ana@example.com" from another client address
Then  the response is 202 with no body
And   no second e-mail is sent
And   the first link's token still sets a new password
```

```gherkin
AC-0012-11
Given the e-mail provider refuses every message
When  a reset link is requested for "ana@example.com"
Then  the response is 202 with no body
```

```gherkin
AC-0012-12
Given the e-mail provider refuses every message
When  a reset link is requested for "ana@example.com"
Then  the logged failure names Ana's account ID
And   the log contains neither "ana@example.com" nor the token
```

```gherkin
AC-0012-13
Given an active account "gabi@example.com" that signs in only with Google and has no password
When  a reset link is requested for "gabi@example.com"
Then  the response is 202 and one e-mail with a link is sent to "gabi@example.com"
```

### The e-mail

```gherkin
AC-0012-14
Given the active account "ana@example.com"
When  a reset link is requested for it with language "en-US"
Then  the e-mail's subject and body are in en-US
And   its link opens the "Nova senha" page in en-US
```

```gherkin
AC-0012-15
Given the active account "ana@example.com"
When  a reset link is requested for it with no language
Then  the e-mail's subject and body are in pt-BR
And   its link opens the "Nova senha" page in pt-BR
```

```gherkin
AC-0012-16
When  a reset link is requested for "ana@example.com" with language "fr-FR"
Then  the response is 422 with { "error": "locale.invalid", "field": "locale" }
And   no e-mail is sent
```

```gherkin
AC-0012-17
When  a reset link is requested for "ana@example.com" in pt-BR
Then  the e-mail says the link expires in 60 minutes
```

```gherkin
AC-0012-64
Given the active account "ana@example.com"
When  a reset link is requested for it with language "en-US"
Then  no link in the e-mail points to an example.com address
And   every image in the e-mail has alternative text in en-US naming what it shows
```

### Setting the new password (API)

```gherkin
AC-0012-18
Given a link was sent to "ana@example.com" 10 minutes ago
When  its token is used with the password "NovaSenha1!"
Then  the response is 204 with no body
And   "ana@example.com" signs in with "NovaSenha1!"
```

```gherkin
AC-0012-19
Given Ana set "NovaSenha1!" with a link
When  "ana@example.com" signs in with "Senha-antiga1"
Then  the response is 401 with { "error": "credentials.invalid", "field": "password" }
```

```gherkin
AC-0012-20
Given Ana set "NovaSenha1!" with a link
When  her stored password is read
Then  it is a bcrypt hash with cost 12 or more
And   it does not contain "NovaSenha1!"
```

```gherkin
AC-0012-21
Given Ana set "NovaSenha1!" with a link
When  the same token is used with "OutraSenha2@"
Then  the response is 401 with { "error": "token.invalid" }
And   "ana@example.com" signs in with "NovaSenha1!" and not with "OutraSenha2@"
```

```gherkin
AC-0012-22
Given a link was sent to "ana@example.com"
When  two requests use its token at the same moment, one with "PrimeiraSenha1!" and one with "SegundaSenha2@"
Then  exactly one answers 204 and the other answers 401 with { "error": "token.invalid" }
And   only the password of the request that answered 204 signs in
```

```gherkin
AC-0012-23
Given a link was sent to "ana@example.com" 61 minutes ago
When  its token is used with "NovaSenha1!"
Then  the response is 401 with { "error": "token.expired" }
And   "ana@example.com" still signs in with "Senha-antiga1"
```

```gherkin
AC-0012-24
When  the token "nao-existe" is used with "NovaSenha1!"
Then  the response is 401 with { "error": "token.invalid" }
```

```gherkin
AC-0012-25
When  a new password "NovaSenha1!" is sent with no token
Then  the response is 422 with { "error": "token.invalid", "field": "token" }
```

```gherkin
AC-0012-26
Given a link was sent to "ana@example.com"
When  its token is used with "Curta1!"
Then  the response is 422 with { "error": "password.min", "field": "password" }
```

```gherkin
AC-0012-27
Given a link whose token was just refused with "Curta1!"
When  the same token is used with "NovaSenha1!"
Then  the response is 204
```

```gherkin
AC-0012-28
Given a link was sent to "ana@example.com"
When  its token is used with "SemNumero!"
Then  the response is 422 with { "error": "password.number", "field": "password" }
```

```gherkin
AC-0012-29
Given a link was sent to "ana@example.com"
When  its token is used with "SemSimbolo1"
Then  the response is 422 with { "error": "password.symbol", "field": "password" }
```

```gherkin
AC-0012-30
Given a link was sent to "ana@example.com"
When  its token is sent with no password
Then  the response is 422 with { "error": "password.required", "field": "password" }
```

```gherkin
AC-0012-31
Given Ana is signed in on two devices
When  she sets "NovaSenha1!" with a link
Then  renewing the session of either device answers 401 with { "error": "token.invalid" }
```

```gherkin
AC-0012-32
Given "ana@example.com" is locked after 5 failed sign-ins, so signing in answers 429 with { "error": "account.locked" }
When  Ana sets "NovaSenha1!" with a link
Then  "ana@example.com" signs in with "NovaSenha1!" with status 200
```

```gherkin
AC-0012-33
Given links were sent to "ana@example.com" and "bia@example.com"
When  Ana's token is used with "NovaSenha1!"
Then  "bia@example.com" still signs in with her old password
And   Bia's link still sets a new password
```

```gherkin
AC-0012-34
Given a link was sent to "ana@example.com"
And   her account became inactive afterwards
When  its token is used with "NovaSenha1!"
Then  the response is 401 with { "error": "token.invalid" }
And   her stored password is unchanged
```

```gherkin
AC-0012-35
Given 5 new password requests from client address 203.0.113.7 within the last minute
When  a sixth one comes from 203.0.113.7 within that minute with a working token
Then  the response is 429 with { "error": "code.rate-limited" } and a Retry-After header
And   the password is unchanged
```

```gherkin
AC-0012-36
Given the Google-only account "gabi@example.com" was sent a link
When  its token is used with "NovaSenha1!"
Then  the response is 204
And   "gabi@example.com" signs in with e-mail and "NovaSenha1!"
```

### "Esqueci minha senha" page

```gherkin
AC-0012-37
Given a signed-out person on the pt-BR sign-in page
When  they select "Esqueceu sua senha?" (auth.login.forgot)
Then  the pt-BR "Esqueci minha senha" page opens with auth.forgot-password.title, an e-mail field and auth.forgot-password.submit
```

```gherkin
AC-0012-38
Given the "Esqueci minha senha" page
When  the person submits "ana@"
Then  the e-mail field shows validation.email.invalid
And   no request is sent
```

```gherkin
AC-0012-39
Given the "Esqueci minha senha" page
When  the person submits an empty e-mail field
Then  the e-mail field shows validation.email.required
And   no request is sent
```

```gherkin
AC-0012-40
Given the "Esqueci minha senha" page
When  the person submits "ana@example.com" and the answer has not arrived
Then  the submit button is disabled and reads auth.forgot-password.submitting
```

```gherkin
AC-0012-41
Given the person submitted "ana@example.com"
When  the answer is 202
Then  the form is replaced by auth.forgot-password.sent.title and auth.forgot-password.sent.description naming "ana@example.com"
```

```gherkin
AC-0012-42
Given no account uses "ninguem@example.com"
When  the person submits "ninguem@example.com"
Then  the page shows the same sent state as for a registered address, naming "ninguem@example.com"
```

```gherkin
AC-0012-65
Given the en-US "Esqueci minha senha" page
When  the person submits "ana@example.com"
Then  the e-mail is in en-US
And   its link opens the en-US "Nova senha" page
```

```gherkin
AC-0012-43
Given the sent state for "ana@example.com" appeared more than 60 seconds ago
When  the person selects auth.forgot-password.sent.resend
Then  the request for "ana@example.com" is sent again
And   the sent state is shown again when it answers 202
```

```gherkin
AC-0012-66
Given the person submitted "ana@example.com" and the answer was 202
When  20 seconds have passed since that answer
Then  the resend button is disabled and reads auth.forgot-password.sent.resend-wait with 40 seconds
And   selecting it sends no request
```

```gherkin
AC-0012-44
Given the person submitted "ana@example.com"
When  the answer is 429
Then  an alert shows auth.forgot-password.errors.rate-limited
And   the form stays with "ana@example.com" filled in
```

```gherkin
AC-0012-45
Given the person submitted "ana@example.com"
When  the web app cannot be reached
Then  an alert shows validation.network.unavailable
And   the form stays with "ana@example.com" filled in
```

```gherkin
AC-0012-46
Given the person submitted "ana@example.com"
When  the answer is 500 with { "error": "unexpected" }
Then  an alert shows validation.unexpected
And   the form stays with "ana@example.com" filled in
```

```gherkin
AC-0012-47
Given a browser signed in as Ana
When  it opens the pt-BR "Esqueci minha senha" page
Then  it is sent to /pt-BR/@me instead
```

### "Nova senha" page

```gherkin
AC-0012-48
Given a signed-out browser
When  it opens the link from a pt-BR reset e-mail
Then  the pt-BR "Nova senha" page shows auth.reset-password.title, a new password field, a confirmation field, the three auth.register.password-criteria items marked not met, and auth.reset-password.submit
```

```gherkin
AC-0012-49
Given the "Nova senha" page
When  the person types "abcdefg1" as the new password
Then  the length and number criteria are marked met
And   the symbol criterion is marked not met
```

```gherkin
AC-0012-50
Given the "Nova senha" page
When  the person submits "NovaSenha1!" with the confirmation "NovaSenha2!"
Then  the confirmation field shows validation.confirmPassword.mismatch
And   no request is sent
```

```gherkin
AC-0012-51
Given the "Nova senha" page
When  the person submits "abcdefgh" in both fields
Then  the new password field shows validation.password.number
And   no request is sent
```

```gherkin
AC-0012-52
Given the "Nova senha" page
When  the person submits "NovaSenha1!" in both fields and the answer has not arrived
Then  the submit button is disabled and reads auth.reset-password.submitting
```

```gherkin
AC-0012-53
Given the person submitted "NovaSenha1!" in both fields
When  the answer is 204
Then  the form is replaced by auth.reset-password.success.title, auth.reset-password.success.description and auth.reset-password.success.sign-in
And   auth.reset-password.success.sign-in opens the sign-in page
```

```gherkin
AC-0012-54
Given the person submitted "NovaSenha1!" in both fields
When  the answer is 401 with { "error": "token.expired" }
Then  the form is replaced by auth.reset-password.expired.title, validation.token.expired and auth.reset-password.request-new
And   auth.reset-password.request-new opens the "Esqueci minha senha" page
```

```gherkin
AC-0012-55
Given a browser holding a session for Ana opens the link from her pt-BR reset e-mail
When  the reset succeeds on that browser
Then  opening /pt-BR/orgs in that browser leads to the pt-BR sign-in page
```

```gherkin
AC-0012-56
Given the person submitted "NovaSenha1!" in both fields
When  the answer is 401 with { "error": "token.invalid" }
Then  the form is replaced by auth.reset-password.invalid.title, validation.token.invalid and auth.reset-password.request-new
```

```gherkin
AC-0012-57
When  a browser opens the "Nova senha" page with no token
Then  the page shows auth.reset-password.invalid.title, validation.token.invalid and auth.reset-password.request-new
And   no request is sent
```

```gherkin
AC-0012-58
Given the person submitted "NovaSenha1!" in both fields
When  the answer is 429
Then  an alert shows auth.reset-password.errors.rate-limited
And   both fields keep "NovaSenha1!"
```

```gherkin
AC-0012-59
Given the person submitted "NovaSenha1!" in both fields
When  the web app cannot be reached
Then  an alert shows validation.network.unavailable
And   both fields keep "NovaSenha1!"
```

```gherkin
AC-0012-60
Given the person submitted "NovaSenha1!" in both fields
When  the answer is 500 with { "error": "unexpected" }
Then  an alert shows validation.unexpected
And   both fields keep "NovaSenha1!"
```

```gherkin
AC-0012-61
Given a browser signed in as Ana
When  it opens her link
Then  the "Nova senha" page opens instead of the app
```

```gherkin
AC-0012-62
When  a browser opens the "Nova senha" page with a token
Then  the page's response tells the browser to send no referrer
```

```gherkin
AC-0012-63
Given a link was sent to "ana@example.com"
When  a browser sends its token with "Curta1!" to the web app's new password endpoint
Then  the response is 422 with { "error": "password.min", "field": "password" }
```

## 11. Implementation plan

Written by `/plan` after the spec is Approved. Empty until then.

```scope
```

## 12. Changelog

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | 2026-11-27 | Draft. As built the same day: the API's reset request and new password endpoints and the web app's forwarding endpoints exist; neither page exists, and the sign-in link and the e-mail link both lead nowhere. The e-mail is always en-US with an English subject and no lifetime. Built behavior that differs from or goes beyond the RFC is listed in §9 (Q2, Q3, Q4, Q6, Q11, Q12, Q13, Q16, Q20, Q21, Q23). |
| 0.2 | 2026-11-27 | Spec review fixes. §6 separates the page's `network.unavailable` (no answer from the web app) from the web app's `502`/`504` `unexpected` (API down or slow), mapped in §8 and R15; §9 notes that the API convention has no 502/504 row. §9 Blocks filled for every question that rules or ACs depend on. New R16 and AC-0012-64 for Q21 (no placeholder links, image alternative text). New AC-0012-65: the page's language reaches the e-mail (R11). "Enviar de novo" waits 60 seconds with a countdown (§4.1, §4.4, §8, new AC-0012-66, AC-0012-43's Given). §2: no spec covers changing the password while signed in (new Q24). AC-0012-47 and AC-0012-55 name `/{lang}/@me` and `/{lang}/orgs`; AC-0012-40 and AC-0012-52 gain a When. R13 cites RN-02 instead of SPEC-0010. §7 lists `POST /auth/register` as affected by the `password.required` fix. §8 adds the missing pt-BR copy, en-US proposals for every new key and the plural form of `body.expiration`. R12 states a minimum of 128 bits of randomness. No §9 question is decided: all stay open for the owner, including Q2, Q3, Q4, Q6 and Q11, and the new Q24. |
