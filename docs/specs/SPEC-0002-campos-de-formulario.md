---
id: SPEC-0002
title: Campos do modelo de formulário
status: Draft # Draft | Review | Approved | Implemented | Superseded
plan_status: Draft # Draft | Approved
version: 0.2
owner: TBD
satisfies: [RF-38, RF-39, RN-20, RN-21]
depends_on: [SPEC-0001]
phase: MVP # owner decision D-5; RFC still says Pós-MVP
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
- System fields per template type: which exist and what can change about them.
- The protected-data switch and when it auto-locks.
- Adding, reordering, removing, archiving and restoring fields.
- What may change on a field that already has values in records.

**Out of scope**
- Validation of typed values and how records display them: SPEC-0003.
- Multi-select, radio groups, image and file upload, URL, CNPJ, computed or conditional fields: post-MVP.
- Per-field configuration such as min/max, masks or default values: post-MVP.
- CEP lookup to auto-fill addresses: post-MVP (an external service; RNF-15).
- Value-pattern PII detection in typed values (forms-overview.md D-3): not planned.

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

`assumption`: "label check" is applied to `date`, `yes_no` and `select` as well, not only to text and number,
because "Data de nascimento" and "Possui alergia?" are as personal as a free-text field.

### 3.2 System fields

| Template type | System key | Default label | Type | Required |
| --- | --- | --- | --- | --- |
| client | `client.name` | Nome completo | `full_name` | always (RN-04) |
| client | `client.email` | E-mail | `email` | always (RN-04) |
| client | `client.phone` | Telefone | `phone` | professional chooses (RF-07; system field pending §9 Q8) |
| service | `service.name` | Nome | `text` | always (RN-06) |
| service | `service.duration` | Duração (minutos) | `duration` | always (RN-06) |
| service | `service.price` | Preço | `money` | always (RN-06) |

### 3.3 Rules

- **R1.** A field has: label, type, required, protected, optional help text, options (only for `select`), and a
  position. Its identity is stable for its whole life. (RF-38)
- **R2.** Label: required, trimmed, 1–80 characters, unique among the template's active fields ignoring case and
  accents. Help text: optional, at most 200 characters. Options: 2–50, each 1–80 characters, unique ignoring case
  and accents. (RF-38; limits are `assumption`)
- **R3.** Every template carries all system fields of its type exactly once (§3.2). A system field's label, help
  text and position can change. Its type cannot, and it cannot be removed. Required is fixed except for
  `client.phone`. (`assumption`, D-2)
- **R4.** System fields are identification data: their values appear in lists and search. They have no
  protected switch. They are still personal data under RFC §6 and never appear in logs. (`assumption`)
- **R5.** A custom field of a type marked "always" in §3.1 is protected, and the switch is locked ON. (D-3)
- **R6.** A custom field of a type marked "label check" is protected and locked ON when its label contains a
  term from the protected-terms list (§3.4). If the label is edited so it no longer matches, the lock is released,
  but the switch stays ON until the professional turns it off. (D-3)
- **R7.** The server enforces R5 and R6. A field cannot be stored unprotected while its type or label requires
  protection. (CLAUDE.md non-negotiable: UI visibility is not authorization)
- **R8.** `yes_no` fields cannot be required, because "no" is a valid answer and an unanswered field reads as
  "no". (`assumption`)
- **R9.** Display order is the order the professional arranged, and it is kept exactly (RN-20). Moving one
  field changes no other field's relative order.
- **R10.** Removing a custom field that has **no values** in any record deletes it. Removing one that **has values**
  archives it: it leaves the template and new records, and its values are kept (RN-21, RN-24).
- **R11.** An archived field can be restored. It returns at the end of the template with its values intact.
  Restoring fails if an active field now has the same label (R2). (`assumption`)
- **R12.** Once a field has a value in any record, its type cannot change. Label, help text, required,
  protected (within R5–R6) and options remain editable. (RN-21)
- **R13.** Removing a `select` option that records use keeps those values. They display as the old label marked
  "(removida)". Renaming an option renames it everywhere it is shown. (RN-21)
