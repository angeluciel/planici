---
id: SPEC-0003
title: Preenchimento de cadastro a partir de modelo
status: Approved # Draft | Review | Approved | Implemented | Superseded
plan_status: Draft # Draft | Approved
version: 1.0
owner: Joao Izidoro
satisfies: [RF-40, RF-41, RF-42, RN-01, RN-02, RN-20, RN-21, RNF-07]
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
- Protection against two tabs overwriting the same record (R14).

**Out of scope**
- Client-specific rules (e-mail uniqueness, lists, inactivation): SPEC-0004.
- Service-specific rules (duration, price, lists, inactivation): SPEC-0005.
- The consent attestation on a client's first save (RFC §6, "Dados Sensíveis (art. 11)"; forms-overview.md
  D-12): SPEC-0004 R12.
- Changing a record's template: post-MVP (D-4).
- Moving a single record to the latest version on its own: post-MVP (SPEC-0001 Q6).
- Searching, filtering or exporting by custom-field values: post-MVP.
- Drafts and autosave of a half-filled record: post-MVP.
- Audit events (RFC §6, "Auditoria e Monitoramento"; RNF-11) for creating and editing records: the separate audit
  spec, as in SPEC-0001 §2 (owner decision, 2026-11-09).

**Dependencies**
- This spec depends on SPEC-0001 (templates, versions, "Atualizar todos") and SPEC-0002 (field types and
  attributes). Both are approved.
- The record endpoints belong to SPEC-0004 (clients) and SPEC-0005 (services), which embed the shapes of §7. Every
  API criterion here runs through them, so it can be verified only once they are implemented.
- AC-0003-19 also needs the client list of SPEC-0004. AC-0003-82 needs inactivation (SPEC-0004 §4.4).

## 3. Domain rules

- **R1.** A record is created from exactly one **active** template whose type matches the record (a client from a
  `client` template). It stays bound to that template, and is linked to the template's **latest published
  version** at the moment it is created. (D-4, RF-40, RN-21, SPEC-0001 R7, R16)
- **R2.** Pages show the fields of the record's **linked version**, in that version's order, with the current
  label and help text (metadata applies to every version, SPEC-0001 §3.3), and mark required ones. (RN-20, RN-21)
- **R3.** Each field holds at most one value. A blank value (empty, or whitespace only) or `null` means "no value"
  and is not stored. (owner decision, §9 Q6)
- **R4.** Values are validated by field type (§3.1). System-field values are also validated by SPEC-0004 or
  SPEC-0005.
- **R5.** `values` holds only the **custom** fields of the record's linked version (for a new record, the latest
  version). System-field values go in the record's top-level attributes (SPEC-0004/0005). A `values` key equal to a
  system field's id is rejected with 422 `value.unknown-field`. (RN-21; owner decision, 2026-11-09)
- **R6.** Required fields of the linked version, system fields included, must have a value on **every** save,
  create or edit. When "Atualizar todos" migrates a record to a version where a field it has no value for is
  required (a new required field, or an existing field turned required, SPEC-0002 R14), the record is migrated
  without that value and the field is pending (`missingRequired`). It is required at the next save. A pending
  system field fails with its own spec's error: for a client's phone, SPEC-0004 `phone.required` on `phone`.
  (RN-20, D-10; owner decision, 2026-11-09)
- **R7.** Every save states the template version the page was showing. A new record is rejected if a newer
  version was published since the page opened. An edit is rejected if the record was migrated since the page
  opened. Nothing is stored in either case. (owner decision, §9 Q5)
- **R8.** Template changes never delete or rewrite stored values, except an explicit "Atualizar todos" migration
  (R13). Metadata changes only change how values are shown. (RN-21)
- **R9.** Protected values are hidden by default on the record's view page and revealed per field on request.
  They are shown in plain text on the edit page. The record response includes protected values, and the UI masks
  them. No custom-field value, protected or not, appears in record lists or search results (SPEC-0004 §4.1).
  (forms-overview.md D-3; RFC §6; owner decisions, §9 Q2 and 2026-11-09)
