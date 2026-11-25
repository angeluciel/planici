---
id: SPEC-0007
title: Nome do cadastro como título da página de preenchimento
status: Implemented # Draft | Review | Approved | Implemented | Superseded
plan_status: Approved # Draft | Approved
version: 1.5
owner: Joao Izidoro
satisfies: [RF-40, RF-41, RN-04, RN-06, RNF-18]
depends_on: [SPEC-0001, SPEC-0002, SPEC-0003, SPEC-0004, SPEC-0005]
phase: MVP
ticket: -
---

# SPEC-0007 — Nome do cadastro como título da página de preenchimento

## 1. Purpose

In the template editor as built, the template's name is typed directly into the page heading: a large, borderless
input sits where the title would be, and a visually hidden level-1 heading names the page for assistive technology.
SPEC-0001 does not specify this; it is how the editor was built. The record fill-in page (SPEC-0003 §4.1) does not
do this. It shows a fixed visible title, "Novo cliente" or "Novo serviço", and the record's name is an ordinary input
in the field list. The owner asked for the fill-in page to work like the editor: the record's name becomes the page
heading input (owner request, 2026-11-25).

This changes how UC-46 and UC-47 look (RFC §2.2.9). RF-40 says the professional "preenche seus campos" of a template,
and RF-41 says the data "são exibidos e validados conforme a versão do modelo". Neither requirement changes, and
neither do the name rules of RN-04 (client) or RN-06 (service). Client and service registration are main MVP flows
under RNF-18 (WCAG 2.1 AA: "labels acessíveis nos campos, feedback de erro textual"), so the new input must meet it.
This spec changes no API, contract or stored data.

## 2. Scope

**In scope**
- The fill-in page of a new client and of a new service: the name system field (`client.name`, `service.name`,
  SPEC-0001 §3.2) shows as the page heading input and is no longer repeated in the field list. The visible title
  "Novo cliente" / "Novo serviço" goes away.
- The edit page of a client and of a service, the same way (§9 Q2).
- What the heading input shows: placeholder, accessible name, required status, help text, error, and its state
  while saving.
- The page's level-1 heading, which is visually hidden (R5, §9 Q4).
- Where name errors show, and how the error summary and focus treat them.

**Out of scope**
- The record view page (SPEC-0003 §4.2). It is unchanged.
- Name validation rules, limits and error keys. They stay as in SPEC-0004 §6 and SPEC-0005 §6.
- The template editor. Moving, renaming or adding help text to system fields stays as in SPEC-0002 R3.
- The consent checkbox and its banner (SPEC-0004 R12, §4.3). They are unchanged.
- The lists, the [Novo] menu and every API endpoint.

**Dependencies and amendments**
- SPEC-0001 to SPEC-0004 are implemented. SPEC-0005 is approved and implemented in the working tree; its fill-in
  and edit pages use the same shared page as clients (SPEC-0003).
- On approval, this spec amends:
  - SPEC-0003 §4.1 step 2: the visible title "Novo cliente" / "Novo serviço" is replaced by the heading input, and
    the name field is not marked "*" (§4.1 here, §9 Q6).
  - SPEC-0003 §4.3 step 1: the edit page shows the heading input pre-filled (§4.2 here).
  - SPEC-0003 R2: the field list keeps the version's order "except the name field, which is the page heading"
    (R2 here, §9 Q3).
  - SPEC-0003 §8: the fill-in rows of §8 here.
  - AC-0003-01: "Nome completo" is the heading input, not the first entry of the field list, and has no "*"
    (AC-0007-01, AC-0007-02).
  - SPEC-0004 §4.3: the name input no longer sits "in the template's position" (R2 here, AC-0007-11).
- Each amended place gets the note "amended by SPEC-0007", and SPEC-0003 and SPEC-0004 each get a version bump and
  a changelog line, as SPEC-0005 §2 did for SPEC-0001.

## 3. Domain rules

- **R1.** The fill-in and edit pages show the record's name system field (`client.name` for a client,
  `service.name` for a service; SPEC-0001 §3.2) as an editable input in the page heading, styled like the template
  editor's name input. (owner request and decision, 2026-11-25, §9 Q1)
- **R2.** The name field is not repeated in the field list. Every other field of the linked version keeps that
  version's order (SPEC-0003 R2). The heading input holds the name wherever the template places it. (owner
  decision, 2026-11-25, §9 Q3)
- **R3.** The heading input uses the name field's current label as its accessible name and placeholder, and shows
  its help text under it as its accessible description (SPEC-0003 R2: current label and help text; RNF-18: labels
  acessíveis nos campos). (owner decision, 2026-11-25, §9 Q5)
