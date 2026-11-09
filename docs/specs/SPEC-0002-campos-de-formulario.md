---
id: SPEC-0002
title: Campos do modelo de formulário
status: Approved # Draft | Review | Approved | Implemented | Superseded
plan_status: Draft # Draft | Approved
version: 1.0
owner: Joao Izidoro
satisfies: [RF-38, RF-39, RN-20, RN-21]
depends_on: [SPEC-0001]
phase: MVP
ticket: -
---

# SPEC-0002 — Campos do modelo de formulário

## 1. Purpose

Inside a template (SPEC-0001), the professional adds **fields**, picks their type, marks them required or
protected, and arranges their order. Each field holds exactly one value per client or service. This addresses
RFC §2.2.9 (UC-43, UC-44) and the LGPD duties in RFC §6 ("Dados Sensíveis (art. 11)"), which say the professional
must be able to decide what is collected and protect it.

## 2. Scope

**In scope**
- MVP field-type catalog and the attributes of a field.
- What can change about system fields. Which system fields exist is defined in SPEC-0001 §3.2.
- The protected-data switch and when it auto-locks.
- Adding, reordering and removing fields.
- What each field change does to versions and records. Which changes are **schema** changes (they publish a
  template version) and which are **metadata** (they apply to every version at once) is defined in SPEC-0001
  §3.3 and R14.

**Out of scope**
- Validation of typed values and how records display them: SPEC-0003.
- Multi-select, radio groups, image and file upload, URL, CNPJ, computed or conditional fields: post-MVP.
- Per-field configuration such as min/max, masks or default values: post-MVP.
- CEP lookup to auto-fill addresses: post-MVP (an external service; RNF-15).
- Value-pattern PII detection in typed values (forms-overview.md D-3): not planned.
- Turning protection on for fields that exist only in older versions: post-MVP (R15).

**Dependencies**
- This spec depends on SPEC-0001 and is approved together with it (owner decision, 2026-11-09).
- Criteria whose Given has clients can seed those records directly. Criteria that read or display clients in
  their Then can be verified only once SPEC-0003 and SPEC-0004 are implemented: AC-0002-16, -19, -23, -24 and
  -26.

## 3. Domain rules

### 3.1 Field-type catalog (MVP)

Decided by the owner (forms-overview.md D-8). From the RFC (RF-38) and `schema.dbml`: text, long text, number,
date, select, e-mail, phone. Added: CPF, full name, address, yes/no. "First name" was dropped.

One field holds **one value**. "Endereço" is one value made of parts.

| Type (UI) | Key | Value | Protected |
| --- | --- | --- | --- |
| Texto curto | `text` | Text, up to 255 characters | label check |
| Texto longo | `long_text` | Text, up to 5,000 characters | label check |
| Número | `number` | Decimal number, up to 2 decimal places | label check |
| Data | `date` | Calendar date, no time | label check |
| Sim/Não | `yes_no` | true / false | label check |
| Seleção | `select` | One option from a list of 2–50 | label check |
| E-mail | `email` | E-mail address | always |
| Telefone | `phone` | Brazilian phone number | always |
| CPF | `cpf` | 11 digits with valid check digits | always |
| Nome completo | `full_name` | Text, up to 120 characters | always |
| Endereço | `address` | CEP, logradouro, número, complemento?, bairro, cidade, UF | always |

System-only types, never offered for custom fields: `duration` (whole minutes) and `money` (BRL amount), used by
service system fields.

"Label check" is applied to `date`, `yes_no` and `select` as well, not only to text and number, because "Data de
nascimento" and "Possui alergia?" are as personal as a free-text field. (owner decision, §9 Q11)

### 3.2 System fields

Moved to SPEC-0001 §3.2 in v0.5, so that SPEC-0001 does not depend on this spec (owner decision, 2026-11-09).
R3 and R4 below still say what can change about system fields.

### 3.3 Rules

- **R1.** A field has: label, type, required, protected, optional help text, options (only for `select`), and a
  position. Its identity is stable for its whole life. (RF-38)
- **R2.** Label: required, trimmed, 1–80 characters, unique among the other fields in the submitted list, ignoring
  case and accents. Help text: optional, at most 200 characters. Options: 2–50, each 1–80 characters, unique
  ignoring case and accents. (RF-38; limits are an owner decision, §9 Q9)