- **R10.** No field value, protected or not, is written to logs or echoed in error responses. (RFC §6, "Auditoria e
  Monitoramento")
- **R11.** Custom-field values are encrypted at rest. (RFC §6, "Dados Sensíveis (art. 11)"; forms-overview.md
  Q-F)
- **R12.** A record and its values belong to one tenant. Another tenant's record behaves as not found. (RN-02)
- **R13.** Migrating a record ("Atualizar todos", SPEC-0001 R17) links it to the new version. Answers to fields
  that exist in both versions are kept unchanged. Answers to fields, or `select` options, that are not in the new
  version are deleted, which the professional confirmed by typing the template name (SPEC-0001 R18). New fields
  start empty. (RN-21, RN-25, D-10)
- **R14.** Every update states the record **revision** it was based on. An update based on an outdated revision
  is rejected with 409 `record.revision-conflict`, stores nothing, and never silently overwrites newer changes. A
  new record starts at revision 1, and the revision goes up on every stored change to its attributes or values,
  including a migration by "Atualizar todos". Inactivating or reactivating does not change it. (owner decision,
  2026-11-09; same pattern as SPEC-0001 R11)

### 3.1 Value rules per type

Input is normalised before validation: trimmed; for `cpf`, `phone` and `cep`, non-digits removed; the UF uppercased.

| Type | Accepts | Stored and shown as | Error key |
| --- | --- | --- | --- |
| `text` | 1–255 characters | trimmed | `value.max` |
| `long_text` | 1–5,000 characters, line breaks kept | trimmed | `value.max` |
| `number` | a number with at most 2 decimals, between −999,999,999.99 and 999,999,999.99. The UI accepts "72,5". | shown with a pt-BR decimal comma | `number.invalid` |
| `date` | a real calendar date between 1900-01-01 and 2100-12-31 | `dd/mm/aaaa` in pt-BR | `date.invalid` |
| `yes_no` | true / false; no value (absent or `null`) counts as false | "Sim" / "Não"; returned as `false` when it has no value | `value.invalid` |
| `select` | the id of one option of the record's linked version | option label | `option.invalid` |
| `email` | a valid address, lowercased | as stored | `email.invalid` |
| `phone` | 10 or 11 digits; the first two are a DDD on Anatel's list of area codes; 11-digit numbers start with 9 after the DDD | `(11) 98765-4321` | `phone.invalid` |
| `cpf` | 11 digits, valid check digits, not all identical | `000.000.000-00` | `cpf.invalid` |
| `full_name` | 1–120 characters, repeated spaces collapsed | as stored | `value.max` |
| `address` | CEP (8 digits), logradouro (1–120), número (1–10, "s/n" allowed), complemento (0–60), bairro (1–60), cidade (1–60), UF (one of the 27; lowercase accepted, stored uppercase) | one line, then CEP | `cep.invalid`, `uf.invalid`, `address.incomplete`, `value.max` |

The limits and formats in this table are owner decisions (§9 Q6). An optional `address` must be fully empty or
complete. Partial input fails with `address.incomplete`. Phone numbers are Brazilian only in the MVP (owner
decision, §9 Q4). A `yes_no` field is never required (SPEC-0002 R8), so having no value is always valid for it.

## 4. Behavior

### 4.1 Create a record
1. The professional picks a template in the **[Novo]** dropdown of `/clients` or `/services` (SPEC-0004/0005), or
   arrives from the template editor shortcut (SPEC-0001 §4.3).
2. The system opens the fill-in page (`/clients/new?form=:id`), titled "Novo cliente", with the subtitle
   "Modelo: <template name>". The page uses the template's latest version (R1). Fields appear in that version's
   order (R2). Required ones are marked with "*". Help text appears under the input. If the template is archived
   or does not exist, the page says "Este modelo não está disponível." with a way back. If it cannot be loaded,
   the page says "Não foi possível carregar o modelo." with a retry button.
3. The professional fills in the fields and presses **[Salvar]**.
4. The page validates every field with the §3.1 rules and shows **all** errors at once, focusing the first.
   The server re-validates and returns only the first issue (`api-convention.md`, Validation).
5. On success the system stores the record and opens its view page with the toast "Cliente cadastrado".
6. **[Cancelar]** returns to the list. If anything was typed, it asks "Descartar cadastro?" first.
7. If the save is rejected because the template was archived (409 `form.archived`) or deleted (400
   `formId.invalid`) since the page opened, the page says "Este modelo não está disponível." with a way back.

### 4.2 View a record
1. The view page lists the fields of the record's linked version, in that version's order, as label and value.
   Fields with no value show "—", except `yes_no` fields, which show "Não" (§3.1).
2. Protected values show as "••••••" with a **"Mostrar"** control per field. Revealing lasts until the page is
   left (R9).
3. The template name and "Versão N" are shown, and the name links to the template editor. If the record is on an
   older version than the latest, the page also says "Este cadastro usa uma versão anterior do modelo".
4. An unknown record id shows "Cadastro não encontrado." If the record cannot be loaded, the page says "Não foi
   possível carregar o cadastro." with a retry button.

### 4.3 Edit a record
1. **[Editar]** opens the fill-in page pre-filled with current values. Protected values are shown in plain text.
   An unknown record id shows "Cadastro não encontrado."
2. The edit page shows the fields of the record's linked version, not the latest one (R2). Saving follows 4.1
   steps 3–5 (toast "Alterações salvas"). Pending required fields from a migration must be filled (R6).
3. If a required field of the linked version has no value, the view page shows "Preenchimento pendente" next to
   it, so the professional is not surprised at the next save.
4. If the record was changed elsewhere since the edit page opened (another tab), the save is rejected (R14). The
   page shows "Este cadastro foi alterado em outra janela. Recarregue para ver a versão atual." and the typed
   values stay on screen until the professional reloads.

### 4.4 New version published while filling (R7)
1. The professional is filling in a new record, or editing one, and in another tab a new version is published (or
   "Atualizar todos" migrates the record being edited).
2. On **[Salvar]**, the system rejects the save and stores nothing.
3. The page reloads with the version the record now uses (the latest one, for a new record). It keeps every typed
   value whose field still exists, drops values of fields that are gone and `select` choices whose option is
   gone, and shows "O modelo foi atualizado. Revise os campos e salve novamente." Metadata-only changes never
   cause this.

## 5. Permissions and tenant isolation

| Action | Unauthenticated | Member | Owner | Other tenant |
| --- | --- | --- | --- | --- |
| Create record from template | 401 | — (post-MVP) | 201 | 400 `formId.invalid` (template of another tenant) |
| Read record | 401 | — | 200 | 404 `client.not-found` / `service.not-found` |
| Update record | 401 | — | 200 | 404 `client.not-found` / `service.not-found` |

A tenant context without membership returns 404 `tenant.not-found`, as in SPEC-0001 §5. Every action above is
tenant-scoped and follows `api-convention.md`, Tenant context: a request without tenant context returns 400
`tenant.required`, and a request whose active tenant is inactive (suspended) returns 403 `tenant.inactive`.

## 6. Errors

`<fieldId>` is the template field's id.

| Situation | Status | `error` key | `field` |
| --- | --- | --- | --- |
| Template id missing on create | 422 | `formId.required` | `formId` |
| Template id sent on update (changing the template is post-MVP) | 422 | `formId.not-allowed` | `formId` |
| Template id malformed | 422 | `formId.invalid` | `formId` |
| Template id well-formed but unknown, or of another tenant | 400 | `formId.invalid` | `formId` |
| Template type does not match (service template for a client) | 422 | `formType.mismatch` | `formId` |
| Template is archived (create only) | 409 | `form.archived` | `formId` |
| `formVersion` missing | 422 | `formVersion.required` | `formVersion` |
| `formVersion` not a positive integer | 422 | `formVersion.invalid` | `formVersion` |
| `formVersion` is not the version the record must use (R7) | 409 | `record.form-changed` | `formVersion` |
| `revision` missing on update | 422 | `recordRevision.required` | `revision` |
| `revision` not a positive integer | 422 | `recordRevision.invalid` | `revision` |
| Update based on an outdated revision (R14) | 409 | `record.revision-conflict` | `revision` |
| `values` missing or not an object | 422 | `values.invalid` | `values` |
| Required field without value | 422 | `value.required` | `values.<fieldId>` |
| A `values` key that is not a well-formed field id | 422 | `value.unknown-field` | `values.<key>` |
| A `values` key equal to a system field's id (R5) | 422 | `value.unknown-field` | `values.<fieldId>` |
| Value for a well-formed field id that is not in the record's version (including another tenant's field) | 400 | `value.unknown-field` | `values.<fieldId>` |
| Value of the wrong JSON type | 422 | `value.invalid` | `values.<fieldId>` |
| Text over its limit | 422 | `value.max` | `values.<fieldId>`; for an address, `values.<fieldId>.street`, `.number`, `.complement`, `.district` or `.city` |
| Type rule failed | 422 | `number.invalid`, `date.invalid`, `option.invalid`, `email.invalid`, `phone.invalid`, `cpf.invalid` | `values.<fieldId>` |
| Address part invalid | 422 | `cep.invalid`, `uf.invalid` | `values.<fieldId>.cep` / `.state` |
| Address partly filled | 422 | `address.incomplete` | `values.<fieldId>` |