- **R4.** The name stays required: blank-name validation, the length limits and the server's name errors are
  those of SPEC-0003 R4, R6, SPEC-0004 §6 and SPEC-0005 §6. The heading input is announced as required. Like the
  template editor's name input, it shows no "*". (RNF-18; owner decision, 2026-11-25, §9 Q6)
- **R5.** The page keeps exactly one level-1 heading, visually hidden; the heading input is the visible title. On
  a new record the heading reads the typed name, or "Novo cliente" / "Novo serviço" while the name is blank. On an
  edit page it reads the stored name, and does not change while the professional types. (RNF-18; owner decision,
  2026-11-25, §9 Q4)
- **R6.** Name errors show as text under the heading input, and the input is announced as invalid. The name counts
  in the error summary like any other field and, as the topmost input, comes first in the focus order when the
  page focuses the first error (SPEC-0003 §4.1 step 4). (RNF-18: feedback de erro textual; owner decision,
  2026-11-25, §9 Q8)

## 4. Behavior

### 4.1 Create a record (amends SPEC-0003 §4.1 step 2)

1. The professional opens the fill-in page as in SPEC-0003 §4.1 step 1.
2. The page shows, top to bottom:
   - the heading input, empty, with the name field's label as placeholder (in default templates, "Nome completo"
     for a client and "Nome" for a service);
   - the name field's help text, if it has one;
   - the subtitle "Modelo: <template name>";
   - every banner of SPEC-0003 §8 and SPEC-0004 §8, when present (error summary, template changed, save error,
     revision conflict, consent text updated);
   - the other fields, in the version's order, with required fields marked "*" (SPEC-0003 §4.1 step 2);
   - for a new client, the consent checkbox above **[Salvar]** (SPEC-0004 §4.3).

   No visible "Novo cliente" / "Novo serviço" title is shown (R5). The loading, load error, unavailable and
   not-found states are unchanged and show no heading input.
3. While the name is blank, the page's level-1 heading reads "Novo cliente" or "Novo serviço". Once the
   professional types a name, it reads that name (R5).
4. On **[Salvar]**, the page validates every field, the name included, and shows all errors at once (SPEC-0003
   §4.1 step 4). A name error shows under the heading input, the input turns to the error colour and is announced
   as invalid, and the summary counts it. When the name has an error, focus goes to the heading input.
5. When the server rejects the name (for example 409 `serviceName.taken`), the message shows under the heading
   input, focus goes to it, and every typed value stays on screen.
6. While saving, the heading input cannot be edited, like every other input (SPEC-0003 §8, saving).
7. A typed name counts as typed data: **[Cancelar]** then asks "Descartar cadastro?" (SPEC-0003 §4.1 step 6).
8. When the template changes while filling (SPEC-0003 §4.4), the typed name is kept: the name field always exists.

### 4.2 Edit a record (amends SPEC-0003 §4.3 step 1)

1. **[Editar]** opens the edit page with the heading input pre-filled with the stored name. The other fields are
   pre-filled as in SPEC-0003 §4.3.
2. The level-1 heading reads the stored name and does not follow the typing (R5).
3. Steps 4–8 of §4.1 apply. Saving and the revision conflict follow SPEC-0003 §4.3 steps 2 and 4.
4. An unknown record id, or another tenant's record, shows "Cadastro não encontrado." with a way back and no
   heading input (SPEC-0003 §4.3 step 1).

## 5. Permissions and tenant isolation

Nothing changes on the server. This spec moves one input on the page; the checks of SPEC-0003 §5, SPEC-0004 §5 and
SPEC-0005 §5 apply unchanged.

| Action | Unauthenticated | Member | Owner | Other tenant |
| --- | --- | --- | --- | --- |
| Create a client or service from the fill-in page | 401 | — (post-MVP) | 201 | 400 `formId.invalid` (SPEC-0003) |
| Open the edit page / update a client | 401 | — | 200 | 404 `client.not-found`; page "Cadastro não encontrado.", no heading input (AC-0003-22, AC-0003-63, AC-0007-18) |
| Open the edit page / update a service | 401 | — | 200 | 404 `service.not-found`; page as for clients |

## 6. Errors

No new errors. These existing ones now show under the heading input:

| Situation | Status | Error key | Field |
| --- | --- | --- | --- |
| Client name blank | 422 | `clientName.required` | `name` |
| Client name over 120 characters | 422 | `clientName.max` | `name` |
| Service name blank | 422 | `serviceName.required` | `name` |
| Service name over 80 characters | 422 | `serviceName.max` | `name` |
| Service name used by another service of the tenant | 409 | `serviceName.taken` | `name` |

Copy is unchanged ("Informe o nome do cliente." / "Use no máximo 120 caracteres." / "Informe o nome do serviço." /
"Use até 80 caracteres." / "Já existe um serviço com este nome.").

## 7. Contract impact

