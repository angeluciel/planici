---
id: SPEC-0003
title: Preenchimento de cadastro a partir de modelo
status: Draft # Draft | Review | Approved | Implemented | Superseded
plan_status: Draft # Draft | Approved
version: 0.5
owner: Joao Izidoro
satisfies: [RF-40, RF-41, RF-42, RN-02, RN-20, RN-21]
depends_on: [SPEC-0001, SPEC-0002]
phase: MVP
ticket: -
---

# SPEC-0003 — Preenchimento de cadastro a partir de modelo

## 1. Purpose

A **record** (cadastro), meaning one client or one service, is created by filling in the fields of one template.
This spec covers what is shared by both: how the template is rendered, how each value is validated, how protected
values are shown, and what a record looks like after its template changes. It addresses RFC §2.2.9 (UC-46–UC-48)
in the "one template per record" model (forms-overview.md D-4).

## 2. Scope

**In scope**
- Rendering a template as a fill-in page for a new record, and as view and edit pages for an existing one.
- Validation rules for each field type of SPEC-0002 §3.1.
- Display of protected values.
- Which template version a record is linked to, and how it is displayed and validated against it.
- What "Atualizar todos" does to a record (migration).
- Metadata changes (labels, help text, protection, option labels) shown on records of every version.

**Out of scope**
- Client-specific rules (e-mail uniqueness, lists, inactivation): SPEC-0004.
- Service-specific rules (duration, price, lists, inactivation): SPEC-0005.
- Changing a record's template: post-MVP (D-4).
- Moving a single record to the latest version on its own: post-MVP (SPEC-0001 Q6).
- Searching, filtering or exporting by custom-field values: post-MVP.
- Drafts and autosave of a half-filled record: post-MVP.

## 3. Domain rules

- **R1.** A record is created from exactly one **active** template whose type matches the record (a client from a
  `client` template). It stays bound to that template, and is linked to the template's **latest published
  version** at the moment it is created. (D-4, RF-40, RN-21, SPEC-0001 R7, R16)
- **R2.** Pages show the fields of the record's **linked version**, in that version's order, with the current
  label and help text (metadata applies to every version, SPEC-0001 §3.3), and mark required ones. (RN-20, RN-21)
- **R3.** Each field holds at most one value. A blank value (empty, or whitespace only) means "no value" and is not
  stored. (`assumption`)
- **R4.** Values are validated by field type (§3.1). System-field values are also validated by SPEC-0004 or
  SPEC-0005.
- **R5.** Values can be submitted only for fields of the record's linked version (for a new record, the latest
  version). (RN-21)
- **R6.** Required fields of the linked version must have a value on **every** save, create or edit. A record
  migrated by "Atualizar todos" to a version with new required fields is migrated without those values and shows
  them as pending; they are required at its next save. (RN-20, D-10)
- **R7.** Every save states the template version the page was showing. A new record is rejected if a newer
  version was published since the page opened. An edit is rejected if the record was migrated since the page
  opened. Nothing is stored in either case. (`assumption`; makes template drift explicit)
- **R8.** Template changes never delete or rewrite stored values, except an explicit "Atualizar todos" migration
  (R13). Metadata changes only change how values are shown. (RN-21)
- **R9.** Protected values are hidden by default on the record's view page and revealed per field on request.
  They are shown in plain text on the edit page. They never appear in record lists, search or logs.
  (forms-overview.md D-3; RFC §6)