After authentication and tenant context (§5), checks run in this order, and the first failure is the response
(owner decision, 2026-11-09):
1. Request shape (422): `formId`, `formVersion`, `revision` and `values` present where required and well-formed,
   no `formId` on update, and every `values` key a well-formed field id.
2. On create, the template: unknown or of another tenant (400), wrong type (422), archived (409). On update, the
   record: unknown or of another tenant (404).
3. The template version: `record.form-changed` (409).
4. On update, the revision: `record.revision-conflict` (409).
5. Field-level checks: `values` keys against the version, required fields, type rules, and the system-attribute
   rules of SPEC-0004/0005.

So an update outdated in both template version and revision gets `record.form-changed`, because the page must
reload with the record's new version. A save on an outdated version never reports a field error.

`email.invalid` already exists. All other keys are new and need pt-BR and en-US copy.

## 7. Contract impact

New, non-breaking. Consumers: `apps/web`. The client and service shapes in SPEC-0004/0005 embed these.

- **Value** by field type: `text`, `long_text`, `full_name`, `email`, `phone`, `cpf` → string (stored
  normalised); `number` → number; `date` → `YYYY-MM-DD` string; `yes_no` → boolean; `select` → option id
  (string); `address` → `{ cep, street, number, complement | null, district, city, state }`.
- **Record request (create)**: `formId` (required), `formVersion`, the system-field attributes of the type
  (SPEC-0004/0005), and `values`: object keyed by custom field id (R5); `null` means no value (R3).
- **Record request (update)**: `revision` (int, required, R14), `formVersion`, system-field attributes, `values` as
  the **full** set of custom values of the linked version (absent keys and `null` clear the value). No `formId`:
  changing a record's template is post-MVP.
- **Record response**: `id`, `form` (`{ id, name, version, latestVersion, status }`, where `version` is the linked
  version), `revision` (int, R14), system-field attributes, `values` (custom fields of the linked version that have a
  value, keyed by field id, protected values included, R9; a `yes_no` with no value is returned as `false`),
  `missingRequired` (ids of required fields of the linked version without a value, system fields included, R6),
  `status`, `createdAt`, `updatedAt`.
- Pages render a record with its linked version's fields, from the version read in SPEC-0001 §7.
- The value rules of §3.1 live once in the shared contracts and are used by the web fill-in page and the API.

## 8. UI states

`{entity}` is `clients` or `services`, matching SPEC-0004 §8 and SPEC-0005 §8.