None. Requests, responses, error codes and stored data are unchanged.
No new copy keys under the proposed answers to §9 (Q4 and Q5 reuse `{entity}.form.newTitle` and the field label).

## 8. UI states

Amends the fill-in rows of SPEC-0003 §8. `{entity}` is `clients` or `services`.

| Screen | State | Behavior | Copy key |
| --- | --- | --- | --- |
| Fill-in (new) | name blank | Heading input empty, placeholder = name field label; hidden level-1 heading "Novo cliente" / "Novo serviço"; no visible title | field label (template data), `{entity}.form.newTitle` |
| Fill-in (new) | name typed | Heading input shows the name; hidden level-1 heading reads it | — |
| Edit | loaded | Heading input pre-filled; hidden level-1 heading reads the stored name | — |
| Fill-in, edit | name has help text | Help text under the heading input, as its accessible description | field help text (template data) |
| Fill-in, edit | name error | Message under the heading input; input in error colour, announced invalid; counted in the summary | `validation.clientName.*`, `validation.serviceName.*`, `{entity}.form.errorSummary` |
| Fill-in, edit | saving | Heading input not editable | `{entity}.form.saving` |
| Fill-in, edit | subtitle | "Modelo: <name>" under the heading input | `{entity}.form.subtitle` |
| Fill-in, edit | loading, load error, unavailable, not found | Unchanged (SPEC-0003 §8); no heading input | as SPEC-0003 §8 |

## 9. Open questions

