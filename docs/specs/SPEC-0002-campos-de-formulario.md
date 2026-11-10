---
id: SPEC-0002
title: Campos do modelo de formulário
status: Approved # Draft | Review | Approved | Implemented | Superseded
plan_status: Draft # Draft | Approved
version: 1.1
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
  never converted between types. (D-10) Before the template is saved, choosing the field's original type again
  keeps the original field: same identity, options and switches, with the current label and help text. This is not
  a restore under R11, because the field was never removed. (owner, 2026-11-10)
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
5. Choosing the field's original type again before saving brings back the original field, with its options and
   switches (R12).

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

```
AC-0002-53
Given a published, required "select" field "Turno" with id T and options "Manhã", "Tarde" and "Noite"
When  its owner changes its type to "yes_no" in the editor, changes it back to "select" before saving, and presses [Salvar]
Then  the update request sends "Turno" with id T, type "select" and required true
And   its options are "Manhã", "Tarde" and "Noite" with their original ids
```

### Withdrawn criteria

Withdrawn IDs are never reused.

- AC-0002-17 (restore an archived field): withdrawn in v0.7 by the owner, 2026-11-09. Archived fields no longer
  exist; template versions replaced them (D-10, R10–R11).

## 11. Implementation plan

Drafted by `/plan` on 2026-11-09, checked again on 2026-11-10 against SPEC-0001's plan and the code (no forms code
exists yet; every path below that SPEC-0001 creates is taken from its plan), and revised on 2026-11-10 after each
plan review and the owner's decisions. `plan_status: Draft` until the owner approves it.

### Scope

```scope
packages/schemas/src/forms/protected-terms.ts
packages/schemas/src/index.ts
packages/i18n/messages/pt-BR.json
packages/i18n/messages/en-US.json
apps/api/src/modules/forms/domain/*
apps/api/src/database/schema/forms.ts
apps/api/drizzle/0003_form_field_rules.sql
apps/api/drizzle/meta/*
apps/api/test/utils/forms-fixtures.ts
apps/api/test/e2e/form-fields*
apps/web/src/app/*/orgs/*/forms/_components/fields/*
apps/web/src/app/*/orgs/*/forms/_components/use-form-draft*
apps/web/src/app/*/orgs/*/forms/_components/form-editor*
apps/web/src/components/ui/switch.tsx
apps/web/src/components/ui/select.tsx
apps/web/src/components/ui/menu.tsx
apps/web/src/components/ui/tooltip.tsx
apps/web/tests/form-fields*
docs/schema.dbml
```

`apps/api/drizzle/meta/*` is in the lock because `drizzle-kit generate` writes it and `task-lock.sh check` reports
every changed file; `guard-paths.sh` still blocks hand edits there. Paths with `[lang]` and `[tenant]` use `*` (the
lock matches bash globs). The API paths are `domain/` only, because of the layout SPEC-0001's plan fixes (API below,
Risks 7). The lock's `*` crosses `/`, so `forms/_components/*` would also unlock every SPEC-0001 component (the
forms list and the publish, apply, archive and delete dialogs). The web paths are therefore `_components/fields/*`
plus the two SPEC-0001 files this plan edits, by name (Web).

### Starting point

This plan builds on SPEC-0001's plan, which must be implemented first. SPEC-0001's plan already provides:
- the tables `form_fields`, `form_field_options`, `form_version_fields` and `form_version_field_options` (label,
  help text, protection and option labels on the field rows; required, position and option membership per
  version);
- the Field / FieldInput contract with its shape checks (label 1–80, help text ≤ 200, type in the catalog,
  option label 1–80, at most 100 fields), every SPEC-0002 §6 key in `FIELD_ERROR_CODES` and its `validation.*`
  copy, and the shared `textKey` helper (case, accents and whitespace);
- `FieldPolicy` with the system-field presence check (`systemField.missing`) and id matching (`field.unknown`),
  the schema/metadata diff that handles removed fields, new fields, reorders and option changes (R10–R14), and
  `valueCount` per field;
- what `FieldPolicy` receives (its API section, points 4–6): the template's type, create or update, and each
  latest-version field's id, type, `systemKey`, stored `required` and `sensitive`, and option ids; a plain-string
  `systemKey` in `FieldInputSchema`; and no field rule when an update omits `fields`;
- the editor shell with a field-list region and the draft hook.

This plan adds the field rules, the computed locks, the database checks for protection, and the field editor
controls. There are no new endpoints.

### Contracts

Non-breaking. No request or response shape changes; SPEC-0001's plan adds every Field shape and error key.