| Screen | State | Behavior | Copy key |
| --- | --- | --- | --- |
| Fill-in | loading template | Skeleton of N field rows | `{entity}.form.loading` |
| Fill-in | template load error | "Não foi possível carregar o modelo." + retry | `{entity}.form.loadError` |
| Fill-in | template archived or not found | "Este modelo não está disponível." + back | `{entity}.form.unavailable` |
| Fill-in | template archived or deleted, found on save (4.1 step 7) | "Este modelo não está disponível." + back | `{entity}.form.unavailable` |
| Edit | record not found | "Cadastro não encontrado." + back to the list | `{entity}.form.notFound` |
| Fill-in | saving | [Salvar] disabled with spinner | `{entity}.form.saving` |
| Fill-in | validation errors | Inline per field, summary at top "Corrija N campos" | `{entity}.form.errorSummary` |
| Fill-in | template changed (4.4) | Banner, form reloaded | `{entity}.form.formChanged` |
| Edit | revision conflict (4.3 step 4) | Banner with [Recarregar]; typed values kept | `{entity}.form.revisionConflict` |
| Fill-in | unexpected error | "Não foi possível salvar. Tente novamente." Typed values kept | `{entity}.form.saveError` |
| Fill-in | dirty, leaving | "Descartar cadastro?" | `{entity}.form.discard` |
| Toast | created / saved | "Cliente cadastrado" / "Alterações salvas" | `{entity}.toast.created`, `{entity}.toast.saved` |
| View | loading | Skeleton | `{entity}.view.loading` |
| View | load error | "Não foi possível carregar o cadastro." + retry | `{entity}.view.loadError` |
| View | not found | "Cadastro não encontrado." | `{entity}.view.notFound` |
| View | empty value | "—"; a `yes_no` shows "Não" | — |
| View | protected value hidden / shown | "••••••" + "Mostrar" / value + "Ocultar" | `{entity}.view.reveal`, `{entity}.view.hide` |
| View | older version | "Este cadastro usa uma versão anterior do modelo" | `{entity}.view.olderVersion` |
| View | version badge | "Modelo: <name> · Versão N" | `{entity}.view.version` |
| View | required field missing | "Preenchimento pendente" badge | `{entity}.view.missingRequired` |

## 9. Open questions

| # | Question | Proposed answer | Blocks |
| --- | --- | --- | --- |
| 1 | ~~Required fields added later.~~ | **Decided (D-10):** records on older versions are unaffected; migrated records are flagged pending and required at their next save. | — |
| 2 | ~~Should a protected value come from the API only on explicit reveal, so reveals can be audited (RFC §6 audit logs)?~~ | **Decided (owner, 2026-11-09):** not in the MVP. The response includes protected values and the UI masks them (R9). | — |
| 3 | ~~Clearing values of archived fields.~~ | **Superseded (v0.3):** fields are no longer archived; older versions keep them (D-10). | — |
| 4 | ~~International phone numbers?~~ | **Decided (owner, 2026-11-09):** Brazilian numbers only in the MVP. | — |
| 5 | ~~Rejecting a stale template version (R7) vs. validating against the current template.~~ | **Decided (owner, 2026-11-09):** reject (R7). | — |
| 6 | ~~Value rules: one value per field and blank means no value (R3); the §3.1 limits and formats (number range and decimals, 1900–2100 dates, address part lengths, "s/n", phone DDD and leading 9, CPF not all identical).~~ | **Decided (owner, 2026-11-09):** accepted as written. A valid DDD is one on Anatel's list of area codes. A lowercase UF is accepted and stored uppercase. | — |

## 10. Acceptance criteria

### Agreed criteria

These follow from the RFC or from decisions the owner has taken (forms-overview.md §3 and §9 of this spec).
The owner approved every criterion below on 2026-11-09.

Each criterion applies to clients and services. Tests cover both; the examples use clients, so copy keys use the
`clients.` prefix.

```gherkin
AC-0003-01
Given an active client template "Ficha" whose Telefone is not required, with custom fields "Profissão" (text) and "Objetivo" (long_text), in that order after the system fields
When  the owner opens the fill-in page for "Ficha"
Then  the inputs appear in the order Nome completo, E-mail, Telefone, Profissão, Objetivo
And   Nome completo and E-mail are marked required, and Telefone is not
```

```gherkin
AC-0003-02
Given template "Ficha" with a required custom field "Profissão" whose id is P
When  the owner creates a client with valid system fields and no value for P
Then  the response is 422 with { "error": "value.required", "field": "values.P" }
And   no client is stored
```

```gherkin
AC-0003-03
Given template "Ficha" with a required field "Profissão" whose id is P
When  the owner creates a client with valid system fields and "   " for P
Then  the response is 422 with { "error": "value.required", "field": "values.P" }
And   no client is stored
```

```gherkin
AC-0003-04
Given a "cpf" field C
When  the owner submits "123.456.789-00" for C
Then  the response is 422 with { "error": "cpf.invalid", "field": "values.C" }
```

```gherkin
AC-0003-05
Given a "cpf" field C
When  the owner creates a client with "529.982.247-25" for C
Then  the response's values hold "52998224725" for C
```

```gherkin
AC-0003-06
Given a "phone" field T
When  the owner submits "(11) 8765-43210" for T
Then  the response is 422 with { "error": "phone.invalid", "field": "values.T" }
```

```gherkin
AC-0003-07
Given an optional "address" field A
When  the owner submits only cep "01310100" and city "São Paulo"
Then  the response is 422 with { "error": "address.incomplete", "field": "values.A" }
```

```gherkin
AC-0003-08
Given a "select" field S with options "Manhã" and "Tarde"
When  the owner submits an option id that is not one of them
Then  the response is 422 with { "error": "option.invalid", "field": "values.S" }
```

```gherkin
AC-0003-09
Given a "date" field D
When  the owner submits "2025-02-30"
Then  the response is 422 with { "error": "date.invalid", "field": "values.D" }
```

```gherkin
AC-0003-10
Given template "Ficha" whose latest version does not contain field "Hobby" (id H) any more
When  the owner creates a client with formVersion set to that latest version and a value for H
Then  the response is 400 with { "error": "value.unknown-field", "field": "values.H" }
```

```gherkin
AC-0003-11
Given an archived client template "Antigo"
When  the owner creates a client from it
Then  the response is 409 with { "error": "form.archived", "field": "formId" }
```