| # | Question | Proposed answer | Blocks |
| --- | --- | --- | --- |
| 1 | ~~Which value does the heading input hold?~~ | **Decided (owner, 2026-11-25):** The name system field: `client.name` ("Nome completo") or `service.name` ("Nome"). It leaves the field list. | — |
| 2 | ~~Create only, or edit too?~~ | **Decided (owner, 2026-11-25):** Both, as in the template editor. Today the edit page has no visible title. | — |
| 3 | ~~SPEC-0002 R3 lets a template move the name field (for example, after E-mail). What happens then?~~ | **Decided (owner, 2026-11-25):** The heading input holds the name wherever the template places it. The list skips the name and keeps every other field in order. SPEC-0003 R2 and SPEC-0004 §4.3 get the exception (§2). Rejected: a heading input only when the name comes first. | — |
| 4 | ~~What does the level-1 heading read, and is it visible?~~ | **Decided (owner, 2026-11-25):** Visually hidden; the heading input is the visible title. New record: the typed name, or "Novo cliente" / "Novo serviço" while it is blank. Edit: the stored name. This is what the template editor does as built (not specified in SPEC-0001). | — |
| 5 | ~~Placeholder and accessible name of the heading input~~ | **Decided (owner, 2026-11-25):** The name field's current label from the template: no new copy, and a renamed label still applies (SPEC-0003 R2). The owner accepted this knowing the RNF-18 risk raised in v0.2: the placeholder is the only visible label, and it disappears once a name is typed (WCAG 2.1 AA 3.3.2 usually asks for a label that stays visible). Rejected: a small visible label above the heading input; fixed copy "Nome do cliente" / "Nome do serviço". | — |
| 6 | ~~SPEC-0003 §4.1 step 2 marks required fields with "*". Does the heading input show one?~~ | **Decided (owner, 2026-11-25):** No visible "*". The name is always required (SPEC-0001 §3.2), the editor's name input shows none, and the input is announced as required. SPEC-0003 §4.1 step 2 gets this exception (§2). The owner accepted that sighted users see no required mark on this field (RNF-18 risk raised in v0.2). | — |
| 7 | ~~Narrow screens~~ | **Decided (owner, 2026-11-25):** Same heading input on every width; it wraps or scrolls like the editor's. | — |
| 8 | ~~Where do name errors show, and in what focus order?~~ | **Decided (owner, 2026-11-25):** As text under the heading input, which is announced as invalid (like the editor's name error). Counted in the summary; first in the focus order because it is the topmost input. | — |

## 10. Acceptance criteria

UI criteria. "Named" means the input's accessible name. "With consent" means the consent checkbox of a new client
is checked (SPEC-0004 R12, §10).

Which criteria cover services:
- AC-0007-08 is service-only.
- AC-0007-04 and AC-0007-17 are the service forms of AC-0007-01 and AC-0007-12.
- Every other criterion also applies to services, in a service form that uses a service template with valid
  duration and price where a save is attempted, leaves out e-mail and consent (and the errors they add to a count),
  and uses the service copy: "Nome", "Novo serviço", "Informe o nome do serviço.", "Serviço cadastrado". In
  AC-0007-19 the service form types an 81-character name and expects "Use até 80 caracteres.".

The examples use clients, so copy keys use the `clients.` prefix.

```gherkin
AC-0007-01
Given an active client template "Ficha" whose system fields keep their default labels and order
When  the owner opens the fill-in page for "Ficha"
Then  the first input of the main content, above the subtitle, is the heading input, empty, named "Nome completo" with placeholder "Nome completo"
And   it is announced as required and shows no "*"
```

```gherkin
AC-0007-02
Given an active client template "Ficha" with custom field "Profissão" after the system fields
When  the owner opens the fill-in page for "Ficha"
Then  below the subtitle "Modelo: Ficha" the field inputs appear in the order E-mail, Telefone, Profissão
And   no input other than the heading input is named "Nome completo"
```

```gherkin
AC-0007-03
Given the owner on the fill-in page of client template "Ficha" with a blank name
And   the page's only level-1 heading reads "Novo cliente"
When  they type "Ana Souza" into the heading input
Then  the page's only level-1 heading reads "Ana Souza"
```

```gherkin
AC-0007-04
Given an active service template "Corte" whose system fields keep their default labels
When  the owner opens the fill-in page for "Corte"
Then  the heading input is named "Nome" with placeholder "Nome"
And   the page's only level-1 heading reads "Novo serviço"
And   below the subtitle the field inputs start with Duração, then Preço
```

```gherkin
AC-0007-05
Given client template "Ficha" whose name field is labelled "Nome do cliente"
When  the owner opens its fill-in page
Then  the heading input is named "Nome do cliente" with placeholder "Nome do cliente"
```

```gherkin
AC-0007-06
Given client template "Ficha" whose name field has help text "Como aparece na agenda"
When  the owner opens its fill-in page
Then  "Como aparece na agenda" shows under the heading input and is its accessible description
```

```gherkin
AC-0007-07
Given the owner on the fill-in page of client template "Ficha" with a blank name, e-mail "ana@" and consent
When  they press [Salvar]
Then  "Informe o nome do cliente." shows under the heading input, which is announced as invalid
And   the summary reads "Corrija 2 campos"
And   focus is on the heading input
```

```gherkin
AC-0007-08
Given a service "Corte masculino" in the tenant
And   the owner on the fill-in page of a service template with name "Corte masculino" and valid duration and price
When  they press [Salvar] and the server answers 409 { "error": "serviceName.taken", "field": "name" }
Then  "Já existe um serviço com este nome." shows under the heading input
And   focus is on the heading input
And   every typed value is still on screen
```

```gherkin
AC-0007-09
Given the owner on the fill-in page of client template "Ficha" with name "Ana Souza", a valid e-mail and consent
When  they press [Salvar] and the save is in progress
Then  the heading input cannot be edited
```

```gherkin
AC-0007-10
Given the owner on the fill-in page of client template "Ficha" who has typed only "Ana" in the heading input
When  they press [Cancelar]
Then  the page asks "Descartar cadastro?"
```

```gherkin
AC-0007-11
Given an active client template "Ficha" whose fields are, in order, client.email, client.phone, client.name
When  the owner opens its fill-in page
Then  the heading input is named "Nome completo"
And   below the subtitle the field inputs appear in the order E-mail, Telefone
```

```gherkin
AC-0007-12
Given a client "Ana Souza" created from template "Ficha"
When  the owner opens its edit page
Then  the heading input shows "Ana Souza"
And   no other input is named "Nome completo"
```

```gherkin
AC-0007-13
Given the owner on the edit page of client "Ana Souza"
When  they change the heading input to "Ana Lima"
Then  the page's only level-1 heading still reads "Ana Souza"
```

```gherkin
AC-0007-14
Given the owner on the fill-in page of client template "Ficha" with name "Ana Souza", a valid e-mail and consent
When  a new version of "Ficha" is published in another tab and the owner presses [Salvar]
Then  the page reloads with the new version and the heading input still shows "Ana Souza"
```

```gherkin
AC-0007-15
Given the owner on the fill-in page of client template "Ficha"
When  they type "Ana Souza" in the heading input, fill in a valid e-mail, check the consent checkbox and press [Salvar]
Then  the client is stored with name "Ana Souza"
And   its view page opens with the toast "Cliente cadastrado"
```

```gherkin
AC-0007-16
Given the owner on the edit page of client "Ana Souza"
When  they clear the heading input and press [Salvar]
Then  "Informe o nome do cliente." shows under the heading input
And   the page's only level-1 heading still reads "Ana Souza"
```

```gherkin
AC-0007-17
Given a service "Corte masculino" created from service template "Corte"
When  the owner opens its edit page
Then  the heading input shows "Corte masculino" and is named "Nome"
And   the page's only level-1 heading reads "Corte masculino"
```

```gherkin
AC-0007-18
Given a client of another tenant
When  the owner opens its edit page
Then  the page says "Cadastro não encontrado." with a way back
And   it shows no heading input
```

```gherkin
AC-0007-19
Given the owner on the fill-in page of client template "Ficha" with consent
When  they type a 121-character name and press [Salvar]
Then  "Use no máximo 120 caracteres." shows under the heading input
```

```gherkin
AC-0007-20
Given an active client template "Ficha"
When  the owner opens its fill-in page
Then  the level-1 heading is visually hidden
And   no visible text on the page reads "Novo cliente"
```

```gherkin
AC-0007-21
Given an archived client template "Ficha"
When  the owner opens its fill-in page
Then  the page says "Este modelo não está disponível." with a way back
And   it shows no heading input
```

## 11. Implementation plan

_Written by `/plan`, 2026-11-25. Approved by the owner, 2026-11-25 (v1.3)._

Web only. No contract, persistence or API change (§7). Bracketed route segments (`[lang]`, `[tenant]`) are written
as `*` in the scope block, because the lock matches bash globs and `[...]` would be read as a character class.

### Scope

```scope
apps/web/src/app/*/orgs/*/_components/records/record-adapter.ts
apps/web/src/app/*/orgs/*/_components/records/record-form.tsx
apps/web/src/app/*/orgs/*/_components/records/record-title-input.tsx
apps/web/src/app/*/orgs/*/_components/records/use-record-form.ts
apps/web/src/app/*/orgs/*/clients/_components/client-adapter.ts
apps/web/src/app/*/orgs/*/services/_components/service-adapter.ts
apps/web/tests/record-title.test.tsx
apps/web/tests/record-form.test.tsx
apps/web/tests/record-harness.tsx
apps/web/tests/clients-form.test.tsx
apps/web/tests/services-form.test.tsx
docs/specs/SPEC-0007-nome-como-titulo-do-cadastro.md
```

### Contracts

None. No schema, error code or copy key is added or changed. The page reuses `{entity}.form.newTitle` (hidden
level-1 heading while the name is blank), `{entity}.form.subtitle`, `{entity}.form.errorSummary` and the existing
`validation.clientName.*` / `validation.serviceName.*` messages.

### Persistence

None. Rollback loses nothing.

### API

None. The create and update requests keep sending `name` as a top-level attribute (SPEC-0004 §7, SPEC-0005 §7).

### Web (`apps/web/src/app/[lang]/(private)/orgs/[tenant]/`)

1. **Adapter** (`_components/records/record-adapter.ts`): `RecordAdapter` gains `titleField: string`, the
   `systemKey` of the field shown as the heading input. It must be a key of `systemFields`.
   - `clients/_components/client-adapter.ts`: `titleField: "client.name"`.
   - `services/_components/service-adapter.ts`: `titleField: "service.name"`.
   - Test fake (`tests/record-harness.tsx`, `fakeAdapter`): `titleField: ENTITY[entity].systemKeys[0]`.
2. **Heading input** (new `_components/records/record-title-input.tsx`): a borderless `<input>` styled like the
   template editor's name input (`font-heading-lg`, full width, `text-text-bold`, `text-text-status-danger` on
   error), plus a visible focus outline (`focus-visible:outline-2 focus-visible:outline-border-focused`, P-2).
   Props: `id`, `label`, `value`, `onChange`, `error?`, `help?`, `disabled`.
   - `aria-label` and `placeholder` are the field's label, without "*" (R3, R4; Q5, Q6).
   - `aria-required="true"`; `aria-invalid="true"` when there is an error.
   - Under it, the shared `FieldMessage` (`field-inputs/field-message.tsx`, imported, not changed) with id
     `<id>-help`: the error (`tone="error"`, so `role="alert"`), or the help text when there is no error (P-5),
     linked by `aria-describedby` (P-3).
   - `disabled` while saving, like every other input of the page (P-4). `autoComplete="off"` (P-1).