- **R3.** Every template carries all system fields of its type exactly once (SPEC-0001 §3.2). A system field's
  label, help text and position can change. Its type cannot, and it cannot be removed. Required is fixed except
  for `client.phone`. (D-2, D-14)
- **R4.** System fields are identification data: their values appear in lists and search. They have no
  protected switch. They are still personal data under RFC §6 and never appear in logs. (owner decision, §9 Q10)
- **R5.** A custom field of a type marked "always" in §3.1 is protected, and the switch is locked ON. (D-3)
- **R6.** A custom field of a type marked "label check" is protected and locked ON when its label contains a
  term from the protected-terms list (§3.4). If the label is edited so it no longer matches, the lock is released,
  but the switch stays ON until the professional turns it off. (D-3)
- **R7.** The server enforces R5 and R6. A field cannot be stored unprotected while its type or label requires
  protection. (CLAUDE.md non-negotiable: UI visibility is not authorization)
- **R8.** `yes_no` fields cannot be required, because "no" is a valid answer and an unanswered field reads as
  "no". (owner decision, §9 Q6)
- **R9.** Display order is the order the professional arranged, and it is kept exactly (RN-20). Moving one
  field changes no other field's relative order.
- **R10.** Removing a custom field removes it from the **next version** only. Older versions keep it, and records
  on them keep their answers. Whether those records follow the new version is decided in the Apply dialog
  (SPEC-0001 R17–R18). (RN-21, RN-24)
- **R11.** A removed field cannot be restored. Adding a field with the same label later creates a new field with a
  new identity. (D-10)
- **R12.** A published field's type is fixed. Choosing another type for it in the editor replaces it with a **new
  field** (new identity) in the next version, and the old field is removed from that version as in R10. Answers are
  never converted between types. (D-10)
- **R13.** Adding or removing a `select` option is a schema change. Renaming an option is metadata: the new label
  shows in every version and record. (D-10)
- **R14.** Making a field required, or adding a required field, is a schema change. Records that stay on older
  versions are not affected. Records migrated by "Atualizar todos" are migrated without the value and flagged as
  pending; the requirement applies at their next save (SPEC-0003 R6). (RN-20, D-10)
- **R15.** Protection can be changed only on fields of the latest version, because an update sends only the next
  version's fields. A field removed from the latest version keeps the protection it had when it was removed, in
  every older version and record that still has it. (owner decision, §9 Q12; turning protection on for those
  fields is post-MVP)

### 3.5 Schema and metadata

Moved to SPEC-0001 §3.3 in v0.5, so that SPEC-0001 does not depend on this spec (owner decision, 2026-11-09).
R10–R14 above say what each field change does.

### 3.4 Protected-terms list

Accepted by the owner (§9 Q4). It changes only by amending this spec.

Matching ignores case and accents and matches whole words or phrases.

- **Documents:** cpf, rg, cnh, cns, cartão sus, passaporte, pis, nis, título de eleitor, documento.
- **Contact and location:** endereço, cep, telefone, celular, whatsapp, e-mail, email.
- **Identity:** nascimento, sexo, gênero, raça, cor, etnia, nome da mãe, filiação.
- **Health (art. 5 II):** saúde, diagnóstico, doença, cid, medicamento, medicação, remédio, alergia, sintoma,
  queixa, anamnese, prontuário, histórico médico, cirurgia, gestação, gravidez, deficiência, peso, altura,
  pressão, exame, tratamento.
- **Other art. 11 data:** religião, crença, orientação sexual, sindicato, partido, opinião política, biometria,
  genético.
- **English UI equivalents:** ssn, passport, address, phone, birth, gender, health, diagnosis, medication,
  allergy, symptom, religion.

False positives (e.g. "Peso da mochila") lock the switch ON. Locking ON is the safe direction, so this is
accepted.

## 4. Behavior

### 4.1 Add a field
1. In the editor (SPEC-0001), the professional presses **[Novo campo]**.
2. A field row is appended at the end: type "Texto curto", empty label, required off, protected off. Focus moves to
   the label input.
3. Each row shows: drag handle, label, type dropdown, "Obrigatório" switch, "Dado protegido" switch, a "⋯" menu
   (help text, options, move up, move down, remove).