```gherkin
AC-0003-12
Given an active service template "Serviço padrão"
When  the owner creates a client with its id
Then  the response is 422 with { "error": "formType.mismatch", "field": "formId" }
```

```gherkin
AC-0003-13
Given a client template belonging to tenant "studio-bia"
When  the owner of "studio-ana" creates a client with that template id
Then  the response is 400 with { "error": "formId.invalid", "field": "formId" }
And   no client is stored in either tenant
```

```gherkin
AC-0003-14
Given the owner opened the fill-in page for "Ficha" while its latest version was 2
And   version 3 was then published
When  the owner submits the record with formVersion 2
Then  the response is 409 with { "error": "record.form-changed", "field": "formVersion" }
And   no client is stored
```

```gherkin
AC-0003-15
Given a client with value "Engenheira" for field "Profissão"
When  the owner relabels the field to "Ocupação"
Then  the template's version does not change
And   the client's view page shows "Ocupação: Engenheira"
```

```gherkin
AC-0003-16
Given a client on version 1 of "Ficha" with value "Corrida" for field "Hobby"
When  the owner removes "Hobby" and applies with "Manter existentes"
Then  the client's view and edit pages still show "Hobby" with "Corrida"
And   the fill-in page for a new client does not offer "Hobby"
```

```gherkin
AC-0003-17
Given a client migrated by "Atualizar todos" to a version where field "Profissão" (id P) is required, without a value for P
When  the owner edits only the client's phone and saves without "Profissão"
Then  the response is 422 with { "error": "value.required", "field": "values.P" }
```

```gherkin
AC-0003-18
Given a client with value "Hipertensão" in protected field "Diagnóstico"
When  the owner opens the client's view page
Then  "Diagnóstico" shows "••••••" and a "Mostrar" control
And   pressing "Mostrar" shows "Hipertensão" until the page is left
```

```gherkin
AC-0003-19
Given a protected field "Diagnóstico" with value "Hipertensão" in a client
When  the client list is requested
Then  the list response contains no custom-field values
```

```gherkin
AC-0003-20
Given a client with value "Hipertensão" in field "Diagnóstico"
When  the client is created, read, updated and fails validation once
Then  no application log line contains "Hipertensão"
```

```gherkin
AC-0003-21
Given an owner filling a record with three invalid fields
When  they press Salvar
Then  all three fields show inline errors, the summary says "Corrija 3 campos" (clients.form.errorSummary)
And   focus moves to the first invalid field
And   no request is sent
```

```gherkin
AC-0003-22
Given a client of tenant "studio-bia"
When  the owner of "studio-ana" reads it with "studio-ana" as active tenant
Then  the response is 404 with { "error": "client.not-found" }
```

```gherkin
AC-0003-23
Given "Ficha" at version 3
When  the owner creates a client from it
Then  the response is 201 with form.version 3 and form.latestVersion 3
```

```gherkin
AC-0003-24
Given a client on version 1 of "Ficha", with answers for "Profissão" and "Objetivo"
And   version 2 keeps "Profissão" and removes "Objetivo"
When  the owner applies version 2 with "Atualizar todos" and confirms the template name
Then  the client reports form version 2, keeps its "Profissão" answer and has no "Objetivo" answer
```

```gherkin
AC-0003-25
Given a client on version 1 of "Ficha" while the latest version is 2
When  the owner opens the client's view page
Then  it shows the fields of version 1 and the notice with copy key clients.view.olderVersion
```

```gherkin
AC-0003-26
Given the owner opened the edit page of a client on version 1 at revision 3
And   "Atualizar todos" then migrated that client to version 2, raising its revision to 4
When  the owner saves the edit with formVersion 1 and revision 3
Then  the response is 409 with { "error": "record.form-changed", "field": "formVersion" }
And   the client is unchanged by that save
```

```gherkin
AC-0003-27
Given a client whose protected "cpf" field C has value "52998224725"
When  the owner opens the view page and presses "Mostrar" on C
Then  C first shows "••••••" and then "529.982.247-25"
```

```gherkin
AC-0003-28
Given the owner typed values for "Profissão" and "Hobby" on the fill-in page for "Ficha" at version 2
And   version 3 keeps "Profissão" and removes "Hobby"
When  the save is rejected with record.form-changed
Then  the page shows "Ficha" at version 3 with the banner with copy key clients.form.formChanged
And   "Profissão" keeps its typed value and "Hobby" is no longer shown
```

```gherkin
AC-0003-29
Given the client of AC-0003-17, before any edit
When  the owner opens its view page
Then  "Profissão" shows the badge with copy key clients.view.missingRequired
```

```gherkin
AC-0003-30
Given a client on version 1 of "Ficha", and version 2 adds field "Objetivo" (id O)
When  the owner updates the client with formVersion 1 and a value for O
Then  the response is 400 with { "error": "value.unknown-field", "field": "values.O" }
```

```gherkin
AC-0003-31
Given a "text" field X
When  the owner submits 256 characters for X
Then  the response is 422 with { "error": "value.max", "field": "values.X" }
```

```gherkin
AC-0003-32
Given an optional "address" field A
When  the owner submits a complete address whose street has 121 characters
Then  the response is 422 with { "error": "value.max", "field": "values.A.street" }
```

```gherkin
AC-0003-33
Given a "number" field N
When  the owner submits 72.555 for N
Then  the response is 422 with { "error": "number.invalid", "field": "values.N" }
```

```gherkin
AC-0003-34
Given an "email" custom field E
When  the owner submits "ana@" for E
Then  the response is 422 with { "error": "email.invalid", "field": "values.E" }
```