3. **Form page** (`_components/records/record-form.tsx`):
   - The visible `<h1>` "Novo cliente" goes. The header becomes, in order: `<h1 className="sr-only">`, the heading
     input, the subtitle "Modelo: <name>".
   - The hidden heading reads, on create, the typed name trimmed, or `t("form.newTitle")` when blank; on edit, the
     stored name of the loaded record (R5).
   - The heading input binds to the title field's attribute: value `form.draft.system[attribute]`, change
     `form.setSystem(attribute, …)`, error `form.error("system.<attribute>")`, help `field.helpText`, id
     `form.systemId(attribute)`, so the focus and server-error routing find it by the same key (`system.name`).
   - The field list skips the field whose `systemKey` equals `adapter.titleField`, wherever the version places it
     (R2). Every other field keeps the version's order.
   - If the loaded version has no field with that key (it cannot under SPEC-0002 R3), the page renders as today
     with no heading input and the hidden heading reads `t("form.newTitle")`.
   - The banners (summary, template changed, save error, revision conflict) and the consent extra field keep their
     place below the subtitle (§4.1 step 2).
4. **Form hook** (`_components/records/use-record-form.ts`):
   - The `ready` load also carries the loaded record's title value (`storedTitle: string | null`, null on create),
     so the edit page's hidden heading does not follow the typing (R5, AC-0007-13).
   - `firstInvalid` checks the title field first, then the rest of the list in order, skipping it (R6). Today it
     walks the version order, so a template that puts the name last would focus another field first.
   - `keyOfServerField` is unchanged: a rejection whose `field` is `name` maps to `system.name`, the heading
     input's key.
   - **Focus after a server rejection.** Today `onValid` calls `setSaving(false)` and then `routeFailure` →
     `focusKey` in the same tick, while the inputs are still `disabled` (P-4), so `.focus()` does nothing. The hook
     keeps the key to focus in a ref, and an effect focuses it once `saving` is false and the page has re-rendered
     with the inputs enabled. This serves every input of the page, not only the name (AC-0007-08; SPEC-0003 §4.1
     step 4 already asks for it).