4. Changes are held in the editor until **[Salvar]** (SPEC-0001 R10).

### 4.2 Choose a type
1. The professional picks a type. Personal-data types lock "Dado protegido" ON, with the tooltip "Este tipo de
   campo sempre é protegido".
2. Choosing `select` opens the options editor with two empty options.
3. Choosing `yes_no` turns "Obrigatório" off and disables it (R8).
4. Changing the type of a field that is already published shows the warning "Alterar o tipo cria um novo campo. As
   respostas atuais não são convertidas." (R12)

### 4.3 Protected switch and label check
1. As the professional types a label for a "label check" type, the editor re-evaluates R6 on each change.
2. On a match, the switch turns ON and locks, with the tooltip "Rótulo indica dado pessoal ou de saúde".
3. When the label stops matching, the switch unlocks and stays ON.

### 4.4 Reorder
1. The professional drags a row by its handle, or uses "Mover para cima" / "Mover para baixo" (keyboard
   accessible; RNF-16–RNF-18).
2. System fields move like any other field.
3. The new order is stored on **[Salvar]** (R9).

### 4.5 Remove
1. **"Remover"** is not offered on system fields (R3).
2. For a custom field without answers, the row disappears from the draft.
3. For a custom field with answers, the editor first says "Este campo tem respostas em N cadastros. Ele sairá da
   próxima versão; o que acontece com as respostas é decidido ao aplicar as alterações." On confirm, the row
   disappears from the draft. The Apply dialog decides the rest (SPEC-0001 §4.7).

## 5. Permissions and tenant isolation

Fields are edited only through their template, so SPEC-0001 §5 applies unchanged. A field id that belongs to
another template, in this tenant or another, is rejected as unknown (§6), and nothing reveals that it exists
elsewhere.

## 6. Errors

`<i>` is the field's index in the request's `fields` array and `<j>` the option's index.

| Situation | Status | `error` key | `field` |
| --- | --- | --- | --- |
| Label missing or blank | 422 | `fieldLabel.required` | `fields.<i>.label` |
| Label over 80 characters | 422 | `fieldLabel.max` | `fields.<i>.label` |
| Label repeats another field in the submitted list | 422 | `fieldLabel.duplicate` | `fields.<i>.label` |
| Unknown type, or a system-only type on a custom field | 422 | `fieldType.invalid` | `fields.<i>.type` |
| Existing field id sent with a different type (R12: send a new field instead) | 400 | `fieldType.immutable` | `fields.<i>.type` |
| Unprotected while type or label requires protection | 422 | `fieldSensitive.locked` | `fields.<i>.sensitive` |
| `sensitive` sent on a system field (R4) | 422 | `fieldSensitive.not-allowed` | `fields.<i>.sensitive` |
| Required changed where it is fixed (system field, `yes_no`) | 422 | `fieldRequired.locked` | `fields.<i>.required` |
| Help text over 200 characters | 422 | `fieldHelpText.max` | `fields.<i>.helpText` |
| `select` with fewer than 2 options | 422 | `fieldOptions.required` | `fields.<i>.options` |
| `select` with more than 50 options | 422 | `fieldOptions.max` | `fields.<i>.options` |
| `options` sent on a type other than `select` | 422 | `fieldOptions.not-allowed` | `fields.<i>.options` |
| Option label blank / too long / duplicate | 422 | `fieldOptionLabel.required` / `.max` / `.duplicate` | `fields.<i>.options.<j>.label` |
| Option id not among the field's options in the latest version | 422 | `fieldOptionId.unknown` | `fields.<i>.options.<j>.id` |
| Option id repeated within one field | 422 | `fieldOptionId.duplicate` | `fields.<i>.options.<j>.id` |
| A system field of the type is missing | 422 | `systemField.missing` | `fields` |
| A system field's type changed | 400 | `systemField.locked` | `fields.<i>` |
| On create, a system key is repeated or is not a system key of the template's type | 422 | `systemField.locked` | `fields.<i>` |
| `systemKey` sent in an update request (after creation, system fields are identified by id) | 422 | `fieldSystemKey.not-allowed` | `fields.<i>.systemKey` |
| Field id not in this template's latest version (unknown, removed earlier, or another template's) | 400 | `field.unknown` | `fields.<i>.id` |
| The same field id twice in one request | 422 | `fieldId.duplicate` | `fields.<i>.id` (the later occurrence) |