- **R10.** No field value, protected or not, is written to logs or echoed in error responses. (RFC §6, "Logs e
  auditoria")
- **R11.** Custom-field values are encrypted at rest. (RFC §6, "Dados Sensíveis (art. 11)"; forms-overview.md
  Q-F)
- **R12.** A record and its values belong to one tenant. Another tenant's record behaves as not found. (RN-02)
- **R13.** Migrating a record ("Atualizar todos", SPEC-0001 R17) links it to the new version. Answers to fields
  that exist in both versions are kept unchanged. Answers to fields, or `select` options, that are not in the new
  version are deleted, which the professional confirmed by typing the template name (SPEC-0001 R18). New fields
  start empty. (RN-21, RN-25, D-10)

### 3.1 Value rules per type

Input is normalised before validation: trimmed, and for `cpf`, `phone` and `cep`, non-digits removed.

| Type | Accepts | Stored and shown as | Error key |
| --- | --- | --- | --- |
| `text` | 1–255 characters | as typed | `value.max` |
| `long_text` | 1–5,000 characters, line breaks kept | as typed | `value.max` |
| `number` | a number with at most 2 decimals, between −999,999,999.99 and 999,999,999.99. The UI accepts "72,5". | shown with a pt-BR decimal comma | `number.invalid` |
| `date` | a real calendar date between 1900-01-01 and 2100-12-31 | `dd/mm/aaaa` in pt-BR | `date.invalid` |
| `yes_no` | true / false; no value counts as false | "Sim" / "Não" | `value.invalid` |
| `select` | the id of one active option | option label | `option.invalid` |
| `email` | a valid address, lowercased | as stored | `email.invalid` |
| `phone` | 10 or 11 digits with a valid DDD; 11-digit numbers start with 9 after the DDD | `(11) 98765-4321` | `phone.invalid` |
| `cpf` | 11 digits, valid check digits, not all identical | `000.000.000-00` | `cpf.invalid` |
| `full_name` | 1–120 characters, repeated spaces collapsed | as stored | `value.max` |
| `address` | CEP (8 digits), logradouro (1–120), número (1–10, "s/n" allowed), complemento (0–60), bairro (1–60), cidade (1–60), UF (one of the 27) | one line, then CEP | `cep.invalid`, `uf.invalid`, `address.incomplete`, `value.max` |

An optional `address` must be fully empty or complete. Partial input fails with `address.incomplete`.
Phone numbers are Brazilian only in the MVP (`assumption`).

## 4. Behavior

### 4.1 Create a record
1. The professional picks a template in the **[Novo]** dropdown of `/clients` or `/services` (SPEC-0004/0005), or
   arrives from the template editor shortcut (SPEC-0001 §4.3).
2. The system opens the fill-in page (`/clients/new?form=:id`), titled "Novo cliente", with the subtitle
   "Modelo: <template name>". The page uses the template's latest version (R1). Fields appear in that version's
   order (R2). Required ones are marked with "*". Help text
   appears under the input.
3. The professional fills in the fields and presses **[Salvar]**.
4. The page validates every field with the §3.1 rules and shows **all** errors at once, focusing the first.
   The server re-validates and returns only the first issue (`api-convention.md`, Validation).
5. On success the system stores the record and opens its view page with the toast "Cliente cadastrado".
6. **[Cancelar]** returns to the list. If anything was typed, it asks "Descartar cadastro?" first.

### 4.2 View a record
1. The view page lists the fields of the record's linked version, in that version's order, as label and value.
   Fields with no value show "—".
2. Protected values show as "••••••" with a **"Mostrar"** control per field. Revealing lasts until the page is
   left (R9).
3. The template name and "Versão N" are shown, and the name links to the template editor. If the record is on an
   older version than the latest, the page also says "Este cadastro usa uma versão anterior do modelo".

### 4.3 Edit a record
1. **[Editar]** opens the fill-in page pre-filled with current values. Protected values are shown in plain text.
2. The edit page shows the fields of the record's linked version, not the latest one (R2). Saving follows 4.1
   steps 3–5 (toast "Alterações salvas"). Pending required fields from a migration must be filled (R6).
3. If a required field of the linked version has no value, the view page shows "Preenchimento pendente" next to
   it, so the professional is not surprised at the next save.

### 4.4 New version published while filling (R7)
1. The professional is filling in a new record, or editing one, and in another tab a new version is published (or
   "Atualizar todos" migrates the record being edited).
2. On **[Salvar]**, the system rejects the save and stores nothing.
3. The page reloads with the version the record now uses (the latest one, for a new record). It keeps every typed
   value whose field still exists, drops values of fields that are gone, and shows "O modelo foi atualizado.
   Revise os campos e salve novamente." Metadata-only changes never cause this.

## 5. Permissions and tenant isolation

| Action | Unauthenticated | Member | Owner | Other tenant |
| --- | --- | --- | --- | --- |
| Create record from template | 401 | — (post-MVP) | 201 | 422 `formId.invalid` (template of another tenant) |
| Read record | 401 | — | 200 | 404 `client.not-found` / `service.not-found` |
| Update record | 401 | — | 200 | 404 `client.not-found` / `service.not-found` |

A tenant context without membership returns 404 `tenant.not-found`, as in SPEC-0001 §5.

## 6. Errors

`<fieldId>` is the template field's id.

| Situation | Status | `error` key | `field` |
| --- | --- | --- | --- |
| Template id unknown, of another tenant, or malformed | 422 | `formId.invalid` | `formId` |
| Template type does not match (service template for a client) | 422 | `formType.mismatch` | `formId` |
| Template is archived (create only) | 409 | `form.archived` | `formId` |
| Version shown on the page is no longer the record's (R7) | 409 | `record.form-changed` | `formVersion` |
| Required field without value | 422 | `value.required` | `values.<fieldId>` |
| Value for a field that is not in the record's version | 422 | `value.unknown-field` | `values.<fieldId>` |
| Value of the wrong JSON type | 422 | `value.invalid` | `values.<fieldId>` |
| Text over its limit | 422 | `value.max` | `values.<fieldId>` (or `.street`, `.city`...) |
| Type rule failed | 422 | `number.invalid`, `date.invalid`, `option.invalid`, `email.invalid`, `phone.invalid`, `cpf.invalid` | `values.<fieldId>` |
| Address part invalid | 422 | `cep.invalid`, `uf.invalid` | `values.<fieldId>.cep` / `.state` |
| Address partly filled | 422 | `address.incomplete` | `values.<fieldId>` |

`email.invalid` already exists. All other keys are new and need pt-BR and en-US copy.

## 7. Contract impact

New, non-breaking. Consumers: `apps/web`. The client and service shapes in SPEC-0004/0005 embed these.

- **Value** by field type: `text`, `long_text`, `full_name`, `email`, `phone`, `cpf` → string (stored
  normalised); `number` → number; `date` → `YYYY-MM-DD` string; `yes_no` → boolean; `select` → option id
  (string); `address` → `{ cep, street, number, complement | null, district, city, state }`.
- **Record request (create)**: `formId`, `formVersion`, the system-field attributes of the type (SPEC-0004/0005),
  and `values`: object keyed by custom field id.
- **Record request (update)**: `formVersion`, system-field attributes, `values` as the **full** set of custom
  values of the linked version (absent keys are cleared).
- **Record response**: `id`, `form` (`{ id, name, version, latestVersion, status }`, where `version` is the linked
  version), system-field attributes, `values` (custom fields of the linked version, keyed by field id),
  `missingRequired` (field ids, per 4.3 step 3), `status`, `createdAt`, `updatedAt`.
- Pages render a record with its linked version's fields, from the version read in SPEC-0001 §7.
- The value rules of §3.1 live once in the shared contracts and are used by the web fill-in page and the API.

## 8. UI states

| Screen | State | Behavior | Copy key |
| --- | --- | --- | --- |
| Fill-in | loading template | Skeleton of N field rows | `records.form.loading` |
| Fill-in | template archived or not found | "Este modelo não está disponível." + back | `records.form.unavailable` |
| Fill-in | saving | [Salvar] disabled with spinner | `records.form.saving` |
| Fill-in | validation errors | Inline per field, summary at top "Corrija N campos" | `records.form.errorSummary` |
| Fill-in | template changed (4.4) | Banner, form reloaded | `records.form.formChanged` |
| Fill-in | unexpected error | "Não foi possível salvar. Tente novamente." Typed values kept | `records.form.saveError` |
| Fill-in | dirty, leaving | "Descartar cadastro?" | `records.form.discard` |
| View | loading | Skeleton | `records.view.loading` |
| View | not found | "Cadastro não encontrado." | `records.view.notFound` |
| View | empty value | "—" | — |
| View | protected value hidden / shown | "••••••" + "Mostrar" / value + "Ocultar" | `records.view.reveal`, `records.view.hide` |
| View | older version | "Este cadastro usa uma versão anterior do modelo" | `records.view.olderVersion` |
| View | version badge | "Modelo: <name> · Versão N" | `records.view.version` |
| View | required field missing | "Preenchimento pendente" badge | `records.view.missingRequired` |

## 9. Open questions

| # | Question | Proposed answer | Blocks |
| --- | --- | --- | --- |
| 1 | ~~Required fields added later.~~ | **Decided (D-10):** records on older versions are unaffected; migrated records are flagged pending and required at their next save. | — |
| 2 | Should a protected value come from the API only on explicit reveal, so reveals can be audited (RFC §6 audit logs)? | Not in the MVP: the detail response includes it and the UI masks it. Revisit with collaborators (RF-05), when audits matter. | R9, contract |
| 3 | ~~Clearing values of archived fields.~~ | **Superseded (v0.3):** fields are no longer archived; older versions keep them (D-10). | — |
| 4 | International phone numbers? | No in the MVP; Brazilian only. | §3.1 |
| 5 | Rejecting a stale template version (R7) vs. validating against the current template. | Reject. It is rare (single user, two tabs) and predictable. | R7 |

## 10. Acceptance criteria

### Agreed criteria

These follow from the RFC or from decisions the owner has already taken (forms-overview.md §3).

Each criterion applies to clients and services. Tests cover both; the examples use clients.

```
AC-0003-01
Given an active client template "Ficha" with custom fields "Profissão" (text) and "Objetivo" (long_text), in that order after the system fields
When  the owner opens the fill-in page for "Ficha"
Then  the inputs appear in the order Nome completo, E-mail, Telefone, Profissão, Objetivo
And   Nome completo and E-mail are marked required
```

```
AC-0003-02
Given template "Ficha" with a required custom field "Profissão" whose id is P
When  the owner creates a client with valid system fields and no value for P
Then  the response is 422 with { "error": "value.required", "field": "values.P" }
And   no client is stored
```

```
AC-0003-03
Given template "Ficha" with a required field "Profissão" whose id is P
When  the owner submits "   " for P
Then  the response is 422 with { "error": "value.required", "field": "values.P" }
```

```
AC-0003-04
Given a "cpf" field C
When  the owner submits "123.456.789-00" for C
Then  the response is 422 with { "error": "cpf.invalid", "field": "values.C" }
```

```
AC-0003-05
Given a "cpf" field C
When  the owner submits a CPF with valid check digits, formatted with dots and dash
Then  the client is stored with the 11 digits only
And   the view page shows it as 000.000.000-00 format, masked until "Mostrar" is pressed
```

```
AC-0003-06
Given a "phone" field T
When  the owner submits "(11) 8765-43210"
Then  the response is 422 with { "error": "phone.invalid", "field": "values.T" }
```

```
AC-0003-07
Given an optional "address" field A
When  the owner submits only cep "01310100" and city "São Paulo"
Then  the response is 422 with { "error": "address.incomplete", "field": "values.A" }
```

```
AC-0003-08
Given a "select" field S with options "Manhã" and "Tarde"
When  the owner submits an option id that is not one of them
Then  the response is 422 with { "error": "option.invalid", "field": "values.S" }
```

```
AC-0003-09
Given a "date" field D
When  the owner submits "2025-02-30"
Then  the response is 422 with { "error": "date.invalid", "field": "values.D" }
```

```
AC-0003-11
Given an archived client template "Antigo"
When  the owner creates a client from it
Then  the response is 409 with { "error": "form.archived", "field": "formId" }
```

```
AC-0003-12
Given an active service template "Serviço padrão"
When  the owner creates a client with its id
Then  the response is 422 with { "error": "formType.mismatch", "field": "formId" }
```

```
AC-0003-13
Given a client template belonging to tenant "studio-bia"
When  the owner of "studio-ana" creates a client with that template id
Then  the response is 422 with { "error": "formId.invalid", "field": "formId" }
And   no client is stored in either tenant
```

```
AC-0003-18
Given a client with value "Hipertensão" in protected field "Diagnóstico"
When  the owner opens the client's view page
Then  "Diagnóstico" shows "••••••" and a "Mostrar" control
And   pressing "Mostrar" shows "Hipertensão" until the page is left
```

```
AC-0003-19
Given a protected field "Diagnóstico" with value "Hipertensão" in a client
When  the client list is requested
Then  the list response contains no custom-field values
```

```
AC-0003-20
Given a client with value "Hipertensão" in field "Diagnóstico"
When  the client is created, read, updated and fails validation once
Then  no application log line contains "Hipertensão"
```

```
AC-0003-21
Given an owner filling a record with three invalid fields
When  they press Salvar
Then  all three fields show inline errors, the summary says "Corrija 3 campos" (records.form.errorSummary)
And   focus moves to the first invalid field
And   no request is sent
```

```
AC-0003-22
Given a client of tenant "studio-bia"
When  the owner of "studio-ana" reads or updates it with "studio-ana" as active tenant
Then  the response is 404 with { "error": "client.not-found" }
```

### Pending owner review (v0.3)

These criteria were rewritten or added in v0.3 to apply the template-versioning rules (forms-overview.md D-10).
**The owner has not approved them yet.** Until then they are drafts: do not turn them into tests. The previous
wording of each rewritten criterion is in version 0.2 of this spec (git history).

**AC-0003-10**: rewritten in v0.3, pending owner review.

```
AC-0003-10
Given template "Ficha" whose latest version does not contain field "Hobby" (id H) any more
When  the owner creates a client including a value for H
Then  the response is 422 with { "error": "value.unknown-field", "field": "values.H" }
```

**AC-0003-14**: rewritten in v0.3, pending owner review. Also depends on §9 Q5 (reject stale template version).

```
AC-0003-14
Given the owner opened the fill-in page for "Ficha" while its latest version was 2
And   version 3 was then published
When  the owner submits the record with formVersion 2
Then  the response is 409 with { "error": "record.form-changed", "field": "formVersion" }
And   the page reloads "Ficha" at version 3, keeps typed values of fields that still exist and shows copy key records.form.formChanged
```

**AC-0003-15**: rewritten in v0.3, pending owner review.

```
AC-0003-15
Given a client with value "Engenheira" for field "Profissão"
When  the owner relabels the field to "Ocupação"
Then  the template's version does not change
And   the client's view page shows "Ocupação: Engenheira"
```

**AC-0003-16**: rewritten in v0.3, pending owner review.

```
AC-0003-16
Given a client on version 1 of "Ficha" with value "Corrida" for field "Hobby"
When  the owner removes "Hobby" and applies with "Manter existentes"
Then  the client's view and edit pages still show "Hobby" with "Corrida"
And   the fill-in page for a new client does not offer "Hobby"
```

**AC-0003-17**: rewritten in v0.3, pending owner review.

```
AC-0003-17
Given a client migrated by "Atualizar todos" to a version where field "Profissão" (id P) is required, without a value for P
When  the owner edits only the client's phone and saves without "Profissão"
Then  the response is 422 with { "error": "value.required", "field": "values.P" }
And   before editing, the view page showed "Preenchimento pendente" next to "Profissão"
```

**AC-0003-23**: new in v0.3, pending owner review.

```
AC-0003-23
Given "Ficha" at version 3
When  the owner creates a client from it
Then  the response reports form version 3 and latestVersion 3
```

**AC-0003-24**: new in v0.3, pending owner review.

```
AC-0003-24
Given a client on version 1 of "Ficha", with answers for "Profissão" and "Objetivo"
And   version 2 keeps "Profissão" and removes "Objetivo"
When  the owner applies version 2 with "Atualizar todos" and confirms the template name
Then  the client reports form version 2, keeps its "Profissão" answer and has no "Objetivo" answer
```

**AC-0003-25**: new in v0.3, pending owner review.

```
AC-0003-25
Given a client on version 1 of "Ficha" while the latest version is 2
When  the owner opens the client's view page
Then  it shows the fields of version 1 and the notice with copy key records.view.olderVersion
And   saving an edit validates against version 1, not version 2
```

**AC-0003-26**: new in v0.3, pending owner review.

```
AC-0003-26
Given the owner opened the edit page of a client on version 1
And   "Atualizar todos" then migrated that client to version 2
When  the owner saves the edit with formVersion 1
Then  the response is 409 with { "error": "record.form-changed", "field": "formVersion" }
And   the client is unchanged by that save
```

### Provisional criteria

These depend on open questions that are not answered yet. They are **not agreed behavior** and must not be turned into tests until the owner answers. On an answer, each one is confirmed, rewritten, or withdrawn (withdrawn IDs are not reused).

## 11. Implementation plan

Written by `/plan` after the spec is Approved. Empty until then.

```

```

## 12. Changelog

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | 2026-11-09 | Draft |
| 0.2 | 2026-11-09 | Owner answer D-8 recorded; `first_name` removed; AC-0003-04, -05, -07 agreed |
| 0.3 | 2026-11-09 | Template versioning (owner, D-10): records linked to a version; migration rules (R13); archived-field display removed; AC-0003-10, -14, -15, -16 rewritten; AC-0003-17 rewritten; AC-0003-23 to -26 added; criteria changes pending owner review |
| 0.4 | 2026-11-09 | Owner Joao Izidoro set |
| 0.5 | 2026-11-09 | Owner decision (SPEC-0001 review round 2): length keys use `.max` (`value.max`); schema vs metadata is now SPEC-0001 §3.3 |