- New `packages/schemas/src/forms/protected-terms.ts`, re-exported from `src/index.ts`:
  - `PROTECTED_TERMS`: the §3.4 list, verbatim, as the single source for web and api (§7).
  - `ALWAYS_PROTECTED_TYPES` (`email`, `phone`, `cpf`, `full_name`, `address`) and `LABEL_CHECK_TYPES` (`text`,
    `long_text`, `number`, `date`, `yes_no`, `select`), from §3.1.
  - `labelHasProtectedTerm(label)`: both sides through `textKey`, then a whole-word or whole-phrase match (a term
    must be bounded by the start or end of the label or by a character that is not a letter or digit).
    "PESO (kg)" matches "peso"; "Receptor" does not match "cep".
  - `protectionLock(type, label)`: `"type"` for an always-protected type, `"label"` for a label-check type whose
    label matches, otherwise `null`. Callers pass custom fields only; system fields are never locked (R4).
- i18n, both locales: the `forms.fields.*` copy below. All `validation.*` keys for §6 come from SPEC-0001's plan.
  The spec gives pt-BR only, so every en-US string is **proposed**.

| Key | pt-BR | en-US | Source |
| --- | --- | --- | --- |
| `forms.fields.add` | Novo campo | New field | §4.1 |
| `forms.fields.onlySystem` | Adicione campos para coletar mais informações | Add fields to collect more information | §8 |
| `forms.fields.systemBadge` | Sistema | System | §8 |
| `forms.fields.required` | Obrigatório | Required | §4.1 |
| `forms.fields.sensitive` | Dado protegido | Protected data | §4.1, D-7 |
| `forms.fields.sensitiveHelp` | Oculta o valor nas listas e só o mostra quando você pedir. Use para documentos, contatos e informações de saúde. | Hides the value in lists and only shows it when you ask. Use it for documents, contact details and health information. | forms-overview.md Q-A |
| `forms.fields.sensitiveLockedType` | Este tipo de campo sempre é protegido | This field type is always protected | §4.2 |
| `forms.fields.sensitiveLockedLabel` | Rótulo indica dado pessoal ou de saúde | The label points to personal or health data | §4.3 |
| `forms.fields.typeChangeWarning` | Alterar o tipo cria um novo campo. As respostas atuais não são convertidas. | Changing the type creates a new field. Current answers are not converted. | §4.2 |
| `forms.fields.removeWithAnswers` | Este campo tem respostas em {count} cadastros. Ele sairá da próxima versão; o que acontece com as respostas é decidido ao aplicar as alterações. | This field has answers in {count} records. It leaves the next version; what happens to the answers is decided when you apply the changes. | §4.5 |
| `forms.fields.moveUp` / `.moveDown` / `.remove` | Mover para cima / Mover para baixo / Remover | Move up / Move down / Remove | §4.1, §4.4 |
| `forms.fields.types.<key>` | the "Type (UI)" names of §3.1 | Short text, Long text, Number, Date, Yes/No, Select, E-mail, Phone, CPF, Full name, Address | §3.1 |
| `forms.fields.types.duration` / `.money` | Duração (minutos) / Valor (R$) | Duration (minutes) / Amount (R$) | **proposed**; system-only types, shown on service system rows |
| `forms.fields.limitReached` | Limite de 100 campos atingido. | Limit of 100 fields reached. | key from §8; copy **proposed** |
| `forms.fields.label` / `.type` / `.helpText` / `.options` / `.addOption` | Rótulo / Tipo / Texto de ajuda / Opções / Adicionar opção | Label / Type / Help text / Options / Add option | **proposed** |
| `forms.fields.menu` / `.dragHandle` | Mais ações do campo / Arrastar para reordenar (accessible names) | More field actions / Drag to reorder | **proposed** |
| `forms.fields.removeOption` | Remover opção (accessible name of the remove-option button in the options editor) | Remove option | **proposed**; RNF-16–RNF-18 |
| `forms.fields.removeConfirm` / `.cancel` | Remover campo / Cancelar | Remove field / Cancel | **proposed** |

### Persistence

New migration `0003_form_field_rules.sql` (`pnpm --filter api exec drizzle-kit generate --name form_field_rules`
after editing `forms.ts`). It only adds check constraints
to `form_fields`, so the database also enforces R4, R5 and the system-only types (R7):