A system field sent with its id and a different type matches both `systemField.locked` and `fieldType.immutable`;
the response is `systemField.locked`. (owner decision, 2026-11-09)

The 400 rows (`fieldType.immutable`, `systemField.locked` on a type change, `field.unknown`) are owner decisions
of 2026-11-09.

## 7. Contract impact

New, non-breaking. Part of the FormTemplate shapes in SPEC-0001 §7.

- **Field** (response): `id` (uuid), `label`, `type` (§3.1 keys plus `duration`, `money`), `required` (bool),
  `sensitive` (bool), `sensitiveLock` (`type | label | null`), `requiredLock` (bool), `helpText` (string | null),
  `options` (`{ id, label }[] | null`), `systemKey` (string | null), `valueCount` (int: records with a value).
- **FormTemplate**: `fields` holds the latest version's fields, in display order. A published version read
  (SPEC-0001 §7) returns the same Field shape for that version, with current metadata (labels, help text,
  protection, option labels).
- **FieldInput** (request): `id?` (omit for new fields), `label`, `type`, `required?` (bool), `sensitive?` (bool;
  never sent for system fields), `helpText?`, `options?` (`{ id?, label }[]`, only for `select`), `systemKey?`
  (only on create, to identify system fields). When `required` or `sensitive` is omitted (owner decisions,
  2026-11-09):
  - on a **new field** (no id), `required` is false, and `sensitive` follows R5 and R6: on if the type or label
    requires protection, otherwise off;
  - on an **existing field** (update), each keeps its current value, except that `sensitive` is on whenever the
    type or label now requires protection (R5–R7).
- **Semantics of `fields` on update:** the full field list of the next version, in display order. Present ids are
  kept, with their metadata updated. Absent ids are removed from the next version (R10). Entries without an id are
  new fields. Whether a version is published follows SPEC-0001 §3.3.
- The protected-terms list (§3.4) is shared by web and api from one source, so the editor and the server agree.

## 8. UI states

| Screen | State | Behavior | Copy key |
| --- | --- | --- | --- |
| Editor fields | only system fields | Hint "Adicione campos para coletar mais informações" | `forms.fields.onlySystem` |
| Field row | system field | "Sistema" badge; no Remover; type and fixed switches disabled | `forms.fields.systemBadge` |
| Field row | protected locked by type | Switch ON + disabled + tooltip | `forms.fields.sensitiveLockedType` |
| Field row | protected locked by label | Switch ON + disabled + tooltip | `forms.fields.sensitiveLockedLabel` |
| Field row | type changed on a published field | Warning (4.2 step 4) | `forms.fields.typeChangeWarning` |
| Field row | validation error | Inline under the input, row highlighted | `validation.*` |
| Field row | dragging | Placeholder gap, others shift | — |
| Remove dialog | field has answers | Explanation (4.5 step 3) | `forms.fields.removeWithAnswers` |
| Options editor | fewer than 2 options | [Salvar] shows `fieldOptions.required` inline | `validation.fieldOptions.required` |
| Field list | 100 fields | [Novo campo] disabled + hint | `forms.fields.limitReached` |

## 9. Open questions

| # | Question | Proposed answer | Blocks |
| --- | --- | --- | --- |
| 1 | ~~Switch name.~~ | **Decided (D-7):** "Dado protegido". | — |
| 2 | ~~Field-type catalog.~~ | **Decided (D-8):** as proposed, without `first_name`. | — |
| 3 | ~~RN-04 makes client e-mail required. Keep it?~~ | **Moved** to SPEC-0001 §9 Q12, together with the system fields. | — |
| 4 | ~~Is the protected-terms list (§3.4) acceptable? Who maintains it?~~ | **Decided (owner, 2026-11-09):** accepted as the initial list; it changes only by amending this spec. | — |
| 5 | ~~Should turning protection OFF be blocked once values exist?~~ | **Decided (owner, 2026-11-09):** no. Protection can be turned off; it only changes display, in every version. | — |
| 6 | ~~Is `yes_no` never-required (R8) acceptable?~~ | **Decided (owner, 2026-11-09):** yes. | — |
| 7 | ~~Should a removed field be recoverable?~~ | **Decided (D-10):** no; older versions keep it. | — |
| 8 | ~~Telefone as a client system field.~~ | **Decided (D-14):** yes, locked like Nome and E-mail, so clients can be searched by it; required stays the professional's choice. | — |
| 9 | ~~Are the limits in R2 right: label 1–80, help text 200, options 2–50 of 1–80 characters?~~ | **Decided (owner, 2026-11-09):** yes. | — |
| 10 | ~~Should system fields never be protected (R4)?~~ | **Decided (owner, 2026-11-09):** yes. | — |
| 11 | ~~Should the label check also apply to `date`, `yes_no` and `select` (§3.1)?~~ | **Decided (owner, 2026-11-09):** yes. | — |
| 12 | ~~Can protection be changed on a field that was removed from the latest version (R15)?~~ | **Decided (owner, 2026-11-09):** not in the MVP. Post-MVP: allow turning protection on for fields of older versions. | — |