5. **i18n**: no new keys.

### Tests

The shared tests run `describe.each(ENTITIES)` on the fake adapter of `record-harness.tsx`; the services run of a
test is the service form of the criterion (§10). Criteria that need the real name copy or the consent checkbox run
on the entity pages (`clients-form.test.tsx` with `NewClientPage` / `ClientEditPage`, `services-form.test.tsx`
with `NewServicePage` / the service edit page), because the fake adapter's name schema answers `value.required`.

| AC | File | Test name |
| --- | --- | --- |
| AC-0007-01 | `tests/record-title.test.tsx` | `AC-0007-01 the heading input comes first, above the subtitle, empty, named and placeholdered by the name label, required, with no *` (clients run) |
| AC-0007-02 | `tests/record-title.test.tsx` | `AC-0007-02 the field inputs follow the subtitle in version order and the name is not repeated` (clients run) |
| AC-0007-03 | `tests/record-title.test.tsx` | `AC-0007-03 the hidden level-1 heading reads the new-record title, then the typed name` (clients run) |
| AC-0007-04 | `tests/record-title.test.tsx` | services runs of the AC-0007-01, -02 and -03 tests (named "Nome", "Novo serviço", Duração then Preço) |
| AC-0007-05 | `tests/record-title.test.tsx` | `AC-0007-05 a renamed name label names the heading input and is its placeholder` |
| AC-0007-06 | `tests/record-title.test.tsx` | `AC-0007-06 the name's help text shows under the heading input as its accessible description` |
| AC-0007-07 | `tests/clients-form.test.tsx`, `tests/services-form.test.tsx` | `AC-0007-07 a blank name with e-mail "ana@" and consent shows the name error under the heading input, "Corrija 2 campos", and focuses it`; service: `AC-0007-07 (service) a blank name shows "Informe o nome do serviço." under the heading input, "Corrija 1 campo", and focuses it` |
| AC-0007-08 | `tests/services-form.test.tsx` | `AC-0007-08 a 409 serviceName.taken shows under the heading input, focuses it and keeps every typed value` (replaces the `§8 shows 'serviceName.taken' under Nome` test) |
| AC-0007-09 | `tests/record-title.test.tsx` | `AC-0007-09 the heading input cannot be edited while the save is pending` (consent is the client page's extra field; the shared run goes without it, as AC-0003-91 does) |
| AC-0007-10 | `tests/record-title.test.tsx` | `AC-0007-10 typing only a name and pressing Cancelar asks to discard` |
| AC-0007-11 | `tests/record-title.test.tsx` | `AC-0007-11 a name placed last by the template is still the heading input; the other fields keep their order` |
| AC-0007-12 | `tests/record-title.test.tsx` | `AC-0007-12 the edit page pre-fills the heading input with the stored name and does not repeat it` (clients run) |
| AC-0007-13 | `tests/record-title.test.tsx` | `AC-0007-13 on the edit page the hidden level-1 heading keeps the stored name while the name is retyped` (clients run) |
| AC-0007-14 | `tests/record-title.test.tsx` | `AC-0007-14 after record.form-changed the reloaded page still shows the typed name` |
| AC-0007-15 | `tests/clients-form.test.tsx`, `tests/services-form.test.tsx` | `AC-0007-15 the typed name is sent as the record's name and the view page opens with the created toast` (client with consent; service with "Serviço cadastrado") |
| AC-0007-16 | `tests/clients-form.test.tsx`, `tests/services-form.test.tsx` | `AC-0007-16 clearing the name on the edit page shows the name error under the heading input and keeps the stored name in the hidden heading` |
| AC-0007-17 | `tests/record-title.test.tsx` | services runs of the AC-0007-12 and -13 tests |
| AC-0007-18 | `tests/record-title.test.tsx` | `AC-0007-18 another tenant's record shows "Cadastro não encontrado." with a way back and no heading input` (read answers 404 `<entity>.not-found`) |
| AC-0007-19 | `tests/clients-form.test.tsx`, `tests/services-form.test.tsx` | `AC-0007-19 a name over the limit shows the length error under the heading input` (121 characters, "Use no máximo 120 caracteres."; service 81, "Use até 80 caracteres.") |
| AC-0007-20 | `tests/record-title.test.tsx` | `AC-0007-20 the level-1 heading is visually hidden and no visible text reads the new-record title`. The test only asserts the `sr-only` class on the heading and that every element with that text is that heading; jsdom does not lay out the page, so "visually hidden" is checked by hand (Deferred checks). |
| AC-0007-21 | `tests/record-title.test.tsx` | `AC-0007-21 an archived template shows "Este modelo não está disponível." with a way back and no heading input` |
| R6 | `tests/record-title.test.tsx` | `R6 with the name placed last, a blank name still takes the focus first` |
| AC-0003-01 (amended) | `tests/record-form.test.tsx` | the existing `AC-0003-01 …` test: the name is checked by `aria-required` and no "*" instead of `labels[0]`; order and the other "*" checks stay |
| SPEC-0003 §4.1 step 4 (server rejection focus) | `tests/record-form.test.tsx` | the existing `routing a 409 whose field names a system attribute…` and `routing a rejection whose field names a custom value…` tests also assert that the named input has focus (Web step 4) |

Existing tests that find the name with `getByLabelText(labelRe(...))` keep working, because `aria-label` names
the heading input. Every other web test runs unchanged.

### Deferred checks

No criterion waits for another spec. Two checks need a browser and are done by hand before `/done`:

| What | Where | Who |
| --- | --- | --- |
| AC-0007-20: the level-1 heading is not visible on screen, and no visible "Novo cliente" / "Novo serviço" title appears | `/clients/new?form=<id>`, `/services/new?form=<id>`, and both edit pages, at 375 px and at 1280 px | Owner (Joao Izidoro), on a running system, as part of accepting the behavior |
| P-2: the heading input shows a visible focus outline when reached with the Tab key | same pages | Owner, same session |

### Sequence

0. **Precondition.** `task-lock.sh start` requires every `depends_on` spec to be `Implemented`. SPEC-0005 is
   `Approved` and waits for the owner's swipe check on iOS Safari and Android Chrome and acceptance on a running
   system (SPEC-0005 changelog 1.7). `/implement SPEC-0007` starts only after SPEC-0005's `/done` sets it to
   `Implemented`. Any other route (for example dropping SPEC-0005 from `depends_on`) is the owner's call.
1. **Adapter field.** `titleField` on `RecordAdapter`, set in the client and service adapters and in the test
   fake. Unused yet, so behavior is unchanged. `pnpm --filter web typecheck`.
2. **Failing tests.** `record-title.test.tsx`, the new cases in `clients-form.test.tsx` and
   `services-form.test.tsx`, and the amended AC-0003-01 test. They fail because the name is still in the list and
   the visible title is still "Novo cliente".
3. **Heading input and page.** `record-title-input.tsx`, the header and field-list changes in `record-form.tsx`,
   `storedTitle` and the focus order in `use-record-form.ts`. Then `pnpm --filter web lint`,
   `pnpm --filter web typecheck`, `pnpm --filter web test`.

Steps 1–3 fit one commit (`feat(web): record name as the page heading input [SPEC-0007]`), plus the spec's
changelog commit at `/done`.

### Decisions this plan makes (owner to confirm with the plan)

| # | Decision | Why |
| --- | --- | --- |
| P-1 | `autoComplete="off"` on the heading input for both entities. The client name input had `autoComplete="name"`. | The name is the client's, not the professional's; the browser would offer the professional's own name. Matches the editor. |
| P-2 | The heading input shows a focus outline when focused by keyboard. The editor's name input shows none. | RNF-18 asks for "foco visível". |
| P-3 | The name error is announced: it uses the shared `FieldMessage`, which puts `role="alert"` and `aria-live="polite"` on an error. | Matches the editor's name error and every other record input (`Input`'s hint and `FieldMessage` both do this). RNF-18: "feedback de erro textual". |
| P-4 | `disabled` while saving (the editor uses `readOnly`). | Matches every other input of the record page (§4.1 step 6). |
| P-5 | When the name has both help text and an error, the error replaces the help text. | As built for every record input today. |