- **R14.** Making a field required does not change existing records. The requirement applies the next time each
  record is saved (SPEC-0003 R6). (RN-20, RN-21)

### 3.4 Protected-terms list — proposed, pending §9 Q4

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
4. Fields with values show the type dropdown disabled with the hint "Campos com respostas não podem mudar de tipo"
   (R12).

### 4.3 Protected switch and label check
1. As the professional types a label for a "label check" type, the editor re-evaluates R6 on each change.
2. On a match, the switch turns ON and locks, with the tooltip "Rótulo indica dado pessoal ou de saúde".
3. When the label stops matching, the switch unlocks and stays ON.

### 4.4 Reorder
1. The professional drags a row by its handle, or uses "Mover para cima" / "Mover para baixo" (keyboard
   accessible; RNF-16–RNF-18).
2. System fields move like any other field.
3. The new order is stored on **[Salvar]** (R9).

### 4.5 Remove, archive and restore
1. **"Remover"** is not offered on system fields (R3).
2. For a custom field without values, the row disappears; it is deleted on save.
3. For a custom field with values, a dialog says "Este campo tem respostas em N cadastros. Ele será arquivado e as
   respostas continuarão visíveis nesses cadastros." On confirm, the row moves to a collapsed
   **"Campos arquivados"** section at the bottom of the editor. It is archived on save.
4. In "Campos arquivados", **[Restaurar]** moves the field back to the end of the active list (R11).

## 5. Permissions and tenant isolation

Fields are edited only through their template, so SPEC-0001 §5 applies unchanged. A field id that belongs to
another template, in this tenant or another, is rejected as unknown (§6), and nothing reveals that it exists
elsewhere.

## 6. Errors

`<i>` is the field's index in the request's `fields` array and `<j>` the option's index.

| Situation | Status | `error` key | `field` |
| --- | --- | --- | --- |
| Label missing or blank | 422 | `fieldLabel.required` | `fields.<i>.label` |
| Label over 80 characters | 422 | `fieldLabel.too-long` | `fields.<i>.label` |
| Label repeats another active field | 422 | `fieldLabel.duplicate` | `fields.<i>.label` |
| Unknown type, or a system-only type on a custom field | 422 | `fieldType.invalid` | `fields.<i>.type` |
| Type changed on a field that has values | 409 | `fieldType.locked` | `fields.<i>.type` |
| Unprotected while type or label requires protection | 422 | `fieldSensitive.locked` | `fields.<i>.sensitive` |
| Required changed where it is fixed (system field, `yes_no`) | 422 | `fieldRequired.locked` | `fields.<i>.required` |
| Help text over 200 characters | 422 | `fieldHelpText.too-long` | `fields.<i>.helpText` |
| `select` with fewer than 2 options | 422 | `fieldOptions.required` | `fields.<i>.options` |
| `select` with more than 50 options | 422 | `fieldOptions.too-many` | `fields.<i>.options` |
| Option label blank / too long / duplicate | 422 | `fieldOptionLabel.required` / `.too-long` / `.duplicate` | `fields.<i>.options.<j>.label` |
| A system field of the type is missing | 422 | `systemField.missing` | `fields` |
| A system field's type changed, or a system key is repeated or invented | 422 | `systemField.locked` | `fields.<i>` |
| Field id not in this template | 422 | `field.unknown` | `fields.<i>.id` |
| Restoring a field whose label is now taken | 422 | `fieldLabel.duplicate` | `fields.<i>.label` |

## 7. Contract impact

New, non-breaking. Part of the FormTemplate shapes in SPEC-0001 §7.

- **Field** (response): `id` (uuid), `label`, `type` (§3.1 keys plus `duration`, `money`), `required` (bool),
  `sensitive` (bool), `sensitiveLock` (`type | label | null`), `requiredLock` (bool), `helpText` (string | null),
  `options` (`{ id, label }[] | null`), `systemKey` (string | null), `valueCount` (int: records with a value).