## 10. Acceptance criteria

### Agreed criteria

These follow from the RFC or from decisions the owner has taken (forms-overview.md §3 and §9 of this spec).
The owner approved every criterion below on 2026-11-09.

```
AC-0002-01
Given an owner of tenant "studio-ana"
When  they create a client template whose fields are the three client system fields, identified by systemKey, with no custom fields
Then  the response's fields are client.name, client.email, client.phone in that order
And   client.name and client.email are required with requiredLock true
And   client.phone is not required with requiredLock false
```

```
AC-0002-02
Given an owner of tenant "studio-ana"
When  they create a service template whose fields are the three service system fields, identified by systemKey, with no custom fields
Then  the response's fields are service.name, service.duration, service.price, all required with requiredLock true
```

```
AC-0002-03
Given a client template
When  its owner saves a field list that omits client.email
Then  the response is 422 with { "error": "systemField.missing", "field": "fields" }
```

```
AC-0002-04
Given a client template whose fields are client.name, client.email and client.phone
When  its owner saves client.email, with its id, at index 1 with type "text"
Then  the response is 400 with { "error": "systemField.locked", "field": "fields.1" }
```

```
AC-0002-05
Given a client template with no records
When  its owner relabels client.name to "Nome do paciente" and moves it to the last position
Then  the response is 200
And   the field keeps its id and systemKey "client.name" with the new label and position
```

```
AC-0002-06
Given a template
When  its owner adds a custom field with label "Observações" and type "long_text"
Then  the response contains the field with required false, sensitive false, sensitiveLock null
```

```
AC-0002-07
Given a client template whose fields are client.name, client.email and client.phone
When  its owner adds, at index 3, a custom field of type "cpf" with sensitive false
Then  the response is 422 with { "error": "fieldSensitive.locked", "field": "fields.3.sensitive" }
```

```
AC-0002-08
Given a template
When  its owner adds a "text" field labelled "Diagnóstico principal" with sensitive true
Then  the response contains that field with sensitive true and sensitiveLock "label"
```

```
AC-0002-09
Given a template
When  its owner adds a "number" field labelled "PESO (kg)" with sensitive false
Then  the response is 422 with { "error": "fieldSensitive.locked", "field": "fields.3.sensitive" }
```

```
AC-0002-10
Given the editor shows a "text" field labelled "Alergia" with the switch locked ON
When  the owner changes the label to "Preferência de horário"
Then  the switch is unlocked and still ON
```

```
AC-0002-11
Given a client template whose fields are client.name, client.email, client.phone, "Profissão" and "Objetivo"
When  its owner saves a new field labelled " profissao " at index 5
Then  the response is 422 with { "error": "fieldLabel.duplicate", "field": "fields.5.label" }
```

```
AC-0002-12
Given a template
When  its owner saves a "select" field with one option
Then  the response is 422 with { "error": "fieldOptions.required", "field": "fields.3.options" }
```

```
AC-0002-13
Given a template
When  its owner saves a "yes_no" field with required true
Then  the response is 422 with { "error": "fieldRequired.locked", "field": "fields.3.required" }
```

```
AC-0002-14
Given a template with no records and fields A, B, C, D in that order
When  its owner moves D between A and B and saves
Then  reading the template returns fields in the order A, D, B, C
```

```
AC-0002-15
Given a client template at version 1 with custom field "Profissão" and no clients
When  its owner removes "Profissão" and publishes
Then  the template is at version 2 and its fields do not include "Profissão"
And   reading version 1 still returns "Profissão"
```