### Risks

- **Accessibility (accepted, Q5/Q6).** The placeholder is the only visible label. The RFC's WCAG 2.1 AA check
  (M7) may flag it. The cheapest fix then is a small visible label above the input, a follow-up spec.
- **"Visually hidden" in jsdom.** AC-0007-20 can only assert the `sr-only` class in tests. The owner checks it in a
  browser on `/clients/new` and `/services/new`, with the keyboard focus outline (P-2), as part of accepting the
  behavior.
- **Focus after a server rejection.** The focus-after-re-render change (Web step 4) touches every server
  rejection routed to an input, not only the name. AC-0007-08 proves it for the name; the existing routing tests
  of `record-form.test.tsx` (`routing a 409 whose field names a system attribute…`, `routing a rejection whose
  field names a custom value…`) gain a focus assertion, so a regression in either path shows in step 2.
- **Tests that read `input.labels`.** An `aria-label` input has no `<label>`. Only the AC-0003-01 test does this
  today (`grep -n "\.labels" apps/web/tests`); found early by step 2.
- **Templates whose version lacks the title field.** Impossible under SPEC-0002 R3; the page falls back to
  today's layout instead of crashing.

### New dependencies

None.

## 12. Changelog

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | 2026-11-25 | Draft |
| 0.2 | 2026-11-25 | Spec review applied: consent in AC-07/-09/-14/-15 and a §10 preamble (each criterion covers both entities); amendments list in §2 (SPEC-0003 §4.1, §4.3, R2, §8, AC-0003-01; SPEC-0004 §4.3) and how they are marked; RNF-18 traced in R3–R6, with Q5 and Q6 flagged for the owner; R5 says the level-1 heading is hidden and the visible title goes; R6 marked assumption (Q8); editor behavior cited "as built"; banners of §4.1 step 2 complete; §5 in template columns; new AC-0007-16 to -20 (edit blank name, service edit, not found, name too long, no visible title); Blocks column completed. |
| 0.3 | 2026-11-25 | Owner accepted the proposed answers to §9 Q1–Q8; R1–R6 now cite those decisions instead of assumptions. Q5 and Q6 record the accepted RNF-18 risk. |
| 0.4 | 2026-11-25 | Spec re-check applied: the §10 preamble now says which criteria cover services (AC-08 service-only; -04 and -17 the service forms of -01 and -12; every other one in a service form without e-mail and consent, with the service copy and 80-character limit); new AC-0007-21 (archived template: no heading input). |
| 1.0 | 2026-11-25 | Approved by Joao Izidoro, 2026-11-25, after the spec review and its re-check (both 2026-11-25), with all 21 criteria agreed and §9 Q1–Q8 decided. SPEC-0003 (v1.11) and SPEC-0004 (v1.9) amended per §2. |
| 1.1 | 2026-11-25 | Implementation plan written (§11): web only, `titleField` on the record adapter, a new heading input, the hidden level-1 heading and the focus order; P-1 to P-5 for the owner. `plan_status` stays Draft. |
| 1.2 | 2026-11-25 | Plan review applied: Sequence step 0 (SPEC-0005 must be Implemented before `/implement`); focus after a server rejection moves to an effect after the re-render (Web step 4, Risks); P-3 now uses `FieldMessage` with `role="alert"`; Deferred checks list the owner's browser check of AC-0007-20 and P-2. `plan_status` stays Draft. |
| 1.3 | 2026-11-25 | Plan approved by Joao Izidoro, 2026-11-25: §11 as revised in 1.2, after the plan review, with P-1 to P-5 decided as written. `plan_status` Approved. `/implement` waits for SPEC-0005 to be Implemented (Sequence step 0). |
| 1.4 | 2026-11-25 | Implemented per §11; `status` stays Approved until the owner accepts the behavior on a running system and records the browser check of the Deferred checks table. Built: `titleField` on the record adapter (clients `client.name`, services `service.name`); the heading input (`FieldMessage` for help and error, `role="alert"` on error); the hidden level-1 heading (typed name or new-record title on create, stored name on edit); the name left out of the field list; the name first in the focus order; focus after a server rejection once the inputs are enabled again. The focus outline needed `focus-visible:outline-solid` as well as the classes §11 Web step 2 names, because `outline-none` sets the outline style to none (found at review, 2026-11-25). All 21 criteria have passing tests in clients and services runs, with the amended AC-0003-01 test and R6. Partly verified, per Deferred checks: AC-0007-20 (the `sr-only` class in jsdom; on screen by hand) and P-2 (the focus outline, by hand). |
| 1.5 | 2026-11-25 | Status Implemented: Joao Izidoro accepts the behavior on a running system and reports the browser check of the Deferred checks table as done, 2026-11-25, so AC-0007-20 (heading not visible on screen) and P-2 (keyboard focus outline) are verified. No criterion is deferred. |