| Constraint | Expression | Rule |
| --- | --- | --- |
| `ck_form_fields_system_not_sensitive` | `system_key is null or sensitive = false` | R4 |
| `ck_form_fields_always_protected` | `system_key is not null or type not in ('email','phone','cpf','full_name','address') or sensitive = true` | R5, R7 |
| `ck_form_fields_system_only_types` | `type not in ('duration','money') or system_key is not null` | §3.1 |

- The label check (R6) and "`yes_no` is never required" (R8, `required` is on `form_version_fields`) stay in
  `FieldPolicy`; a check constraint cannot see the term list or join the two tables.
- No column changes. `sensitiveLock` and `requiredLock` are computed, not stored.
- **Existing rows** (owner, 2026-11-10): handled by a precondition, checked in Sequence step 0 before step 2.
  forms-overview.md only *suggests* building SPEC-0001 and SPEC-0002 together, and Risks 1 has SPEC-0001
  implemented first, so a database can hold `form_fields` rows written under SPEC-0001's rules alone. Some of
  those could break rules no check constraint sees (R6, R8). Postgres checks existing rows when a constraint is
  added, so a row that breaks a check fails the whole migration and nothing changes. There is no data-fixing
  `UPDATE`.
- **Rollback**: dropping the three constraints loses no data.
- `docs/schema.dbml`: the three checks as notes on `form_fields`.

### API

No new routes. The rules run in `POST /v1/forms` (create), `PATCH /v1/forms/:formId` (update) and
`POST /v1/forms/:formId/preview`, with SPEC-0001's guards (`JwtAccessGuard`, then `ActiveTenantGuard`). The
computed locks appear in every Field response: create, read, update, version read.

**Where the code changes: `domain/` only, no handler edits.** SPEC-0001's plan fixes six points (its API section):
1. the preview handler is a query;
2. handlers store and diff the field list `FieldPolicy` returns;
3. the aggregate builds the Field response under `domain/`;
4. `FieldPolicy` gets the template's type, create or update, and each latest-version field's id, type,
   `systemKey`, stored `required` and `sensitive`, and option ids. `fieldType.immutable`, the keep-current defaults
   (AC-0002-51, -52) and `fieldOptionId.unknown` (AC-0002-42) need them;
5. `FieldInputSchema.systemKey` is a plain string, so "client.cpf" reaches `FieldPolicy` (AC-0002-40) instead of
   failing the shape check under another key;
6. an update that omits `fields` runs no field rule.

So the rules and defaults go into `domain/field-policy.ts`, and the locks go into the domain's Field response.
Create, update and preview get the rules through `FieldPolicy`. If SPEC-0001's implementation departs from those
points, see Risks 7.