```
AC-0002-16
Given a client template at version 1 with field "Profissão" answered in 3 clients
When  its owner removes "Profissão" and applies with "Manter existentes"
Then  the latest version's fields do not include "Profissão"
And   the 3 clients stay on version 1 and still return their "Profissão" answers (SPEC-0003)
```

```
AC-0002-18
Given a client template with no records whose fields are client.name, client.email, client.phone and a published "text" field with id T
When  its owner saves the template with field id T at index 3 and type "number"
Then  the response is 400 with { "error": "fieldType.immutable", "field": "fields.3.type" }
```

```
AC-0002-19
Given a published "select" field with options "Manhã", "Tarde", "Noite" and a client on that version whose value is "Tarde"
When  its owner removes the option "Tarde" and applies with "Manter existentes"
Then  the latest version offers "Manhã" and "Noite"
And   that client stays on its version and still shows "Tarde"
```

```
AC-0002-20
Given a template of tenant "studio-bia" with field id F
When  the owner of "studio-ana" saves one of their client templates with a field whose id is F at index 3
Then  the response is 400 with { "error": "field.unknown", "field": "fields.3.id" }
And   the field F in "studio-bia" is unchanged
```

```
AC-0002-21
Given the editor with a system field row
When  the owner opens its "⋯" menu using the keyboard
Then  "Mover para cima" and "Mover para baixo" are available and "Remover" is not
```

```
AC-0002-22
Given a published "text" field "Peso" with id T, answered in 2 clients
When  its owner changes its type to "number" in the editor
Then  the editor shows the warning with copy key forms.fields.typeChangeWarning
```

```
AC-0002-23
Given a client template at version 2 that still has the unprotected custom field "Hobby" (id H) from version 1, and a client on version 1 with an answer for "Hobby"
When  its owner turns "Dado protegido" on for "Hobby" and saves
Then  the template is still at version 2
And   the client on version 1 shows "Hobby" masked (SPEC-0003 R9)
```

```
AC-0002-24
Given a published "select" field with option "Tarde" and a client on an older version whose value is "Tarde"
When  its owner renames the option to "Período da tarde" and saves
Then  no version is published
And   that client shows "Período da tarde"
```

```
AC-0002-25
Given a client template at version 1 with fields A, B, C
When  its owner moves C before A and publishes
Then  the template is at version 2 with order C, A, B
And   reading version 1 still returns order A, B, C
```

```
AC-0002-26
Given a client template at version 1 whose published "text" field "Peso" (id T) is answered in 2 clients
When  its owner saves fields without T and with a new "number" field "Peso", and applies with "Manter existentes"
Then  the latest version has a "number" field "Peso" whose id is not T
And   the 2 clients stay on version 1 with their "text" answers
```

```
AC-0002-27
Given a template with a "text" field "Alergia" stored with sensitive true
When  its owner saves it with label "Preferência de horário" and sensitive false
Then  the response contains that field with sensitive false and sensitiveLock null
```

```
AC-0002-28
Given a client template whose fields are client.name, client.email and client.phone
When  its owner adds, at index 3, a custom field of type "money"
Then  the response is 422 with { "error": "fieldType.invalid", "field": "fields.3.type" }
```

```
AC-0002-29
Given a client template whose fields are client.name, client.email and client.phone
When  its owner saves client.email at index 1 with required false
Then  the response is 422 with { "error": "fieldRequired.locked", "field": "fields.1.required" }
```

```
AC-0002-30
Given a client template with no records whose client.phone is not required
When  its owner saves client.phone with required true
Then  the response is 200 and client.phone has required true and requiredLock false
```

```
AC-0002-31
Given a client template with no records whose custom field "Profissão" (id P) was removed in version 2
When  its owner saves, at index 3, a field with id P
Then  the response is 400 with { "error": "field.unknown", "field": "fields.3.id" }
```

```
AC-0002-32
Given tenant "studio-ana" has client templates "Ficha" and "Anamnese", and "Anamnese" has a field with id A
When  its owner saves "Ficha" with a field whose id is A at index 3
Then  the response is 400 with { "error": "field.unknown", "field": "fields.3.id" }
And   field A in "Anamnese" is unchanged
```