```gherkin
AC-0003-35
Given an optional "address" field A
When  the owner submits a complete address with cep "0131010"
Then  the response is 422 with { "error": "cep.invalid", "field": "values.A.cep" }
```

```gherkin
AC-0003-36
Given an optional "address" field A
When  the owner submits a complete address with state "XX"
Then  the response is 422 with { "error": "uf.invalid", "field": "values.A.state" }
```

```gherkin
AC-0003-37
Given a "yes_no" field Y
When  the owner submits the string "sim" for Y
Then  the response is 422 with { "error": "value.invalid", "field": "values.Y" }
```

```gherkin
AC-0003-38
Given tenant "studio-bia" has a template with field id F
When  the owner of "studio-ana" creates a client from one of their templates with a value for F
Then  the response is 400 with { "error": "value.unknown-field", "field": "values.F" }
And   no client is stored in either tenant
```

```gherkin
AC-0003-39
Given a user who owns "studio-ana" and has no membership in "studio-bia"
When  they create a client with "studio-bia" as tenant context
Then  the response is 404 with { "error": "tenant.not-found" }
```

```gherkin
AC-0003-40
Given a request with no access token
When  it creates a client
Then  the response is 401
```

```gherkin
AC-0003-41
Given an active client template "Ficha" at version 2
When  the owner creates a client from it with valid system fields and a value for its custom field "Profissão"
Then  the response is 201 with id, form { id, name "Ficha", version 2, latestVersion 2, status "active" }, revision 1, the system-field attributes, values with "Profissão", missingRequired [], status "active", createdAt and updatedAt
```

```gherkin
AC-0003-42
Given a client with a value for its optional custom field "Hobby" (id H)
When  the owner updates the client with a values object that has no key H
Then  the response is 200
And   reading the client returns no value for H
```

```gherkin
AC-0003-43
Given a client created from template "Ficha", which is now archived
When  the owner updates the client with valid values
Then  the response is 200
```

```gherkin
AC-0003-44
Given a client with value "Corrida" in custom field "Hobby"
When  the database rows that store the client and its values are read directly
Then  no stored row contains "Corrida" in plain text
```

```gherkin
AC-0003-45
Given a client on version 1 whose "select" field "Turno" holds option "Tarde"
And   version 2 removes option "Tarde" from "Turno"
When  the owner applies version 2 with "Atualizar todos" and confirms the template name
Then  the client reports form version 2 and has no value for "Turno"
```

```gherkin
AC-0003-46
Given a client on version 2 of template "Ficha"
When  the owner opens the client's view page
Then  it shows "Modelo: Ficha · Versão 2" with copy key clients.view.version
```

```gherkin
AC-0003-47
Given an archived client template "Antigo"
When  the owner opens the fill-in page for "Antigo"
Then  the page shows copy key clients.form.unavailable with a way back
```

```gherkin
AC-0003-48
Given an owner on the fill-in page with typed values
When  they press Salvar and the response is 500
Then  the page shows copy key clients.form.saveError
And   every typed value is still on screen
```

```gherkin
AC-0003-49
Given an owner on the fill-in page who typed a value
When  they press Cancelar
Then  a confirmation with copy key clients.form.discard is shown before leaving
```

```gherkin
AC-0003-50
Given an owner of "studio-ana"
When  they open the view page of a client id that does not exist in "studio-ana"
Then  the page shows copy key clients.view.notFound
```

```gherkin
AC-0003-51
Given an owner opening the fill-in page for template "Ficha"
And   loading the template fails with a server error
When  the page renders
Then  it shows copy key clients.form.loadError with a retry button
And   pressing retry loads the template again
```

```gherkin
AC-0003-52
Given an owner opening the view page of an existing client
And   loading the client fails with a server error
When  the page renders
Then  it shows copy key clients.view.loadError with a retry button
And   pressing retry loads the client again
```

```gherkin
AC-0003-53
Given an owner of "studio-ana"
When  they open the edit page of a client id that does not exist in "studio-ana"
Then  the page shows copy key clients.form.notFound
```

```gherkin
AC-0003-54
Given an active client template "Ficha"
When  the owner creates a client without formVersion
Then  the response is 422 with { "error": "formVersion.required", "field": "formVersion" }
```

```gherkin
AC-0003-55
Given an active client template "Ficha"
When  the owner creates a client with values set to a list instead of an object
Then  the response is 422 with { "error": "values.invalid", "field": "values" }
```

```gherkin
AC-0003-56
Given an owner of "studio-ana"
When  they create a client with formId "abc"
Then  the response is 422 with { "error": "formId.invalid", "field": "formId" }
```

```gherkin
AC-0003-57
Given tenant "studio-ana" is suspended
When  its owner creates a client
Then  the response is 403 with { "error": "tenant.inactive" }
```

```gherkin
AC-0003-58
Given an authenticated owner
When  they create a client without a tenant context
Then  the response is 400 with { "error": "tenant.required" }
```

```gherkin
AC-0003-59
Given a client at revision 3, opened for editing in two tabs
When  tab A saves (revision becomes 4) and then tab B saves with revision 3
Then  tab B receives 409 with { "error": "record.revision-conflict", "field": "revision" }
And   the stored client matches tab A's save
```

```gherkin
AC-0003-60
Given a client at revision 3
When  the owner updates it without revision
Then  the response is 422 with { "error": "recordRevision.required", "field": "revision" }
And   the client is unchanged at revision 3
```

```gherkin
AC-0003-61
Given the situation of AC-0003-59
When  tab B receives the revision conflict
Then  it shows the banner with copy key clients.form.revisionConflict
And   tab B's typed values are still on screen
```

