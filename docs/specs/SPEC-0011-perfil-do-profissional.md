---
id: SPEC-0011
title: Perfil do profissional
status: Draft # Draft | Review | Approved | Implemented | Superseded
plan_status: Draft # Draft | Approved
version: 0.2
owner: Joao Izidoro
satisfies: [RF-04, RN-01, RNF-15, RNF-16]
depends_on: [SPEC-0008, SPEC-0009]
phase: MVP
ticket: -
---

# SPEC-0011 — Perfil do profissional

## 1. Purpose

RF-04 (RFC §2.3, "Gerenciamento de perfil") says "O profissional pode editar nome, foto, dados de contato e informações
do negócio", and UC-04 (RFC §2.2.1, "Gerenciar perfil e dados do negócio") puts it in the MVP. RFC §4.1 adds that "O
perfil do usuário é independente do tenant, o mesmo usuário pode gerenciar múltiplos negócios", so the profile lives
outside any organization, at the address the account menu already links to (SPEC-0008, "Perfil" leads to `/@me`).

As built (verified 2026-11-27), there is no profile to edit. The API can only read the signed-in user. The web app's
profile page is a placeholder ("Hello this is your own profile, it's still under construction"), and no link reaches
it. Choosing "Perfil" in the account menu, following the not-found page's "Ir ao perfil", or opening `/` or the sign-in
page while signed in all go to `/{lang}/@me`, and that address matches no page, so each one ends on the not-found page.
The page is registered only under the percent-encoded address `/{lang}/%40me`, which only a hand-typed address uses
(§9 Q10; evidence in §11, "Notes for /plan").

This spec makes the profile page reachable. On it the professional can read and change their name, surname and
apelido, and change their e-mail after proving the new address. The photo, the business information and any contact
data beyond the e-mail are left to other specs or decisions (§2, §9 Q1–Q3).

## 2. Scope

**In scope**
- The profile page at `/{lang}/@me`: reachable from the account menu (SPEC-0008), from the not-found page, and by
  direct address. It sends signed-out visitors to sign-in and brings them back afterwards.
- Reading the signed-in user's own profile: name, surname, apelido, e-mail, and whether the account has a password.
- Changing the name, surname and apelido.
- Changing the e-mail: proving the new address with a code, confirming the current password, and what changes for
  sign-in afterwards.
- The text and language of the e-mail that carries that code.
- Maximum lengths for the name, surname and apelido (R4). Registration also starts refusing values over them,
  because both use one rule. `assumption` (§9 Q9)

