---
id: SPEC-0013
title: Páginas públicas dos Termos de Serviço e da Política de Privacidade
status: Draft # Draft | Review | Approved | Implemented | Superseded
plan_status: Draft # Draft | Approved
version: 0.6
owner: Joao Izidoro
satisfies: [RNF-12]
depends_on: []
phase: MVP
ticket: -
---

# SPEC-0013 — Páginas públicas dos Termos de Serviço e da Política de Privacidade

## 1. Purpose

RNF-12 (RFC §2, "LGPD e Privacidade") asks the system to "exigir aceite explícito dos termos de uso e política de
privacidade no cadastro, com registro rastreável", measured by "Aceite registrado com timestamp e versão do documento |
Exibição obrigatória no onboarding". RFC §6.2 ("Aceite Contratual, Consentimento e Transparência") says the user must
accept the Terms of Service and the Privacy Policy during registration, that the acceptance is recorded with the
"versão do documento aceito", and lists what the Privacy Policy must explain. RFC §7 puts the "registro de
consentimento versionado (aceite de Termos/Política)" in M2.

As built (verified 2026-11-27), registration asks the person to accept both documents and links to them, and the
cookie banner links to the Privacy Policy, but neither document has a page: every one of those links ends on the "page
not found" screen. The person accepts documents they cannot read. The acceptance records also miss part of RNF-12: the
web app knows a Terms version and a Privacy Policy version, but sends only the Terms version, and the API stores it on
the Privacy Policy record too. The API accepts any version text the browser states.

This spec gives each document a public page in both languages, and makes the version stored on each acceptance record
the version of that document that its page shows. It does not write the documents' text: that comes from the owner
(§9 Q1).

## 2. Scope

**In scope**
- A public page for the Terms of Service and one for the Privacy Policy, in pt-BR and en-US, readable without signing
  in (R1, R2, R4).
- The version identifier of each document and how the page shows it (R3, R4).
- Keeping every published version's text unchanged, and checking that each current version is complete (R13, R14).
- An address for each section heading of a document, with a link to it (R15).
- The existing links to the documents: the two in the registration acceptance step and the one in the cookie banner
  (R9, R10).
- The relation between a document's current version and the acceptance record stored at registration (R5, R6),
  including the registration request field that carries the Privacy Policy version (§7).
- Addresses under the documents that do not exist (R4).

**Out of scope**
- The text of either document. The owner supplies it (§9 Q1); agents never draft it.
- A public archive of earlier versions (§9 Q4).
- Asking existing accounts to accept a new version (§9 Q5).
- A separate cookie policy (§9 Q6).
- New links to the documents elsewhere: page footers, the signed-in area, e-mails (§9 Q11).
- The privacy notice on the public booking link (RFC §6.2, "Aviso de Privacidade no Link Público"): it belongs to the
  public booking link spec.
- The client address stored on the acceptance records: SPEC-0009.
- A screen to edit the documents (R8).

## 3. Domain rules

- **R1 — Two public documents.** The platform publishes the Terms of Service at `/{lang}/terms` and the Privacy Policy
  at `/{lang}/privacy`, where `lang` is `pt-BR` or `en-US` (RFC §6.2, "Aceite Contratual, Consentimento e
  Transparência"; RNF-12). RNF-12's "termos de uso" is the Terms of Service (§9 Q10).
- **R2 — Readable by anyone.** Anyone can read both pages, signed in or not. Reading them never asks for a sign-in,
  and a signed-in user is not redirected away from them. The person must be able to read the documents before an
  account exists, because registration requires accepting them (RNF-12). The pages are not tenant resources (§9 Q16).
- **R3 — One current version per document.** Each document has exactly one current version at any time, named by a
  version identifier in the form `YYYY-MM-DD`: a date the owner chooses as the version's label. A version becomes
  current when the release that publishes it goes live (§4.5), not on the date in its label (§9 Q17, decided). The
  two documents are versioned independently. A version covers both languages: its pt-BR and en-US texts are
  published together and share the identifier (§9 Q8). The web app and the API take each document's current
  identifier from one shared source, so they never disagree on which version is current (§9 Q17, decided).
- **R4 — The page shows the current version only.** A document's page shows its title, the identifier of its current
  version and the full text of that version in the page's language. Earlier versions have no address; any address
  below a document's page shows the "page not found" screen (§9 Q4, decided).
- **R5 — The recorded version is the shown version.** When a registration completes, the acceptance record of each
  document stores that document's current version identifier: the one its page shows at that moment (RNF-12:
  "Aceite registrado com timestamp e versão do documento"; RFC §6.2: "versão do documento aceito").
- **R6 — An outdated acceptance does not count.** A registration whose acceptance names a version that is not the
  current one, for either document, is refused and no account is created. The person accepts the current versions
  again before continuing. When the acceptance step is shown again after such a refusal, the new acceptance is
  stamped with the current version of each document, not the version the tab held before, and the registration keeps
  the password, the e-mail verification and the Google sign-in the person already gave (each still expires as
  before), so it completes without repeating earlier steps. A registration in progress whose acceptance was given for
  an earlier version of either document has its acceptance cleared: when the person next reaches the acceptance step,
  its checkbox is unchecked (§9 Q2, decided).