```
AC-0002-33
Given a client template whose fields are client.name, client.email and client.phone
When  its owner adds, at index 3, a custom field with a label of 81 characters
Then  the response is 422 with { "error": "fieldLabel.max", "field": "fields.3.label" }
```

```
AC-0002-34
Given a client template whose fields are client.name, client.email and client.phone
When  its owner adds, at index 3, a custom field with help text of 201 characters
Then  the response is 422 with { "error": "fieldHelpText.max", "field": "fields.3.helpText" }
```

```
AC-0002-35
Given a client template whose fields are client.name, client.email and client.phone
When  its owner adds, at index 3, a "select" field with 51 options
Then  the response is 422 with { "error": "fieldOptions.max", "field": "fields.3.options" }
```

```
AC-0002-36
Given a client template whose fields are client.name, client.email and client.phone
When  its owner adds, at index 3, a "select" field with options "Manhã" and " "
Then  the response is 422 with { "error": "fieldOptionLabel.required", "field": "fields.3.options.1.label" }
```

```
AC-0002-37
Given a client template whose fields are client.name, client.email and client.phone
When  its owner adds, at index 3, a "select" field with options "Manhã" and a label of 81 characters
Then  the response is 422 with { "error": "fieldOptionLabel.max", "field": "fields.3.options.1.label" }
```

```
AC-0002-38
Given a client template whose fields are client.name, client.email and client.phone
When  its owner adds, at index 3, a "select" field with options "Manhã" and " manha "
Then  the response is 422 with { "error": "fieldOptionLabel.duplicate", "field": "fields.3.options.1.label" }
```

```
AC-0002-39
Given an owner of tenant "studio-ana"
When  they create a client template whose fields are the three client system fields plus, at index 3, a second entry with systemKey "client.email"
Then  the response is 422 with { "error": "systemField.locked", "field": "fields.3" }
```

```
AC-0002-40
Given an owner of tenant "studio-ana"
When  they create a client template whose fields are the three client system fields plus, at index 3, an entry with systemKey "client.cpf"
Then  the response is 422 with { "error": "systemField.locked", "field": "fields.3" }
```

```
AC-0002-41
Given a client template whose fields are client.name, client.email, client.phone and custom field "Profissão" (id P)
When  its owner saves a field list with id P at index 3 and again at index 4
Then  the response is 422 with { "error": "fieldId.duplicate", "field": "fields.4.id" }
```

```
AC-0002-42
Given a client template whose fields are client.name, client.email, client.phone and a "select" field "Turno" with two options
When  its owner saves "Turno" at index 3 with a second option whose id is not one of its options
Then  the response is 422 with { "error": "fieldOptionId.unknown", "field": "fields.3.options.1.id" }
```

```
AC-0002-43
Given a client template whose fields are client.name, client.email, client.phone and a "select" field "Turno" with options "Manhã" (id M) and "Tarde"
When  its owner saves "Turno" at index 3 with two options that both have id M
Then  the response is 422 with { "error": "fieldOptionId.duplicate", "field": "fields.3.options.1.id" }
```

```
AC-0002-44
Given a client template whose fields are client.name, client.email and client.phone
When  its owner adds, at index 3, a "text" field that has options
Then  the response is 422 with { "error": "fieldOptions.not-allowed", "field": "fields.3.options" }
```

```
AC-0002-45
Given a client template whose fields are client.name, client.email and client.phone
When  its owner saves client.email at index 1 with sensitive true
Then  the response is 422 with { "error": "fieldSensitive.not-allowed", "field": "fields.1.sensitive" }
```

```
AC-0002-46
Given a client template whose fields are client.name, client.email and client.phone
When  its owner sends an update in which client.name at index 0 has systemKey "client.name"
Then  the response is 422 with { "error": "fieldSystemKey.not-allowed", "field": "fields.0.systemKey" }
```

```
AC-0002-47
Given a client template whose fields are client.name, client.email and client.phone
When  its owner adds a custom field of type "cpf" without sensitive
Then  the response contains that field with sensitive true and sensitiveLock "type"
```

```
AC-0002-48
Given the editor shows custom field "Profissão" with answers in 3 clients
When  the owner chooses "Remover" on it
Then  a dialog with copy key forms.fields.removeWithAnswers says the field has answers in 3 records
```