- **FormTemplate** gains `archivedFields: Field[]`. `fields` holds active fields only, in display order.
- **FieldInput** (request): `id?` (omit for new fields), `label`, `type`, `required`, `sensitive`, `helpText?`,
  `options?` (`{ id?, label }[]`), `systemKey?` (only to identify system fields on create).
- **Semantics of `fields` on update:** a full list in display order. Ids that are present and active are updated.
  Present ids that are archived are restored. Active ids that are absent are removed or archived (R10).
- The protected-terms list (§3.4) is shared by web and api from one source, so the editor and the server agree.

## 8. UI states

| Screen | State | Behavior | Copy key |
| --- | --- | --- | --- |
| Editor fields | only system fields | Hint "Adicione campos para coletar mais informações" | `forms.fields.onlySystem` |
| Field row | system field | "Sistema" badge; no Remover; type and fixed switches disabled | `forms.fields.systemBadge` |
| Field row | protected locked by type | Switch ON + disabled + tooltip | `forms.fields.sensitiveLockedType` |
| Field row | protected locked by label | Switch ON + disabled + tooltip | `forms.fields.sensitiveLockedLabel` |
| Field row | type locked (has values) | Type dropdown disabled + hint | `forms.fields.typeLocked` |
| Field row | validation error | Inline under the input, row highlighted | `validation.*` |
| Field row | dragging | Placeholder gap, others shift | — |
| Remove dialog | field has values | Archive explanation (4.5 step 3) | `forms.fields.archiveConfirm` |
| Archived section | collapsed / expanded | "Campos arquivados (N)" | `forms.fields.archivedTitle` |
| Options editor | fewer than 2 options | [Salvar] shows `fieldOptions.required` inline | `validation.fieldOptions.required` |
| Field list | 100 fields | [Novo campo] disabled + hint | `forms.fields.limitReached` |

## 9. Open questions

| # | Question | Proposed answer | Blocks |
| --- | --- | --- | --- |
| 1 | ~~Switch name.~~ | **Decided (D-7):** "Dado protegido". | — |
| 2 | ~~Field-type catalog.~~ | **Decided (D-8):** as proposed, without `first_name`. | — |
| 3 | RN-04 makes client e-mail required, but some clients have none (children, elderly). Keep it? | Keep, per RFC. Revisit with the main user. | §3.2 |
| 4 | Is the protected-terms list (§3.4) acceptable? Who maintains it? | Accept it as the initial list, changed only through this spec. | R6 |
| 5 | Should turning protection OFF be blocked once values exist? | No. It only changes display. | R12 |
| 6 | Is `yes_no` never-required (R8) acceptable? | Yes. | R8 |
| 7 | Should a deleted field (no values) be recoverable? | No. Only archived fields are. | R10 |
| 8 | The decision covered Name and E-mail as client system fields. Should Telefone be one too? RF-07 lists it as a fixed field, and later notifications (RF-33–RF-35) need it. | Yes, optional by default. | §3.2, AC-0002-01 |

## 10. Acceptance criteria

### Agreed criteria

These follow from the RFC or from decisions the owner has already taken (forms-overview.md §3).

```
AC-0002-02
Given an owner creating a service template
When  they save it with no custom fields
Then  the stored fields are service.name, service.duration, service.price, all required and requiredLock true
```

```
AC-0002-03
Given a client template
When  its owner saves a field list that omits client.email
Then  the response is 422 with { "error": "systemField.missing", "field": "fields" }
```

```
AC-0002-04
Given a client template
When  its owner saves client.email with type "text"
Then  the response is 422 with { "error": "systemField.locked", "field": "fields.1" }
```

```
AC-0002-05
Given a client template
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
Given a template
When  its owner adds a custom field of type "cpf" with sensitive false
Then  the response is 422 with { "error": "fieldSensitive.locked", "field": "fields.3.sensitive" }
```

```
AC-0002-11
Given a template with active fields "Profissão" and "Objetivo"
When  its owner saves a new field labelled " profissao "
Then  the response is 422 with { "error": "fieldLabel.duplicate", "field": "fields.5.label" }
```