```gherkin
AC-0003-62
Given a client at revision 1
When  the owner updates it with revision 1 and valid values
Then  the response is 200 with revision 2
```

```gherkin
AC-0003-63
Given a client of tenant "studio-bia"
When  the owner of "studio-ana" updates it with "studio-ana" as active tenant
Then  the response is 404 with { "error": "client.not-found" }
And   the client is unchanged
```

```gherkin
AC-0003-64
Given an active client template "Ficha"
When  the owner creates a client without formId
Then  the response is 422 with { "error": "formId.required", "field": "formId" }
```

```gherkin
AC-0003-65
Given a client at revision 3
When  the owner updates it with revision 0
Then  the response is 422 with { "error": "recordRevision.invalid", "field": "revision" }
And   the client is unchanged at revision 3
```

```gherkin
AC-0003-66
Given a client created from template "Ficha", and another active client template "Anamnese"
When  the owner updates the client with formId set to the id of "Anamnese"
Then  the response is 422 with { "error": "formId.not-allowed", "field": "formId" }
And   the client is still on "Ficha"
```

```gherkin
AC-0003-67
Given the owner opened the fill-in page for "Ficha" while its latest version was 2, and both versions 2 and 3 have a "cpf" field C
And   version 3 was then published
When  the owner creates a client with formVersion 2 and "123.456.789-00" for C
Then  the response is 409 with { "error": "record.form-changed", "field": "formVersion" }
```

```gherkin
AC-0003-68
Given a client at revision 4 whose version has a "cpf" field C
When  the owner updates it with revision 3 and "123.456.789-00" for C
Then  the response is 409 with { "error": "record.revision-conflict", "field": "revision" }
```

```gherkin
AC-0003-69
Given template "Ficha" with an optional "yes_no" field "Fumante" (id F)
When  the owner creates a client with no value for F
Then  the response is 201 with values.F false
```

```gherkin
AC-0003-70
Given the client of AC-0003-69
When  the owner opens its view page
Then  "Fumante" shows "Não"
```

```gherkin
AC-0003-71
Given a client with value "Corrida" in its optional custom field "Hobby" (id H)
When  the owner updates the client with values.H set to null
Then  the response is 200
And   reading the client returns no value for H
```

```gherkin
AC-0003-72
Given template "Ficha" whose system field Nome completo has id N
When  the owner creates a client with a valid name and also a value for N in values
Then  the response is 422 with { "error": "value.unknown-field", "field": "values.N" }
```

```gherkin
AC-0003-73
Given a client on version 1 of "Ficha" with no phone
And   version 2 makes Telefone (field id T) required
When  the owner applies version 2 with "Atualizar todos" and confirms the template name
Then  the client reports form version 2 and its missingRequired contains T
```

```gherkin
AC-0003-74
Given the client of AC-0003-73
When  the owner updates it without a phone
Then  the response is 422 with { "error": "phone.required", "field": "phone" }
```

```gherkin
AC-0003-75
Given a "phone" field T, and DDD 20, which is not on Anatel's list of area codes
When  the owner submits "(20) 98765-4321" for T
Then  the response is 422 with { "error": "phone.invalid", "field": "values.T" }
```

```gherkin
AC-0003-76
Given an optional "address" field A
When  the owner creates a client with a complete address for A whose state is "sp"
Then  the response's values hold state "SP" for A
```

```gherkin
AC-0003-77
Given the owner on the fill-in page for "Ficha" with typed values
And   "Ficha" is then archived in another tab
When  they press Salvar
Then  the page shows copy key clients.form.unavailable with a way back
```

```gherkin
AC-0003-78
Given the owner on the fill-in page for "Ficha" with typed values
And   "Ficha" is then deleted in another tab
When  they press Salvar
Then  the page shows copy key clients.form.unavailable with a way back
```

```gherkin
AC-0003-79
Given an owner of "studio-ana"
When  they create a client with a well-formed template id that no template has
Then  the response is 400 with { "error": "formId.invalid", "field": "formId" }
```

```gherkin
AC-0003-80
Given the owner chose option "Tarde" for the "select" field "Turno" on the fill-in page for "Ficha" at version 2
And   version 3 keeps "Turno" but removes option "Tarde"
When  the save is rejected with record.form-changed
Then  the page shows "Ficha" at version 3 and "Turno" has no choice selected
```

```gherkin
AC-0003-81
Given a client at revision 2 on version 1 of "Ficha"
When  the owner applies version 2 with "Atualizar todos" and confirms the template name
Then  the client reports revision 3
```

```gherkin
AC-0003-82
Given a client at revision 2
When  the owner inactivates it (SPEC-0004 §4.4)
Then  the client still reports revision 2
```

```gherkin
AC-0003-83
Given a client with value "Hipertensão" in protected field "Diagnóstico"
When  the owner opens the client's edit page
Then  the "Diagnóstico" input shows "Hipertensão" in plain text
```

```gherkin
AC-0003-84
Given a client on version 1 of "Ficha" whose "select" field "Turno" holds option "Tarde"
And   the latest version is 2 and still has "Turno" with option "Tarde"
When  the owner relabels option "Tarde" to "Vespertino"
Then  the client's view page shows "Turno: Vespertino"
```

```gherkin
AC-0003-85
Given a client on version 1 of "Ficha" with value "Corrida" in field "Hobby"
And   the latest version is 2 and still has "Hobby"
When  the owner turns protection on for "Hobby"
Then  the client's view page shows "Hobby" as "••••••" with a "Mostrar" control
```