**Out of scope**
- The profile photo: uploading, showing (profile page, account button), removing. A later spec (§9 Q1).
- Business information (the organization's name, its área de atuação): organization settings, a separate spec (§9 Q2).
- Contact data other than the e-mail, such as a phone number (§9 Q3).
- Changing the password while signed in: not covered by any spec yet; raised as an open question in SPEC-0012 §9.
- Linking or unlinking a Google account (RF-02) from the profile.
- Changing the e-mail of an account that has no password (Google-only) in the MVP (§9 Q4).
- Account deletion and data export: RNF-13 and RNF-14 are Pós-MVP; in the MVP they go through the DPO channel (RFC
  §6.2, "Direitos do Titular").
- Interface preferences: the theme stays as SPEC-0008 decided it.
- An audit log of profile changes (RNF-11): the future audit spec (§9 Q12).
- A notice to the old address after an e-mail change (§9 Q6).
- Where signed-in visits to `/` and to the sign-in pages land (§9 Q11).
- Seeing another user's profile, which never exists (RFC §2.6.1: no "visualização de perfil entre usuários
  distintos").

## 3. Domain rules

- **R1 — The profile belongs to the account, not to an organization.** It is the same in every organization the user
  belongs to, and a user with no organization yet has one (RFC §4.1). Reading or changing it needs no active
  organization and ignores any organization the request names. RN-02 lists the data that belong to a tenant
  ("clientes, procedimentos, planos, agendamentos, pagamentos, formulários, configurações e colaboradores"), and
  account data is not among them.
- **R2 — Only one's own profile.** A request reads or changes the profile of the account its session identifies,
  and no other. Any account identifier the request carries is ignored. Without a valid session nothing is read or
  changed (RN-01). A suspended or deleted account cannot read or change its profile (as built for reading).
- **R3 — What the profile edits.** Name, surname and apelido are edited directly (RF-04 "nome"; RFC §4.2, Registro
  passo 4, links the apelido to RF-04). The e-mail changes only through R7 to R12 (RF-04 "dados de contato", §9 Q3).
  No other account datum changes through the profile: not its status, verification state, password, sign-in methods
  or preferences. The profile asks for no datum beyond these four, all of which the account already has (RNF-15,
  "nenhum campo obrigatório além do mínimo funcional"; §9 Q3).
- **R4 — Registration's rules.** The name and surname are required, with surrounding spaces removed. The apelido is
  required and is made of lowercase letters and digits, in groups joined by single hyphens (for example `ana-souza`),
  exactly as in registration. Maximum lengths: 80 characters for the name and the surname, 48 for the apelido.
  `assumption` (§9 Q9)
- **R5 — The apelido is unique.** No two accounts have the same apelido, as in registration. Saving an account's own
  current apelido is not a conflict. `assumption` (§9 Q8)
- **R6 — One save, all or nothing.** A save carries the name, surname and apelido together and stores all three or
  none. If two saves overlap, the last one wins. `assumption` (§9 Q16)
- **R7 — A new e-mail counts only once it is proven.** The user asks for the change, a 6-digit code is sent to the new
  address, and the e-mail changes only when the user enters that code. Until then, sign-in, password recovery and
  every e-mail keep using the current address. `assumption` (§9 Q4)
- **R8 — The code follows registration's rules.** It has the same length, lifetime (today 15 minutes) and number of
  wrong entries allowed (today 5) as the registration code. The wait between two codes (today 60 seconds) counts
  per address, as registration's does: once an e-mail change code goes to an address, no account can have another
  one sent there until the wait has passed, while a request for a different address needs no wait. The wait is
  separate from registration's: registration codes and e-mail change codes for the same address do not hold each
  other back. The request stores the client address (SPEC-0009 R7). `assumption` (§9 Q18)
- **R9 — The current password confirms the request.** An account with a password confirms it when asking for the
  change. A wrong one counts as a failed sign-in for the per-account lockout (RFC §6.1, "lockout progressivo por
  conta"), and while the account is locked the request is refused. This extends the sign-in lockout to a new kind
  of attempt: SPEC-0012 keeps the lockout rules unchanged, so this spec is the one that changes them. An account
  without a password cannot change its e-mail in the MVP. `assumption` (§9 Q4, Q7)
- **R10 — The new address is free and different.** Addresses are compared after removing surrounding spaces and
  lowercasing (`docs/architecture/api-convention.md`, Validation). The new address must differ from the current one
  and belong to no other account. This is checked when the code is requested and again when it is entered.
  `assumption` (§9 Q4)
- **R11 — A code proves one address for one account.** A code changes only the account that requested it, only to
  the address it was sent to, only once, and only while it is that account's latest request. A new request replaces
  the previous one. `assumption` (§9 Q4)
- **R12 — After the change.** The account signs in with the new e-mail and password, and the old e-mail no longer
  signs in. The e-mail counts as verified. No session ends (§9 Q6). A Google account already linked keeps signing in
  (§9 Q5). `assumption` (§9 Q5, Q6)
- **R13 — The change has its own e-mail.** The code for an e-mail change goes out in an e-mail that says it confirms a
  new address for an existing account. It does not reuse registration's text ("continuar criando sua conta"). It is
  an e-mail verification message in the sense of RFC §2.7 ("verificação de e-mail"), because it verifies the new
  address, so the MVP's account e-mails stay verification and recovery. It is written in the language of the page
  the change was requested from. `assumption` (§9 Q15)
- **R14 — Where the page is.** The profile page is at `/{lang}/@me` for both languages. A signed-out visitor is sent
  to sign-in and returns to the profile after signing in. No address shows profile data without a valid session.
  `assumption` on keeping the address (§9 Q10)

## 4. Behavior

### 4.1 Opening the profile

1. The user chooses "Perfil" in the account menu, follows "Ir ao perfil" on the not-found page, or opens
   `/{lang}/@me` directly.
2. If there is no session, the web app sends the browser to sign-in and remembers the profile as the place to return
   to (R14). After signing in, the user lands on the profile.
3. Otherwise the page loads the profile. While it loads, it shows a loading state. If loading fails, it shows an error
   with a retry. If the session turns out to be gone (after the web app's usual single renewal attempt), it sends the
   browser to sign-in as in step 2.
4. When it has loaded, the page shows:
   - the title "Meu perfil" and a link "Minhas organizações" to the organization list;
   - the section "Dados pessoais", with "Nome", "Sobrenome" and "Apelido" (and a hint about the apelido's format),
     filled with the current values, and "Salvar alterações", which stays disabled until a value differs from the
     stored one;
   - the section "E-mail", with the current e-mail. Accounts with a password also get "Alterar e-mail". Accounts
     without one get an explanation that they sign in with Google and must create a password first, through "Esqueci
     minha senha" after signing out (§9 Q4).
5. The page is outside every organization, so it has no organization header (SPEC-0008 §2). It shows no photo
   (§9 Q1). It works at phone and desktop widths (RNF-16), every field has a visible label, and every error is text
   tied to its field, as in registration.

There is no empty state: every account has a name, surname, apelido and e-mail.

### 4.2 Changing name, surname or apelido

1. The user changes one or more fields and chooses "Salvar alterações".
2. Before sending, the page checks what it can check itself (required, format, length) and shows each problem under
   its field. Nothing is sent while a problem remains.
3. The button shows "Salvando…" and is disabled while the save runs.
4. The system validates (R4), checks the apelido (R5) and stores all three values (R6). It answers with the updated
   profile. The displayed name is the name followed by the surname.
5. The page shows "Perfil atualizado.", fills the fields with the stored values (spaces removed), and disables the
   button again.
6. If the apelido belongs to another account, the page shows the message under "Apelido" and keeps what the user
   typed. Any other failure shows a toast and keeps what the user typed.

### 4.3 Changing the e-mail

1. The user chooses "Alterar e-mail". The section shows "Novo e-mail", "Senha atual", "Enviar código" and
   "Cancelar".
2. The user fills them and chooses "Enviar código". The system checks, in this order, and stops at the first failure:
   1. both fields are filled and the new e-mail is well formed;
   2. the account has a password (R9);
   3. the current password is right (R9). A wrong one counts toward the lockout, and while the account is locked the
      request is refused;
   4. the new address differs from the current one (R10);
   5. no other account uses it (R10);
   6. the wait since the last e-mail change code sent to this address, for any account, has passed (R8).
   It then sends a code to the new address, in the page's language (R13), and accepts the request without a payload. The account's e-mail is
   unchanged (R7).
3. The section shows "Enviamos um código de 6 dígitos para {email}", a "Código" field, "Confirmar", "Reenviar código"
   (available once the wait of R8 has passed) and "Cancelar". "Reenviar código" repeats step 2 with the values the user
   typed. The page keeps them only until the form closes. The new code replaces the previous one (R11).
4. The user enters the code and chooses "Confirmar". The system checks that the code belongs to this account's latest
   request for this address and is right, unexpired and not over the attempt limit (R8, R11). It then checks that no
   other account took the address in the meantime (R10), changes the e-mail and answers with the updated profile
   (R12).
5. The page shows "E-mail alterado para {email}.", closes the form and shows the new e-mail.

Alternative flows:
- "Cancelar" at any step closes the form. The e-mail is unchanged, and a code already sent simply expires. Leaving the
  page has the same effect.
- Each refusal in step 2 or step 4 shows its message under the field it concerns when that field is on screen, or
  as a toast otherwise (§6, §8). At the code step, "Novo e-mail" is no longer shown, so an address taken in the
  meantime is a toast and the code step stays open. The user stays signed in and on the page.
- An account without a password never sees the form (4.1 step 4). If one sends the request anyway, it is refused at
  step 2.2.

### 4.4 After an e-mail change

- Signing in with the new e-mail and the existing password opens the account. The old e-mail is refused like any
  unknown e-mail (R12).
- A Google account already linked to the account keeps signing in. A Google account not yet linked whose verified
  e-mail is the new address links on its first Google sign-in, as built (§9 Q5).
- Password recovery sends its link to the new address only. A request for the old address sends nothing.
- The account menu shows the new e-mail the next time it loads.

## 5. Permissions and tenant isolation

Profiles are account data, not tenant data (R1). Instead of another tenant, the table shows another user's account.

| Action | Unauthenticated | The account itself (active) | Suspended or deleted account | Another user's account |
| --- | --- | --- | --- | --- |
| Open the profile page | Sent to sign-in | Allowed | Load error state (the read answers 403 `account.inactive`) | Not addressable: the page always shows the session's own account |
| Read the profile | 401 `token.invalid` | 200, own profile | 403 `account.inactive` | Never: no request names another account (R2) |
| Change name, surname, apelido | 401 `token.invalid` | 200 | 403 `account.inactive` | Never: an identifier in the request is ignored (R2) |
| Request an e-mail change | 401 `token.invalid` | 202 (R9 applies) | 403 `account.inactive` | Never (R2) |
| Confirm an e-mail change | 401 `token.invalid` | 200 with its own code | 403 `account.inactive` | Another account's code is `code.invalid` (R11) |

No action requires an active organization or checks membership. An organization named in the request is ignored
(R1).

## 6. Errors

Keys and statuses follow `docs/architecture/api-convention.md`. New keys are marked *new* and need pt-BR and en-US copy
(§8).

| Situation | Status | `error` key | `field` |
| --- | --- | --- | --- |
| Name missing or only spaces | 422 | `name.required` | `name` |
| Name over 80 characters | 422 | `name.max` *new* | `name` |
| Surname missing or only spaces | 422 | `surname.required` | `surname` |
| Surname over 80 characters | 422 | `surname.max` *new* | `surname` |
| Apelido missing or empty | 422 | `slug.required` | `slug` |
| Apelido not lowercase letters and digits joined by single hyphens | 422 | `slug.pattern` | `slug` |
| Apelido over 48 characters | 422 | `slug.max` *new* | `slug` |
| Apelido used by another account | 409 | `slug.taken` | `slug` |
| New e-mail missing | 422 | `email.required` | `email` |
| New e-mail malformed | 422 | `email.invalid` | `email` |
| Request language not pt-BR or en-US (§9 Q15) | 422 | `locale.invalid` (added by SPEC-0012) | `locale` |
| Current password missing | 422 | `currentPassword.required` *new* | `currentPassword` |
| Account has no password | 409 | `account.no-password` | `currentPassword` |
| Current password wrong (§9 Q7) | 400 | `currentPassword.invalid` *new* | `currentPassword` |
| Account locked by failed attempts | 429 | `account.locked` | — |
| New e-mail equals the current one | 422 | `email.unchanged` *new* | `email` |
| New e-mail used by another account (on request or on confirmation) | 409 | `email.taken` | `email` |
| An e-mail change code was sent to this address, for any account, less than the wait ago (R8) | 429 | `code.rate-limited` | — |
| Code missing | 422 | `code.required` | `code` |
| Code not 6 digits | 422 | `code.length` | `code` |
| Code wrong, replaced by a newer request, or requested by another account | 400 | `code.invalid` | `code` |
| Code expired | 400 | `code.expired` | `code` |
| Too many wrong codes | 429 | `code.attempts` | `code` |
| No, malformed or invalid access token | 401 | `token.invalid` | — |
| Expired access token | 401 | `token.expired` | — |
| Account suspended or deleted | 403 | `account.inactive` | — |
| Unexpected failure | 500 | `unexpected` | — |

## 7. Contract impact

New and changed shapes, at field level. Breaking: no. Consumers: the web app (and, through it, the browser).

- **Profile** (the existing response of `GET /auth/me`): `id`, `email`, `name`, `surname`, `slug` (the apelido),
  `displayName` (name and surname), `avatarUrl` (string or null; stays null until the photo spec, §9 Q1),
  `emailVerified`. Added: `hasPassword` (boolean), which tells the page whether to offer the e-mail change (R9).
  Non-breaking addition. `hasPassword` is on the Profile only: the profile read and the update and confirm
  responses. Today the session `user` that sign-in, registration and renewal return has the same shape as the
  Profile. It keeps today's fields, so the two shapes stop being identical.
- **Update profile** (new): request `name`, `surname`, `slug`, all three required strings with the rules of R4.
  Response 200 with the Profile.
- **Request e-mail change** (new): request `email` (string, trimmed and lowercased), `currentPassword` (string),
  and an optional `locale` (`"pt-BR"` or `"en-US"`), the language of the page the request comes from. Today no
  field or header carries the page's language to the API. This is the same field the password reset request adds
  (SPEC-0012 R11, §7). Without it the code e-mail is in pt-BR; any other value is 422 `locale.invalid` (§9 Q15).
  Response 202, no payload.
- **Confirm e-mail change** (new): request `email` (string, trimmed and lowercased), `code` (6 digits). Response 200
  with the Profile.
- **Shared field rules**: name, surname and apelido use the same rules in registration and in the profile. Adding the
  maximum lengths (§9 Q9) means registration also starts refusing values over them. The contract shape is unchanged.
- **Error keys**: the new keys of §6 join the shared list of error codes.
- **Paths**: proposed in §9 Q16. The final paths and the web app's matching routes are set in `/plan`.

## 8. UI states

| Screen | State | Behavior | Copy key |
| --- | --- | --- | --- |
| Profile | signed out | Browser sent to sign-in, returning to the profile afterwards | — |
| Profile | loading | "Carregando seu perfil…" in place of the sections | `profile.loading` |
| Profile | load failed (not 401) | "Não foi possível carregar seu perfil." and "Tentar novamente" | `profile.error`, `profile.retry` |
| Profile | session gone during load | Browser sent to sign-in, returning to the profile | — |
| Profile | empty | — (every account has every shown field) | — |
| Profile | ready | Title, "Minhas organizações", "Dados pessoais" (fields filled), "E-mail" (current address) | `profile.title`, `profile.back`, `profile.personal.*`, `profile.email.title` |
| Dados pessoais | unchanged | "Salvar alterações" disabled | `profile.personal.save` |
| Dados pessoais | invalid value (page check or 422) | Message under the field; nothing saved | `validation.name.required`, `validation.name.max`, `validation.surname.required`, `validation.surname.max`, `validation.slug.required`, `validation.slug.pattern`, `validation.slug.max` |
| Dados pessoais | apelido taken (409) | Message under "Apelido"; typed values kept | `validation.slug.taken` |
| Dados pessoais | saving | Button disabled, "Salvando…" | `profile.personal.saving` |
| Dados pessoais | saved | Toast "Perfil atualizado."; fields show stored values; button disabled | `profile.toast.saved` |
| Dados pessoais | save failed (500 or unreachable) | Toast; typed values kept; button enabled | `validation.unexpected`, `validation.network.unavailable` |
| E-mail | idle, account with password | Current e-mail and "Alterar e-mail" | `profile.email.change` |
| E-mail | idle, account without password | Current e-mail and the explanation; no "Alterar e-mail" | `profile.email.needsPassword` |
| E-mail | form | "Novo e-mail", "Senha atual", "Enviar código", "Cancelar" | `profile.email.new`, `profile.email.currentPassword`, `profile.email.sendCode`, `profile.email.cancel` |
| E-mail | sending | "Enviar código" disabled, "Enviando…" | `profile.email.sending` |
| E-mail | request refused | Message under the field, or toast for errors without a field; user stays signed in | `validation.email.required`, `validation.email.invalid`, `validation.email.unchanged`, `validation.email.taken`, `validation.currentPassword.required`, `validation.currentPassword.invalid`, `validation.account.no-password`, `validation.account.locked`, `validation.code.rate-limited` |
| E-mail | code sent | "Enviamos um código de 6 dígitos para {email}", "Código", "Confirmar", "Reenviar código", "Cancelar" | `profile.email.codeSent`, `profile.email.code`, `profile.email.confirm`, `profile.email.resend`, `profile.email.cancel` |
| E-mail | resend waiting | "Reenviar código" disabled until the wait of R8 has passed | `profile.email.resend` |
| E-mail | confirming | "Confirmar" disabled, "Confirmando…" | `profile.email.confirming` |
| E-mail | code refused | Message under "Código" | `validation.code.required`, `validation.code.length`, `validation.code.invalid`, `validation.code.expired`, `validation.code.attempts` |
| E-mail | address taken at confirmation (409 `email.taken`) | Toast, because "Novo e-mail" is not on the code step; the code step stays open; e-mail unchanged | `validation.email.taken` |
| E-mail | changed | Toast "E-mail alterado para {email}."; form closed; new e-mail shown | `profile.email.changedToast` |
| E-mail | request or confirmation failed (500 or unreachable) | Toast; form and typed values kept | `validation.unexpected`, `validation.network.unavailable` |
| Code e-mail | sent | Subject, title, text, code, expiry, footer | `emails.email-change-code.*` |

New copy (proposed keys; `/plan` may rename them). en-US says "workspace" where pt-BR says "organização", as the
existing copy does:

| Key | pt-BR | en-US |
| --- | --- | --- |
| `profile.title` | Meu perfil | My profile |
| `profile.back` | Minhas organizações | My workspaces |
| `profile.loading` | Carregando seu perfil… | Loading your profile… |
| `profile.error` | Não foi possível carregar seu perfil. | We couldn't load your profile. |
| `profile.retry` | Tentar novamente | Try again |
| `profile.personal.title` | Dados pessoais | Personal details |
| `profile.personal.name` | Nome | First name |
| `profile.personal.surname` | Sobrenome | Last name |
| `profile.personal.slug` | Apelido | Nickname |
| `profile.personal.slugHint` | Use letras minúsculas, números e hifens. | Use lowercase letters, numbers and hyphens. |
| `profile.personal.save` | Salvar alterações | Save changes |
| `profile.personal.saving` | Salvando… | Saving… |
| `profile.toast.saved` | Perfil atualizado. | Profile updated. |
| `profile.email.title` | E-mail | Email |
| `profile.email.change` | Alterar e-mail | Change email |
| `profile.email.needsPassword` | Sua conta entra com o Google. Para alterar o e-mail, saia da conta e crie uma senha em “Esqueci minha senha”. | Your account signs in with Google. To change your email, sign out and create a password with “Forgot password”. |
| `profile.email.new` | Novo e-mail | New email |
| `profile.email.currentPassword` | Senha atual | Current password |
| `profile.email.sendCode` | Enviar código | Send code |
| `profile.email.sending` | Enviando… | Sending… |
| `profile.email.codeSent` | Enviamos um código de 6 dígitos para {email}. | We sent a 6-digit code to {email}. |
| `profile.email.code` | Código | Code |
| `profile.email.confirm` | Confirmar | Confirm |
| `profile.email.confirming` | Confirmando… | Confirming… |
| `profile.email.resend` | Reenviar código | Resend code |
| `profile.email.cancel` | Cancelar | Cancel |
| `profile.email.changedToast` | E-mail alterado para {email}. | Email changed to {email}. |
| `validation.name.max` | O nome deve ter no máximo 80 caracteres. | First name must be at most 80 characters. |
| `validation.surname.max` | O sobrenome deve ter no máximo 80 caracteres. | Last name must be at most 80 characters. |
| `validation.slug.max` | O apelido deve ter no máximo 48 caracteres. | Nickname must be at most 48 characters. |
| `validation.email.unchanged` | Este já é o seu e-mail. | This is already your email. |
| `validation.currentPassword.required` | Informe sua senha atual. | Enter your current password. |
| `validation.currentPassword.invalid` | Senha atual incorreta. | Current password is incorrect. |
| `emails.email-change-code.subject` | Confirme seu novo e-mail no Planici | Confirm your new email for Planici |
| `emails.email-change-code.preview` | Planici \| Confirme seu novo e-mail | Planici \| Confirm your new email |
| `emails.email-change-code.body.title` | Confirme seu novo e-mail | Confirm your new email |
| `emails.email-change-code.body.subtitle` | Digite o código abaixo no Planici para passar a usar este endereço na sua conta. | Enter the code below in Planici to start using this address on your account. |
| `emails.email-change-code.body.expiration` | Este código expira em {minutes, plural, one {# minuto} other {# minutos}}. | This code expires in {minutes, plural, one {# minute} other {# minutes}}. |
| `emails.email-change-code.body.footer` | Se você não pediu esta alteração, ignore este e-mail. O e-mail da conta continua o mesmo. | If you didn't ask for this change, ignore this email. Your account's email stays the same. |

Reused copy: the existing `validation.*` keys listed in the table above, and `emails.verification-code.slogan`. The
account menu's `shell.account.profile` ("Perfil") and the not-found page's `not-found.profile` ("Ir ao perfil") are
unchanged.

## 9. Open questions

| # | Question | Proposed answer | Blocks |
| --- | --- | --- | --- |
| 1 | RF-04 lists "foto". RFC §5 ("Object storage (AWS S3)") puts the profile photo in object storage, with signed URLs that expire and size and type limits (a MIME allowlist) checked on upload, and owner memory confirms AWS S3. RFC §2.7 (Arquitetura: "AWS S3 para foto de perfil") and §7 (M2: "perfil do usuário com foto no AWS S3 (RF-04)") put the photo in the MVP. The RFC sets no limit, no types, no place where the photo shows and no way to remove it, and the storage does not exist yet. Include the photo here? | No. A separate spec, "Foto de perfil", phase MVP (RFC §2.7, §7 M2), covers upload, the size and type limits, where it shows (profile page and account button, SPEC-0008 §9 Q5), removal, deleting the stored file, and the storage the owner sets up. This spec leaves the photo as it is today (none; `avatarUrl` stays null). RF-04 stays partly satisfied until that spec is done. | Yes: §2 scope |
| 2 | RF-04 and UC-04 put "informações do negócio" under the profile, but RFC §4.1 says the profile is independent of the tenant and one user can run several businesses. RFC §6.2 lists the business data as tenant data (name, slug, área de atuação; área de atuação is RF-43, Pós-MVP). The API can already rename an organization, but no screen uses it (verified 2026-11-27). Is "informações do negócio" organization data or new account fields? | Organization data, edited per organization in a separate organization settings spec: rename now, área de atuação when RF-43 arrives. The profile has no business fields. | Yes: §2 scope |
| 3 | RF-04 says "dados de contato". The only contact datum an account stores is its e-mail. RFC §6.2 ("Dados do profissional") lists no phone or address for the professional, RNF-15 asks for nothing beyond the functional minimum, and no requirement uses a professional's phone. | Contact data means the e-mail (R7 to R12). No phone field. A phone arrives with the first requirement that uses it (for example notifications, Pós-MVP). | Yes: R3, §2 scope, AC-0011-73 |
| 4 | How does an e-mail change work? The e-mail is the sign-in identifier and the password recovery channel (RF-03). A reset works for every active account, Google-only ones included (verified 2026-11-27), so whoever changes the e-mail can then take over the account through a reset. This question rests on SPEC-0012 §9 Q6(a), which proposes that Google-only accounts can reset their password: if the owner decides otherwise there, the takeover path and the explanation of 4.1 step 4 (`profile.email.needsPassword`) change. Options: (a) the session alone is enough; (b) a code proves the new address (R7) and the current password confirms the request (R9), and accounts without a password cannot change their e-mail in the MVP; (c) as (b), but accounts without a password confirm with a new Google sign-in; (d) no self-service change in the MVP, only on request through the DPO channel (RFC §6.2). | (b). It reuses the registration code and the existing keys, and blocks a takeover from an open session. (c) needs its own Google re-confirmation flow. (d) leaves RF-04's contact data read-only. Adds `hasPassword` to the profile response (§7). | Yes: R7 to R12, AC-0011-10, AC-0011-24 to -44, AC-0011-54 to -71, AC-0011-75 to -79 |
| 5 | Google sign-in finds the account by its linked Google account first. Failing that, it links a Google account whose verified e-mail equals the account's e-mail (as built). What happens after an e-mail change? | Keep as built. A linked Google account keeps signing in (AC-0011-28). After the change, an unlinked Google account with the new address links on first Google sign-in, and one with the old address no longer reaches the account. No unlinking in this spec. | R12, AC-0011-28 |
| 6 | Should an e-mail change end other sessions, or notify the old address? RFC §6.1 ends sessions on logout and password change only, and RFC §2.7 limits MVP account e-mails to verification and recovery. The code e-mail of R13 counts as verification, because it verifies the new address; a notice to the old address would be a third kind of account e-mail. | Neither in the MVP. With the password confirmation of Q4 (b), a notice adds little. Revisit with the audit work (Q12). | R12, AC-0011-68 |
| 7 | (a) Why does a wrong current password answer 400 `currentPassword.invalid` and not 401 `credentials.invalid`? (b) Should a wrong current password count toward the per-account sign-in lockout? SPEC-0012 §2 keeps the lockout rules unchanged for the reset flow, so this spec is the one that would change them (R9). | (a) Because the web app treats every 401 as a lost session: it renews the session and repeats the request once (verified 2026-11-27). That would send the password twice and could sign the user out. 400 is the convention's status for domain refusals (like `code.invalid`). (b) Yes. Each wrong current password counts toward the per-account sign-in lockout (today 5 failures, 15 minutes; RFC §6.1), which answers 429 `account.locked` (AC-0011-43). Without it, the request would let anyone holding an open session guess the password without limit. | R9, AC-0011-29, AC-0011-43, AC-0011-58, AC-0011-78 |
| 8 | RFC §4.2 (Registro passo 4) and §6.2 describe one datum, "apelido ou nome de exibição". As built, registration stores the apelido as a unique handle restricted to lowercase letters, digits and hyphens, never sets a separate display name, and answers name + surname as the display name. `docs/schema.dbml` has a display name and no handle. | Keep as built. The profile edits the apelido with registration's rules and uniqueness (R4, R5). There is no separate display-name field, and the displayed name stays name + surname. Align the DBML (Q13). | R4, R5, AC-0011-15 to -19 |
| 9 | Registration sets no maximum length for name, surname or apelido. | Name and surname at most 80 characters, apelido at most 48 (the organization name and slug limits). Registration gets the same limits, because both use one rule (§7). An existing longer value still shows, and the next save asks to shorten it. | R4, §2 scope, AC-0011-17, AC-0011-72 (registration) |
| 10 | Keep the address `/{lang}/@me`? As built (2026-11-27), the page answers only at the percent-encoded address `/{lang}/%40me`. Browsers and the app's links send `@` unencoded, so every link to the profile ends on the not-found page, including the not-found page's own "Ir ao perfil". The encoded address reaches the placeholder, and the sign-in redirect does not apply to it. Evidence: §11, "Notes for /plan". | Keep `/{lang}/@me`: three links and AC-0008-23 already use it. `/plan` makes that address reach the page. The encoded spelling `/{lang}/%40me` reaches nothing: it shows the not-found page and no profile data (R14, AC-0011-07). The alternative is a plain address (for example `/{lang}/perfil`), which needs the three links changed and SPEC-0008 AC-0008-23 amended. | R14, AC-0011-01 to -07 |
| 11 | Signed-in visits to `/` and to the sign-in and registration pages are sent to `/@me`, while a completed sign-in goes to `/orgs` (as built). Once the profile works, those visits land on the profile. Intended? | Out of scope here. Keep as built. Pointing them to `/orgs` like the sign-in default is a small follow-up the owner can pick. | No |
| 12 | RNF-11 asks to log "alteração de dados" with timestamp, user and IP, but no audit log exists (SPEC-0009 §2). | Out of scope. The future audit spec covers profile and e-mail changes, using the client address of SPEC-0009. | No |
| 13 | `docs/schema.dbml` `users` lacks the name, surname, apelido handle and the e-mail verification and password change times that the database has. RFC §6.2 calls self-service "alteração de dados cadastrais" a future version, while RF-04 is MVP. | RF-04 and §2.7 prevail. Align the DBML and RFC §6.2 in an editorial change. | No |
| 14 | RFC §4 has no profile screen. The only profile mockup was the sidebar block that SPEC-0008 removed. | Use the layout of §4.1 (one page, two sections) built from the existing form components. A Figma frame can follow and amend §8. | No |
| 15 | Registration's code e-mail always goes out in English (as built, marked as a to-do in the code). Which language does the e-mail-change code use? Today no field or header carries the page's language to the API. | The language of the page the change was requested from (pt-BR or en-US), carried by an optional `locale` on the request, as SPEC-0012 proposes for the reset request (§7). pt-BR without it; any other value is 422 `locale.invalid`. | R13, §7, AC-0011-44, AC-0011-71 |
| 16 | Contract placement. | Paths next to the existing `GET /auth/me`: `PATCH /auth/me` (update), `POST /auth/me/email/code` (request), `POST /auth/me/email` (confirm). The alternative is a `/users/me` resource. A save always sends all three personal fields, as organization rename sends its name. There are no partial updates and no revision check, because one person edits a profile (R6). Final paths in `/plan`. | R6 |
| 17 | The access token carries the e-mail it was issued with, so after a change it holds the old one until the next renewal. | Accept. Nothing in the API reads it for a decision today (checked 2026-11-27); `/plan` confirms nothing starts to. | No |
| 18 | R8's wait between two codes: per address or per account, and shared with registration codes for the same address? The RFC states no wait. As built, registration's 60-second wait counts per address, whoever asks, and only among registration codes (verified 2026-11-27). | Per address, as in registration: once an e-mail change code goes to an address, no account gets another one sent there for 60 seconds (AC-0011-63), and a request for a different address needs no wait (AC-0011-40). Separate from registration's wait: neither kind of code holds the other back (AC-0011-64), so registration is unchanged. The alternatives are a per-account wait (a user could not quickly fix a typo in the new address) or one wait shared by both kinds of code (registration would then refuse a request it accepts today). | R8, AC-0011-35, AC-0011-40, AC-0011-56, AC-0011-63, AC-0011-64, AC-0011-79 |

## 10. Acceptance criteria

The ACs encode the proposed answers of §9. An owner decision that differs amends the ACs that question lists before
approval. Fixtures: "Ana" is an active account with e-mail "ana@example.com", name "Ana", surname "Souza", apelido
"ana-souza" and password "Senha#2026", linked to no Google account unless stated. "Bruno" has "bruno@example.com" and
apelido "bruno". "Carla" has "carla@example.com" and signs in only with Google (no password). All are fictional.
"Code e-mail" means the e-mail of R13.

### Reaching the page

```gherkin
AC-0011-01
Given Ana is signed in, inside her organization "studio-ana", in pt-BR
When  she chooses "Perfil" in the account menu
Then  the browser is on "/pt-BR/@me"
And   the page shows "Meu perfil" with Nome "Ana", Sobrenome "Souza", Apelido "ana-souza" and E-mail "ana@example.com"
And   the not-found page is not shown
```

```gherkin
AC-0011-02
Given Ana is signed in
When  the browser loads "/pt-BR/@me" directly
Then  the response is 200
And   the page shows "Meu perfil" with Ana's data
```

```gherkin
AC-0011-03
Given Ana is signed in
When  the browser loads "/en-US/@me"
Then  the page shows "My profile", "Personal details", "First name", "Last name" and "Nickname"
```

```gherkin
AC-0011-04
Given Ana is signed in and on the not-found page
When  she follows "Ir ao perfil"
Then  the browser is on "/pt-BR/@me" and shows her profile
```

```gherkin
AC-0011-05
Given no session
When  the browser opens "/pt-BR/@me"
Then  the browser ends on "/pt-BR/login" with "next" set to "/@me"
And   no profile data was shown
```

```gherkin
AC-0011-06
Given the browser was sent from "/pt-BR/@me" to "/pt-BR/login" with "next" set to "/@me"
When  Ana signs in there with "ana@example.com" and "Senha#2026"
Then  the browser ends on "/pt-BR/@me" showing her profile
```

```gherkin
AC-0011-07
Given no session
When  the browser opens "/pt-BR/%40me"
Then  the browser ends on the not-found page
And   no profile data is shown
```

```gherkin
AC-0011-08
Given Ana belongs to no organization
When  she opens "/pt-BR/@me"
Then  the page shows her profile
And   she is not sent to organization creation
```

```gherkin
AC-0011-09
Given Ana is on her profile
When  she follows "Minhas organizações"
Then  the browser is on "/pt-BR/orgs"
```

### Reading and changing the profile (API)

```gherkin
AC-0011-10
Given the account <account>
When  it reads its profile
Then  the response is 200 with email "<email>" and hasPassword <hasPassword>

Examples:
  | account | email             | hasPassword |
  | Ana     | ana@example.com   | true        |
  | Carla   | carla@example.com | false       |
```

```gherkin
AC-0011-11
Given Ana
When  she updates her profile with name "Ana Clara", surname "Lima" and slug "ana-clara"
Then  the response is 200 with name "Ana Clara", surname "Lima", slug "ana-clara", displayName "Ana Clara Lima" and email "ana@example.com"
And   reading her profile afterwards returns the same values
```

```gherkin
AC-0011-12
Given Ana
When  she updates her profile with name "  Ana  ", surname " Souza " and slug "ana-souza"
Then  the response is 200 with name "Ana" and surname "Souza"
```

```gherkin
AC-0011-13
Given Ana
When  she updates her profile with name "   ", surname "Souza" and slug "ana-souza"
Then  the response is 422 with { "error": "name.required", "field": "name" }
And   her profile is unchanged
```

```gherkin
AC-0011-14
Given Ana
When  she updates her profile with name "Ana" and slug "ana-souza" and no surname
Then  the response is 422 with { "error": "surname.required", "field": "surname" }
And   her profile is unchanged
```

```gherkin
AC-0011-15
Given Ana
When  she updates her profile with name "Ana", surname "Souza" and slug ""
Then  the response is 422 with { "error": "slug.required", "field": "slug" }
And   her profile is unchanged
```

```gherkin
AC-0011-16
Given Ana
When  she updates her profile with name "Ana", surname "Souza" and slug "Ana Souza"
Then  the response is 422 with { "error": "slug.pattern", "field": "slug" }
And   her profile is unchanged
```

```gherkin
AC-0011-17
Given Ana
When  she updates her profile with <field> set to a value of <length> characters and the other fields valid
Then  the response is 422 with { "error": "<key>", "field": "<field>" }
And   her profile is unchanged

Examples:
  | field   | length | key         |
  | name    | 81     | name.max    |
  | surname | 81     | surname.max |
  | slug    | 49     | slug.max    |
```

```gherkin
AC-0011-18
Given Ana and Bruno, whose apelido is "bruno"
When  Ana updates her profile with name "Ana Maria", surname "Souza" and slug "bruno"
Then  the response is 409 with { "error": "slug.taken", "field": "slug" }
And   Ana's apelido is still "ana-souza"
And   her name is still "Ana"
```

```gherkin
AC-0011-19
Given Ana
When  she updates her profile with name "Ana Maria", surname "Souza" and her own slug "ana-souza"
Then  the response is 200 with name "Ana Maria" and slug "ana-souza"
```

```gherkin
AC-0011-20
Given Ana and Bruno
When  Ana updates her profile with name "Ana Maria", surname "Souza", slug "ana-souza", and also id set to Bruno's id, email "outra@example.com" and status "suspended"
Then  the response is 200 with Ana's id, name "Ana Maria" and email "ana@example.com"
And   Ana's account is still active
And   Bruno's profile is unchanged
```

```gherkin
AC-0011-21
Given a request with no access token
When  it <action>
Then  the response is 401 with { "error": "token.invalid" }
And   no profile is changed

Examples:
  | action                                                                        |
  | reads a profile                                                               |
  | updates a profile with name "Ana Maria", surname "Souza" and slug "ana-souza" |
```

```gherkin
AC-0011-22
Given Ana's account is suspended and her access token has not expired
When  she updates her profile with name "Ana Maria", surname "Souza" and slug "ana-souza"
Then  the response is 403 with { "error": "account.inactive" }
And   her name is still "Ana"
```

```gherkin
AC-0011-23
Given Ana belongs to no organization, and Bruno owns the organization "studio-bruno"
When  Ana updates her profile with name "Ana Maria", surname "Souza" and slug "ana-souza", <header>
Then  the response is 200 with name "Ana Maria"
And   "studio-bruno" and Bruno's profile are unchanged

Examples:
  | header                                             |
  | with no organization header                        |
  | with the organization header naming "studio-bruno" |
```

### Changing the e-mail (API)

```gherkin
AC-0011-24
Given Ana
When  she requests an e-mail change to "ana.lima@example.com" with current password "Senha#2026"
Then  the response is 202 with no payload
And   exactly one code e-mail is sent, to "ana.lima@example.com"
And   reading her profile still returns email "ana@example.com"
```

```gherkin
AC-0011-25
Given Ana requested an e-mail change to "ana.lima@example.com" and received code "482913"
When  she confirms the change with email "ana.lima@example.com" and code "482913"
Then  the response is 200 with email "ana.lima@example.com" and emailVerified true
```

```gherkin
AC-0011-26
Given Ana changed her e-mail to "ana.lima@example.com"
When  someone signs in with "ana.lima@example.com" and "Senha#2026"
Then  the response is 200 with a session for Ana
```

```gherkin
AC-0011-27
Given Ana changed her e-mail to "ana.lima@example.com"
When  someone signs in with "ana@example.com" and "Senha#2026"
Then  the response is 401 with { "error": "credentials.invalid", "field": "password" }
```

```gherkin
AC-0011-28
Given Ana has a linked Google account and changed her e-mail to "ana.lima@example.com"
When  she signs in with that Google account
Then  the response is 200 with a session for Ana
```

```gherkin
AC-0011-29
Given Ana
When  she requests an e-mail change to "ana.lima@example.com" with current password "Errada#2026"
Then  the response is 400 with { "error": "currentPassword.invalid", "field": "currentPassword" }
And   no code e-mail is sent
```

```gherkin
AC-0011-30
Given Ana
When  she requests an e-mail change to "ana.lima@example.com" with no current password
Then  the response is 422 with { "error": "currentPassword.required", "field": "currentPassword" }
And   no code e-mail is sent
```

```gherkin
AC-0011-31
Given Carla, who has no password
When  she requests an e-mail change to "carla.nova@example.com" with current password "Qualquer#1"
Then  the response is 409 with { "error": "account.no-password", "field": "currentPassword" }
And   no code e-mail is sent
```

```gherkin
AC-0011-32
Given Ana and Bruno
When  Ana requests an e-mail change to " BRUNO@example.com " with current password "Senha#2026"
Then  the response is 409 with { "error": "email.taken", "field": "email" }
And   no code e-mail is sent
```

```gherkin
AC-0011-33
Given Ana
When  she requests an e-mail change to "ANA@example.com" with current password "Senha#2026"
Then  the response is 422 with { "error": "email.unchanged", "field": "email" }
And   no code e-mail is sent
```

```gherkin
AC-0011-34
Given Ana
When  she requests an e-mail change to "ana@" with current password "Senha#2026"
Then  the response is 422 with { "error": "email.invalid", "field": "email" }
```

```gherkin
AC-0011-35
Given Ana requested an e-mail change to "ana.lima@example.com" 30 seconds ago
When  she requests the same change again with current password "Senha#2026"
Then  the response is 429 with { "error": "code.rate-limited" }
And   no second code e-mail is sent
```

```gherkin
AC-0011-36
Given Ana requested an e-mail change to "ana.lima@example.com" and received code "482913"
When  she confirms with email "ana.lima@example.com" and code "000000"
Then  the response is 400 with { "error": "code.invalid", "field": "code" }
And   her e-mail is still "ana@example.com"
```

```gherkin
AC-0011-37
Given Ana requested an e-mail change to "ana.lima@example.com" 16 minutes ago and received code "482913"
When  she confirms with email "ana.lima@example.com" and code "482913"
Then  the response is 400 with { "error": "code.expired", "field": "code" }
And   her e-mail is still "ana@example.com"
```

```gherkin
AC-0011-38
Given Ana requested an e-mail change to "ana.lima@example.com", received code "482913", and entered 5 wrong codes
When  she confirms with email "ana.lima@example.com" and code "482913"
Then  the response is 429 with { "error": "code.attempts", "field": "code" }
And   her e-mail is still "ana@example.com"
```

```gherkin
AC-0011-39
Given Ana requested an e-mail change to "nova@example.com" and received code "482913"
When  Bruno confirms an e-mail change with email "nova@example.com" and code "482913"
Then  the response is 400 with { "error": "code.invalid", "field": "code" }
And   Bruno's e-mail is still "bruno@example.com"
```

```gherkin
AC-0011-40
Given Ana requested an e-mail change to "ana.lima@example.com" and received code "482913"
And   10 seconds later she requested a change to "ana.souza@example.com", which was accepted
When  she confirms with email "ana.lima@example.com" and code "482913"
Then  the response is 400 with { "error": "code.invalid", "field": "code" }
And   her e-mail is still "ana@example.com"
```

```gherkin
AC-0011-41
Given Ana requested an e-mail change to "nova@example.com" and received code "482913"
And   another person then registered an account with "nova@example.com"
When  Ana confirms with email "nova@example.com" and code "482913"
Then  the response is 409 with { "error": "email.taken", "field": "email" }
And   her e-mail is still "ana@example.com"
```

```gherkin
AC-0011-42
Given a request with no access token
When  it <action>
Then  the response is 401 with { "error": "token.invalid" }
And   no code e-mail is sent and no e-mail is changed

Examples:
  | action                                                                                 |
  | requests an e-mail change to "ana.lima@example.com" with current password "Senha#2026" |
  | confirms an e-mail change with email "ana.lima@example.com" and code "482913"          |
```

```gherkin
AC-0011-43
Given Ana has sent 5 e-mail change requests with a wrong current password within the lockout window
When  she requests an e-mail change to "ana.lima@example.com" with current password "Senha#2026"
Then  the response is 429 with { "error": "account.locked" }
And   no code e-mail is sent
```

```gherkin
AC-0011-44
Given Ana requested an e-mail change to "ana.lima@example.com" <origin>
When  the code e-mail arrives at "ana.lima@example.com"
Then  its subject is "<subject>" and it shows the title "<title>", the 6-digit code and the expiry in minutes
And   it does not contain "<registration text>"

Examples:
  | origin             | subject                             | title                    | registration text                      |
  | from a pt-BR page  | Confirme seu novo e-mail no Planici | Confirme seu novo e-mail | continuar criando sua conta            |
  | from an en-US page | Confirm your new email for Planici  | Confirm your new email   | continue creating your Planici account |
  | with no language   | Confirme seu novo e-mail no Planici | Confirme seu novo e-mail | continuar criando sua conta            |
```

```gherkin
AC-0011-63
Given Ana requested an e-mail change to "nova@example.com" 30 seconds ago
When  Bruno requests an e-mail change to "nova@example.com" with his correct current password
Then  the response is 429 with { "error": "code.rate-limited" }
And   Ana's code e-mail is the only one sent to "nova@example.com"
```

```gherkin
AC-0011-64
Given <earlier> 30 seconds ago
When  <later>
Then  the response is 202
And   a code e-mail for that later request is sent to "nova@example.com"

Examples:
  | earlier                                                      | later                                                                                  |
  | Ana requested an e-mail change to "nova@example.com"         | someone asks for a registration code for "nova@example.com"                            |
  | someone asked for a registration code for "nova@example.com" | Ana requests an e-mail change to "nova@example.com" with current password "Senha#2026" |
```

```gherkin
AC-0011-65
Given Ana requested an e-mail change to "ana.lima@example.com" 2 minutes ago and received code "482913"
And   her account was then suspended, and her access token has not expired
When  she <action>
Then  the response is 403 with { "error": "account.inactive" }
And   no code e-mail is sent
And   her e-mail is still "ana@example.com"

Examples:
  | action                                                                                   |
  | requests an e-mail change to "ana.souza@example.com" with current password "Senha#2026" |
  | confirms with email "ana.lima@example.com" and code "482913"                             |
```

```gherkin
AC-0011-66
Given Ana's browser reaches the platform from the client address "203.0.113.7"
When  she requests an e-mail change to "ana.lima@example.com" with current password "Senha#2026"
Then  the stored change request for "ana.lima@example.com" holds the address "203.0.113.7"
```

```gherkin
AC-0011-67
Given Ana changed her e-mail to "ana.lima@example.com"
When  a password reset link is requested for "<address>"
Then  <outcome>

Examples:
  | address              | outcome                                                      |
  | ana.lima@example.com | exactly one reset e-mail is sent, to "ana.lima@example.com" |
  | ana@example.com      | no reset e-mail is sent                                      |
```

```gherkin
AC-0011-68
Given Ana is signed in on two devices
And   on the first she changed her e-mail to "ana.lima@example.com"
When  the second device renews its session
Then  the response is 200 with a session for Ana
And   the session's user has email "ana.lima@example.com"
```

```gherkin
AC-0011-69
Given Ana requested an e-mail change to "ana.lima@example.com" and received code "482913"
And   61 seconds later she requested the same change again and received code "731594"
When  she confirms with email "ana.lima@example.com" and code "482913"
Then  the response is 400 with { "error": "code.invalid", "field": "code" }
And   her e-mail is still "ana@example.com"
```

```gherkin
AC-0011-70
Given Ana changed her e-mail to "ana.lima@example.com" by confirming code "482913"
When  she confirms with email "ana.lima@example.com" and code "482913" again
Then  the response is 400 with { "error": "code.invalid", "field": "code" }
And   her e-mail is still "ana.lima@example.com"
```

```gherkin
AC-0011-71
Given Ana
When  she requests an e-mail change to "ana.lima@example.com" with current password "Senha#2026" and language "fr-FR"
Then  the response is 422 with { "error": "locale.invalid", "field": "locale" }
And   no code e-mail is sent
```

### Registration limits (API)

```gherkin
AC-0011-72
Given a person proved the address "nova@example.com" with a registration code
When  they register with that address, a name of 81 characters, surname "Lima", apelido "nova-lima", a valid password and the terms accepted
Then  the response is 422 with { "error": "name.max", "field": "name" }
And   no account with "nova@example.com" exists
```

### Profile page states

```gherkin
AC-0011-45
Given Ana is signed in and her profile has not answered yet
When  she opens "/pt-BR/@me"
Then  the page shows "Carregando seu perfil…" (profile.loading) and no form
```

```gherkin
AC-0011-46
Given reading Ana's profile fails with <failure>
When  she opens "/pt-BR/@me"
Then  the page shows "Não foi possível carregar seu perfil." (profile.error) and "Tentar novamente" (profile.retry)
And   choosing "Tentar novamente" requests the profile again

Examples:
  | failure                             |
  | 500                                 |
  | 403 { "error": "account.inactive" } |
```

```gherkin
AC-0011-47
Given Ana's session can no longer be renewed
When  she opens "/pt-BR/@me"
Then  the browser ends on "/pt-BR/login" with "next" set to "/@me"
```

```gherkin
AC-0011-48
Given Ana's profile has loaded
When  no field differs from the stored values
Then  "Salvar alterações" is disabled
```

```gherkin
AC-0011-49
Given Ana changed Nome to "Ana Maria" and the save has not answered yet
When  she has chosen "Salvar alterações"
Then  the button shows "Salvando…" (profile.personal.saving) and is disabled
```

```gherkin
AC-0011-50
Given Ana changed Nome to " Ana Maria "
When  she chooses "Salvar alterações" and the save succeeds
Then  the toast "Perfil atualizado." (profile.toast.saved) is shown
And   Nome shows "Ana Maria"
And   "Salvar alterações" is disabled
```

```gherkin
AC-0011-51
Given Ana cleared Nome
When  she chooses "Salvar alterações"
Then  "Informe seu nome." (validation.name.required) shows under Nome
And   her stored name is still "Ana"
```

```gherkin
AC-0011-52
Given Ana changed Apelido to "bruno", which Bruno uses
When  she chooses "Salvar alterações"
Then  "Esse apelido já está em uso." (validation.slug.taken) shows under Apelido
And   Apelido still shows "bruno"
```

```gherkin
AC-0011-53
Given Ana changed Nome to "Ana Maria"
When  she chooses "Salvar alterações" and <failure>
Then  the toast with <key> is shown
And   Nome still shows "Ana Maria" and "Salvar alterações" is enabled

Examples:
  | failure                        | key                          |
  | the save fails with 500        | validation.unexpected        |
  | the server cannot be reached   | validation.network.unavailable |
```

```gherkin
AC-0011-54
Given Ana's profile has loaded
When  she chooses "Alterar e-mail"
Then  the E-mail section shows "Novo e-mail", "Senha atual", "Enviar código" and "Cancelar"
```

```gherkin
AC-0011-55
Given Ana filled "Novo e-mail" with "ana.lima@example.com" and "Senha atual" with "Senha#2026"
When  she chooses "Enviar código" and the request is accepted
Then  the section shows "Enviamos um código de 6 dígitos para ana.lima@example.com." (profile.email.codeSent)
And   it shows "Código", "Confirmar", "Reenviar código" and "Cancelar"
```

```gherkin
AC-0011-56
Given the code for "ana.lima@example.com" was sent 30 seconds ago
When  Ana looks at the code step
Then  "Reenviar código" is disabled
And   it becomes enabled once 60 seconds have passed since the code was sent
```

```gherkin
AC-0011-57
Given Ana is on the code step for "ana.lima@example.com"
When  she enters the right code and chooses "Confirmar"
Then  the toast "E-mail alterado para ana.lima@example.com." (profile.email.changedToast) is shown
And   the E-mail section shows "ana.lima@example.com" and no form
```

```gherkin
AC-0011-58
Given Ana filled "Novo e-mail" with "ana.lima@example.com" and "Senha atual" with "Errada#2026"
When  she chooses "Enviar código"
Then  "Senha atual incorreta." (validation.currentPassword.invalid) shows under "Senha atual"
And   the browser is still on "/pt-BR/@me" and Ana is still signed in
```

```gherkin
AC-0011-59
Given Carla, who has no password, opens her profile
When  the profile has loaded
Then  the E-mail section shows "carla@example.com" and the explanation profile.email.needsPassword
And   no "Alterar e-mail" control is shown
```

```gherkin
AC-0011-60
Given Ana is on the code step for "ana.lima@example.com"
When  she enters "000000" and chooses "Confirmar"
Then  "Código incorreto. Confira e tente de novo." (validation.code.invalid) shows under "Código"
And   the E-mail section still lists "ana@example.com" as her e-mail
```

```gherkin
AC-0011-61
Given Ana is on the code step for "ana.lima@example.com"
When  she chooses "Cancelar"
Then  the E-mail section shows "ana@example.com" and "Alterar e-mail", and no form
And   reading her profile returns email "ana@example.com"
```

```gherkin
AC-0011-62
Given Ana changed her e-mail to "ana.lima@example.com" on her profile
When  she opens her organization "studio-ana" and opens the account menu
Then  the menu's e-mail line shows "ana.lima@example.com"
```

```gherkin
AC-0011-73
Given Ana's profile has loaded
When  she has not chosen "Alterar e-mail"
Then  the only inputs on the page are "Nome", "Sobrenome" and "Apelido"
```

```gherkin
AC-0011-74
Given Ana's profile has loaded on a viewport <width> wide
When  she chooses "Alterar e-mail"
Then  every label, field and button of "Dados pessoais" and "E-mail" is visible without horizontal scrolling

Examples:
  | width  |
  | 375px  |
  | 1280px |
```

```gherkin
AC-0011-75
Given Ana is on the code step for "nova@example.com"
And   another person then registered an account with "nova@example.com"
When  she enters the right code and chooses "Confirmar"
Then  the toast "Já existe uma conta com esse e-mail." (validation.email.taken) is shown
And   the code step stays open
And   the E-mail section still lists "ana@example.com" as her e-mail
```

```gherkin
AC-0011-76
Given Ana filled the <step> and its request has not answered yet
When  she has chosen "<button>"
Then  the button shows "<copy>" (<key>) and is disabled

Examples:
  | step        | button        | copy         | key                      |
  | e-mail form | Enviar código | Enviando…    | profile.email.sending    |
  | code step   | Confirmar     | Confirmando… | profile.email.confirming |
```

```gherkin
AC-0011-77
Given Ana is on the <step> showing <values>
When  she chooses "<button>" and <failure>
Then  the toast with <key> is shown
And   the <step> is still open and shows <values>

Examples:
  | step        | values                                                                    | button        | failure                         | key                            |
  | e-mail form | "ana.lima@example.com" in "Novo e-mail" and "Senha#2026" in "Senha atual" | Enviar código | the request fails with 500      | validation.unexpected          |
  | e-mail form | "ana.lima@example.com" in "Novo e-mail" and "Senha#2026" in "Senha atual" | Enviar código | the server cannot be reached    | validation.network.unavailable |
  | code step   | "482913" in "Código"                                                      | Confirmar     | the confirmation fails with 500 | validation.unexpected          |
  | code step   | "482913" in "Código"                                                      | Confirmar     | the server cannot be reached    | validation.network.unavailable |
```

```gherkin
AC-0011-78
Given Ana's account is locked after 5 wrong current passwords
And   she filled "Novo e-mail" with "ana.lima@example.com" and "Senha atual" with "Senha#2026"
When  she chooses "Enviar código"
Then  the toast "Muitas tentativas malsucedidas. Tente novamente em alguns minutos." (validation.account.locked) is shown
And   the form still shows "ana.lima@example.com"
And   Ana is still signed in
```

```gherkin
AC-0011-79
Given Ana is on the code step for "ana.lima@example.com" and 60 seconds have passed since the code was sent
When  she chooses "Reenviar código"
Then  exactly one new code e-mail is sent to "ana.lima@example.com"
And   "Reenviar código" is disabled until another 60 seconds have passed
```

## 11. Implementation plan

Written by `/plan` after the spec is Approved. Empty until then, apart from the notes below.

```scope
```

### Notes for /plan (evidence, not a plan)

Evidence gathered 2026-11-27 while drafting and reviewing. It describes the code as built and decides nothing.

- §9 Q10, the profile address. The page's folder is named `%40me`, the percent-encoded `@`, because in the App Router
  a folder starting with `@` is a parallel-route slot and adds no address segment (a folder `@me` maps to `/{lang}`).
  The framework registers `%40me` literally. The production build's route table holds `^/([^/]+?)/%40me(?:/)?$`,
  and the installed Next.js 16.3.4 route matcher, run directly, matches `/pt-BR/%40me` but not `/pt-BR/@me`. The
  web app's proxy lists `/@me` as a protected prefix and compares the path as written, so `/pt-BR/%40me` is not
  protected (read from the code, not run). Not run against a live server; the development server was not checked.
- §9 Q18, the code wait. The registration code request looks up the latest code stored for the address, whoever
  asked for it, and refuses within `EMAIL_CODE_RESEND_SECONDS` (default 60). Storing a new code invalidates any code
  still outstanding for that address.
- §7, the session shape. The shared contracts define one user shape that `GET /auth/me` returns and that sign-in,
  registration and renewal embed as `user`.

## 12. Changelog

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | 2026-11-27 | Draft. As built the same day: the API reads the signed-in user but cannot change it; the profile page is a placeholder that no link reaches, because its folder `%40me` registers only the encoded address `/{lang}/%40me` (route table and Next.js 16.3.4 matcher checked; no live server run); a password reset gives a Google-only account a password; organization rename exists in the API with no screen; the registration code e-mail is always English. |
| 0.2 | 2026-11-27 | Spec review required changes applied; still Draft, nothing approved. §9: Blocks filled for Q3, Q5 to Q10, Q15, Q16; Q1 states the photo spec is MVP (RFC §2.7, §7 M2); Q4 notes it rests on SPEC-0012 Q6(a); Q6 counts the code e-mail as "verificação de e-mail" (R13); Q7 (b) asks whether wrong current passwords extend the sign-in lockout, which SPEC-0012 leaves unchanged (R9); Q10 keeps only the address behavior, its technical evidence moved to §11 notes; new Q18 on the code wait. §3: R1 cites RN-02; R5, R8, R10, R12, R13 marked `assumption`; R3 traces RNF-15; R8 makes the 60-second wait per address and separate from registration's (as registration's own wait is per address; least new behavior); R11 says a code works once. §2: registration maximums in scope (Q9); the signed-in password change bullet now matches SPEC-0012. §7: `hasPassword` only on the Profile, the session `user` unchanged (fewer responses change); the request carries an optional `locale`, as SPEC-0012 does (Q15). §8: `emails.email-change-code.subject`; `email.taken` at confirmation is a toast (no address field on the code step). §10: AC-0011-07 picks the not-found page (the sign-in redirect covers only `/@me`); AC-0011-18, -21, -23, -40, -42, -44, -46 amended; new AC-0011-63 to -79; RNF-16 added to `satisfies` (AC-0011-74). Pending on the owner: every §9 question, Q1 to Q4 blocking scope, including new Q18 and the extended Q7. |