- **R7 — The text comes from the owner.** Each version's text, in each language, is supplied by the owner, who is
  responsible for its legal review. No version is published without its text, and no placeholder text is shown in
  production (§9 Q1, decided). The RFC requires the owner's text to include:
  - in the Privacy Policy, which data is collected, why, where it is stored, for how long, with whom it may be shared,
    and how to request access, correction, export or deletion (RFC §6.2, "Aceite Contratual, Consentimento e
    Transparência");
  - in the Terms of Service, the data processing clause of art. 39 of the LGPD (RFC §6.2, "Papéis: Controlador e
    Operador");
  - a public contact for the Data Protection Officer (RFC §6.2, "Encarregado pelo Tratamento (DPO) e Resposta a
    Incidentes").

  The owner's review of the text checks this list; automated tests do not.
- **R8 — Published by a release.** A new version of a document reaches the pages only through a release of the
  product. There is no screen to edit the documents. `assumption`
- **R9 — Links keep the language.** Every link to a document leads to its page in the language of the page that holds
  the link. An address without a language (`/terms`, `/privacy`) follows the platform's existing language rule: the
  visitor's saved language, else the browser's preferred language when it is supported, else pt-BR.
- **R10 — Reading a document does not cost the registration.** Following a document link from the registration
  acceptance step opens the document in a new browser tab. The registration tab stays on its step with everything the
  person entered. On a document page, the header's back control is hidden when the tab has no earlier page to return
  to, as in a tab opened this way (§9 Q7, decided).
- **R11 — Nothing personal.** The pages show the same content to every visitor, show no personal or tenant data and
  collect nothing (RNF-15).
- **R12 — Readable on a phone.** The pages work on smartphones and desktops (RNF-16).
- **R13 — A published version never changes.** Once a version has been published, its text in each language stays
  exactly as published and stays kept in the product, also after a newer version becomes current. Any change to the
  text, however small, is a new version with a new identifier. The automated checks fail, naming the document, the
  version and the language, when the text of a published version changes or is removed. This keeps the exact text of
  every recorded version available to the owner (RNF-12: "registro rastreável"; §9 Q4, Q17, decided).
- **R14 — Every current version is complete.** The automated checks fail, naming the document, the version and the
  language, when a document's current version lacks its text in pt-BR or en-US. There is no fallback to the other
  language (R3; §9 Q8, decided).
- **R15 — Every section has its own address.** Each section and subsection heading in a document's text has an
  identifier, and the heading's address is the page's address followed by `#` and that identifier, for example
  `/pt-BR/privacy#cookies`. The identifier is derived from the heading's text the way GitHub derives heading anchors:
  letters are lower-cased, letters with accents are kept, punctuation and symbols are removed, spaces become hyphens,
  and when the same identifier appears again in one page the repeats get `-1`, `-2`, and so on, in page order. Each
  such heading shows a link to its own address, whose accessible name names the section (§8). Opening a heading's
  address shows the page with that heading at the top of the view. The document's title has no such link. Because the
  identifier follows the heading's text, it differs between languages when the headings differ, and it changes when
  a later version changes the heading (§9 Q18, decided; §9 Q19).

## 4. Behavior

### 4.1 Reading a document

1. A visitor, signed in or not, opens `/pt-BR/terms`.
2. The page shows the heading "Termos de Serviço", the line "Versão {version}" with the current Terms identifier, and
   the Terms text of that version in Portuguese.
3. `/en-US/terms` shows the same version in English. `/pt-BR/privacy` and `/en-US/privacy` do the same for the Privacy
   Policy.
4. Each section and subsection heading of the text shows a link to its own address (R15). Following it, or opening a
   shared address such as `/pt-BR/privacy#cookies`, brings that heading to the top of the view. An address whose
   `#` part names no heading shows the page from the top.
5. The page keeps the public layout used by the documents today: the shared public header and the footer with the
   cookie preferences link and the copyright line. The cookie banner shows on these pages as on any other until the
   visitor makes a choice. The header's back control is hidden when the tab has no earlier page (R10).

### 4.2 Address without a language

A visitor who opens `/terms` or `/privacy` is redirected to the same document under the language chosen by R9.

### 4.3 From the registration acceptance step

1. The step's acceptance sentence links "Termos de Serviço" and "Política de Privacidade" (pt-BR) or "Terms of
   Service" and "Privacy Policy" (en-US).
2. Following either link opens that document's page, in the registration's language, in a new tab (R10).
3. The person reads it, returns to the registration tab and accepts. The registration stamps the current version of
   each document on the acceptance.
4. On completion, the API checks that both stated versions are the current ones and stores one acceptance record per
   document with that document's version (R5). If either is not current, it refuses the registration (R6) and the
   web app shows the acceptance step again, unchecked, with a message saying which document changed (§8). If both
   changed, the message names the Terms of Service (§6, check order).
5. The person checks the acceptance again and continues. This acceptance carries the current version of both
   documents, and the registration completes with the password, e-mail verification or Google sign-in already given,
   without repeating earlier steps (R6).

### 4.4 From the cookie banner

The banner's "Política de Privacidade" / "Privacy Policy" link opens `/{lang}/privacy` in the same tab, in the
language of the current page. The banner stays until the visitor makes a choice.

### 4.5 Publishing a new version

1. The owner supplies the new text in both languages and its identifier (R3, R7). The earlier version's text stays
   as it was (R13).
2. A release publishes it. From then on, both pages show the new version, and every registration that completes stores
   the new identifier.
3. A registration in progress whose acceptance was given for the earlier version has its acceptance cleared: when
   the person next reaches the acceptance step, its checkbox is unchecked (R6).
4. Existing accounts keep their records as they are and are not asked to accept again (§9 Q5).

### 4.6 Unknown addresses

Any address below a document's page, such as `/pt-BR/terms/2026-08-26`, shows the "page not found" screen with status
404 (R4).

## 5. Permissions and tenant isolation

| Action | Unauthenticated | Signed-in user (any tenant, or none) | Other tenant |
| --- | --- | --- | --- |
| Read a document's page | 200, the page | 200, the same page; no redirect | n/a: the pages hold no tenant data |
| Open an unknown address below a document | 404, "page not found" screen | 404, "page not found" screen | n/a |
| Complete registration with current versions | 201 (registration rules unchanged) | n/a (registration is for visitors) | n/a |

The pages hold no tenant or personal data, so tenant isolation does not apply to them (R11). Acceptance records belong
to a user, not to a tenant: they are created at registration, before any tenant exists, and as built each record
names its user and no tenant. RN-02 places the system's operational data in a tenant; account data such as these
records is not among it.

## 6. Errors

The pages themselves have no API and no error of their own. New registration errors (§9 Q2, decided):

| Situation | Status | `error` key | `field` |
| --- | --- | --- | --- |
| The registration states a Terms version that is not the current one | 409 | `terms.outdated` | `consent.termsVersion` |
| The registration states a Privacy Policy version that is not the current one | 409 | `privacy.outdated` | `consent.privacyVersion` |
| The registration has no Privacy Policy version, or an empty one | 422 | `privacyVersion.required` | `consent.privacyVersion` |
| The registration has no Terms version, or an empty one (today this answers a non-key message) | 422 | `termsVersion.required` | `consent.termsVersion` |

**Check order for registration** (§9 Q2, decided). The checks run in this order, and the first failure is the
response:
1. Request shape (422), as built. The two version checks are part of it. Within `consent`: `terms.required`, then
   `termsVersion.required`, then `privacyVersion.required`.
2. `terms.outdated`, then `privacy.outdated` (409).
3. The e-mail verification proof or the Google credential, as built (`token.invalid`, `token.expired`,
   `google.invalid`, `google.unavailable`).
4. `email.taken`, then `slug.taken` (409), as built.

The version checks come before the proof, e-mail and slug checks because they need neither Google nor the database,
and the person resolves them on the acceptance step without losing what they entered (R6). So:
- a consent with neither version returns `termsVersion.required`;
- a registration with both versions outdated returns `terms.outdated`; the person accepts again, which stamps the
  current version of both documents (R6), so `privacy.outdated` does not follow;
- a registration with an outdated Terms version and an e-mail that is already registered returns `terms.outdated`;
  `email.taken`, which the web app sends to the account step, comes only on the next attempt.

Keys and statuses follow `docs/architecture/api-convention.md`; all four follow §9 Q2 (decided). Each needs pt-BR and
en-US copy (§8).

## 7. Contract impact

- `POST /auth/register`, request: `consent` gains `privacyVersion` (string, required, non-empty). `termsVersion` keeps
  its type and now names the Terms version only. Both `termsVersion` and `privacyVersion` get the error keys of §6.
- `POST /auth/register`, response: unchanged.
- Breaking: yes, for the registration request. Its only consumer is the web app; the release order goes in §11.
- The document pages add no API endpoint. The current identifier of each document becomes a value shared by the web
  app and the API (R3, §9 Q17); it is a constant, not a request or response shape.

## 8. UI states

**Terms page and Privacy Policy page** (`{doc}` is `terms` or `privacy`)

| State | What shows | Copy key |
| --- | --- | --- |
| Loading | None: the page arrives with its text | — |
| Empty | Not shipped: no version is published without its text (R7). The existing placeholder keys are removed (§9 Q1, decided) | `legal.{doc}.placeholder` (removed) |
| Success | Heading, version line, text of the current version | `legal.{doc}.title`, `legal.{doc}.updated` (`{version}`); the text itself is owner content |
| Section heading link (R15) | A link beside each section and subsection heading, pointing to the heading's own address; its accessible name names the section | `legal.heading-link` (`{section}`, proposed) |
| Error | No error state of its own | — |
| Unknown address below the page | "Page not found" screen | `not-found.h2`, `not-found.content`, `not-found.button`, `not-found.profile` |
| Back control in the header (shown only at phone widths, as built) | Shown when the tab has an earlier page; hidden when it has none, as in a tab opened from the registration acceptance step (R10, §9 Q7) | `common.back` |

**Registration acceptance step** (changes only)

| State | What shows | Copy key |
| --- | --- | --- |
| Links | Both documents linked inside the acceptance sentence, each opening in a new tab with a hint for screen readers (§9 Q7, AC-0013-19) | `auth.register.steps.third.accept-label`; `common.new-tab` (proposed) |
| Acceptance outdated (saved progress from an earlier version) | When the person next reaches the step: checkbox unchecked, no message | — |
| Terms changed during registration (API answered `terms.outdated`, also when both documents changed, §6) | Step shown again, checkbox unchecked, message; accepting again sends the current versions (R6) | `validation.terms.outdated` (proposed) |
| Privacy Policy changed during registration (API answered `privacy.outdated`) | Step shown again, checkbox unchecked, message; accepting again sends the current versions (R6) | `validation.privacy.outdated` (proposed) |
| Version missing (API answered `termsVersion.required` or `privacyVersion.required`; a defect, since the web app always sends both) | Step shown again, checkbox unchecked, message | `validation.termsVersion.required`, `validation.privacyVersion.required` (proposed) |

Proposed copy (UI copy only, not legal text):

| Key | pt-BR | en-US |
| --- | --- | --- |
| `validation.terms.outdated` | Os Termos de Serviço foram atualizados. Leia a nova versão e aceite novamente para continuar. | The Terms of Service have been updated. Read the new version and accept again to continue. |
| `validation.privacy.outdated` | A Política de Privacidade foi atualizada. Leia a nova versão e aceite novamente para continuar. | The Privacy Policy has been updated. Read the new version and accept again to continue. |
| `validation.termsVersion.required` | Não foi possível registrar seu aceite. Aceite os termos novamente para continuar. | We could not record your acceptance. Accept the terms again to continue. |
| `validation.privacyVersion.required` | Não foi possível registrar seu aceite. Aceite os termos novamente para continuar. | We could not record your acceptance. Accept the terms again to continue. |
| `common.new-tab` | (abre em nova aba) | (opens in a new tab) |
| `legal.heading-link` | Link para a seção {section} | Link to the {section} section |

**Cookie banner**: unchanged; its link now reaches the Privacy Policy page (`consent.banner.policy-link`).

## 9. Open questions

| # | Question | Proposed answer | Blocks |
| --- | --- | --- | --- |
| 1 | No text exists for either document. `docs/` and the copy catalog hold only the placeholders "O conteúdo … ainda será publicado" (`legal.*.placeholder`); the RFC lists required content (R7) but no text. ~~Who supplies it, in which languages, and does it ship before the pages?~~ Note for the text: RFC §6.2 names the operators "AWS (Amplify, Lambda, S3, SES), Google, Neon, Sentry", while SPEC-0009 §2 records the production entry chain as Cloudflare → load balancer → web app; the policy must name the operators actually in use. RFC §6.2 gives `dpo@planici.com.br` only as an example ("ex.:"). | **Decided (owner, 2026-11-27):** the owner supplies both documents in pt-BR and en-US, reviewed by a lawyer, covering R7, with the real DPO address and the operators in use. Agents never draft or edit the text. The pages are not released before the text exists; the placeholder keys are removed. The text is a precondition of the release, not of this spec's approval. | The release (the owner's text, both languages) |
| 2 | ~~How do versions reach the acceptance records?~~ As built: the web app holds a Terms version and a Privacy Policy version (both "2026-08-26") but sends only the Terms one; the API stores it on the Terms, Privacy Policy and marketing records; it accepts any non-empty text; a missing version answers a message that is not an error key. Options: (a) the request states each document's version and the API refuses one that is not current; (b) the API ignores stated versions and records the current ones. | **Decided (owner, 2026-11-27): (a).** The request states each document's version and the API refuses one that is not current, as R5 and R6, with the keys and check order of §6 and the `privacyVersion` field of §7. (b) was not chosen because it would record a version the person may not have seen if a release lands mid-registration. The identifier format and the shared source are decided in Q17. | — |
| 3 | Accounts registered so far have acceptance records with version "2026-08-26", a version whose text was never published. Does production hold real accounts? What happens to those records? | The first published version gets its own identifier (a new date label, R3), never "2026-08-26", so no record claims acceptance of a text that did not exist. The owner says whether production holds real accounts; if it does, how they accept is Q5. | No, but answer before release |
| 4 | ~~Should earlier versions be readable publicly, so a person can see what they accepted?~~ The RFC asks for the version to be recorded, not published. | **Decided (owner, 2026-11-27): no, in the MVP.** Each published version's text stays kept and unchanged in the product (R13, decided with Q17), so the owner can produce the text of any recorded version through the DPO channel, and a public archive later needs only pages, not new storage. If the owner wants a public archive, add pages per version and an AC for an unknown version; until then AC-0013-08 applies. | — |
| 5 | When a document changes, must existing accounts accept the new version? The RFC is silent. | Out of scope here. A separate spec if the owner wants re-acceptance (for example, on the next sign-in). | No |
| 6 | Is a separate cookie policy needed? The RFC asks for none. The banner links to the Privacy Policy, and the cookie preferences dialog lists every cookie with purpose and duration. | No separate page. The owner's Privacy Policy includes a cookies section consistent with the preferences dialog. | No |
| 7 | ~~Should the registration links open in a new tab?~~ As built they navigate in the same tab, and the progress kept for the tab omits the password, the e-mail verification proof and the Google credential. Coming back sends the person to the e-mail code step (e-mail sign-up) or to the first step (Google sign-up). The public header's back control has nothing to return to in a new tab. | **Decided (owner, 2026-11-27): yes,** a new tab, with the hint `common.new-tab` for screen readers (R10, AC-0013-05, AC-0013-18, AC-0013-19). On the document pages, the back control is hidden when the tab has no earlier page (R10, AC-0013-20). | — |
| 8 | ~~Which language prevails, and what does the en-US page show if no English text exists at launch?~~ | **Decided (owner, 2026-11-27): (a).** The owner supplies both languages; which one prevails is stated in the owner's text. No fallback: a version without its en-US text is not published (R14, AC-0013-27). Option (b), the Portuguese text under a `legal.untranslated` notice, was not chosen, and that key is dropped. The en-US text is part of Q1. | — |
| 9 | Does "Exibição obrigatória no onboarding" (RNF-12) require the person to open or scroll the documents before accepting? | No. The mockup (RFC §4.2, "Registro — Passo 5") shows a link and the acceptance is mandatory. Linking both documents in the step meets it. | No |
| 10 | Wording conflicts: RNF-12 says "termos de uso"; the mockup's step 5 shows only the Terms of Service; RFC §6.2 and the built step name both documents and say "Termos de Serviço"; the built step's title is "Termos de uso". | Follow RFC §6.2: two documents, "Termos de Serviço". Align RNF-12 and the mockup in an editorial change. The step title is left as is in this spec. | No |
| 11 | Should the documents be linked from more places: the footers of login, registration and the document pages, the signed-in area, e-mails? The RFC asks for none. | Not in this spec. A follow-up if the owner wants it. | No |
| 12 | The acceptance time stored on a record is the time the browser stamped at the acceptance step. Is that acceptable? The server also stores when it created the record. | Yes, no change. | No |
| 13 | The marketing consent record stores the Terms version, although the marketing consent sentence has no version of its own. | Out of scope; unchanged until a spec for marketing communications. | No |
| 14 | `docs/schema.dbml` does not list the acceptance records table. | Editorial amendment of `docs/schema.dbml`, no behavior. | No |
| 15 | R5 and R6 change registration, which has no spec of its own. Keep them here or split? | Keep them here: RNF-12 ties the version shown to the version recorded. The owner may split them into a registration spec. | No |
| 16 | RN-01 read literally allows unauthenticated access only to public resources "vinculados a um tenant válido". The document pages belong to no tenant. | RN-01 governs tenant resources. Platform pages needed before an account exists (login, registration, the documents) are outside it, as login and registration already are. Editorial clarification of RN-01. | No |
| 17 | ~~How are versions identified and kept?~~ | **Decided (owner, 2026-11-27):** a date label `YYYY-MM-DD` per document, chosen by the owner; the version becomes current when its release goes live (R3). Every published version's text, in each language, is kept and never changes; any change is a new version (R13). The web app and the API read each document's current identifier from one shared source (R3). The owner also chose MDX files as the authoring format; that is recorded for `/plan` in §11. | — |
| 18 | ~~How is a section heading's identifier formed?~~ | **Decided (owner, 2026-11-27):** derived from the heading's text with GitHub's heading-anchor rule (R15). The tool is recorded for `/plan` in §11. | — |
| 19 | With identifiers derived from the heading text, a heading's address differs between pt-BR and en-US and changes when a later version rewords the heading, so a shared link such as `/pt-BR/privacy#cookies` may stop pointing at its section. Should headings that other pages link to get a fixed identifier written in the text, the same in both languages? | Not now: no page links to a section yet (§4.4 links the whole Privacy Policy). Revisit when one does, for example a cookie banner link to the cookies section. | No |

## 10. Acceptance criteria

"Current Terms version" and "current Privacy Policy version" are the identifiers of R3. Where a criterion needs
concrete identifiers it uses "2026-12-01" for the Terms and "2026-12-15" for the Privacy Policy; they are examples, not
the real identifiers (§9 Q3).

```gherkin
AC-0013-01
Given a visitor who is not signed in
And   the current <document> version is <version>
When  they open <address>
Then  the page shows the heading <heading>
And   it shows the line "<version line>"
And   it shows the <language> text of <document> version <version>
And   they were not asked to sign in

Examples:
  | address        | document         | version    | heading              | version line       | language   |
  | /pt-BR/terms   | Terms            | 2026-12-01 | Termos de Serviço    | Versão 2026-12-01  | Portuguese |
  | /en-US/terms   | Terms            | 2026-12-01 | Terms of Service     | Version 2026-12-01 | English    |
  | /pt-BR/privacy | Privacy Policy   | 2026-12-15 | Política de Privacidade | Versão 2026-12-15 | Portuguese |
  | /en-US/privacy | Privacy Policy   | 2026-12-15 | Privacy Policy       | Version 2026-12-15 | English    |
```

```gherkin
AC-0013-02
Given a signed-in user who is a member of tenant "studio-ana"
When  they open <address>
Then  they stay on <address>
And   the page shows the same heading, version line and text a visitor who is not signed in sees

Examples:
  | address        |
  | /pt-BR/terms   |
  | /en-US/privacy |
```

```gherkin
AC-0013-03
Given a visitor with saved language <saved> and a browser that prefers <browser>
When  they open <address>
Then  they are redirected to <destination>

Examples:
  | saved | browser | address  | destination    |
  | none  | en-US   | /terms   | /en-US/terms   |
  | none  | fr-FR   | /terms   | /pt-BR/terms   |
  | en-US | pt-BR   | /privacy | /en-US/privacy |
  | none  | pt-BR   | /privacy | /pt-BR/privacy |
```

```gherkin
AC-0013-04
Given a visitor on the acceptance step of registration at <registration>
When  they follow the link <link>
Then  the page <destination> opens and shows that document

Examples:
  | registration    | link                    | destination    |
  | /pt-BR/register | Termos de Serviço       | /pt-BR/terms   |
  | /pt-BR/register | Política de Privacidade | /pt-BR/privacy |
  | /en-US/register | Terms of Service        | /en-US/terms   |
  | /en-US/register | Privacy Policy          | /en-US/privacy |
```

```gherkin
AC-0013-05
Given a visitor signing up with e-mail who has verified their e-mail, set a password and reached the acceptance step
When  they follow the link "Termos de Serviço"
Then  the Terms page opens in a new tab
And   the registration tab still shows the acceptance step
# Follows §9 Q7. The registration tab's next action is AC-0013-18.
```

```gherkin
AC-0013-06
Given a visitor who has not made a cookie choice, on <page>
When  they follow the cookie banner's link <link>
Then  they are on <destination>
And   the cookie banner is still shown

Examples:
  | page         | link                    | destination    |
  | /pt-BR/login | Política de Privacidade | /pt-BR/privacy |
  | /en-US/login | Privacy Policy          | /en-US/privacy |
```

```gherkin
AC-0013-07
Given the current Terms version is "2026-12-01"
When  a visitor opens /pt-BR/terms and then /en-US/terms
Then  both pages show the version identifier "2026-12-01"
```

```gherkin
AC-0013-08
Given a visitor who is not signed in
When  they open <address>
Then  the response status is 404
And   the page shows the "page not found" screen (`not-found.h2`)

Examples:
  | address                  |
  | /pt-BR/terms/2026-08-26  |
  | /en-US/privacy/archive   |
```

```gherkin
AC-0013-09
Given the current Terms version is "2026-12-01" and the current Privacy Policy version is "2026-12-15"
When  a visitor completes registration with <provider>, having accepted on the acceptance step
Then  the new account has a Terms of Service acceptance record with version "2026-12-01"
And   it has a Privacy Policy acceptance record with version "2026-12-15"

Examples:
  | provider |
  | e-mail   |
  | Google   |
```

```gherkin
AC-0013-10
Given the current Terms version is "2026-12-01" and the current Privacy Policy version is "2026-12-15"
When  a registration request states Terms version "2026-08-26" and Privacy Policy version <privacy>
Then  the response is 409 with { "error": "terms.outdated", "field": "consent.termsVersion" }
And   no account exists for that e-mail

Examples:
  | privacy    |
  | 2026-12-15 |
  | 2026-08-26 |
# Second row: both versions outdated; the Terms check comes first (§6, check order).
```

```gherkin
AC-0013-11
Given the current Privacy Policy version is "2026-12-15"
When  a registration request states the current Terms version and Privacy Policy version "2026-08-26"
Then  the response is 409 with { "error": "privacy.outdated", "field": "consent.privacyVersion" }
And   no account exists for that e-mail
```

```gherkin
AC-0013-12
Given a registration request that is valid except that its consent has no Privacy Policy version
When  it is sent
Then  the response is 422 with { "error": "privacyVersion.required", "field": "consent.privacyVersion" }
And   no account exists for that e-mail
```

```gherkin
AC-0013-13
Given a registration request that is valid except that its consent has an empty Terms version
When  it is sent
Then  the response is 422 with { "error": "termsVersion.required", "field": "consent.termsVersion" }
And   no account exists for that e-mail
```

```gherkin
AC-0013-14
Given a registration in progress whose acceptance was given when the current <document> version was <old>
And   the current <document> version is now <new>
When  the person returns to the registration page
Then  when they next reach the acceptance step, its acceptance checkbox is unchecked
And   no message shows on that step

Examples:
  | document       | old        | new        |
  | Terms          | 2026-12-01 | 2027-01-10 |
  | Privacy Policy | 2026-12-15 | 2027-01-10 |
```

```gherkin
AC-0013-15
Given a visitor on the profile step ("Criar conta") of registration
When  they complete it and the API answers <error>
Then  the acceptance step is shown with the message <copy key>
And   its acceptance checkbox is unchecked
And   no account exists for that e-mail

Examples:
  | error                   | copy key                           |
  | terms.outdated          | validation.terms.outdated          |
  | privacy.outdated        | validation.privacy.outdated        |
  | termsVersion.required   | validation.termsVersion.required   |
  | privacyVersion.required | validation.privacyVersion.required |
```

```gherkin
AC-0013-16
Given a browser window 360 px wide
When  a visitor opens /pt-BR/privacy
Then  the heading, the version line and the whole text fit the window width with no horizontal scrolling
```

```gherkin
AC-0013-17
Given the current Terms version is "2026-12-01" and the current Privacy Policy version is "2026-12-15"
And   a visitor signing up with <provider> whose registration the API refused with <error>, because their acceptance named <document> version "2026-08-26"
And   the acceptance step is shown again, unchecked
When  they check the acceptance, press "Eu li e concordo" and then "Criar conta", entering nothing else
Then  the registration request is answered 201
And   the new account has a Terms of Service acceptance record with version "2026-12-01"
And   it has a Privacy Policy acceptance record with version "2026-12-15"

Examples:
  | provider | error            | document       |
  | e-mail   | terms.outdated   | Terms          |
  | Google   | privacy.outdated | Privacy Policy |
# Follows R6: the password, e-mail verification and Google sign-in already given are kept.
```

```gherkin
AC-0013-18
Given a visitor signing up with e-mail who has verified their e-mail, set a password, reached the acceptance step and opened the Terms page in a new tab from it
When  they return to the registration tab, check the acceptance and press "Eu li e concordo"
Then  the profile step ("Criar conta") is shown, not the e-mail code step or the password step
# Follows §9 Q7.
```

```gherkin
AC-0013-19
Given a visitor on the acceptance step at <registration>
When  a screen reader reads the link <link>
Then  the link's accessible name is <link> followed by <hint> (`common.new-tab`)

Examples:
  | registration    | link              | hint                 |
  | /pt-BR/register | Termos de Serviço | (abre em nova aba)   |
  | /en-US/register | Privacy Policy    | (opens in a new tab) |
# Follows §9 Q7.
```

```gherkin
AC-0013-20
Given a browser window 360 px wide
When  a visitor opens <address> <how>
Then  the header's back control (`common.back`) is <back control>

Examples:
  | address        | how                                                                                | back control |
  | /pt-BR/terms   | in a new tab, by following "Termos de Serviço" on the registration acceptance step | not shown    |
  | /pt-BR/privacy | in the same tab, by following the cookie banner's link on /pt-BR/login             | shown        |
# Follows R10 and §9 Q7.
```

```gherkin
AC-0013-21
Given the current Privacy Policy version has a section heading <heading> in <lang>
When  a visitor opens /<lang>/privacy
Then  that heading shows a link to /<lang>/privacy#<identifier>
And   the link's accessible name is <name>

Examples:
  | lang  | heading | identifier | name                           |
  | pt-BR | Cookies | cookies    | Link para a seção Cookies      |
  | en-US | Cookies | cookies    | Link to the Cookies section    |
```

```gherkin
AC-0013-22
Given the current Privacy Policy version has, below its first screen of text, a section heading "Cookies" in pt-BR
When  a visitor opens /pt-BR/privacy#cookies
Then  the page shows with the "Cookies" heading at the top of the view
```

```gherkin
AC-0013-23
Given the current Terms version in pt-BR has the section headings <headings>, in this order
When  a visitor opens /pt-BR/terms
Then  the headings' links point to /pt-BR/terms#<identifiers>, in the same order

Examples:
  | headings                         | identifiers                 |
  | "1. Quem somos?"                 | 1-quem-somos                |
  | "Retenção de dados"              | retenção-de-dados           |
  | "Exemplos", "Exemplos"           | exemplos, exemplos-1        |
# Follows R15 and §9 Q18 (GitHub's heading-anchor rule).
```

```gherkin
AC-0013-24
Given the current Terms version has no heading whose identifier is "nao-existe"
When  a visitor opens /pt-BR/terms#nao-existe
Then  the response status is 200
And   the page shows the Terms from the top
```

```gherkin
AC-0013-25
Given version "2026-12-01" of the Terms of Service has been published
When  its pt-BR text is changed in any way and the automated checks run
Then  the checks fail
And   the failure names the Terms of Service, version "2026-12-01" and pt-BR
```

```gherkin
AC-0013-26
Given version "2026-12-01" of the Privacy Policy has been published and version "2027-03-01" is now current
When  the en-US text of version "2026-12-01" is removed and the automated checks run
Then  the checks fail
And   the failure names the Privacy Policy, version "2026-12-01" and en-US
```

```gherkin
AC-0013-27
Given the current Terms version is "2026-12-01" and it has a pt-BR text but no en-US text
When  the automated checks run
Then  the checks fail
And   the failure names the Terms of Service, version "2026-12-01" and en-US
# Follows R14 and §9 Q8 (a).
```

## 11. Implementation plan

Written by `/plan` after the spec is Approved. Empty until then.

### Notes for /plan (owner decisions on tooling, not a plan)

- Authoring format: the documents' texts are MDX files, one per document, version and language (owner,
  2026-11-27, §9 Q17).
- Heading identifiers: `github-slugger` (owner, 2026-11-27, §9 Q18). It is not a dependency of the web app today; the
  owner adds it with pnpm.
- The plan should confirm that the MDX setup works with the build used in production (Turbopack in Next.js 16), and
  that the heading link is a component of the MDX rendering rather than markup written in each text.

```scope
```

## 12. Changelog

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | 2026-11-27 | Draft. As-built state verified the same day: no page exists for either document, so the registration step's two links and the cookie banner's link end on the "page not found" screen, although the platform already treats both addresses as public; the links already keep the page's language; the copy catalog holds only titles, a version line and placeholders; the web app holds a Terms version and a Privacy Policy version (both "2026-08-26") but sends only the Terms one, which the API stores on all three acceptance records; the API accepts any non-empty version text. |
| 0.2 | 2026-11-27 | Spec review fixes. §9: the Blocks cells name what is written to each proposed answer (Q1, Q2, Q4, Q7, Q8). AC-0013-14 follows the as-built resume: the saved progress drops the e-mail proof and the Google credential, so the cleared acceptance shows when the person next reaches the step, with no message (R6, §4.5 and §8 aligned). R6, §4.3 and new AC-0013-17: accepting again after `terms.outdated` or `privacy.outdated` stamps the current versions and keeps the password, e-mail proof and Google credential. §6: check order for registration (both versions missing, both outdated, version checks before the proof, `email.taken` and `slug.taken`), with a both-outdated row in AC-0013-10. R10, §4.1, §8 and new AC-0013-20: the back control is hidden when the tab has no earlier page. AC-0013-05 split: its second action is now AC-0013-18; new AC-0013-19 for the `common.new-tab` hint. AC-0013-15 adds the `termsVersion.required` and `privacyVersion.required` rows and names the profile step. §5 cites RN-02 and the as-built records instead of SPEC-0010 §2. Still pending on the owner: Q1 (the documents' text) and Q2 (how versions reach the records, including the new §6 check order). Should-fix items not applied. |
| 0.3 | 2026-11-27 | Owner decisions, 2026-11-27. §9 Q17 decided: versions are date labels `YYYY-MM-DD` chosen by the owner, current when their release goes live; every published text is kept and never changes; the web app and the API share each current identifier (R3 rewritten, which also settles the review's should-fix on R3 vs §4.5; new R13, R14; §2, §4.5, §7 and Q2, Q3, Q4 aligned). §9 Q18 decided: each section heading has an address whose identifier follows GitHub's heading-anchor rule, with a link beside the heading (new R15, §4.1 step 4, §8 row and `legal.heading-link`). New §9 Q19 (fixed identifiers for headings other pages link to), not blocking. New AC-0013-21 to -27. §11 records the tooling choices for `/plan`: MDX files and `github-slugger`. Still pending on the owner: Q1 (the documents' text) and Q2 (a) or (b). |
| 0.4 | 2026-11-27 | Owner decision, 2026-11-27: §9 Q2 decided as (a). The registration request states each document's version and the API refuses one that is not current (R5, R6), with the keys and check order of §6 and the `privacyVersion` field of §7; R6 is no longer an assumption, and §6 no longer marks its keys and check order as proposed. Still pending on the owner before Approved: Q1 (the documents' text). Q4, Q7 and Q8 keep their proposed answers, with the criteria written to them listed in their Blocks cells. |
| 0.5 | 2026-11-27 | Owner decisions, 2026-11-27: §9 Q4, Q7 and Q8 decided as proposed. Q4: only the current version is public in the MVP (R4, AC-0013-08). Q7: the registration links open in a new tab, and the back control is hidden when the tab has no earlier page (R10, AC-0013-05, -18 to -20). Q8 (a): the owner supplies both languages, with no fallback (R14, AC-0013-27); the `legal.untranslated` key and its §8 rows are dropped. R4, R10 and R14 are no longer assumptions. Still pending on the owner before Approved: Q1 (the documents' text, both languages). Q3 to answer before release. |
| 0.6 | 2026-11-27 | Owner decision, 2026-11-27: §9 Q1 decided as proposed. The owner supplies both documents in pt-BR and en-US, reviewed by a lawyer, covering R7, with the real DPO address and the operators in use; agents never draft or edit the text; the pages are not released before the text exists, and the placeholder keys are removed (R7, §8). The text is a precondition of the release, not of approval. No §9 question blocks approval now; Q3 is to be answered before release. R8 stays an assumption. |