**Check order.** SPEC-0001's plan fixes the outer order of an update: contract shape (422) → 404 → 409 revision →
**field rules** → 409 `formName.taken` → migration checks (400). On create: contract shape → field rules → template
cap → name check (Decision 7, the same order as SPEC-0001's plan, Decision 3). Inside "field rules", `FieldPolicy` walks `fields` in array order and returns the
first failure. For each entry:

1. **Repeated id**: an id already seen at an earlier index → 422 `fieldId.duplicate` at the later index.
2. **Identity.**
   - Update: a `systemKey` → 422 `fieldSystemKey.not-allowed`; an id not in the latest version (unknown,
     malformed, removed earlier, or another template's or tenant's) → 400 `field.unknown`.
   - Create: an id → 400 `field.unknown` (nothing exists yet); a `systemKey` that repeats an earlier entry or is
     not a system key of the template's type → 422 `systemField.locked`.
3. **Type.**
   - A system field whose type is not its fixed type → `systemField.locked`: 400 on update (§6 "type changed"),
     422 on create (with the other create-time system-key errors). This is checked before
     `fieldType.immutable`, as §6 requires.
   - A custom entry with a system-only type (`duration`, `money`), new or existing → 422 `fieldType.invalid`.
   - An existing custom field with another type → 400 `fieldType.immutable`.
4. **Label**: its `textKey` equals an earlier entry's → 422 `fieldLabel.duplicate` at the later index.
5. **Required**: a system field other than `client.phone` whose `required` differs from its fixed value, or a
   `yes_no` field with `required: true` → 422 `fieldRequired.locked`.
6. **Protection**: `sensitive` present on a system field → 422 `fieldSensitive.not-allowed`; `sensitive: false`
   while `protectionLock(type, label)` is not `null` → 422 `fieldSensitive.locked`.
7. **Options**: a `select` with fewer than 2 → `fieldOptions.required`, more than 50 → `fieldOptions.max`;
   options on another type → `fieldOptions.not-allowed`; then per option in order: an id repeated at an
   earlier index → `fieldOptionId.duplicate`; an id that is not one of this field's options in the latest version
   (always the case for a new field, and for a malformed id) → `fieldOptionId.unknown`; a label whose `textKey`
   repeats an earlier option's → `fieldOptionLabel.duplicate`. All 422.

After every entry passes: a system field of the type that is absent → 422 `systemField.missing` at `fields`.

**Defaults** (§7), applied after the rules pass:
- New field: `required` false; `sensitive` true when `protectionLock` is not `null`, otherwise false. A system
  field on create takes its fixed `required` (`client.phone`: the sent value, default false) and is never
  sensitive.
- Existing field: an omitted `required` or `sensitive` keeps the stored value, and `sensitive` becomes true when
  `protectionLock` now requires it.

**Computed locks** (`FieldPolicy.locks(field)`): `requiredLock` is true for system fields other than
`client.phone` and for `yes_no`; `sensitiveLock` is `protectionLock(type, label)` for custom fields and `null` for
system fields. A version read uses the field's current label, so its locks follow the current metadata.

R15 needs no code: protection lives on the field row, and an update only touches the fields it sends.

### Web

Inside SPEC-0001's editor. Every file is **new**, in `forms/_components/fields/`, unless marked **edit**: an edit of
a SPEC-0001 file in `forms/_components/`.

- **Edit** `form-editor` (SPEC-0001's editor): mounts `field-list.tsx` in its field-list region.
- `field-list.tsx`: rows from the draft's `fields` (react-hook-form `useFieldArray`). [Novo campo] appends a "Texto
  curto" row with an empty label and focuses it (§4.1). Disabled at 100 fields with `forms.fields.limitReached`.
  Hint `forms.fields.onlySystem` when every row is a system field.
- `field-row.tsx`: drag handle, label input, type select, "Obrigatório" switch, "Dado protegido" switch, "⋯" menu,
  "Sistema" badge on system rows. A system row has **no** "Dado protegido" switch at all (R4), and its
  "Obrigatório" switch is disabled except on `client.phone`.
- **Edit** `use-form-draft` (SPEC-0001's draft hook), **draft serialisation**: the draft never sends
  `sensitive` for a system row, and sends `systemKey` only on create. On update, system rows are identified by
  id. Otherwise every save fails with 422 `fieldSensitive.not-allowed` (AC-0002-45) or
  `fieldSystemKey.not-allowed` (AC-0002-46).
- `field-error-target.ts`: maps a server `field` path to the place its message shows. `useFieldError` only
  translates the key; this helper decides where. The row with the error is highlighted (§8).

  | `field` path | Shown |
  | --- | --- |
  | `fields` | above the field list (`systemField.missing`) |
  | `fields.<i>`, `fields.<i>.id`, `fields.<i>.systemKey` | at the top of row i (`systemField.locked`, `field.unknown`, `fieldId.duplicate`, `fieldSystemKey.not-allowed`) |
  | `fields.<i>.label`, `.type`, `.required`, `.sensitive` | under that control |
  | `fields.<i>.helpText` | under the help-text input, opened if it was closed |
  | `fields.<i>.options` | under the options editor, opened if it was closed (§8 `fieldOptions.required`); on a type without options, at the top of row i |
  | `fields.<i>.options.<j>.id`, `fields.<i>.options.<j>.label` | under option j |

- `field-type-select.tsx`: offers the custom types (`CUSTOM_FIELD_TYPES`). On system rows it is disabled and shows
  the row's type from `FIELD_TYPES`, so `duration` and `money` render with `forms.fields.types.duration` and
  `.money`. Picking `select` opens the options editor with two empty options; picking `yes_no` turns "Obrigatório"
  off and disables it (R8).
- **Type change on a published field** (owner, 2026-11-10; R12). The row is replaced with a new field without an id,
  and shows `forms.fields.typeChangeWarning`.
  - The new field keeps label, help text and position, and drops options.
  - `required` and `sensitive` carry over, then the locks apply: `yes_no` forces required off, and an
    always-protected type or a label match forces sensitive on.
  - Picking the original type again restores the original field: its id, options and both switches as they were,
    with the current label and help text, and the locks apply again. Without this, switching away and back, then
    "Atualizar todos", would delete every answer to the original field. Now R12 and AC-0002-53 (v1.1).
- `field-protection.ts`: the draft-side locks, from `protectionLock` and the same system and `yes_no` rules as
  the server, re-evaluated on every label or type change (§4.3). A lock forces the switch ON and disables it,
  with the tooltip of its copy key. When the lock is released, the switch stays ON (R6).
- `field-options-editor.tsx`: add, rename and remove options of a `select`. Each remove button's accessible name
  is `forms.fields.removeOption`.
- `field-row-menu.tsx`: base-ui Menu, keyboard operable: help text, options (select only), "Mover para cima",
  "Mover para baixo", and "Remover" (custom rows only, R3).
- `remove-field-dialog.tsx`: for a field with `valueCount > 0`, `forms.fields.removeWithAnswers` with the count
  before removing it from the draft; a field without answers is removed at once (§4.5).
- `use-field-reorder.ts`: pointer-event drag on the handle (mouse and touch, a placeholder gap while dragging),
  plus the menu moves for keyboard users (RNF-16–RNF-18). Order is the array order sent on [Salvar].
- New primitives on `@base-ui/react` 1.8.0, which already exports them: `components/ui/switch.tsx`,
  `select.tsx`, `menu.tsx`, `tooltip.tsx`. None exists today, and SPEC-0001 adds only dialog, toast and skeleton.
- No Figma frame is referenced by SPEC-0001 or SPEC-0002, so the rows use the existing token layers and
  components. Visual review happens on the running editor.

### Tests

Files:
- **E-fld** `apps/api/test/e2e/form-fields.e2e-spec.ts`: rules, defaults, locks and order through the real API.
- **U-pol** `apps/api/src/modules/forms/domain/field-policy.spec.ts`: rule order, defaults and locks, with
  in-memory field lists.
- **U-terms** `apps/api/src/modules/forms/domain/protected-terms.spec.ts`: every §3.4 term matches in upper case,
  without accents and inside a phrase; whole words only ("Receptor" vs "cep"); "Peso da mochila" locks. It tests
  `packages/schemas/src/forms/protected-terms.ts` from the api, because `packages/schemas` has no test runner.
- **W-fld** `apps/web/tests/form-fields.test.tsx`: the field list inside the editor with a prepared draft and a
  mocked `@/lib/api/forms`.
- Fixtures: `apps/api/test/utils/forms-fixtures.ts` gains field, option and value seeding that respects the new
  checks. Fields whose label matches a §3.4 term ("Peso" in AC-0002-22 and -26) are seeded with sensitive true,
  because the database checks do not enforce the label rule (R6).

Every test name starts with its AC ID. "Index 3" in a criterion means after the three system fields.

| AC | Test | What it checks here |
| --- | --- | --- |
| 01 | E-fld, W-fld | create with the three client system keys → name, email, phone; name and email required with `requiredLock` true; phone not required, `requiredLock` false. W-fld: [Salvar] on a new client template → the mocked create receives the three system rows with their `systemKey` and no `sensitive` |
| 02 | E-fld | service system keys → name, duration, price, all required, `requiredLock` true |
| 03 | E-fld, U-pol | update without client.email → 422 `systemField.missing` at `fields` |
| 04 | E-fld, U-pol | client.email with its id and type "text" at index 1 → 400 `systemField.locked` at `fields.1` |
| 05 | E-fld | relabel client.name and move it last → 200; same id, systemKey, new label and position |
| 06 | E-fld | new "Observações" long_text → required false, sensitive false, `sensitiveLock` null |
| 07 | E-fld | new cpf with sensitive false at index 3 → 422 `fieldSensitive.locked` at `fields.3.sensitive` |
| 08 | E-fld, U-terms | "Diagnóstico principal" text, sensitive true → `sensitiveLock` "label" |
| 09 | E-fld, U-terms | "PESO (kg)" number, sensitive false → 422 `fieldSensitive.locked` at `fields.3.sensitive` |
| 10 | W-fld | label "Alergia" → "Preferência de horário": switch enabled and still ON |
| 11 | E-fld, U-pol | new " profissao " at index 5 → 422 `fieldLabel.duplicate` at `fields.5.label` |
| 12 | E-fld | select with one option → 422 `fieldOptions.required` at `fields.3.options` |
| 13 | E-fld | yes_no with required true → 422 `fieldRequired.locked` at `fields.3.required` |
| 14 | E-fld, W-fld | A, B, C, D saved as A, D, B, C → read returns A, D, B, C. W-fld: D moved up twice with the keyboard menu, then [Salvar] and the publish confirmation → the mocked update receives A, D, B, C, and the system rows carry their ids with no `sensitive` and no `systemKey` |
| 15 | E-fld | remove "Profissão" with no records → version 2 without it; version 1 read still has it |
| 16 | E-fld | remove "Profissão", "Manter existentes" → latest version without it; the 3 records stay on version 1 with their value rows |
| 18 | E-fld, U-pol | id T at index 3 with type "number" → 400 `fieldType.immutable` at `fields.3.type` |
| 19 | E-fld | remove option "Tarde", "Manter existentes" → latest version offers "Manhã", "Noite"; the record stays on its version and its value still decrypts to Tarde's option id |
| 20 | E-fld | another tenant's field id F at index 3 → 400 `field.unknown` at `fields.3.id`; F unchanged |
| 21 | W-fld | system row's "⋯" menu opened with the keyboard → move up and move down present, "Remover" absent |
| 22 | W-fld | type of published "Peso" changed to number → `forms.fields.typeChangeWarning` |
| 23 | E-fld | protection on for "Hobby" (H) → still version 2; H stored with sensitive true |
| 24 | E-fld | rename option "Tarde" → "Período da tarde" → no new version; the option row has the new label |
| 25 | E-fld, W-fld | A, B, C saved as C, A, B → version 2 in that order; version 1 read is A, B, C. W-fld: C moved up twice with the keyboard menu, then [Salvar] and the publish confirmation → the mocked update receives C, A, B, and the system rows carry their ids with no `sensitive` and no `systemKey` |
| 26 | E-fld | T removed and a new number "Peso" added, "Manter existentes" → latest "Peso" is a number field with an id other than T; the 2 records stay on version 1 with their T value rows |
| 27 | E-fld | "Alergia" (sensitive) relabelled "Preferência de horário" with sensitive false → sensitive false, `sensitiveLock` null |
| 28 | E-fld | custom "money" at index 3 → 422 `fieldType.invalid` at `fields.3.type` |
| 29 | E-fld | client.email with required false → 422 `fieldRequired.locked` at `fields.1.required` |
| 30 | E-fld | client.phone with required true → 200; required true, `requiredLock` false |
| 31 | E-fld | id P removed in version 2, sent at index 3 → 400 `field.unknown` at `fields.3.id` |
| 32 | E-fld | id A of "Anamnese" sent in "Ficha" → 400 `field.unknown` at `fields.3.id`; A unchanged |
| 33 | E-fld | 81-character label → 422 `fieldLabel.max` at `fields.3.label` |
| 34 | E-fld | 201-character help text → 422 `fieldHelpText.max` at `fields.3.helpText` |
| 35 | E-fld | select with 51 options → 422 `fieldOptions.max` at `fields.3.options` |
| 36 | E-fld | options "Manhã" and " " → 422 `fieldOptionLabel.required` at `fields.3.options.1.label` |
| 37 | E-fld | options "Manhã" and 81 characters → 422 `fieldOptionLabel.max` at `fields.3.options.1.label` |
| 38 | E-fld | options "Manhã" and " manha " → 422 `fieldOptionLabel.duplicate` at `fields.3.options.1.label` |
| 39 | E-fld | create with a second client.email at index 3 → 422 `systemField.locked` at `fields.3` |
| 40 | E-fld | create with systemKey "client.cpf" at index 3 → 422 `systemField.locked` at `fields.3` |
| 41 | E-fld, U-pol | id P at index 3 and 4 → 422 `fieldId.duplicate` at `fields.4.id` |
| 42 | E-fld | "Turno" with an option id that is not its own → 422 `fieldOptionId.unknown` at `fields.3.options.1.id` |
| 43 | E-fld, U-pol | "Turno" with id M twice → 422 `fieldOptionId.duplicate` at `fields.3.options.1.id` |
| 44 | E-fld | "text" with options → 422 `fieldOptions.not-allowed` at `fields.3.options` |
| 45 | E-fld | client.email with sensitive true → 422 `fieldSensitive.not-allowed` at `fields.1.sensitive` |
| 46 | E-fld | update with systemKey on client.name → 422 `fieldSystemKey.not-allowed` at `fields.0.systemKey` |
| 47 | E-fld | new cpf without sensitive → sensitive true, `sensitiveLock` "type" |
| 48 | W-fld | "Remover" on "Profissão" with `valueCount` 3 → `forms.fields.removeWithAnswers` with 3 |
| 49 | W-fld | 100 fields → [Novo campo] disabled with `forms.fields.limitReached` |
| 50 | W-fld | new row set to "CPF" → switch ON, disabled, tooltip `forms.fields.sensitiveLockedType` |
| 51 | E-fld | O (sensitive) saved without sensitive → still sensitive true |
| 52 | E-fld | O (required, version 2, records) saved without required → 200, version 2, still required |
| 53 | W-fld | required select "Turno" (T) → "yes_no" → "select", then [Salvar] → the mocked update receives id T, type "select", required true and the three original option ids |

U-pol also covers each step of the check order with two failing rules in one request, the defaults, the locks,
and that the first failing entry wins.

### Deferred checks

Their Then reads or displays clients (§2). Under `/done` step 4 they may stay partly verified when this spec is set
`Implemented`: `/done` reports them as partly verified, never as passing, and lists them in the changelog line.
The verifying spec's plan lists them in its test table, includes this file in its scope, and adds
`<AC ids> verified with SPEC-XXXX, <date>` to this changelog.

| AC | Checked here | Verified by |
| --- | --- | --- |
| 16 | latest version, records' version and value rows | SPEC-0004: the clients "still return their answers" |
| 19 | latest version's options, the record's version and stored value | SPEC-0004: the client "still shows Tarde" |
| 23 | version unchanged, field stored as protected | SPEC-0004, under SPEC-0003 R9: the value shows masked |
| 24 | no new version, option row renamed | SPEC-0004: the client shows "Período da tarde" |

Rows 19, 23 and 24 are verified by SPEC-0004, not SPEC-0003: SPEC-0003 §2 puts the record endpoints in SPEC-0004
and SPEC-0005, so SPEC-0003's plan has no way to read a client.
| 26 | new field id and type, records' version and value rows | SPEC-0004: the clients keep their "text" answers |

### Sequence

0. **Prerequisite**: SPEC-0001 implemented (Risks 1), and SPEC-0001's step 0 gate passed (Decision 9).
   - **Existing rows check**, before step 2 (Persistence): ask the owner which databases will run `0003`, shared
     and local. Testcontainers databases start empty and are exempt. Each must hold no `form_fields` rows; the
     owner runs `select count(*) from form_fields` there, or grants access to run it. If any database holds rows,
     stop and ask the owner: resetting it, or fixing its rows, is a destructive database operation.
1. **Contracts**: `protected-terms.ts`, the export, the `forms.fields.*` copy in both locales; build the package.
2. **Persistence**: the three checks in `forms.ts`; generate `0003_form_field_rules.sql` and read its SQL; update
   the fixtures so seeded fields respect them; `docs/schema.dbml`.
3. **Tests first**: E-fld, U-pol, U-terms and W-fld, one test per AC as mapped (written by `test-author`).
   - **Expected to pass already** (regression tests): SPEC-0001's plan delivers AC-0002-03, -05, -14 to -16, -19,
     -20, -23 to -26, -31 to -34, -36 and -37. They cover system-field presence, id matching, the schema/metadata
     diff, the shape checks, order, and option and protection metadata. Confirm each passes. This covers their E-fld
     tests only: the W-fld parts of -14 and -25 need the menu and the draft serialisation, so they fail until step 6.
   - **Expected to fail**: every other AC. Confirm each fails because the rule or control is missing.
   - A test outside the first list that passes at this step is reported with the SPEC-0001 behavior that delivers
     it. It is never rewritten to fail.
4. **API**: in `domain/` only. `FieldPolicy` rules in the order above, defaults, and locks in the domain's Field
   response. No handler changes (API section).
5. **Web, part 1**: switch, select, menu and tooltip primitives.
6. **Web, part 2**, three commits, reorder first (Risks 5):
   - **6a** field list and drag reorder (`field-list.tsx`, `use-field-reorder.ts`): AC-0002-49.
   - **6b** row, type select, protection, draft serialisation, error targets (`field-row.tsx`,
     `field-type-select.tsx`, `field-protection.ts`, `field-error-target.ts`): AC-0002-01 (W-fld), -10, -22, -50,
     -53.
   - **6c** options editor, row menu with move up and move down, remove dialog (`field-options-editor.tsx`,
     `field-row-menu.tsx`, `remove-field-dialog.tsx`): AC-0002-14 and -25 (W-fld), -21, -48.
7. **Checks**: `pnpm --filter @planici/schemas build`, `pnpm lint`, `pnpm typecheck`, `pnpm --filter api test`,
   `pnpm --filter api test:e2e`, `pnpm --filter web exec vitest run`. `apps/web` has no `test` script; see the
   owner action in SPEC-0001's plan, Sequence step 8.

### Decisions this plan makes (owner to confirm with the plan)

The spec leaves these open. Each follows an existing rule where one exists.

1. **Two passes.** Shape checks (SPEC-0001's contract) answer before 404 and before any field rule, so a blank
   label at index 5 wins over a duplicate label at index 2. Rules then run per entry in the order above.
2. **Malformed ids are unknown**, like malformed template ids (SPEC-0001 §5): a malformed field id → 400
   `field.unknown`, a malformed option id → 422 `fieldOptionId.unknown`. No new error keys.
3. **Create-time ids and types.** An id on create → 400 `field.unknown`. A system entry with a type other than
   its fixed type on create → 422 `systemField.locked`, with the other create-time system-key errors.
4. **A system-only type on an existing custom field** → 422 `fieldType.invalid`, before `fieldType.immutable`.
5. **Type change in the editor**: decided by the owner on 2026-11-10 (Web, "Type change on a published field").
   Restoring the original field is now in the spec (R12, AC-0002-53); the rest is listed here so the plan approval
   covers it.
6. **Proposed copy** for the keys marked "proposed" in Contracts, in pt-BR and en-US.
7. **Create check order**: contract shape → field rules → template cap → name check. SPEC-0001's plan uses the same
   order (its Decision 3).
8. **`textKey` collapses internal whitespace**, as well as ignoring case and accents. R2 only says case and
   accents, so "Data  de nascimento" and "Data de nascimento" counting as the same label is a decision.
9. **Step 0 gate** (inherited from SPEC-0001's plan, its Decision 1): SPEC-0003's plan is drafted and reviewed, not
   approved, before SPEC-0001's persistence step. By the time this plan starts, the gate has already passed.

### Risks

1. **SPEC-0001 must be `Implemented` first** (`task-lock.sh` checks `depends_on`). The earlier deadlock is resolved
   (owner, 2026-11-09): `/done` may set `Implemented` while the criteria in a plan's Deferred checks table are still
   unverified, so SPEC-0001's deferred criteria no longer block this plan. Those are AC-0001-34 and -58 under an
   owner waiver, ten SPEC-0004 criteria and the phone count, and AC-0001-10 for SPEC-0003.
2. **The field-list interface is shared** with SPEC-0001's editor and draft hook. Cheapest check: build SPEC-0001's
   field region against the props `field-list.tsx` needs (rows, `fields.<i>` error paths, `valueCount`).
3. **Term matching.** Whole-word matching on normalised text can surprise with multi-word terms and hyphens
   ("e-mail", "cartão sus"). U-terms runs every term; any change to the list amends this spec (§3.4).
4. **Check constraints and seeded data.** SPEC-0001's fixtures could seed an unprotected cpf field, which the new
   checks reject. Step 2 updates the fixtures before any test runs.
5. **Pointer-event drag** is written here, not taken from a library. Cheapest check: build reorder first in step 6
   and try it with mouse, touch emulation and the keyboard menu. If it is not usable, the fallback is a library,
   proposed to the owner as a new dependency.
6. **E2e needs Docker** (Testcontainers); without it, only unit and web tests run, and that is reported.
7. **File layout comes from SPEC-0001's implementation.** The API scope is `domain/` only, which relies on the
   six points in SPEC-0001's plan (API section). If the implementation departs from them, the lock blocks
   the edit. Cheapest check: when SPEC-0001's `/done` runs, compare its file list with this scope, and amend this
   plan before `/implement SPEC-0002`.
8. **SPEC-0001's tests run under these rules but are outside this scope**: `apps/api/test/e2e/forms*`, the
   `commands/**` handler specs, `apps/web/tests/form-editor*` and `form-dialogs*`.
   - After this plan, these inputs get 422: a custom field with a §3.4 label sent with `sensitive: false` (AC-0001-71
     adds a "text" field "Peso"), `sensitive` on a system field, and `systemKey` on an update.
   - Prevention (owner, 2026-11-10): SPEC-0001's plan has its tests, W-ed payloads and fixtures follow these input
     rules from the start (its Tests, "SPEC-0002 input rules").
   - Final check: at SPEC-0001's `/done`, grep its tests for those inputs. Any conflict goes to the owner, never to
     an edit of those tests.

### New dependencies

None. `@base-ui/react` 1.8.0 already exports Switch, Select, Menu and Tooltip. Drag uses pointer events.

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
| 1.1 | 2026-11-10 | From the second plan review, the owner agreed to add a criterion for reverting a type change before saving (it keeps the original field). Without one, a revert followed by "Atualizar todos" could delete every answer to that field with no test failing. AC-0002-53 added and R12 and §4.2 step 5 amended; owner Joao Izidoro approved all three as written, 2026-11-10 |