```
AC-0002-12
Given a template
When  its owner saves a "select" field with one option
Then  the response is 422 with { "error": "fieldOptions.required", "field": "fields.3.options" }
```

```
AC-0002-14
Given a template with fields A, B, C, D in that order
When  its owner moves D between A and B and saves
Then  reading the template returns fields in the order A, D, B, C
```

```
AC-0002-15
Given a custom field "Profissão" that no record has a value for
When  its owner removes it and saves
Then  it appears in neither fields nor archivedFields
```

```
AC-0002-16
Given a custom field "Profissão" with values in 3 clients
When  its owner removes it and saves
Then  it appears in archivedFields with valueCount 3, not in fields
And   the 3 clients still return their "Profissão" values (SPEC-0003)
```

```
AC-0002-17
Given an archived field "Profissão" and no active field with that label
When  its owner restores it and saves
Then  it is the last item of fields, with its original id and valueCount
```

```
AC-0002-18
Given a "text" field with a value in one client
When  its owner saves it with type "number"
Then  the response is 409 with { "error": "fieldType.locked", "field": "fields.3.type" }
And   the editor had shown the type dropdown disabled with copy key forms.fields.typeLocked
```

```
AC-0002-19
Given a "select" field with options "Manhã", "Tarde" and a client whose value is "Tarde"
When  its owner removes the option "Tarde" and saves
Then  the response is 200
And   that client's value displays as "Tarde (removida)"
```

```
AC-0002-20
Given a template of tenant "studio-bia" with field id F
When  the owner of "studio-ana" saves one of their templates with a field whose id is F
Then  the response is 422 with { "error": "field.unknown", "field": "fields.3.id" }
And   the field F in "studio-bia" is unchanged
```

```
AC-0002-21
Given the editor with a system field row
When  the owner opens its "⋯" menu using the keyboard
Then  "Mover para cima" and "Mover para baixo" are available and "Remover" is not
```

### Provisional criteria

These depend on open questions that are not answered yet. They are **not agreed behavior** and must not be turned into tests until the owner answers. On an answer, each one is confirmed, rewritten, or withdrawn (withdrawn IDs are not reused).

**AC-0002-01**: depends on §9 Q8 (Telefone as a client system field).

```
AC-0002-01
Given an owner creating a client template
When  they save it with no custom fields
Then  the stored fields are client.name, client.email, client.phone in that order
And   client.name and client.email are required with requiredLock true
And   client.phone is not required with requiredLock false
```

**AC-0002-08**: depends on §9 Q4 (protected-terms list).

```
AC-0002-08
Given a template
When  its owner adds a "text" field labelled "Diagnóstico principal" with sensitive true
Then  the response contains that field with sensitive true and sensitiveLock "label"
```

**AC-0002-09**: depends on §9 Q4 (protected-terms list).

```
AC-0002-09
Given a template
When  its owner adds a "number" field labelled "PESO (kg)" with sensitive false
Then  the response is 422 with { "error": "fieldSensitive.locked", "field": "fields.3.sensitive" }
```

**AC-0002-10**: depends on §9 Q4 (protected-terms list).

```
AC-0002-10
Given the editor shows a "text" field labelled "Alergias" with the switch locked ON
When  the owner changes the label to "Preferência de horário"
Then  the switch is unlocked and still ON
And   after turning it off and saving, the field is stored with sensitive false
```

**AC-0002-13**: depends on §9 Q6 (`yes_no` never-required rule).

```
AC-0002-13
Given a template
When  its owner saves a "yes_no" field with required true
Then  the response is 422 with { "error": "fieldRequired.locked", "field": "fields.3.required" }
```

## 11. Implementation plan

Written by `/plan` after the spec is Approved. Empty until then.

```

```

## 12. Changelog

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | 2026-11-09 | Draft |
| 0.2 | 2026-11-09 | Owner answers D-7, D-8 recorded; `first_name` removed; AC-0002-07 agreed |