```gherkin
AC-0003-86
Given an active client template "Ficha"
When  the owner creates a client with formVersion 0
Then  the response is 422 with { "error": "formVersion.invalid", "field": "formVersion" }
```

```gherkin
AC-0003-87
Given an active client template "Ficha"
When  the owner creates a client whose values has the key "abc", which is not a well-formed field id
Then  the response is 422 with { "error": "value.unknown-field", "field": "values.abc" }
```

```gherkin
AC-0003-88
Given a "cpf" field C
When  the owner submits "123.456.789-00" for C and the response is 422 with cpf.invalid
Then  the response body contains neither "123.456.789-00" nor "12345678900"
```

```gherkin
AC-0003-89
Given the client of AC-0003-17, before any edit
When  the owner reads the client
Then  the response's missingRequired contains P
```

```gherkin
AC-0003-90
Given the owner opening the fill-in page for "Ficha" before the template has loaded
When  the page renders
Then  it shows the skeleton with copy key clients.form.loading
```

```gherkin
AC-0003-91
Given the owner on the fill-in page with valid values
When  they press Salvar and the response has not arrived yet
Then  Salvar is disabled and shows a spinner with copy key clients.form.saving
```

```gherkin
AC-0003-92
Given the owner opening a client's view page before the client has loaded
When  the page renders
Then  it shows the skeleton with copy key clients.view.loading
```

```gherkin
AC-0003-93
Given the owner on the fill-in page for "Ficha" with valid values
When  they press Salvar and the client is created
Then  the new client's view page opens with the toast with copy key clients.toast.created
```

```gherkin
AC-0003-94
Given the owner on the edit page of a client with valid changes
When  they press Salvar and the save succeeds
Then  the client's view page opens with the toast with copy key clients.toast.saved
```

```gherkin
AC-0003-95
Given a client with no value for its optional "text" field "Hobby"
When  the owner opens the client's view page
Then  "Hobby" shows "—"
```

```gherkin
AC-0003-96
Given the owner revealed protected field "Diagnóstico" on a client's view page with "Mostrar"
When  they press the control with copy key clients.view.hide
Then  "Diagnóstico" shows "••••••" again
```

## 11. Implementation plan

Written by `/plan` after the spec is Approved. Empty until then.

```scope
```

## 12. Changelog

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | 2026-11-09 | Draft |
| 0.2 | 2026-11-09 | Owner answer D-8 recorded; `first_name` removed; AC-0003-04, -05, -07 agreed |
| 0.3 | 2026-11-09 | Template versioning (owner, D-10): records linked to a version; migration rules (R13); archived-field display removed; AC-0003-10, -14, -15, -16 rewritten; AC-0003-17 rewritten; AC-0003-23 to -26 added; criteria changes pending owner review |
| 0.4 | 2026-11-09 | Owner Joao Izidoro set |
| 0.5 | 2026-11-09 | Owner decision (SPEC-0001 review round 2): length keys use `.max` (`value.max`); schema vs metadata is now SPEC-0001 §3.3 |
| 0.6 | 2026-11-09 | Owner decisions (SPEC-0003 review): Q2, Q4 and Q5 decided (R7, R9, §3.1); well-formed but unknown or other-tenant ids (`formId.invalid`, `value.unknown-field`) use 400, malformed ids stay 422; copy keys are per entity (`{entity}.form.*`, `{entity}.view.*`); consent attestation belongs to SPEC-0004 (§2); record revision (R14, `record.revision-conflict`, `recordRevision.required`, `revision` in the contract). Review fixes: `select` accepts options of the linked version; `formVersion` and `values` errors; tenant-context errors (§5); load-error, not-found, revision-conflict and toast states (§4, §8); address paths and "trimmed" (§3.1, §6); AC-0003-05, -14, -17 and -25 split (new -27 to -30). AC-0003-01, -03, -05, -10, -13, -14, -17, -21, -23 and -25 changed; AC-0003-27 to -62 added; empty Provisional section removed; all pending owner review |
| 0.7 | 2026-11-09 | Owner confirmed the R14 revision rules (starts at 1, goes up on every stored change including migration, not on inactivate or reactivate), the precedence of `record.form-changed` over `record.revision-conflict` (§6), and the keys `formVersion.required`, `formVersion.invalid`, `values.invalid` and `recordRevision.required` |
| 0.8 | 2026-11-09 | Owner Joao Izidoro approved all pending criteria (AC-0003-01, -03, -05, -10, -13 to -17, -21, -23 to -62); all 62 criteria agreed |
| 0.9 | 2026-11-09 | R10 trace names the RFC §6 section correctly ("Auditoria e Monitoramento"); no behavior change |
| 0.10 | 2026-11-09 | Owner decisions (SPEC-0003 review round 2): check order (§6); `yes_no` with no value is false everywhere and `null` means no value (R3, §3.1, §4.2, §7); a system field's id in `values` gets 422 `value.unknown-field` (R5); `missingRequired` includes system fields and R6 covers fields turned required; R3 and the §3.1 limits accepted (§9 Q6: Anatel DDD list, lowercase UF stored uppercase); record audit events out of scope; template unavailable on save (§4.1 step 7, §8); dropped `select` choices on reload (§4.4); lists hide all custom values (R9). Review fixes: RN-01 and RNF-07 in `satisfies`; Dependencies note (§2); `formId.required`, `formId.not-allowed` and `recordRevision.invalid` (§6); `gherkin` and `scope` fences. AC-0003-06, -10, -22, -26 and -44 reworded and AC-0003-63 to -96 added, pending owner review |
| 1.0 | 2026-11-09 | Approved by Joao Izidoro, 2026-11-09, with all 96 criteria agreed |