```
AC-0002-49
Given the editor with 100 fields in the template
When  the field list renders
Then  [Novo campo] is disabled and the hint with copy key forms.fields.limitReached is shown
```

```
AC-0002-50
Given the editor with a new custom field row
When  the owner picks type "CPF"
Then  "Dado protegido" is ON and disabled, with the tooltip of copy key forms.fields.sensitiveLockedType
```

```
AC-0002-51
Given a client template with no records and a custom "text" field "Objetivo" (id O) stored with sensitive true
When  its owner saves the template with field id O and no sensitive
Then  the response contains "Objetivo" with sensitive true
```

```
AC-0002-52
Given a client template at version 2 with clients and a required custom field "Objetivo" (id O)
When  its owner saves the template with field id O and no required
Then  the response is 200 with version 2
And   "Objetivo" is still required
```

### Withdrawn criteria

Withdrawn IDs are never reused.

- AC-0002-17 (restore an archived field): withdrawn in v0.7 by the owner, 2026-11-09. Archived fields no longer
  exist; template versions replaced them (D-10, R10–R11).

## 11. Implementation plan

Written by `/plan` after the spec is Approved. Empty until then.

```

```

## 12. Changelog

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | 2026-11-09 | Draft |
| 0.2 | 2026-11-09 | Owner answers D-7, D-8 recorded; `first_name` removed; AC-0002-07 agreed |
| 0.3 | 2026-11-09 | Template versioning (owner, D-10): archive/restore replaced by versions; schema vs metadata (§3.5); type change creates a new field; AC-0002-15, -16, -18, -19 rewritten; AC-0002-17 proposed for withdrawal; AC-0002-22 to -25 added; criteria changes pending owner review |
| 0.4 | 2026-11-09 | Owner Joao Izidoro set. Telefone confirmed as a locked client system field (D-14); AC-0002-01 agreed |
| 0.5 | 2026-11-09 | Owner decisions (SPEC-0001 review round 2): §3.2 (system fields) and §3.5 (schema vs metadata) moved to SPEC-0001 §3.2 and §3.3 to remove the dependency cycle, with pointers left here; Q3 moved to SPEC-0001 §9 Q12; length and count keys use `.max` (`fieldLabel.max`, `fieldHelpText.max`, `fieldOptions.max`, `fieldOptionLabel.max`) |
| 0.6 | 2026-11-09 | Owner decisions (SPEC-0002 review): Q4, Q5 and Q6 decided, §3.4 no longer pending; R2 limits, R4 and the §3.1 label check decided (Q9–Q11); R3 assumption tag removed; `field.unknown`, `fieldType.immutable` and `systemField.locked` on a type change use 400; `systemField.locked` wins over `fieldType.immutable`; five undefined inputs rejected with 422 (`fieldId.duplicate`, `fieldOptionId.unknown` / `.duplicate`, `fieldOptions.not-allowed`, `fieldSensitive.not-allowed`, `fieldSystemKey.not-allowed`); `required` and `sensitive` optional in FieldInput with defaults; R15 and Q12, protection of removed fields is fixed in the MVP. Review fixes: AC-0002-19 and -23 no longer contradict R2 and R6; "active fields" wording removed; Givens made specific; AC-0002-10 and -22 split (new -27 and -26); dependency note in §2. AC-0002-08, -09, -13 moved from provisional; AC-0002-01, -02, -04, -05, -07, -10, -11, -14, -18, -19, -20, -22, -23 changed; AC-0002-26 to -50 added; all pending owner review |
| 0.7 | 2026-11-09 | Owner decisions: on update, an existing field that omits `required` or `sensitive` keeps its current value (protection still forced on by R5–R7), and the defaults apply only to new fields (§7; AC-0002-51 and -52 added, pending owner review); `systemField.locked` keeps one key for both statuses; `fieldOptionId.unknown` (422) and `field.unknown` (400) stay different; AC-0002-17 withdrawn |
| 0.8 | 2026-11-09 | Owner Joao Izidoro approved all pending criteria as written (AC-0002-01, -02, -04, -05, -07 to -11, -13 to -16, -18 to -20 and -22 to -52); all criteria are now agreed |
| 1.0 | 2026-11-09 | Approved by Joao Izidoro, 2026-11-09 (together with SPEC-0001) |
