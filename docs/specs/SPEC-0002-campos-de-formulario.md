---
id: SPEC-0002
title: Campos do modelo de formulário
status: Implemented # Draft | Review | Approved | Implemented | Superseded
plan_status: Approved # Draft | Approved
version: 1.33
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
2. A field card is appended at the end: type "Texto curto", label "Texto curto" (the type name, in the editor's
   language), required off, protected off, "Texto de ajuda" OFF (owner, 2026-11-18). The page scrolls to it.
   - On wide screens the card stays idle and no panel opens. Focus moves to the card's title input, with its whole
     text selected, so typing replaces it (§4.6 step 12).
   - On narrow screens it becomes the selected card and its sheet opens (§4.6 step 3). Focus moves to the sheet's
     label input, with its whole text selected. (owner, 2026-11-18, §9 Q23)

   A label left as "Texto curto" is saved as written. Two new fields left that way share a label and stop
   [Salvar] under R2.
   _(Amended in v1.5, approved 2026-11-16. Before: a row was appended and focus moved to its label. Amended in v1.12,
   approved 2026-11-17. Before: on wide screens, focus moved to the card's label input. Amended in v1.26 (owner,
   2026-11-18), approved 2026-11-18. Before: the label was empty, "Texto de ajuda" was ON with an empty
   description, and on every screen the card was selected and its panel opened with focus on the panel's label
   input.)_
3. Cards, selection and the settings panel are described in §4.6.
   _(Amended in v1.5, approved 2026-11-16. Before: each row showed a drag handle, label, type dropdown, both
   switches and a "⋯" menu.)_
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
_(Amended in v1.5, approved 2026-11-16. Before: rows were dragged by a handle. Steps 1 to 3 amended in v1.12,
approved 2026-11-17, because cards hold no controls any more (§4.6). Steps 1 and 3 amended in v1.19, approved
2026-11-17, for the title and help-text inputs of §4.6 step 12.)_

1. The professional drags a card by pressing anywhere on it, except, on wide screens, inside its title and help-text
   inputs (§4.6 step 12). With a mouse or pen, the drag starts once the pointer moves. On touch, it starts once the card has been held still for
   300 ms (owner, 2026-11-16); a finger that moves before then scrolls the page. The other cards shift and the gap
   follows the pointer. Near the top or bottom edge of the screen, the page scrolls while a card is dragged (owner,
   2026-11-17).
2. No card can be dragged while a settings panel is open (§4.6 step 10). A press inside the panel never starts a
   drag.
3. Dragging a card neither selects nor focuses it, and focus stays where it was. A click without a drag, outside the
   card's title and help-text inputs, still selects the card and opens its settings panel (owner, 2026-11-17).
4. Keyboard users open "Mover" in the settings panel and pick "Mover para cima" or "Mover para baixo" (RNF-18).
5. System fields move like any other field.
6. The new order is stored on **[Salvar]** (R9).

### 4.5 Remove
1. **"Remover"** is not offered on system fields (R3).
2. For a custom field without answers, the card disappears from the draft.
3. For a custom field with answers, the editor first says "Este campo tem respostas em N cadastros. Ele sairá da
   próxima versão; o que acontece com as respostas é decidido ao aplicar as alterações." On confirm, the card
   disappears from the draft. The Apply dialog decides the rest (SPEC-0001 §4.7).

### 4.6 Field cards and settings panel

_(Added in v1.5, approved 2026-11-16. Replaces the row layout of §4.1 step 3 in v1.4. Amended in v1.12, approved 2026-11-17
(owner, 2026-11-17). A card is now selected exactly while its panel is open. The panel holds all editing on every
screen, and the rest of the page does not respond while it is open. Before: focus selected a card; on wide screens
the selected card edited its label and description and showed a "⋯" button that opened the panel; selecting
another card closed the panel (Q14); clicks outside the panel did not close it. Steps 1, 2, 3 and 10 amended and
step 12 added in v1.19 (owner, 2026-11-17), approved 2026-11-17: on wide screens an idle card's title and help
text are edited in place. Before: cards only displayed on every screen. Steps 4, 7, 8 and 12 amended in v1.26
(owner, 2026-11-18), approved 2026-11-18: on wide screens the panel has no label or description input, and
those are edited only in place on an idle card. Before: the panel held both inputs on every screen.)_

1. Each field is a card. Every card can be reached with Tab. It takes focus as a whole, with its label as its
   accessible name, or the type name while the label is empty. On wide screens, Tab then reaches the card's title
   input and its help-text input, when it is shown, and then the next card (step 12, Q21). Taking focus selects no card,
   whether the card or one of its inputs takes it (RNF-18).
2. A card shows the label as its title, the help text when there is one, and an answer preview for its type that
   cannot be filled in (Q16): a box with "Resposta" for one-line types, a taller one for "Texto longo", "Sim" and
   "Não" for `yes_no`, and the options for `select`. A system field also shows the "Sistema" badge, and a field whose
   published type was changed shows the warning of §4.2 step 4. On wide screens, an idle card's title and help text
   are edited in place (step 12), and everything else is edited in the panel. On narrow screens, cards only display.
3. Clicking or tapping a card, or pressing Enter or Space while the card itself has focus, **selects** it and opens its
   **settings panel** "Configurações do campo" (Q13). A card is selected exactly while its panel is open, so at most
   one card is selected. The selected card is highlighted. Every other card is **idle**. When the card is not fully
   in view, the page first scrolls to it, because the page cannot scroll while the panel is open (Q19). On wide
   screens, a click inside an idle card's title or help-text input edits it instead (step 12).
4. The panel holds every editing control of the field, except the label and the description on wide screens:
   there, they are edited only in place on an idle card (step 12), and the panel shows neither (owner, 2026-11-18).
   The panel's controls, in this order:
   - the label input, on narrow screens only;
   - the description input "Adicionar descrição", on narrow screens only, while "Texto de ajuda" is ON;
   - the options editor, for `select`;
   - "Obrigatório" (switch);
   - "Texto de ajuda" (switch);
   - "Dado protegido" (switch, with an info icon that shows the `forms.fields.sensitiveHelp` text);
   - "Tipo", which shows the current type and opens the type list, followed by the warning of §4.2 step 4 when it
     applies;
   - "Mover", which opens "Mover para cima" and "Mover para baixo";
   - "Remover".

   The rules that applied to the row apply to these controls: the locks of §4.2 and §4.3, R3 (no "Remover" and a
   fixed type on system fields), R4 (no "Dado protegido" on system fields), R8 and §4.5.
5. The panel closes with its close button, with Escape, or with a click or tap outside it. Closing it deselects the
   card, and focus returns to that card. A click or tap outside the panel only closes it. Whatever is under the
   pointer does not react, whether another card, [Salvar] or a link (owner, 2026-11-17).
6. On wide screens the panel sits beside the selected card. On narrow screens, below 1024 px (Q15), it opens as a
   sheet from the bottom of the screen, with the label input at its top (owner, 2026-11-16), and the same rules
   apply (Q18). A touch that is held and released without moving counts as a tap. A touch drag (§4.4) opens no
   panel.
7. "Texto de ajuda" is OFF for new fields (owner, 2026-11-18), and ON for loaded fields that have help text.
   Turning it OFF hides the description input and clears the help text from the draft (Q17), so [Salvar] sends
   `helpText: null`. On wide screens, turning it ON in the panel adds an empty description input to the card, which
   can be edited once the panel is closed (step 12).
8. When [Salvar] is stopped by field errors (SPEC-0001 §8: focus moves to the first error), and the first error
   belongs to a control (the label, the description, the options, "Obrigatório", "Dado protegido" or "Tipo"), the
   page scrolls to the card holding it and that card's settings panel opens, on every screen (step 3). Focus moves
   to the invalid control, and the message is shown under it. On wide screens, an error on the label or the
   description is the exception: no panel opens and no card is selected; focus moves to that card's title or
   help-text input, which is marked invalid, and the message is shown under the card's title (step 12; owner,
   2026-11-18). Every other card with an error is highlighted and shows its first message under its title, so no
   error is shown only by color.
9. Some errors have no control: a field's id, its `systemKey`, the field as a whole, or options sent for a type
   that has none. No panel opens and no card is selected. On wide screens, the message goes under the card's title
   and focus goes to the card. On narrow screens, the message is shown as an error toast and focus goes to the card
   (owner, 2026-11-16; in v1.12 the card is no longer selected).
10. While a panel is open, the rest of the page does not respond (owner, 2026-11-17):
   - nothing under the pointer shows a hover effect;
   - clicks and taps close the panel and do nothing else (step 5);
   - no card can be dragged (§4.4);
   - no card's title or help-text input can be edited (step 12): a click on one only closes the panel;
   - Tab and Shift+Tab move only between the panel's controls;
   - the page does not scroll, and a panel taller than the screen scrolls on its own (Q19).

   What the panel opens stays usable, and does not count as outside the panel for step 5:
   - the "Tipo" and "Mover" lists;
   - the "Dado protegido" info and the lock tooltips (§4.2 step 1, §4.3 step 2);
   - the remove dialog (§4.5 step 3), with the panel open behind it.

   SPEC-0001's leave prompt (SPEC-0001 §4.2 step 7), shown when the browser leaves the editor, also responds
   normally, with the panel open behind it. [Salvar] and [Novo campo] respond again once the panel is closed.
11. "Remover" in the panel (§4.5):
   - For a field without answers, the card leaves the draft, its panel closes, and focus moves to the next card,
     or to the previous card when the removed one was the last.
   - For a field with answers, the remove dialog opens. Confirming does the same as above. Cancelling, or pressing
     Escape, closes only the dialog: the panel stays open, with focus on "Remover".
12. Editing in place, on wide screens only (owner, 2026-11-17; v1.19, approved 2026-11-17):
   - An idle card shows its title as an input holding the label. While "Texto de ajuda" is ON, it shows its help
     text as an input holding the description. Both look like the card's text. While the label is empty, the title
     input shows the type name as its placeholder (Q20). While the description is empty, its input shows
     "Adicionar descrição". While "Texto de ajuda" is OFF, the card shows no description input. Turning the switch
     ON in the panel adds it to the card (step 7).
   - These are the only places the label and the description are edited on wide screens (step 4). While a card's
     panel is open, that card shows its title and help text as text, not as inputs. They can be edited again once
     the panel is closed (owner, 2026-11-18).
   - A new field's title input takes focus with its whole text selected (§4.1 step 2).
   - Each input has its own accessible name (RNF-18), so the inputs of different cards can be told apart: the
     title input is "Rótulo de <name>" and the help-text input is "Texto de ajuda de <name>", where <name> is the
     label, or the type name while the label is empty. A focused input shows a visible focus indicator.
   - Clicking either input, or moving focus to it with Tab, puts the cursor in it. No card is selected and no panel
     opens.
   - Typing changes the draft. The label check of §4.3 runs on each change, and the panel shows its result when
     it opens. R2 is checked on [Salvar].
   - Enter keeps the text and does not save the template. Moving focus out of the input also keeps it. Escape
     restores the text the input had when it took focus, both in the input and in the draft, and the label check of
     §4.3 runs again on the restored label. After Enter or Escape, focus stays in the input (Q22).
   - A press inside either input never starts a drag (§4.4 step 1).
   - While the editor saves, the inputs are read-only, like the editor's other inputs (SPEC-0001 §8).
   - When the first error of a save is on the label or the description, no panel opens and focus moves to the
     card's title or help-text input (step 8). An idle card with an error on its label or description marks that
     input as invalid, and the input is described by the message under the title.
   - On narrow screens, the card shows its title and help text as text, and a tap anywhere on it selects it and
     opens the sheet (step 3, Q18).

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
- **`helpText` in FieldInput** _(stated in v1.5, approved 2026-11-16; the API already behaves this way)_: string
  or null. On an existing field, omitting it keeps the stored help text, and `null` clears it. On a new field,
  omitting it or sending `null` means no help text. The editor sends an empty description as `null`.
- **Semantics of `fields` on update:** the full field list of the next version, in display order. Present ids are
  kept, with their metadata updated. Absent ids are removed from the next version (R10). Entries without an id are
  new fields. Whether a version is published follows SPEC-0001 §3.3.
- The protected-terms list (§3.4) is shared by web and api from one source, so the editor and the server agree.

## 8. UI states

| Screen | State | Behavior | Copy key |
| --- | --- | --- | --- |
| Editor fields | only system fields | Hint "Adicione campos para coletar mais informações" | `forms.fields.onlySystem` |
| Field card | idle | Label as title, help text if any, answer preview (§4.6 step 2). On wide screens the title and help text are inputs edited in place, named "Rótulo de <name>" and "Texto de ajuda de <name>", with the type name as the title's placeholder while the label is empty and "Adicionar descrição" while the description is empty; read-only while the editor saves (§4.6 step 12) | `forms.fields.answerPreview`, `forms.fields.inlineLabel`, `forms.fields.inlineHelpText`, `forms.fields.types.*`, `forms.fields.descriptionPlaceholder` |
| Field card | selected | Highlighted while its settings panel is open (§4.6 step 3) | — |
| Settings panel | open | Beside the card, or a sheet on narrow screens (§4.6 step 6). On narrow screens, label, description and options inputs, then the settings; on wide screens, the options input then the settings, with no label or description input (§4.6 step 4). While it is open on a wide screen, its card shows the title and help text as text (§4.6 step 12). The rest of the page does not respond, and a click outside only closes the panel (§4.6 steps 5 and 10) | `forms.fields.panelTitle`, `forms.fields.close`, `forms.fields.descriptionPlaceholder` |
| Settings panel | system field | "Sistema" badge on the card; no Remover; no Dado protegido; Tipo and fixed switches disabled | `forms.fields.systemBadge` |
| Settings panel | protected locked by type | Switch ON + disabled + tooltip | `forms.fields.sensitiveLockedType` |
| Settings panel | protected locked by label | Switch ON + disabled + tooltip | `forms.fields.sensitiveLockedLabel` |
| Field card | type changed on a published field | Warning inside the card, and under "Tipo" in the panel (4.2 step 4) | `forms.fields.typeChangeWarning` |
| Field card | validation error | First error with a control: its card's panel or sheet opens, with focus and the message on the invalid control (§4.6 step 8). On wide screens, a first error on the label or description opens no panel: focus goes to that card's title or help-text input, marked invalid and described by the message under the title (§4.6 steps 8 and 12). No control: no card is selected, the message goes under the title on wide screens or into an error toast on narrow screens, and the card takes focus (§4.6 step 9). Other cards with errors: highlighted, first message under the title; on wide screens, an idle card's title or help-text input that holds an error is marked invalid and described by that message (§4.6 step 12) | `validation.*` |
| Field card | dragging | Placeholder gap, others shift | — |
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
| 13 | ~~What is the settings panel called? The design says "Question options", but "Opções" already names a `select` field's option list.~~ | **Decided (owner, 2026-11-16):** "Configurações do campo" (en-US "Field settings"). | — |
| 14 | ~~When another card is selected while the panel is open, does the panel close or move to the new card?~~ | **Decided (owner, 2026-11-16):** it closes; the new card's "⋯" opens it. **Superseded in v1.12 (owner, 2026-11-17):** while a panel is open the rest of the page does not respond, and a click on another card only closes the panel (§4.6 steps 5 and 10). | — |
| 15 | ~~Below which screen width does the panel become a sheet?~~ | **Decided (owner, 2026-11-16):** below 1024 px, RNF-16's `lg` breakpoint (64rem). Beside the card, the panel needs room for both. The app sidebar still switches at 768 px. | — |
| 16 | ~~What does the answer preview show?~~ | **Decided (owner, 2026-11-16):** a box with "Resposta" for one-line types, a taller one for "Texto longo", "Sim" and "Não" for `yes_no`, and the options for `select`. It cannot be filled in. | — |
| 17 | ~~Does turning "Texto de ajuda" OFF clear the help text, or only hide it?~~ | **Decided (owner, 2026-11-16):** it clears it. What is hidden in the editor is not shown to clients either, so it is not stored. | — |
| 18 | ~~On narrow screens, where are the description input and the `select` options editor? Can the label still be edited in the card?~~ | **Decided (owner, 2026-11-16):** all editing is in the sheet: label, description and options. On narrow screens the card only displays, and tapping it selects it and opens the sheet. **Extended in v1.12 (owner, 2026-11-17):** wide screens too: all editing is in the panel. **Narrowed in v1.19 (owner, 2026-11-17), approved 2026-11-17:** on wide screens an idle card's title and help text are edited in place (§4.6 step 12). On narrow screens the card still only displays. **Narrowed in v1.26 (owner, 2026-11-18), approved 2026-11-18:** on wide screens the label and description are edited only in place; the panel has neither input (§4.6 step 4). Narrow screens are unchanged. | — |
| 19 | ~~Does the page scroll while a settings panel is open?~~ | **Decided (owner, 2026-11-17):** no. The panel stays beside its card, and a panel taller than the screen scrolls on its own. Before a panel opens, the page scrolls its card into view (§4.6 step 3). On narrow screens the sheet already covers the page. | — |
| 20 | ~~While the label is empty, what does an idle card's title input show on wide screens?~~ | **Decided (owner, 2026-11-17):** the type name as its placeholder, as the card title shows it today. | — |
| 21 | ~~On wide screens, in what order does Tab reach a card and its inputs?~~ | **Decided (owner, 2026-11-17):** the card, then its title input, then its help-text input, then the next card. | — |
| 22 | ~~After Enter or Escape in an idle card's title or help-text input, where is focus?~~ | **Decided (owner, 2026-11-17):** it stays in the input. | — |
| 23 | ~~The owner decided, for wide screens, that a new field's label starts as "Texto curto" with its whole text selected (2026-11-18). Does the same apply on narrow screens, in the sheet's label input?~~ | **Decided (owner, 2026-11-18):** yes. A field's starting values do not depend on screen width, as "Texto de ajuda" OFF does not. The sheet's label input shows "Texto curto", fully selected. | — |
| 24 | ~~A new field keeps its "Texto curto" label when its type is changed before it is renamed (no rule changes a label on a type change, §4.2). Should an untouched label follow the type instead?~~ | **Decided (owner, 2026-11-18):** no. The label stays as typed or as prefilled. | — |

## 10. Acceptance criteria

### Agreed criteria

These follow from the RFC or from decisions the owner has taken (forms-overview.md §3 and §9 of this spec).
The owner approved the criteria below on 2026-11-09, except AC-0002-53 (2026-11-10) and the amended AC-0002-21 (2026-11-16).

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

_AC-0002-21 amended in v1.5, approved 2026-11-16. Before: "Given the editor with a system field row / When the
owner opens its "⋯" menu using the keyboard / Then "Mover para cima" and "Mover para baixo" are available and
"Remover" is not"._

_AC-0002-21 amended in v1.12, approved 2026-11-17. Before: "Given the editor with a system field card that is not selected / When the owner moves focus to it with Tab, opens its settings panel and then "Mover", using only the keyboard"._

```
AC-0002-21
Given the editor with a system field card and no settings panel open
When  the owner moves focus to the card with Tab, presses Enter to open its settings panel and then opens "Mover", using only the keyboard
Then  "Mover para cima" and "Mover para baixo" are available
And   the panel offers no "Remover"
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
Given the editor with a new custom field card
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

### Criteria added in v1.5 (approved 2026-11-16)

From the field card design (owner, 2026-11-16): §4.1, §4.4, §4.6 and the `helpText` rule in §7. A "narrow"
screen is below 1024 px and a "wide" one is 1024 px or more (Q15).

_AC-0002-54 amended in v1.12, approved 2026-11-17. Before: the card showed the "Adicionar descrição" input, and focus was on the card's label input._

_AC-0002-54 amended in v1.26 (owner, 2026-11-18), approved 2026-11-18. Before: "Then a "Texto curto" card is appended after the last field and is the selected card / And its settings panel is open beside it / And "Texto de ajuda" is ON and the panel shows an empty "Adicionar descrição" input / And focus is on the panel's label input"._

```
AC-0002-54
Given the editor of a client template on a wide screen
When  the owner presses [Novo campo]
Then  a "Texto curto" card is appended after the last field
And   no settings panel is open and no card is selected
And   focus is on the new card's title input, which shows "Texto curto" with its whole text selected
And   the card shows no help-text input
```

_AC-0002-55 amended in v1.26 (owner, 2026-11-18, §9 Q23), approved 2026-11-18. Before: "And the sheet's first control is the label input, and it has focus"._

```
AC-0002-55
Given the editor of a client template on a narrow screen
When  the owner presses [Novo campo]
Then  the settings panel of the new field opens as a sheet
And   the sheet's first control is the label input, which shows "Texto curto" with its whole text selected and has focus
And   "Texto de ajuda" is OFF and the sheet shows no "Adicionar descrição" input
```

```
AC-0002-56
Given a published custom "text" field "Objetivo" with id O and help text "Conte o que você espera"
When  its owner turns "Texto de ajuda" OFF in its settings panel and presses [Salvar]
Then  the update request sends the field with id O and helpText null
```

_AC-0002-57 amended in v1.12, approved 2026-11-17. Before: "When its owner selects its card and opens its settings panel … And the card shows no "Adicionar descrição" input"._

```
AC-0002-57
Given a published custom "text" field "Profissão" without help text
When  its owner opens the card's settings panel
Then  "Texto de ajuda" is OFF
And   the panel shows no "Adicionar descrição" input
```

_AC-0002-58 amended in v1.12, approved 2026-11-17. Before: "Then "Objetivo" is the selected card and "Profissão" is idle / And no settings panel is open" (Q14)._

```
AC-0002-58
Given the editor on a wide screen with custom field cards "Profissão" and "Objetivo"
And   the settings panel of "Profissão" is open
When  the owner clicks the card "Objetivo"
Then  no settings panel is open
And   no card is selected
```

_AC-0002-59 amended in v1.12, approved 2026-11-17. Before: "Given the editor with the custom field card "Objetivo" selected and its settings panel closed / When the owner presses the card's "⋯" button / Then the settings panel "Configurações do campo" opens / And it lists "Obrigatório", "Texto de ajuda", "Dado protegido", "Tipo", "Mover" and "Remover" in that order"._

_AC-0002-59 amended in v1.19, approved 2026-11-17. Before: "When the owner clicks the card "Objetivo"", because the card had no inputs (§4.6 step 12)._

_AC-0002-59 amended in v1.26 (owner, 2026-11-18), approved 2026-11-18. Before: "And the panel shows the label input, the "Adicionar descrição" input, "Obrigatório", …"._

```
AC-0002-59
Given the editor on a wide screen with the custom "text" field "Objetivo", help text "Conte o que você espera", and no settings panel open
When  the owner clicks the card "Objetivo" outside its title and help-text inputs
Then  "Objetivo" is the selected card and its settings panel "Configurações do campo" is open beside it
And   the panel shows "Obrigatório", "Texto de ajuda", "Dado protegido", "Tipo", "Mover" and "Remover" in that order
And   the panel shows no label input and no "Adicionar descrição" input
```

_AC-0002-60 amended in v1.12, approved 2026-11-17. Before: "Then the panel closes / And focus is on the "⋯" button of the card "Objetivo""._

```
AC-0002-60
Given the settings panel of the custom field "Objetivo" is open
And   focus is on a control inside the panel, and neither the "Tipo" list nor the "Mover" list is open
When  the owner presses Escape
Then  the panel closes and no card is selected
And   focus is on the card "Objetivo"
```

```
AC-0002-61
Given the editor of an existing template with no records, whose custom fields are "A", "B" and "C", in that order after the system fields
When  the owner presses the mouse on card "C" outside its inputs and buttons, drags it above card "A", releases it, presses [Salvar] and confirms [Publicar]
Then  the update request lists the custom fields in the order "C", "A", "B"
```

_AC-0002-62 amended in v1.12, approved 2026-11-17. Before: "And card "C" is selected / When the owner presses the mouse inside the label input of card "C" and moves the pointer above card "A""._

_AC-0002-62 amended in v1.26 (owner, 2026-11-18), approved 2026-11-18, because the wide-screen panel has no label input. Before: "When the owner presses the mouse inside the panel's label input …"._

```
AC-0002-62
Given the editor on a wide screen with custom fields "A", "B" and "C", in that order after the system fields
And   the settings panel of card "C" is open
When  the owner presses the mouse on the panel's title "Configurações do campo" and moves the pointer above card "A"
Then  the cards stay in the order "A", "B", "C"
```

```
AC-0002-63
Given the editor on a touch screen, of an existing template with no records, whose custom fields are "A", "B" and "C", in that order after the system fields
When  the owner touches card "C", holds it still for at least 300 ms, drags it above card "A", lifts the finger, presses [Salvar] and confirms [Publicar]
Then  the update request lists the custom fields in the order "C", "A", "B"
```

```
AC-0002-64
Given the editor on a touch screen with custom fields "A", "B" and "C", in that order after the system fields
When  the owner touches card "C" and moves the finger upward before 300 ms have passed
Then  no card is picked up
And   the cards stay in the order "A", "B", "C"
```

_AC-0002-65 amended in v1.12, approved 2026-11-17. Before: "And card "Profissão" is selected … Then card "Objetivo" is the selected card / And its label input shows …", with the label input on the card._

_AC-0002-65 amended in v1.26 (owner, 2026-11-18), approved 2026-11-18. Before: "Then the settings panel of card "Objetivo" is open / And the panel's label input shows the message of validation.fieldLabel.required and has focus"._

```
AC-0002-65
Given the editor on a wide screen with custom fields "Profissão" at index 3 and "Objetivo" at index 4
And   no settings panel is open
When  the owner presses [Salvar] and the save is stopped by fieldLabel.required at fields.4.label
Then  no settings panel is open and no card is selected
And   the title input of the card at index 4 has focus, is marked invalid and is described by the message of validation.fieldLabel.required under its title
```

```
AC-0002-66
Given the editor on a narrow screen with custom fields "Profissão" at index 3 and "Objetivo" at index 4
And   no sheet is open
When  the owner presses [Salvar] and the save is stopped by fieldLabel.required at fields.4.label
Then  the sheet of "Objetivo" is open
And   its label input shows the message of validation.fieldLabel.required and has focus
```

```
AC-0002-67
Given the editor on a wide screen with a custom "yes_no" field at index 3 whose card is idle
When  the owner presses [Salvar] and the response is 422 with { "error": "fieldRequired.locked", "field": "fields.3.required" }
Then  the card at index 3 is selected and its settings panel is open
And   the "Obrigatório" switch shows the message of validation.fieldRequired.locked and has focus
```

```
AC-0002-68
Given a client template with no records and a custom "text" field "Objetivo" (id O) stored with help text "Conte o que você espera"
When  its owner saves the template with field id O and helpText null
Then  the response contains "Objetivo" with helpText null
```

```
AC-0002-69
Given the editor on a narrow screen with the custom field card "Objetivo" idle
When  the owner taps the card "Objetivo"
Then  "Objetivo" is the selected card
And   its sheet is open
```

_AC-0002-70 added in v1.8 from an owner decision, 2026-11-16 (§4.6 step 9). Its wording was approved by the owner
with the plan, 2026-11-17. Amended in v1.12, approved 2026-11-17. Before: "And the card at index 3 is selected and has
focus"._

```
AC-0002-70
Given the editor on a narrow screen with a custom "text" field at index 3 whose card is idle
When  the owner presses [Salvar] and the response is 422 with { "error": "fieldOptions.not-allowed", "field": "fields.3.options" }
Then  an error toast shows the message of validation.fieldOptions.not-allowed
And   the card at index 3 has focus and is not selected
And   no sheet is open
```

### Criteria added in v1.12 (approved 2026-11-17)

From the modal settings panel (owner, 2026-11-17): §4.6 steps 1, 5, 9 and 10. AC-0002-75 and -76 were added in v1.13
from the spec review.

```
AC-0002-71
Given the editor on a wide screen with custom fields "A", "B" and "C", in that order after the system fields
And   the settings panel of card "A" is open
When  the owner presses the mouse on card "C", moves the pointer above card "A" and releases it
Then  the cards stay in the order "A", "B", "C"
```

```
AC-0002-72
Given the editor on a wide screen with the settings panel of the custom field "Objetivo" open
And   focus is on the panel's last control
When  the owner presses Tab
Then  focus is on the panel's first control
```

```
AC-0002-73
Given the editor on a wide screen of an existing template whose name was changed
And   the settings panel of the custom field "Objetivo" is open
When  the owner clicks [Salvar]
Then  no request is sent
And   no settings panel is open
```

```
AC-0002-74
Given the editor on a narrow screen with the sheet of the custom field "Objetivo" open
When  the owner taps outside the sheet
Then  the sheet closes
And   no card is selected
```

```
AC-0002-75
Given the editor on a wide screen with the custom field card "Objetivo" and no settings panel open
When  the owner moves focus to the card "Objetivo" with Tab
Then  no settings panel is open
And   no card is selected
```

```
AC-0002-76
Given the editor on a wide screen with a custom "text" field at index 3 whose card is idle
When  the owner presses [Salvar] and the response is 422 with { "error": "fieldOptions.not-allowed", "field": "fields.3.options" }
Then  the message of validation.fieldOptions.not-allowed is shown under the title of the card at index 3
And   the card at index 3 has focus and is not selected
And   no settings panel is open
```

### Criteria added in v1.19 (approved 2026-11-17)

From editing in place (owner, 2026-11-17): §4.4 steps 1 and 3, and §4.6 steps 1, 3, 10 and 12. AC-0002-83 follows
Q20, AC-0002-85 Q21, and AC-0002-79 and -81 Q22. AC-0002-90 to -94 were added in v1.20 from the spec review.

```
AC-0002-77
Given the editor on a wide screen with the custom field card "Objetivo" idle and no settings panel open
When  the owner clicks the title of the card "Objetivo"
Then  the card's title input has focus and shows "Objetivo"
And   no settings panel is open
And   no card is selected
```

```
AC-0002-78
Given the editor on a wide screen with the custom field card "Objetivo", help text "Conte o que você espera", idle and no settings panel open
When  the owner clicks the help text of the card "Objetivo"
Then  the card's help-text input has focus and shows "Conte o que você espera"
And   no settings panel is open
And   no card is selected
```

```
AC-0002-79
Given the editor on a wide screen of an existing template, with the custom field card "Objetivo" idle and no settings panel open
When  the owner clicks the title of the card "Objetivo", replaces the text with "Meta" and presses Enter
Then  no request is sent
And   the card's title input shows "Meta" and has focus
And   no settings panel is open
```

```
AC-0002-80
Given the editor on a wide screen of an existing template with the published custom "text" field "Objetivo" (id O)
When  the owner replaces the text in the title input of the card "Objetivo" with "Meta" and presses [Salvar]
Then  the update request sends the field with id O and label "Meta"
```

```
AC-0002-81
Given the editor on a wide screen with the custom field card "Objetivo" idle and no settings panel open
When  the owner clicks the title of the card "Objetivo", replaces the text with "Meta" and presses Escape
Then  the card's title input shows "Objetivo" and has focus
And   no settings panel is open
```

_AC-0002-82 amended in v1.26 (owner, 2026-11-18), approved 2026-11-18, because a new field no longer opens its panel and starts with "Texto de ajuda" OFF. Before: "When the owner presses [Novo campo] and then closes the new field's settings panel with Escape"._

```
AC-0002-82
Given the editor of a client template on a wide screen
When  the owner presses [Novo campo], clicks the new card outside its title input, turns "Texto de ajuda" ON in its settings panel and closes the panel with Escape
Then  the new card shows an empty help-text input whose placeholder is the copy of forms.fields.descriptionPlaceholder
```

_AC-0002-83 amended in v1.26 (owner, 2026-11-18), approved 2026-11-18, because a new field's label now starts as "Texto curto". Before: "When the owner presses [Novo campo] and then closes the new field's settings panel with Escape"._

```
AC-0002-83
Given the editor of a client template on a wide screen
When  the owner presses [Novo campo] and deletes the whole text of the new card's title input
Then  the new card's title input is empty and shows "Texto curto" as its placeholder
```

```
AC-0002-84
Given an existing template with the published custom "text" field "Profissão" without help text
When  its owner opens the template in the editor on a wide screen
Then  the card "Profissão" shows its title input
And   the card shows no help-text input
```

```
AC-0002-85
Given the editor on a wide screen with the custom field card "Objetivo", help text "Conte o que você espera", and no settings panel open
And   focus is on the card "Objetivo"
When  the owner presses Tab
Then  focus is on the card's title input
And   no settings panel is open
And   no card is selected
```

```
AC-0002-86
Given the editor on a wide screen with custom fields "A", "B" and "C", in that order after the system fields, and no settings panel open
When  the owner presses the mouse inside the title input of card "C", moves the pointer above card "A" and releases it
Then  the cards stay in the order "A", "B", "C"
And   no card is selected
```

```
AC-0002-87
Given the editor on a wide screen with custom field cards "Profissão" and "Objetivo"
And   the settings panel of "Profissão" is open
When  the owner clicks the title of the card "Objetivo"
Then  no settings panel is open
And   no card is selected
And   the title input of the card "Objetivo" does not have focus
```

_AC-0002-88 amended in v1.26 (owner, 2026-11-18), approved 2026-11-18, because the wide-screen panel has no label input, and because a new field's title input now starts with "Texto curto". Before: "When the owner types "CPF do responsável" into the card's title input … / And the panel's label input shows "CPF do responsável""._

```
AC-0002-88
Given the editor on a wide screen with a new custom "text" field card idle and no settings panel open
When  the owner replaces the text in the card's title input with "CPF do responsável" and then clicks the card outside its inputs
Then  the card's settings panel is open
And   the card's title shows "CPF do responsável"
And   the panel's "Dado protegido" switch is ON and disabled, with the tooltip of copy key forms.fields.sensitiveLockedLabel
```

```
AC-0002-89
Given the editor on a narrow screen with the custom field card "Objetivo" idle
When  the owner taps the title of the card "Objetivo"
Then  "Objetivo" is the selected card and its sheet is open
And   the card shows no title input
```

```
AC-0002-90
Given the editor on a wide screen of an existing template whose name was changed, with the published custom "text" field "Objetivo" (id O)
When  the owner replaces the text in the title input of the card "Objetivo" with "Meta", presses Escape and presses [Salvar]
Then  the update request sends the field with id O and label "Objetivo"
```

```
AC-0002-91
Given the editor on a wide screen with the custom field card "Objetivo", help text "Conte o que você espera", and no settings panel open
When  the owner reaches the card's inputs with Tab
Then  the title input's accessible name is the copy of forms.fields.inlineLabel for "Objetivo" ("Rótulo de Objetivo")
And   the help-text input's accessible name is the copy of forms.fields.inlineHelpText for "Objetivo" ("Texto de ajuda de Objetivo")
```

_AC-0002-92 amended in v1.26 (owner, 2026-11-18), approved 2026-11-18. Before: "Then the settings panel of the card at index 3 is open / And the card at index 4 is not selected / And its title input is marked invalid …"._

```
AC-0002-92
Given the editor on a wide screen with custom "text" fields at index 3 and index 4, both with an empty label, and no settings panel open
When  the owner presses [Salvar] and the save is stopped by fieldLabel.required at fields.3.label and at fields.4.label
Then  no settings panel is open and the title input of the card at index 3 has focus
And   the title input of the card at index 4 is marked invalid and is described by the message of validation.fieldLabel.required
```

```
AC-0002-93
Given the editor on a wide screen of an existing template with the published custom "text" field "Objetivo" (id O) and help text "Conte o que você espera"
When  the owner replaces the text in the help-text input of the card "Objetivo" with "Diga sua meta" and presses [Salvar]
Then  the update request sends the field with id O and helpText "Diga sua meta"
```

```
AC-0002-94
Given the editor on a wide screen of an existing template whose name was changed, with the custom field card "Objetivo" idle
When  the owner presses [Salvar] and the request has not returned yet
Then  the title input of the card "Objetivo" is read-only
```

### Criteria added in v1.26 (approved 2026-11-18)

From the wide-screen panel without text inputs (owner, 2026-11-18): §4.1 step 2, and §4.6 steps 4, 7, 8 and 12.
AC-0002-54, -55, -59, -62, -65, -82, -83, -88 and -92 were amended for the same change. AC-0002-100 was added in
v1.27 from the spec review.

```
AC-0002-95
Given the editor on a wide screen with the custom "text" field "Objetivo", help text "Conte o que você espera", and no settings panel open
When  the owner clicks the card "Objetivo" outside its title and help-text inputs
Then  its settings panel is open
And   the card shows "Objetivo" and "Conte o que você espera" as text, with no title input and no help-text input
```

```
AC-0002-96
Given the editor of a client template on a wide screen
When  the owner presses [Novo campo] and types "Profissão"
Then  the new card's title input shows "Profissão"
```

```
AC-0002-97
Given the editor on a wide screen of an existing template with no records
When  the owner presses [Novo campo], presses [Salvar] and confirms [Publicar]
Then  the update request sends the new field with label "Texto curto", type "text" and helpText null
```

```
AC-0002-98
Given the editor of a new client template on a wide screen with no custom fields
When  the owner presses [Novo campo] twice and presses [Salvar]
Then  the response is 422 with { "error": "fieldLabel.duplicate", "field": "fields.4.label" }
And   no settings panel is open and no card is selected
And   the title input of the card at index 4 has focus, is marked invalid and is described by the message of validation.fieldLabel.duplicate under its title
```

```
AC-0002-99
Given the editor on a wide screen with custom fields "Profissão" at index 3 and "Objetivo" at index 4, "Objetivo" with help text
And   no settings panel is open
When  the owner presses [Salvar] and the save is stopped by fieldHelpText.max at fields.4.helpText
Then  no settings panel is open and no card is selected
And   the help-text input of the card at index 4 has focus, is marked invalid and is described by the message of validation.fieldHelpText.max under its title
```

```
AC-0002-100
Given the editor of a client template on a narrow screen
When  the owner presses [Novo campo] and turns "Texto de ajuda" ON in the new field's sheet
Then  the sheet shows an empty description input whose placeholder is the copy of forms.fields.descriptionPlaceholder
```

### Withdrawn criteria

Withdrawn IDs are never reused.

- AC-0002-17 (restore an archived field): withdrawn in v0.7 by the owner, 2026-11-09. Archived fields no longer
  exist; template versions replaced them (D-10, R10–R11).

## 11. Implementation plan

### Wide-screen panel amendment (v1.28)

Drafted by `/plan` on 2026-11-18 for the v1.26–v1.27 amendment, approved in v1.28 (§4.1 step 2; §4.6 steps 4, 7, 8
and 12; §8; Q18, Q23, Q24; AC-0002-54, -55, -59, -62, -65, -82, -83, -88 and -92 amended; AC-0002-95 to -100
added). Revised after the plan review, with the owner's pick of 2026-11-18 (v1.30). **Approved by the owner on
2026-11-18**, with Decisions 7 as written (the switch-row edit is finished here). Only the editor's field list changes. Contracts, database, API and copy stay as
they are. It builds on the editing-in-place amendment below (implemented), and keeps its structure: display cards
with a cover button and inline title and help-text boxes, the modal popover, and the one-open-card state in the
list.

Starting point. Part of this amendment was built before the spec allowed it:
- Commit b50aa4d already hides the label and description inputs in the wide popover (`showTextInputs={!wide}` in
  `field-list.tsx`). That makes 8 W-fld tests fail: AC-0002-10, -54, -59, -62, -65, -72, -88 and "§8 after a server
  field error, fixing another row and pressing Salvar sends the request".
- An uncommitted edit to `field-settings.tsx` turns each switch row's text into a `<label>` (Decisions 7).
- Nothing else in v1.26 is built.

#### Scope

`task-lock.sh` reads the first `scope` block of the file, so this block is the lock while this amendment is
implemented.

```scope
apps/web/src/app/*/orgs/*/forms/_components/fields/*
apps/web/tests/form-fields*
docs/specs/SPEC-0002-campos-de-formulario.md
```

Not in scope:
- `packages/i18n`. The prefilled label is `forms.fields.types.text` ("Texto curto", en-US "Short text"), which
  already exists. No key is added or removed.
- `popover.tsx` and `sheet.tsx`. `initialFocus` already takes a function, and its `true` fallback gives base-ui's
  default, the first tabbable control (Decisions 6).
- `form-editor.tsx`. It already turns the first field error of a save, from the schema or from a 422, into the
  list's `reveal`. The list decides what to do with it.
- `packages/schemas`. `FieldInput.helpText` is already `.nullish()`, and `null` already means OFF (§7).

The SPEC-0001 tests (`form-editor.test.tsx`, `form-dialogs.test.tsx`, `forms-list.test.tsx`) are not in scope, and
they must still pass.

#### Contracts

None. A new field is sent with `helpText: null`, as a field whose switch was turned OFF is (AC-0002-56, -68).

#### Persistence

None.

#### API

None. The 422 of AC-0002-98 is the existing `fieldLabel.duplicate` of the create path. Labels are checked for
duplicates only on the server (AC-0002-11).

#### Web

All paths are under `apps/web/src/app/[lang]/(private)/orgs/[tenant]/forms/_components/fields/`.

1. **New field** (`field-model.ts`). `newField(label)` takes the label and returns `{ label, type: "text",
   required: false, helpText: null }`: the type name as the label, and help text OFF (§4.1 step 2, §4.6 step 7). The
   comment that says help text starts ON goes.
2. **List** (`field-list.tsx`):
   - [Novo campo] appends `newField(t("types.text"))` and sets `addedNew`, as now. The click handler cannot keep the
     new row's key, because `append` creates it.
   - The effect that runs after the append reads the key from `rows.at(-1).rowKey` and stores it as `selectKey`, the
     input to select on its first focus (Web 4). Then:
     - Wide screens: no panel opens. The new card's title box, `[data-error-slot="label"]` inside the card, is
       queued for focus (AC-0002-54).
     - Narrow screens: `openCard(key)` as now, so the sheet opens on its label input (AC-0002-55).
   - `pendingFocus` holds `{ key, selector }` instead of a key, so it can focus a card's title or help-text box as
     well as its cover button. The cover button stays the default.
   - `pendingFocus` is cleared only once its element is found and focused, or once its card is no longer in the
     list. Today the effect clears it before the lookup. That drops the new card's focus, because the card is not
     rendered in the render that follows the append. `values` comes from `useWatch`, and react-hook-form updates it
     only in `useFieldArray`'s own effect after that render, so the list skips the row (it has no value yet). A
     target that is not found yet stays queued for the next render.
   - `reveal`: the slot check passes `wide` (Web 3). On wide screens, a label or help-text error now has no panel
     control. It takes the no-control branch with no toast, as today on wide screens, and focuses
     `[data-error-slot="<slot>"]` inside the card instead of the cover button (AC-0002-65, -92, -98, -99). Every
     other slot is unchanged, and so is the narrow screen.
   - `selectOnFocus` goes to the new row's card on wide screens, and to `FieldSettings` on narrow screens.
     `onSelected` clears `selectKey`.
   - `showTextInputs={!wide}` stays.
3. **Errors and card** (`field-card/field-card-errors.ts`, `field-card/field-card.tsx`):
   - `slotHasControl(slot, field, wide)`: on wide screens, `label` and `helpText` have no control in the panel.
   - The card passes `wide`. A selected card on a wide screen then keeps a label or help-text message under its
     title, because the panel has no input to show it under (§4.6 step 8: no error is shown only by color).
   - The card forwards `selectOnFocus` and `onSelected` to its title box.
   - `isPanelSlot` is only re-exported and is not used. It stays: removing it is outside this amendment.
4. **Select on first focus** (`field-card/field-inline-input.tsx`, `field-card/field-text-inputs.tsx`). Both take
   optional `selectOnFocus` and `onSelected`. While `selectOnFocus` is set, focus calls `select()` on the input and
   then `onSelected()`. This works the same whether the list focuses the card's title box or base-ui focuses the
   sheet's label input. The inline box still takes its Escape snapshot on focus.
5. **Panel content** (`field-settings.tsx`):
   - It passes `selectOnFocus` and `onSelected` to `FieldTextInputs` (narrow screens only, through
     `showTextInputs`).
   - It finishes the owner's uncommitted switch-row edit (Decisions 7). The row's `<label>` keeps `id={labelId}`,
     and the inner `<span>` loses it, so the id is no longer duplicated.
   - Each switch gets its own id: `-required-switch`, `-help-switch` and `-sensitive-switch`. Today the help switch
     carries the required one's id, the required switch has none, and `sensitiveSwitch` repeats the `sensitive`
     label id.
   - The unused imports `tr` (`zod/v4/locales`) and `cn` go. They are the two lint warnings in this file today.

#### Tests

All in W-fld (`apps/web/tests/form-fields.test.tsx`). `labelInput(label)` finds the panel's "Rótulo" textbox, so it
now works only on narrow screens. Wide-screen tests use the existing `inlineTitle(card)` and `inlineHelp(card)`. The
selection is checked with `selectionStart === 0` and `selectionEnd === value.length`.

The last column says what each test does on today's code, before Web 2–5. **Fails first** tests must fail for the
reason given. **Passes at once** tests pass on today's code, because commit b50aa4d or an earlier amendment already
built that part. They are written and run, but the fail-first rule does not apply to them.

| AC | Test | Before Web 2–5 |
| --- | --- | --- |
| AC-0002-54 | renamed "AC-0002-54 Novo campo on a wide screen opens no panel and focuses the new card's title with Texto curto selected" | Fails first: a panel opens, and the label starts empty |
| AC-0002-55 | renamed "AC-0002-55 Novo campo on a narrow screen opens the sheet with focus on its label input, Texto curto selected and help text OFF" | Fails first: the label input is empty, and "Texto de ajuda" is ON |
| AC-0002-59 | renamed "AC-0002-59 clicking a card outside its title and help-text inputs opens Configurações do campo with the six items in order and no label or description input" | Passes at once: b50aa4d already hides the panel's label and description inputs |
| AC-0002-62 | renamed "AC-0002-62 a mouse drag that starts on the panel's title does not move the card" | Passes at once: no drag starts while a panel is open (§4.4 step 2), wherever the press starts |
| AC-0002-65 | renamed "AC-0002-65 a label error on a wide screen focuses that card's title input, invalid and described by the message, with no panel" | Fails first: the error opens the card's panel |
| AC-0002-72 | renamed "AC-0002-72 Tab from the panel's last control (✕) moves to its first control". The AC is unchanged. On a wide screen the first control of a "text" field is "Obrigatório" | Passes at once: b50aa4d already makes "Obrigatório" the first control |
| AC-0002-82 | renamed "AC-0002-82 help text turned ON in a new card's panel shows an empty help-text input with the description placeholder". It checks that the switch is OFF before turning it ON | Fails first: a new field starts with "Texto de ajuda" ON |
| AC-0002-83 | renamed "AC-0002-83 clearing a new card's title shows the type name as placeholder" | Fails first: a panel opens after [Novo campo], so the selected card has no title box |
| AC-0002-88 | name kept; replaces the title box's text and reads the card's title | Fails first: a panel opens after [Novo campo], so the card has no title box |
| AC-0002-92 | renamed "AC-0002-92 two label errors on a wide screen focus the first card's title input and mark the second invalid, with no panel" | Fails first: the first error opens the panel of the card at index 3 |
| AC-0002-95 | "AC-0002-95 while its panel is open on a wide screen, a card shows its title and help text as text" | Passes at once: v1.25 already shows the selected card's title and help text as text |
| AC-0002-96 | "AC-0002-96 typing after Novo campo replaces Texto curto in the new card's title" | Fails first: a panel opens after [Novo campo], so the card has no title box |
| AC-0002-97 | "AC-0002-97 an untouched new field is sent with label Texto curto and helpText null" | Fails first: the panel that opens after [Novo campo] takes the first [Salvar] (AC-0002-73), and the label starts empty |
| AC-0002-98 | "AC-0002-98 two untouched new fields stop Salvar with fieldLabel.duplicate on the second card's title input" | Fails first: the labels start empty, so [Salvar] stops on fieldLabel.required and sends no request |
| AC-0002-99 | "AC-0002-99 a help-text error on a wide screen focuses that card's help-text input with no panel" | Fails first: the error opens the card's panel |
| AC-0002-100 | "AC-0002-100 turning help text ON in a new field's sheet shows an empty description input". It checks that the switch is OFF before turning it ON | Fails first: a new field starts with "Texto de ajuda" ON |

These ACs are unchanged, but their test bodies change:
- **AC-0002-10:** the label is changed in the card's title box instead of the panel. Passes at once: v1.25 already
  has the title box.
- **"§8 after a server field error, fixing another row and pressing Salvar sends the request":** the error no
  longer opens a panel, so the test edits "A" in place and drops the first `closePanel()`. Fails first: the label
  error opens the panel of "B", and the message is shown nowhere.
- **AC-0002-50:** expected to pass unchanged, because `chooseFieldType` opens the panel itself. Re-run it.

Every other W-fld test is re-run with no assertion changed. Fake timers and the drag helpers stay as they are.

#### Deferred checks

None added. AC-0002-16, -19, -23, -24 and -26 stay deferred to SPEC-0004.

#### Sequence

0. **The owner commits or sets aside the uncommitted `field-settings.tsx` edit**, depending on their pick for
   Decisions 7, and commits the spec changes of v1.26–v1.30 before `/implement`. The spec file is in scope, so the
   spec commit is optional.
1. **Failing tests.** The `test-author` subagent rewrites the amended tests and the changed bodies, and adds
   AC-0002-95 to -100, as listed under Tests. Only the tests marked "Fails first" must fail before Web 2–5, each for
   the reason given there, not for a missing helper. The tests marked "Passes at once" are written and run, and they
   pass.
2. **Web 1–5**, in one step, so that typecheck passes at its end.
3. **Checks:** `pnpm --filter web lint`, `typecheck` and `test`. The API is unchanged.
4. `/review`, then `/done`, with these manual checks for the owner:
   1. On a wide screen, [Novo campo] selects "Texto curto" in the new card's title, and typing replaces it.
   2. On a phone-width screen, the sheet's label input shows "Texto curto" selected.
   3. Clicking the words "Obrigatório", "Texto de ajuda" and "Dado protegido" toggles their switches (Decisions 7,
      Risks 1).
   4. After a label error on a wide screen, the focused title box shows its focus ring.

#### Decisions this plan makes

1. **The label is filled from the type name in the editor's language**, as the spec says (§4.1 step 2). An en-US
   editor saves "Short text".
2. **"Select on first focus" is a flag on the input**, cleared on its first focus. It does not depend on when
   base-ui moves focus, and it does not select the text again on later focus.
3. **A wide-screen label or help-text error goes through the no-control branch.** The panel has no control for it
   on wide screens. That branch already selects no card and shows no toast on wide screens. Only its focus target
   changes, from the card to the card's box.
4. **A selected wide card keeps a label or help-text message under its title.** The spec does not name this case
   (a panel opened by click on a card that already has such an error). Hiding the message would leave it shown
   only by color, which §4.6 step 8 rules out.
5. **No new copy key.**
6. **Panel focus on open, wide screens:** the first tabbable control. That is the first option for `select`, else
   "Obrigatório", as AC-0002-72 already says ("the panel's first control"). This is base-ui's default when
   `initialFocus` finds no label input.
7. **The uncommitted switch-row edit is finished in this amendment** (Web 5). It is visual, except that clicking
   the label text toggles the switch, which no criterion covers. The owner picked this with the plan approval,
   2026-11-18.

#### Risks

1. **base-ui `Switch` and `id`.** `<label htmlFor>` toggles only a labelable element. If base-ui puts `id` on the
   hidden checkbox, a label click may toggle that checkbox without updating the switch. If it does not forward
   `id` at all, the label does nothing. `aria-labelledby` still names the switch, so the criteria pass either way.
   Cheapest check: manual check 3, or a quick W-fld assertion that `label.control` is set and a click on it flips
   `aria-checked`. If it fails, the label wraps the switch instead of pointing at it.
2. **AC-0002-98 depends on the create request's 422** reaching `reveal`, as the preview's 422 does in the §8 tests.
   If the create path shows a toast instead, Web 2 has to route that 422 too, and `form-editor.tsx` leaves the
   "Not in scope" list. Cheapest check: the AC-0002-98 test in Sequence 1 shows where the message lands.
3. **Focus right after the append.** The new card's box exists only one render after the append, once `useWatch`
   has the new row's value (Web 2). A `pendingFocus` cleared before its element is found drops the focus without
   any error. Web 2 keeps it queued until the element is focused. React's development double effects then focus
   the same box twice, which is harmless. Cheapest check: if AC-0002-54 still fails on focus after Web 2, the
   target was dropped.
4. **AC-0002-72** keeps relying on base-ui's focus guard (Risks 5 of the modal panel amendment). Only its target
   changes, from the label input to "Obrigatório".

#### New dependencies

None.

#### Spec review follow-ups (not taken; the owner picks)

Should-fix items 5–14 of the v1.26 spec review stay follow-ups. Decisions 1, 4 and 6 above answer items 5, 6 and 8
for the implementation, without changing the spec.

#### Plan review follow-ups (not taken; the owner picks)

From the plan review of 2026-11-18. Required changes 1 and 2 were applied in v1.30.
3. The AC-0002-96 test sets the value with `fireEvent.change`, which passes whether or not the text was selected.
   Either add a helper that types over the current selection, or defer AC-0002-96 to manual check 1.
4. Risks 1 can be closed: base-ui 1.8 puts `id` on the hidden checkbox, whose change calls `onCheckedChange`, so a
   label click toggles the switch and `readOnly` blocks it.
5. Risks 2 is answered by the code: the create path reaches `setReveal` through `showFailure` and `showFieldError`
   in `form-editor.tsx`. State this, so that the file stays out of scope.
6. Make Web 5 its own step and commit, so that the Decisions 7 pick can be committed or dropped on its own.
7. The 1.29 changelog row calls Decisions 7 "the owner's pick", while Decisions 7 and Sequence 0 say the owner
   picks at approval.
8. The §8 test should also drop `openSettings(cardOf("A"))` and the second `closePanel()`, because an open panel
   turns A's title box into text.
9. Not in scope should say that `tests/forms-harness.tsx` and `tests/setup.ts` are not needed.
10. Sequence 4 should list the manual checks still open from earlier amendments (editing in place 1–7, modal panel
    1–5).

### Editing-in-place amendment (v1.21)

Drafted by `/plan` on 2026-11-17 for the v1.19–v1.20 amendment, approved in v1.21 (§4.4 steps 1 and 3; §4.6 steps
1–4, 10 and 12; §8; Q18, Q20–Q22; AC-0002-59 amended; AC-0002-77 to -94 added). Revised after the plan review, with
the owner's picks of 2026-11-17 (v1.23). **Approved by the owner on 2026-11-17.** Only the editor's field list and
two copy keys change. Contracts, database and API stay as they are. It builds on the modal panel amendment below
(implemented and committed), whose structure it keeps: display cards with a cover button, the modal popover, the
one-open-card state in the list, and `field-reorder.tsx`.

#### Scope

`task-lock.sh` reads the first `scope` block of the file, so this block is the lock while this amendment is
implemented.

```scope
apps/web/src/app/*/orgs/*/forms/_components/fields/*
apps/web/tests/form-fields*
packages/i18n/messages/pt-BR.json
packages/i18n/messages/en-US.json
docs/specs/SPEC-0002-campos-de-formulario.md
```

Not in scope:
- `form-editor.tsx`. It already passes `disabled={saving}` to the list, which becomes the inputs' read-only flag.
  Enter is stopped in the card's own inputs, so the editor's `<form>` needs no change.
- `popover.tsx` and `sheet.tsx`. The backdrop already covers the cards' inputs while a panel is open (§4.6 step 10).
- `forms-harness.tsx` and `tests/setup.ts`. Its `never` reply already holds a save open (AC-0002-94).

The SPEC-0001 tests are not in scope, and they must still pass.

#### Contracts

None. `packages/schemas` is unchanged.

#### Persistence

None.

#### API

None. The label and the help text reach the existing update request through the same draft as the panel's inputs
(AC-0002-80, -90, -93).

#### Web

1. **Inline text box** (new, `fields/field-card/field-inline-input.tsx`). It is one auto-growing `<textarea rows={1}>`
   that looks like the card's text, used for the title and the help text (§4.6 step 12). A textarea wraps long text
   as the card's text does today; a one-line input would clip it (Decisions 6).
   - Props: `value`, `name` (its accessible name), `placeholder`, `invalid`, `describedBy`, `readOnly`, an error
     slot for `data-error-slot`, and `onChange(value)`.
   - Classes: `field-sizing-content`, `w-auto`, `max-w-full`, `self-start` and `resize-none`. It grows with its text
     and wraps at the card's width. A short text box is only as wide as its text or placeholder, so a click beside
     the text lands on the cover button and opens the panel (§4.6 step 3). Its padding, font and line height are
     those of the text it replaces (no `px-2 py-1`), so the title does not shift when the card is selected and the
     text comes back (Decisions 1). It adds `pointer-events-auto`, because the card's content layer has
     `pointer-events-none`, and a visible focus ring (`focus-visible:outline-2 focus-visible:outline-border-focused`).
     It does **not** take `CardTextInput`'s `focus:outline-none`: in Tailwind v4 that sets the outline style to
     `none`, which would hide the ring.
   - Line breaks: a change replaces each line break with a space, because a label or help text holds one line
     (pasted text included).
   - On focus, it keeps the current value as its snapshot.
   - On Enter, it cancels the keydown, so no line break is typed (AC-0002-79). A textarea never submits its form on
     Enter, so the editor's `<form>` is not saved either. An Enter that ends an IME composition (`isComposing`) is
     left alone.
   - On Escape, it calls `onChange(snapshot)` (AC-0002-81, -90). An Escape during an IME composition, or while the
     text box is read-only, is left alone.
   - Focus stays in the input after Enter and Escape (Q22). There is no blur or commit step: like the panel's
     inputs, every change already updates the draft, and leaving the input keeps it.
   - It renders no error line of its own. `aria-invalid` and `aria-describedby` point at the message under the card
     title (§4.6 step 12, AC-0002-92).
2. **Card** (`fields/field-card/field-card.tsx`).
   - New props: `wide`, `saving` and `onChange`.
   - When `wide && !selected`, it renders the title and, while help text is ON, the description as inline inputs.
     The title input's name is `forms.fields.inlineLabel` and its placeholder is the type name (Q20). The help-text
     input's name is `forms.fields.inlineHelpText` and its placeholder is `forms.fields.descriptionPlaceholder`.
     `<name>` in both names is the label, or the type name while the label is empty.
   - The title's `onChange` goes through `withLabel`, so the label check of §4.3 runs on each change, Escape
     included (AC-0002-88). The help text's `onChange` sets `helpText`.
   - The selected card and every card on a narrow screen keep the current text title and help text (Decisions 1).
   - Each input's `invalid` is its own slot's error (`errors.label` for the title, `errors.helpText` for the help
     text). Its `describedBy` is the card error's id only while that own error is set, so a valid input is never
     described by another slot's message, such as the options error of AC-0002-76.
   - DOM order is the cover button, then the title input, then the help-text input. That gives the Tab order of
     Q21 without any `tabIndex` (AC-0002-85).
   - A press in the inputs starts no drag, because `pressOnCard` in `field-reorder.tsx` already ignores inputs
     (`isCardControl`, AC-0002-86). No change there.
3. **List** (`fields/field-list.tsx`). It passes `wide`, `saving={disabled}` and `onChange={(next) => setRow(index,
   next)}` to each card. Its state, the reveal and focus rules are unchanged. A label error still opens the panel on
   the panel's input (§4.6 step 8, AC-0002-65 unchanged).
4. **i18n**: two new keys in `forms.fields`.

   | Key | pt-BR | en-US |
   | --- | --- | --- |
   | `inlineLabel` | Rótulo de {name} | Label for {name} |
   | `inlineHelpText` | Texto de ajuda de {name} | Help text for {name} |

   Then run `pnpm --filter @planici/i18n build`.

#### Tests

All in W-fld (`apps/web/tests/form-fields.test.tsx`).

New helpers. Each one emulates what a browser does, because jsdom does not:
- `inlineTitle(card)` and `inlineHelp(card)` find the card's inputs by their names (`forms.fields.inlineLabel` and
  `forms.fields.inlineHelpText`), with `{ hidden: true }`, because a modal panel hides the page from assistive
  technology (AC-0002-87, -92).
- `clickInput(input)` sends `pointerdown` and `mousedown`, focuses the input unless `mousedown` was cancelled, then
  sends `mouseup` and `click`.
- `pressEnterIn(input)` sends `keydown` Enter and, unless it was cancelled, appends a line break with
  `fireEvent.change`, as a browser does in a textarea. A missed cancel then shows up as a line break in the value.
- Typing is `fireEvent.change`, as in the existing tests.

| AC | Test |
| --- | --- |
| AC-0002-59 | renamed "AC-0002-59 clicking a card outside its title and help-text inputs opens Configurações do campo with label, description and the six items in order"; it already clicks the cover button |
| AC-0002-77 | "AC-0002-77 clicking an idle card's title edits it in place without selecting the card" |
| AC-0002-78 | "AC-0002-78 clicking an idle card's help text edits it in place without selecting the card" |
| AC-0002-79 | "AC-0002-79 Enter in a card's title input keeps the text, sends nothing and keeps focus" |
| AC-0002-80 | "AC-0002-80 a label edited on the card is sent on Salvar" |
| AC-0002-81 | "AC-0002-81 Escape in a card's title input restores the text and keeps focus" |
| AC-0002-82 | "AC-0002-82 a new card closed with Escape shows an empty help-text input with the description placeholder" |
| AC-0002-83 | "AC-0002-83 a new card closed with Escape shows an empty title input with the type name as placeholder" |
| AC-0002-84 | "AC-0002-84 a field without help text shows a title input and no help-text input on its card" |
| AC-0002-85 | "AC-0002-85 Tab from a card moves to its title input without selecting it" (jsdom does not move focus on Tab, so the test checks that the title input is the next tab stop after the cover button in document order, as AC-0002-55 does) |
| AC-0002-86 | "AC-0002-86 a mouse drag that starts in a card's title input does not move the card" |
| AC-0002-87 | "AC-0002-87 with a panel open, clicking another card's title only closes the panel" (`clickOutside()`, because the backdrop covers the title) |
| AC-0002-88 | "AC-0002-88 a protected term typed in a card's title locks Dado protegido in its panel" |
| AC-0002-89 | "AC-0002-89 on a narrow screen, tapping a card's title opens its sheet and the card has no inputs" |
| AC-0002-90 | "AC-0002-90 Escape in a card's title input, then Salvar, sends the original label" |
| AC-0002-91 | "AC-0002-91 a card's inputs are named Rótulo de Objetivo and Texto de ajuda de Objetivo" |
| AC-0002-92 | "AC-0002-92 an idle card with a label error marks its title input invalid, described by the message" |
| AC-0002-93 | "AC-0002-93 help text edited on the card is sent on Salvar" |
| AC-0002-94 | "AC-0002-94 while saving, a card's title input is read-only" (the preview request gets `never`) |

Every other W-fld test is re-run with no assertion changed. Inline inputs are named "Rótulo de …" and "Texto de
ajuda de …", so the existing queries for the panel's "Rótulo" and "Texto de ajuda" textboxes, which match names
exactly, do not find them.

#### Deferred checks

No AC is deferred to another spec. The deferred checks of the plans below are unchanged. Three ACs are only partly
checked in jsdom, and a manual check below finishes each:
- **AC-0002-79** (Enter keeps the text and sends nothing): the test emulates the line break a browser types when
  Enter is not cancelled. Manual check 2 confirms it in a browser.
- **AC-0002-85** (Tab from the card to its title): the test checks document order only, because jsdom does not move
  focus on Tab. Manual check 6 confirms the order.
- **AC-0002-87** (a click on another card's title only closes the panel): the test clicks the backdrop, the same
  action as the AC-0002-58 test, so "the title input does not have focus" holds without a real hit-test. Manual
  check 4 confirms it.

`/done` reports these three as verified by test plus manual check.

**Manual checks on a running system** (owner, before `status: Implemented`; jsdom cannot check them):
1. On a wide screen, a click on the title text edits it, and a click beside it, on the same row, opens the panel. Do
   this in Chrome, Safari and Firefox, because the input's width depends on `field-sizing` (Risks 2).
2. Enter in a card's title or help-text input adds no line break, sends no request (browser network tab), and the
   page does not reload.
3. A focused title or help-text input shows a visible focus ring.
4. With a panel open, hovering another card's title shows no text cursor or hover effect, and a click only closes
   the panel.
5. Below 1024 px, cards show no inputs, and a tap on the title opens the sheet.
6. With no panel open, Tab goes from a card to its title input, then to its help-text input, then to the next card,
   and Shift+Tab goes back the same way (Q21).
7. Still open from the earlier plans: modal panel manual checks 1–5.

#### Sequence

0. **Owner commits the spec changes of v1.19–v1.21** (docs only) before `/implement`, so the lock's base commit
   holds the approved spec. The spec file is in scope, so this step is optional.
1. **i18n**: the two keys (Web 4), then `pnpm --filter @planici/i18n build`. First, so that the failing tests fail for
   the missing behavior and not for missing copy.
2. **Failing tests.** The `test-author` subagent adds the helpers and the tests in the table, and renames AC-0002-59.
   Each new test must fail for the missing behavior.
3. **Inline text box, card and list**, in one step so that typecheck passes at its end (Web 1–3).
4. **Checks**: `pnpm --filter web lint`, `typecheck` and `test`, and `pnpm --filter @planici/emails typecheck`. The
   API is unchanged.
5. `/review`, then `/done`, with the manual checks listed for the owner.

#### Decisions this plan makes

1. **The selected card shows text, not inputs.** §4.6 step 12 puts inputs on idle cards. The selected card sits
   behind the backdrop, and its panel edits the same text.
2. **An inline input has no error line of its own.** It is described by the message under the card title, as
   §4.6 step 12 says, so the message is not shown twice.
3. **Escape goes through the same update as typing**, so the restored label re-runs the label check (§4.6 step 12).
   Under R6, a lock that typing added is released, and the switch stays ON.
4. **en-US copy**: "Label for {name}" and "Help text for {name}". pt-BR is the spec's.
5. **The focus ring is added to the inline inputs only.** The panel's inputs keep their look. Whether the panel's
   inputs also need a ring is left as a follow-up.
6. **An auto-growing textarea, not a one-line input** (owner, 2026-11-17, from the plan review). R2 allows 80
   characters of label and 200 of help text, and the card's text wraps today. A textarea wraps the same way, so the
   card looks the same while it is edited. A short title is only as wide as its text, so a click beside it opens
   the panel. A title long enough to wrap fills its row, as the text does now, so there is less room beside it, and
   the area below the text and the answer preview still open the panel. A one-line input would have kept room
   beside any title, but long text would be clipped and scroll sideways.

#### Risks

1. **Layering of the card.** The content layer has `pointer-events-none`, and the inputs must opt back in. If
   another element in that layer catches clicks, the cover button never gets them. jsdom cannot see this. Cheapest
   early check: after Sequence step 3, click the title, beside it and the answer preview in the dev server.
2. **`field-sizing: content` support.** Browsers without it draw the textarea at its default size, one row at its
   default width, so a click beside a short title would edit it instead of opening the panel, and long text would
   scroll inside one row instead of wrapping. Manual check 1 covers this. The fallback, if needed, is to size the
   textarea to its text, which is a follow-up and not in this plan.
3. **Enter in a textarea.** A missed `preventDefault` on Enter would type a line break into the label. AC-0002-79
   emulates the browser's line break, so a missed cancel fails the test. The change handler also turns line breaks
   into spaces, as a second guard.
4. **Test churn.** The cards gain textboxes on wide screens, so a query for any textbox without a name could start
   matching them. The failing-tests step reports any existing test that changes, and no assertion may change.

#### New dependencies

None.

### Modal panel amendment (v1.14)

Drafted by `/plan` on 2026-11-17 for the v1.12–v1.13 amendment, approved in v1.14 (§4.1 step 2, §4.4 steps 1–3,
§4.6, §8, Q14, Q18, Q19; AC-0002-21, -54, -57 to -60, -62, -65, -70 amended; AC-0002-71 to -76 added).
**Approved by the owner on 2026-11-17.** Revised after the plan review, with the owner's picks of
2026-11-17. Only the editor's field list and the popover primitive change.
Contracts, database and API stay as they are. It builds on the field-card amendment below (implemented, not yet
committed), whose structure it keeps: cards, `field-settings.tsx`, `field-reorder.tsx` (dnd-kit) and the cover
button.

#### Scope

`task-lock.sh` reads the first `scope` block of the file, so this block is the lock while this amendment is
implemented.

```scope
apps/web/src/app/*/orgs/*/forms/_components/fields/*
apps/web/src/components/ui/popover.tsx
apps/web/tests/form-fields*
packages/i18n/messages/pt-BR.json
packages/i18n/messages/en-US.json
docs/specs/SPEC-0002-campos-de-formulario.md
```

`form-editor.tsx` is not in scope: the `reveal` it passes to the list keeps its shape, and [Salvar] needs no change,
because the panel's backdrop covers it. `sheet.tsx` is not in scope (Web 2). The test helpers live in
`form-fields.test.tsx`, so `forms-harness.tsx` and `tests/setup.ts` are not in scope either. The SPEC-0001 tests are
not in scope, and they must still pass.

#### Contracts

None. No schema, no error key, nothing breaking.

#### Persistence

None.

#### API

None. The only `packages/` change is removing `forms.fields.menu` from the i18n messages. A grep on 2026-11-17 found
it only in `field-card.tsx` and W-fld, and not in `@planici/emails`, the package through which the API uses i18n.
Sequence step 5 still runs `pnpm --filter @planici/emails typecheck`, because it is cheap. The API checks are not
rerun.

#### Web

1. **Popover primitive** (`src/components/ui/popover.tsx`).
   - `Popover.Root` gets `modal`. base-ui then hides the rest of the page from assistive technology
     (`aria-hidden`), locks page scroll (Q19) and keeps Tab inside the popup, because the popup holds a
     `Popover.Close` (the ✕).
   - A transparent `Popover.Backdrop`, `fixed inset-0 z-40`, is rendered before the positioner. Its `onClick` calls
     `onClose`. It sits above the page's own layers (app header and sidebar), so hover effects, clicks and drag
     presses land on it (§4.6 step 10).
   - `onOpenChange` keeps ignoring `outside-press` and `focus-out`, and still closes on `escape-key` and
     `close-press`. base-ui closes on a touch *press* outside (`sloppy`). The backdrop would then vanish before the
     tap's click, which would land on the card underneath. Closing on the backdrop's `click` keeps the whole press on
     the backdrop, so nothing under it reacts (§4.6 step 5).
   - The popup gets `max-h-(--available-height)` and `overflow-y-auto`, so a panel taller than the screen scrolls on
     its own while the page cannot (Q19).
   - The ✕ (`Popover.Close`) moves after `children` in the DOM, and stays in the top-right corner by absolute
     positioning. The label input is then the panel's first control, as in the sheet (AC-0002-55, -72), and Tab
     reaches ✕ last (Decisions 6).
2. **Sheet primitive**: no change. Its `Drawer.Viewport` (`fixed inset-0`) sits above its backdrop, so a real tap
   outside the sheet lands on the viewport, which base-ui counts as an outside press. With a backdrop, base-ui's
   drawer closes on the click, not the press (`useDialogRoot`), so the ghost-click guard of Web 1 is not needed
   here. `onOpenChange(false)` keeps calling `onClose`, which now deselects the card (Web 5).
3. **Card** (`fields/field-card/field-card.tsx`): display only, on every screen (§4.6 step 2).
   - Removed: the editing branch (`FieldTextInputs` and the options editor on the card), the "⋯" button, and the
     props `panelOpen`, `wide`, `settingsRef`, `onSelect`, `onToggleSettings` and `onChange`.
   - The `<li>` loses `onFocus`, because focus no longer selects (§4.6 step 1). It keeps its name, `aria-invalid`,
     `aria-current` and the highlight while `selected`.
   - The cover button is always the card's tab stop (`tabIndex=0`). It gets `aria-haspopup="dialog"`,
     `aria-expanded={selected}` and `aria-controls` while its panel is open. A click, or Enter or Space through the
     native button, calls `onActivate`. It keeps the cancelled `mousedown` and focus-on-click (§4.4 step 3).
   - Under the title: the first message, while the card's panel is closed. While it is open, the panel shows the
     messages under their controls, and a message with no control stays under the title.
   - The type-change warning stays on the card (§4.6 step 2), with no id: it only displays. The panel's warning keeps
     `${baseId}-warning`, which "Tipo" references in `aria-describedby`, so the two never share an id. The answer
     preview is always shown.
4. **Panel content** (`fields/field-settings.tsx`). The `narrow` prop goes: the label and description inputs, and
   the options editor for `select`, are always at the top (§4.6 step 4). The type-change warning is always under
   "Tipo". Ids lose the `-sheet` prefix. The remove dialog is rendered inside this component (Decisions 4).
5. **List state** (`fields/field-list.tsx`).
   - `selected` and `panelOpen` merge into `open: string | null`, the row key of the card whose panel is open
     (§4.6 step 3). `showPanel` is `open !== null` with a field at that key.
   - `openCard(key, focus)` scrolls the card into view with `scrollIntoView({ block: "nearest" })` when the browser
     has it (jsdom does not), then sets `open` (§4.6 step 3, Q19). Click, tap, Enter, Space, a held touch tap, [Novo
     campo] and a reveal all go through it.
   - Removed: `select`, `toggleSettings`, `settingsRef` and `closedByUser`. `finalFocus` is the closed card's cover
     button, on every close (§4.6 step 5), or `false` after a removal.
   - `initialFocus`: the label input on every screen, both on open and for a new field (AC-0002-54, -55). For a
     reveal, the invalid control.
   - Reveal (§4.6 steps 8 and 9): a slot with a control opens the panel on every screen, with focus on the slot. A
     slot with no control sets `open` to `null`, shows the toast on narrow screens, and focuses the card's cover
     button.
   - Remove (§4.6 step 11):
     - `requestRemove` no longer closes the panel before the dialog.
     - With no answers: `remove`, `open = null`, then focus on the next card, or the previous one.
     - With answers: the dialog opens over the panel. Confirm removes as above. Cancel and Escape close only the
       dialog, and focus returns to "Remover" (base-ui's default `finalFocus`).
   - `FieldReorder` gets `disabled={disabled || open !== null}` (§4.4 step 2, AC-0002-71).
   - `pendingFocus` only targets the panel or a cover button, never an input on the card.
6. **i18n**: `forms.fields.menu` is removed from pt-BR and en-US, because it was the "⋯" button's name. No key is
   added.

#### Tests

All in W-fld (`apps/web/tests/form-fields.test.tsx`).

The helpers change first. Each change emulates what a browser does, so that no assertion is weakened:
- `openSettings(card)` clicks the cover button and waits for the dialog.
- `selectCard` and `settingsButton` go.
- `labelInput` reads the panel's input.
- `pressEnter(el)` sends `keydown` and then `click`, because jsdom does not click a button on Enter.
- `clickOutside()` sends a full press (`pointerdown`, `mousedown`, `pointerup`, `mouseup`, `click`). On wide screens
  it goes to the popover's backdrop. On narrow screens it goes to the sheet's viewport, outside the popup, where a
  real tap lands. jsdom has no hit-testing, so a click "on a card" with a panel open is a click on what covers the
  card.
- Queries for page elements while a panel is open pass `{ hidden: true }`.

| AC | Test |
| --- | --- |
| AC-0002-21 | "AC-0002-21 Tab to a system card, Enter opens its panel, Mover offers up and down, no Remover" |
| AC-0002-54 | "AC-0002-54 Novo campo on a wide screen opens the new card's panel with help text ON and focus on its label" |
| AC-0002-55 | unchanged, re-run |
| AC-0002-56 | unchanged, re-run |
| AC-0002-57 | "AC-0002-57 a published field without help text opens its panel with help text OFF and no description input" |
| AC-0002-58 | "AC-0002-58 clicking outside an open panel over another card only closes the panel" |
| AC-0002-59 | "AC-0002-59 clicking a card opens Configurações do campo with label, description and the six items in order" |
| AC-0002-60 | "AC-0002-60 Escape closes the panel, deselects the card and returns focus to it" |
| AC-0002-61, -63, -64 | unchanged, re-run (no panel open) |
| AC-0002-62 | "AC-0002-62 a mouse drag that starts in the panel's label input does not move the card" |
| AC-0002-65 | "AC-0002-65 a label error on a wide screen opens that card's panel with the message and focus on its label input" |
| AC-0002-66, -67, -69 | unchanged wording, re-run against the new helpers |
| AC-0002-70 | "AC-0002-70 an error with no control on a narrow screen shows an error toast and focuses the card, unselected, no sheet" |
| AC-0002-71 | "AC-0002-71 with a panel open, dragging another card does not reorder" |
| AC-0002-72 | "AC-0002-72 Tab from the panel's last control (✕) moves to its label input" (Risks 5) |
| AC-0002-73 | "AC-0002-73 clicking [Salvar] while a panel is open sends nothing and only closes the panel" |
| AC-0002-74 | "AC-0002-74 tapping outside the sheet closes it and deselects the card" |
| AC-0002-75 | "AC-0002-75 Tab to a card neither opens its panel nor selects it" |
| AC-0002-76 | "AC-0002-76 an error with no control on a wide screen shows under the card title, card focused and unselected, no panel" |
| §4.6 step 11 | "§4.6 step 11 removing a field without answers from its panel focuses the next card" |
| §4.6 step 11 | "§4.6 step 11 cancelling the remove dialog keeps the panel open with focus on Remover" |
| §4.6 step 10 | "§4.6 step 10 the leave prompt responds while a panel is open" |
| §4.4 step 3 | the existing "§4.4 a mouse drag neither selects nor focuses the dragged card", re-run |

Every other W-fld test (AC-0002-01 to -53, §7 and §8) is re-run against the new helpers, with no assertion changed.

#### Deferred checks

None for SPEC-0004. The deferred checks of the plans below are unchanged.

**Manual checks on a running system** (owner, before `status: Implemented`; jsdom cannot check them):
1. With a panel open, the backdrop covers the whole page, header and sidebar included. Nothing shows hover, and a
   click on a card or on [Salvar] only closes the panel.
2. On a phone, tapping outside the sheet only closes it: the card underneath does not open again.
3. [Novo campo] with the list below the screen, and a first error on an off-screen card: the page scrolls to the
   card before its panel opens.
4. A panel taller than the screen scrolls on its own, and the page does not scroll.
5. Still open from v1.10: popover placement between 1024 and about 1280 px, and a phone swipe versus a 300 ms hold.

#### Sequence

0. **Owner commits the field-card amendment** (v1.10–v1.11, still uncommitted) before `/implement`. The lock
   records HEAD when it starts. Many of that work's files are outside this scope: `form-editor.tsx`, `_lib/draft.ts`,
   `ui/menu|select|switch.tsx`, `hooks/use-media-query.ts`, `apps/web/package.json`, `pnpm-lock.yaml`,
   `styles/tokens/*.css` and the E-fld file. Left uncommitted, `task-lock.sh check` would report them at `/done`.
   This is P9 of the earlier plan review.
1. **Failing tests.** The `test-author` subagent rewrites the W-fld helpers and writes or updates the tests in the
   table. Each new or amended test must fail for the missing behavior.
2. **Popover primitive**: `popover.tsx` (Web 1). Run W-fld: AC-0002-58 and -73 should now pass, or fail only on
   selection.
3. **Card, panel content and list state**, in one step so that typecheck passes at its end: `field-card.tsx`,
   `field-settings.tsx` and `field-list.tsx` (Web 3, 4, 5), including the remove flow and the disabled drag.
4. **i18n**: remove `forms.fields.menu` (Web 6), then `pnpm --filter @planici/i18n build`.
5. **Checks**: `pnpm --filter web lint`, `typecheck` and `test`, and `pnpm --filter @planici/emails typecheck`. The
   API is unchanged.
6. `/review`, then `/done`, with the manual checks listed for the owner.

#### Decisions this plan makes

1. **Focus on open** is the label input on every screen, also when opening by click. Before, wide screens focused
   "Obrigatório". The label is now the panel's first field, and AC-0002-55 already asks for it on narrow screens.
2. **The backdrop is transparent**, without dimming. The spec asks for no visual change to the page, and the sheet
   keeps its existing dimmed backdrop.
3. **A message under the title** shows on every card whose panel is closed, on narrow screens too. For the first
   no-control error on a narrow screen, the toast comes on top of it. §8 reads "under the title on wide screens or
   into an error toast on narrow screens". This plan reads that as where the first message goes, not as hiding it
   from the card. Confirmed by the owner, 2026-11-17.
4. **The remove dialog is rendered inside the panel's React tree**, so base-ui treats it as a nested popup of the
   modal popover (Risks 2).
5. **No keyboard shortcut** opens a panel except Enter and Space on the focused card.
6. **The popover's ✕ is reached last with Tab**, while it stays in the top-right corner. The label input is the
   first control on every screen, as in the sheet, whose "Fechar" button is already last (owner, 2026-11-17, from
   the plan review).

#### Risks

1. **No hit-testing in jsdom.** Tests click the backdrop directly, so the claim that it covers everything is only
   checked by hand (manual check 1). Cheapest early check: after Sequence step 2, open a panel in the dev server
   and click the header, a card and [Salvar].
2. **Nested modals.** The remove dialog and SPEC-0001's leave prompt open while the modal popover is open, and its
   focus trap or `aria-hidden` could block them. Decisions 4 nests the remove dialog. The leave prompt lives in
   `form-editor.tsx`, outside the list. If the "§4.6 step 10 the leave prompt responds" test fails after step 2,
   stop and ask the owner before widening the scope to `form-editor.tsx`.
3. **Ghost clicks on touch.** On the popover, closing on the backdrop's `click` instead of base-ui's outside press is
   the guard. On the sheet, base-ui's drawer already closes on the click. Manual check 2 confirms it on a phone.
4. **Test churn.** Most W-fld helpers change. The guard is that no assertion changes except in the amended ACs, and
   the diff of `form-fields.test.tsx` is reviewed with that in mind.
5. **Tab inside the panel (AC-0002-72).** jsdom does not move focus on Tab, and `@testing-library/user-event` is
   not installed. The test focuses base-ui's trailing focus guard, which is where Tab from the last control lands,
   and checks that focus moves to the label input. That relies on a base-ui detail. The owner chose this over adding
   `@testing-library/user-event`, 2026-11-17.
6. **`scrollIntoView` in jsdom.** It is missing, so it is called only when present and has no automated check
   (manual check 3).

#### New dependencies

None. The owner chose not to add `@testing-library/user-event` (Risks 5).

#### Plan review follow-ups (not taken; the owner picks)

From the plan review of 2026-11-17. None blocks the plan.
1. `openSettings` checks that no panel is open, or closes it, before clicking a cover button.
2. §4.6 step 11: an Escape case in the cancel test.
3. Sequence 1: list the tests expected to pass from the start (AC-0002-62 probably does).
4. A `vi.fn` spy on `scrollIntoView` for AC-0002-54 and -65.
5. Deferred checks: "None for SPEC-0004" reads "No new deferred checks".
6. Decisions 2: §4.6 step 10 rules out hover effects; it does not ask for "no visual change".
7. The backdrop and the sidebar are both `z-40`; the backdrop is on top only because it comes later in the page.

### Field-card amendment (v1.7)

Drafted by `/plan` on 2026-11-16 for the v1.5–v1.8 amendment (§4.1, §4.4, §4.6, §7 `helpText`, §8, AC-0002-21 and
AC-0002-54 to -70). Revised the same day after the plan review (5 required changes). **Approved by the owner on
2026-11-17.** Only the editor's field list changes. The
contracts, the database and the API endpoints stay as they are. The original plan (v1.2, implemented in v1.3)
follows under "Original plan". Where it describes rows, the drag handle or the row menu, this amendment replaces it.

#### Scope

This was the lock while the field-card amendment was implemented; the modal panel amendment's block above now
comes first. The original plan's block is now
fenced as `text`.

```scope
packages/i18n/messages/pt-BR.json
packages/i18n/messages/en-US.json
apps/web/src/app/*/orgs/*/forms/_components/fields/*
apps/web/src/app/*/orgs/*/forms/_components/form-editor*
apps/web/src/app/*/orgs/*/forms/_lib/draft.ts
apps/web/src/components/ui/select.tsx
apps/web/src/components/ui/menu.tsx
apps/web/src/components/ui/switch.tsx
apps/web/src/components/ui/popover.tsx
apps/web/src/components/ui/sheet.tsx
apps/web/src/hooks/use-media-query.ts
apps/web/tests/form-fields*
apps/web/tests/forms-harness.tsx
apps/web/tests/setup.ts
apps/api/test/e2e/form-fields*
```

`tests/setup.ts` gets a `matchMedia` stub, because jsdom has none. `forms-harness.tsx` gets the screen-width and
layout helpers the new tests share. The SPEC-0001 tests (`form-editor`, `form-dialogs`, `forms-list`) are not in
the lock. If one fails, it goes to the owner as a conflict, not to an edit (original Risks 8).
`components/ui/toast.tsx` is used as it is, and is not edited.

#### Contracts

None. No schema, request or response shape changes, and no error key is added. §7's `helpText` rule describes what
`FieldPolicy` already does (`field-policy.ts`: omitted keeps the stored text, `null` clears it).

i18n, both locales (`forms.fields.*`; en-US is **proposed**):

| Key | pt-BR | en-US | Source |
| --- | --- | --- | --- |
| `panelTitle` | Configurações do campo | Field settings | §4.6, Q13 |
| `menu` (copy changes) | Configurações do campo (accessible name of "⋯"; was "Mais ações do campo") | Field settings | §4.6 step 3 |
| `descriptionPlaceholder` | Adicionar descrição | Add description | §4.6 step 3 |
| `answerPreview` | Resposta | Answer | §4.6 step 2, Q16 |
| `previewYes` / `previewNo` | Sim / Não | Yes / No | Q16 |
| `move` | Mover | Move | §4.6 step 4 |
| `close` | Fechar | Close | §4.6 step 5 |
| `sensitiveInfo` | Sobre dado protegido (accessible name of the info icon) | About protected data | §4.6 step 4 |
| `dragHandle` | removed: there is no handle | — | §4.4 |

The switch keeps `helpText` ("Texto de ajuda") as its label, and that is also the description input's accessible
name. The card's label input keeps `label` ("Rótulo") as its accessible name.

#### Persistence

None.

#### API

No change. AC-0002-68 gets an E-fld test for behavior that already exists, so it is expected to pass from the
start.

#### Web

All files are under `forms/_components/fields/` unless named otherwise.

1. **Screen width.** New `src/hooks/use-media-query.ts`, built on `useSyncExternalStore` over `matchMedia`. It
   reports wide when `matchMedia` is missing (jsdom, older browsers). `useWideScreen()` is
   `(min-width: 1024px)` (Q15).
2. **Primitives** (`src/components/ui/`):
   - New `popover.tsx`, on base-ui Popover: controlled `open`, non-modal, anchored to an element, `side="right"`,
     `align="start"`, and the default collision handling. It has an `initialFocus` pass-through and an
     `onOpenChange(open, reason, event)` callback, so the caller can ignore some outside presses.
   - New `sheet.tsx`, on base-ui Drawer: a bottom sheet that is modal and closes on swipe down, Escape or its close
     button. It takes a `title` and an `initialFocus` ref.
   - `select.tsx` and `menu.tsx` get a `row` look: a full-width trigger with the label on the left, then the value
     and a chevron. The current look stays the default.
   - `switch.tsx`: locked switches use `readOnly` with `aria-disabled="true"` instead of `disabled` (Decisions 2),
     with the same dimmed style.
3. **Cards** (`field-card.tsx` replaces `field-row.tsx`).
   - The `<li>` is the card. Its accessible name is the label, or the type name when the label is empty. It has
     `aria-invalid` while it has errors, and `tabIndex=-1`, so a script can focus it.
   - A button with the same name covers the card (`data-card-activate`); it replaced the `<li>` as the tab stop in
     v1.11 (owner, 2026-11-17). It is the idle card's tab stop (`tabIndex=0`, `-1` once selected) and the target of
     a click or tap. It is described by the first error under the title. Inputs and "⋯" sit above it. Focus inside
     the card or a click selects the card. Pressing the cover button does not focus it (its `mousedown` is
     cancelled), because the press may become a drag (§4.4 step 3). The click focuses it, and dnd-kit drops the
     click that follows a drag.
   - Idle content: title, help text when there is one, the type-change warning when the field's type was changed
     (§4.2 step 4, §8), the answer preview, the "Sistema" badge, and the first error message under the title when
     the card has errors.
   - Selected content on wide screens: the label input styled as a title, the description input while help text is
     on, the type-change warning, the answer preview (the options editor for `select`), and inline errors.
   - Narrow screens: always the idle content, type-change warning included, plus the "⋯" button and the highlight
     when selected.
   - The border shows the state: idle; selected; panel open (stronger); error (danger).
   - No animation (owner, 2026-11-16: motion comes later, app-wide).
4. **Answer preview.** New `field-answer-preview.tsx`, `aria-hidden`: a one-line box with "Resposta", a taller box
   for `long_text`, "Sim" and "Não" for `yes_no`, and the option labels for `select` (Q16).
5. **Settings.** New `field-settings.tsx`.
   - The panel content in §4.6 step 4's order:
     - "Obrigatório";
     - "Texto de ajuda";
     - "Dado protegido", with the info icon (`Tooltip`, text `sensitiveHelp`, also linked by
       `aria-describedby` as today);
     - "Tipo": the type select, `row` look;
     - "Mover": a menu with "Mover para cima" and "Mover para baixo", `row` look;
     - "Remover", with danger text.
   - The same locks and hiding rules as the row: `sensitiveLockOf`, `requiredLocked`, system fields.
   - Wide screens: inside `popover.tsx`, anchored to the selected card. It ignores an outside press or a focus-out
     that lands inside the selected card. Selecting another card closes it (Q14).
   - Narrow screens: inside `sheet.tsx`, with the label input, the description input and the options editor above
     the settings (Q18). The type-change warning sits under "Tipo", which is where the type changes on narrow
     screens.
   - `field-row-menu.tsx` is deleted.
6. **Selection** (`field-list.tsx`): `selected` (a row key or none) and `panelOpen`. Nothing is selected on load,
   and a click on empty space keeps the selection (Decisions 7).
   - [Novo campo] selects the new row and opens its panel.
     - Wide: focus goes to the card's label input, and the popover opens without moving focus.
     - Narrow: the sheet opens with focus on its label input.
   - "⋯" toggles the panel (`aria-expanded`, `aria-controls`). Opening it from "⋯" moves focus to the first panel
     control, and closing it (✕, Escape) returns focus to "⋯".
   - After "Mover para cima" / "Mover para baixo", the card stays selected and focus returns to "Mover". After
     "Remover", focus goes to the next card, else the previous one, else [Novo campo].
7. **Help-text switch** (§4.6 step 7), kept in the draft with no extra state:
   - `helpText: ""` means ON and empty, and `null` means OFF.
   - `newField()` starts with `""`. A loaded field is ON when its help text is not empty.
   - OFF sets `null`; ON sets `""` when it was `null`.
   - `_lib/draft.ts` `toRequestFields` sends `""` as `null` (§7: the editor sends an empty description as `null`).
8. **Drag** (`field-reorder.tsx`, with dnd-kit since v1.11; it replaced the hand-written `use-field-reorder.ts`,
   owner, 2026-11-17).
   - `FieldReorder` wraps the list in a dnd-kit `DndContext` and `SortableContext` (vertical list strategy,
     closest-center collision, vertical-only movement). Each card calls `useSortableCard`, a `useSortable` with no
     transition.
   - Two sensors start the drag from the card. A press on a card control (`CARD_CONTROLS`) is ignored (§4.4 step 2).
     - Mouse and pen (`PointerSensor`): the drag starts after 4 px of movement.
     - Touch (`TouchSensor`): the drag starts after 300 ms held within 8 px. A move before then cancels it, and the
       card has `touch-action: pan-y` so the page scrolls. Once the drag has started, dnd-kit cancels `touchmove`,
       suppresses the context menu, and stops the click that follows the drop.
   - While dragging, the other cards shift (CSS transforms) and the page auto-scrolls near the edges (§4.4 step 1).
     The draft order changes on drop, through the field array's `move`. Dragging is off while saving.
   - A held touch released without passing over another card counts as a tap (§4.6 step 6). On narrow screens, a
     click or tap selects the card and opens the sheet.
   - No screen-reader announcements or drag instructions. There is no keyboard sensor: keyboard users use "Mover"
     (RNF-18).
9. **First error** (§4.6 step 8).
   - `form-editor.tsx` `showFieldError` stops focusing by DOM query. It records the first field target of the save:
     `fieldErrorTarget`, then index and slot. It passes that to `FieldList` as `reveal` with a counter.
   - `FieldList` selects the card.
     - Panel slots (`required`, `sensitive`, `type`): the panel opens on wide screens.
     - Narrow screens: the sheet opens for any slot that has a control.
   - Focus then moves to the control marked `data-error-slot`.
   - Slots with no control (§4.6 step 9) are `top`, which covers `id`, `systemKey` and `fields.<i>`, and `options`
     on a type other than `select`. `fieldSensitive.not-allowed` on a system field is in this group too, because a
     system field has no "Dado protegido" switch.
     - Wide screens: the message goes under the card title and the card takes focus.
     - Narrow screens: `useToast().show(message, "danger")` (sonner, `components/ui/toast.tsx`); the card is selected
       and takes focus, and no sheet opens (Decisions 3).

#### Tests

W-fld is `apps/web/tests/form-fields.test.tsx`; E-fld is `apps/api/test/e2e/form-fields.e2e-spec.ts`. The existing
W-fld helpers move to cards:
- `rowOf` becomes `cardOf`;
- `openMenuByKeyboard` becomes `openSettingsByKeyboard`;
- `moveUp` opens "Mover";
- switch and type queries open the panel first.

The existing tests for AC-0002-01, -10, -14, -22, -25, -48, -49, -50, -53, "§7" and "§8" keep their assertions. Only
their queries change, and AC-0002-50 checks `aria-disabled` instead of `disabled`. Wide is the default
(`setup.ts`); narrow tests call a harness helper that sets `matchMedia` to below 1024 px. Drag tests stub the
cards' `getBoundingClientRect`, and touch tests use fake timers.

| AC | Test | Name |
| --- | --- | --- |
| AC-0002-21 | W-fld | "AC-0002-21 tabbing to an idle system card and opening Mover by keyboard offers move up and move down, no Remover" (replaces the row-menu test) |
| AC-0002-54 | W-fld | "AC-0002-54 Novo campo on a wide screen selects the new card, opens its panel, help text ON, focus on its label" |
| AC-0002-55 | W-fld | "AC-0002-55 Novo campo on a narrow screen opens the sheet with focus on its label input" |
| AC-0002-56 | W-fld | "AC-0002-56 turning help text OFF on a published field sends helpText null" |
| AC-0002-57 | W-fld | "AC-0002-57 a published field without help text opens with help text OFF and no description input" |
| AC-0002-58 | W-fld | "AC-0002-58 clicking another card selects it and closes the open panel" |
| AC-0002-59 | W-fld | "AC-0002-59 the ⋯ button opens Configurações do campo with its six items in order" |
| AC-0002-60 | W-fld | "AC-0002-60 Escape from a panel control closes the panel and returns focus to ⋯" |
| AC-0002-61 | W-fld | "AC-0002-61 dragging card C above A with the mouse and publishing sends C, A, B" |
| AC-0002-62 | W-fld | "AC-0002-62 a mouse drag that starts in the label input does not move the card" |
| AC-0002-63 | W-fld | "AC-0002-63 holding card C for 300 ms on touch, dragging above A and publishing sends C, A, B" |
| AC-0002-64 | W-fld | "AC-0002-64 a touch that moves before 300 ms picks up no card" |
| AC-0002-65 | W-fld | "AC-0002-65 a label error on an idle card selects it with the message and focus on its label input" |
| AC-0002-66 | W-fld | "AC-0002-66 a label error on a narrow screen opens that card's sheet with focus on its label input" |
| AC-0002-67 | W-fld | "AC-0002-67 a server fieldRequired.locked opens the card's panel with the message and focus on Obrigatório" |
| AC-0002-68 | E-fld | "AC-0002-68 a save with helpText null clears the stored help text" |
| AC-0002-69 | W-fld | "AC-0002-69 tapping an idle card on a narrow screen selects it and opens its sheet" |
| AC-0002-70 | W-fld | "AC-0002-70 an error with no control on a narrow screen shows an error toast and focuses the card, no sheet" |

AC-0002-65 and -66 put an empty label on the card at index 4. Their Given names the card "Objetivo", so the test
clears its label before [Salvar] (re-check suggestion 2). AC-0002-57 and -59 run on a wide screen (suggestion 3).

**Deferred checks.** None from another spec. Two checks need the running app, so the owner does them before
Implemented:
- whether the panel sits beside the card or overlaps it between 1024 and about 1280 px;
- on a real phone, whether a quick swipe scrolls and a 300 ms hold picks up the card (AC-0002-63 and -64 in jsdom
  only see pointer events).

#### Sequence

1. i18n keys; `use-media-query`; `popover`, `sheet`, and the `row` looks of `select` and `menu`; `switch`
   `readOnly`. Checks: `pnpm --filter web lint` and `pnpm --filter web typecheck`.
2. Failing tests: the W-fld helpers move to cards and the new AC tests are added; E-fld AC-0002-68 is added (passes
   at once). Checks: `pnpm --filter web test` (the new W-fld tests fail) and
   `pnpm --filter api test:e2e -- form-fields` (needs Docker; if Docker is missing, say so and do not report it as
   passing). Also `pnpm --filter api lint` for the e2e file.
3. Cards, answer preview, settings panel on wide screens, selection, the help-text switch and `draft.ts`. AC-0002-21,
   -54 and -56 to -60 pass, along with the existing W-fld tests.
4. Drag rewrite: AC-0002-61 to -64.
5. First-error reveal on wide screens: AC-0002-65 and -67.
6. Narrow screens: the sheet and the error toast. AC-0002-55, -66, -69 and -70 pass.
7. Final checks, all from this turn's output:
   - `pnpm --filter web test`, `pnpm --filter web lint` and `pnpm --filter web typecheck`;
   - `pnpm --filter api test:e2e` (E-fld) and `pnpm --filter api test` (U-pol and U-terms). Together they re-verify
     AC-0002-01 to -53, which `/done` needs before the status goes back to Implemented. Docker is required, so a
     missing Docker is reported as unrun;
   - `pnpm --filter api lint`;
   - then `/review`.

#### Decisions this plan makes

Owner Joao Izidoro confirmed decisions 1–8 as written, 2026-11-16. The plan itself still needs the owner's approval.

1. **Panel primitives.** Wide screens: a base-ui Popover anchored to the card, non-modal, that flips or shifts when
   there is no room on the right. Narrow screens: a base-ui Drawer bottom sheet. Both are in base-ui 1.8.0, which
   is already installed.
2. **Locked switches keep focus.** They are `readOnly` + `aria-disabled` instead of `disabled`. AC-0002-67 needs focus
   on a locked "Obrigatório", and the lock tooltip is then reachable from the keyboard. Screen readers still hear
   them as unavailable, and they cannot be toggled.
3. **Errors with no control** (`id`, `systemKey`, `fields.<i>`, options on a type without options,
   `fieldSensitive.not-allowed` on a system field). Wide screens: the message goes under the card title and focus goes
   to the card (re-check suggestion 1). Narrow screens: an error toast (sonner), the card selected and focused, and
   no sheet. The owner changed this one on 2026-11-16, and spec §4.6 step 9 and AC-0002-70 record it.
4. **Help-text state lives in the draft** (`""` ON, `null` OFF), and the request sends `""` as `null`. The API never
   receives `""` from the editor (re-check suggestion 8).
5. **Idle card name.** It is the label, or the type name while the label is empty (re-check suggestion 6).
6. **Focus.** "⋯" moves focus into the panel. A new field keeps focus on its label. After "Mover", focus returns to
   "Mover". After "Remover", focus goes to the next card, the previous one, or [Novo campo] (re-check suggestion 11).
7. **No selection on load**, and a click on empty space keeps the selection.
8. **Thresholds.** A mouse drag starts at 4 px. A touch must stay within 8 px to count as held still.
9. **File changes.** `field-row.tsx` becomes `field-card.tsx`, and `field-row-menu.tsx` is deleted. Added:
   `field-settings.tsx`, `field-answer-preview.tsx`, `ui/popover.tsx`, `ui/sheet.tsx`, `hooks/use-media-query.ts`.

#### Risks

1. **Popover dismissal.** base-ui closes a popover on an outside press or a focus-out, and clicks in the selected
   card are outside it. Cheapest check, in step 1: a W-fld spike that clicks the label input with the panel open
   and asserts the panel stays open.
2. **base-ui Drawer in jsdom.** It is newer than Dialog, and swipe and animation hooks may need stubs. Same check
   in step 1: open and close a `sheet` in a test.
3. **Test churn.** Most W-fld queries change. Keeping every existing assertion unchanged is the guard, and the diff
   review checks it.
4. **Layout.** Between 1024 px and about 1280 px, with the app sidebar open, the popover may cover the card.
   Collision handling keeps it on screen, and the owner checks it on the running app.
5. **AC-0002-50 wording.** The AC says "disabled". With Decisions 2, the switch is announced as disabled
   (`aria-disabled`) but stays focusable. If the owner wants native `disabled`, AC-0002-67 must move to a control
   that can take focus. That would be a spec change.
6. **Re-check suggestions the owner did not take.** 4 (a held release is a tap) and 5 (click or tap) are
   implemented as §4.6 step 6 already reads, with no new AC. 7 (other cards' messages) and 9 (px vs rem) are left
   as written: the code uses `1024px`, and the second error card is not tested.
7. **Plan review suggestions not taken (follow-ups; the owner picks).** Each is cheap to take later, and none
   blocks:
   - P1, drag: ignore presses that come from outside the card through a portal. Also ignore `label`, `select`,
     `[role=option]` and `[role=menuitem]`.
   - P2: a `finalFocus` pass-through, so focus returns to "⋯" only on Escape or ✕.
   - P3: name the spike's file, and cover choosing from "Tipo" and "Mover" with the panel open.
   - P4: query dialogs by name, because the popover and the sheet are also `role="dialog"`.
   - P5: a loaded field's help text is `undefined`, which also means OFF; say where new system fields start.
   - P6: a width-only `matchMedia` stub, without `vi.stubGlobal`.
   - P7: ignore the click that follows a drag.
   - P8: jsdom limits (focus-only Tab, tests that pass vacuously before step 4, the AC-0002-65 setup,
     `aria-invalid` and `tabIndex` on cards).
   - P9: before `/implement`, name the AC list, keep the original Deferred checks, and land the working-tree
     changes.
   - P10: a separate name for the switch and the description input, px vs rem, devices for the phone check, and a
     `data-readonly` switch style.

#### New dependencies

None at first. Popover and Drawer come from `@base-ui/react` 1.8.0, which is installed. No animation library (owner,
2026-11-16).

Added in v1.11 (owner, 2026-11-17), as the library fallback named in Risks 5 of the original plan:
`@dnd-kit/core` 6.3.1, `@dnd-kit/sortable` 10.0.0 and `@dnd-kit/utilities` 3.2.2, for drag reordering (Web item 8).
The W-fld drag helpers changed with it, and no assertion changed. A touch now also sends touch events, as browsers do.
After a drop, the test waits 50 ms before the next click, because dnd-kit ignores clicks for 50 ms after a drop.

### Original plan (v1.2, implemented in v1.3)

Drafted by `/plan` on 2026-11-09, checked again on 2026-11-10 against SPEC-0001's plan and the code (no forms code
exists yet; every path below that SPEC-0001 creates is taken from its plan), and revised on 2026-11-10 after each
plan review and the owner's decisions. Approved by the owner on 2026-11-11.

### Scope

Locked for v1.2; no longer the lock (the amendment's block above is).

```text
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
apps/api/test/e2e/forms-versions.e2e-spec.ts
apps/web/src/app/*/orgs/*/forms/_components/fields/*
apps/web/src/app/*/orgs/*/forms/_components/use-form-draft*
apps/web/src/app/*/orgs/*/forms/_components/form-editor*
apps/web/src/app/*/orgs/*/forms/_lib/draft.ts
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
  "Obrigatório" switch is disabled except on `client.phone`. On custom rows, `forms.fields.sensitiveHelp` is the
  description of the "Dado protegido" switch.
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
  checks. Fields whose label matches a §3.4 term ("Peso" in AC-0002-26, "Alergia" in AC-0002-27) are seeded with
  sensitive true, because the database checks do not enforce the label rule (R6). W-fld uses no fixture: its
  prepared drafts for AC-0002-10 ("Alergia") and -22 ("Peso") give those fields `sensitive: true` and
  `sensitiveLock: "label"`.

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
| 26 | new field id and type, records' version and value rows | SPEC-0004: the clients keep their "text" answers |

Every row is verified by SPEC-0004, not SPEC-0003: SPEC-0003 §2 puts the record endpoints in SPEC-0004 and
SPEC-0005, so SPEC-0003's plan has no way to read a client.

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
   - **Expected to pass already** (regression tests): SPEC-0001's plan delivers AC-0002-03, -05, -14 to -16, -19, -20,
     -23 to -26, -31 to -34, -36 and -37. They cover system-field presence, id matching, the schema/metadata diff, the
     shape checks, order, and option and protection metadata. AC-0002-01 (E-fld), -02, -06, -27 and -30 pass too:
     SPEC-0001 stores a system field's fixed `required` on create (its API, "System fields' `required`") and returns
     the interim locks (its Contracts, "Locks before SPEC-0002"). Confirm each passes. This covers their E-fld tests
     only: the W-fld parts of -14 and -25 need the menu and the draft serialisation, so they fail until step 6.
   - **Expected to fail**: every other AC. Confirm each fails because the rule or control is missing.
   - A test outside the first list that passes at this step is reported with the SPEC-0001 behavior that delivers
     it. It is never rewritten to fail.
4. **API**: in `domain/` only. `FieldPolicy` rules in the order above, defaults, and locks in the domain's Field
   response. No handler changes (API section).
5. **Web, part 1**: switch, select, menu and tooltip primitives.
6. **Web, part 2**, three commits, reorder first (Risks 5):
   - **6a** field list, drag handle and drag reorder (`field-list.tsx`, `use-field-reorder.ts`, and the handle in
     `field-row.tsx`, whose other controls follow in 6b): AC-0002-49. `field-list.tsx` is mounted in
     `form-editor` here; until 6b, each row shows its label as visible text next to the handle.
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
   unverified, so SPEC-0001's deferred criteria no longer block this plan. Those are AC-0001-34, -57 and -58 under
   an owner waiver, eleven SPEC-0004 criteria and the phone count, and AC-0001-10 for SPEC-0003 and SPEC-0004.
2. **The field-list interface is shared** with SPEC-0001's editor and draft hook. Cheapest check: build SPEC-0001's
   field region against the props `field-list.tsx` needs (rows, `fields.<i>` error paths, `valueCount`).
3. **Term matching.** Whole-word matching on normalised text can surprise with multi-word terms and hyphens
   ("e-mail", "cartão sus"). U-terms runs every term; any change to the list amends this spec (§3.4).
4. **Check constraints and seeded data.** SPEC-0001's fixtures could seed an unprotected cpf field, which the new
   checks reject. Step 2 updates the fixtures before any test runs.
5. **Pointer-event drag** is written here, not taken from a library. Cheapest check: build drag reorder first, in
   6a, and try it with mouse and touch emulation at the end of 6a; try the keyboard menu moves at the end of 6c,
   where the menu is built. If drag is not usable, the fallback is a library, proposed to the owner as a new
   dependency. Pointer drag has no automated test (AC-0002-14 and -25 use the keyboard menu), so this manual check
   is its only coverage.
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
   - Mounting `field-list.tsx` in `form-editor` changes the region W-ed already queries: AC-0001-50 checks that the
     field list shows the service system fields and still has "Objetivo", and AC-0001-01 that the editor sends
     the system fields. Once labels are input values, text queries can stop matching. W-ed must still pass with
     `field-list.tsx` mounted. Cheapest check: at SPEC-0001's `/done`, list the roles and accessible names W-ed
     queries in that region and keep them in `field-row.tsx`; then run `form-editor.test.tsx` at the end of 6a
     and again at the end of 6b.
     Any failure goes to the owner, never to an edit of that test.

### New dependencies

None. `@base-ui/react` 1.8.0 already exports Switch, Select, Menu and Tooltip. Drag uses pointer events.

### Amendments during implementation

Owner-approved in the implementation conversation, 2026-11-11. They change how the plan is carried out, not the
acceptance criteria.

1. **Existing rows check** (Sequence step 0): only the local Docker database runs `0003` besides Testcontainers. It
   held 3 `form_fields` rows from manual testing; the owner chose to leave it and reset it (its data is tmpfs) before
   applying `0003` there. Nothing was deleted.
2. **SPEC-0001 R18 test data** (Risks 8): the three R18 tests in `apps/api/test/e2e/forms-versions.e2e-spec.ts`
   dropped option "Tarde" and left the select "Turno" with one option, which §3.1 rejects. The owner chose to fix the
   test data: "Turno" is seeded with Manhã, Tarde and Noite, and the next version keeps Manhã and Noite. The
   assertions are unchanged. The file was added to the scope.
3. **Draft serialisation** (Web, 6b): `forms/_lib/draft.ts` `toRequestFields` sends `sensitive` whenever it is set on
   a custom field (never on a system field), so turning protection off on an existing field is saved (§7: an omitted
   `sensitive` keeps the stored value). The file was added to the scope; W-fld test "§7 turning protection off on an
   existing custom field sends sensitive: false".
4. **Server error placement** (Web, §8; from the review): errors at `fields.<i>.options` are shown in that row's
   options, and the form clears earlier server field errors before validating, so [Salvar] keeps working after a
   field error. W-fld tests "§8 …" cover both.
5. **Files**: `fields/field-model.ts` holds the row model shared by the row, list and draft code (not in the Web file
   list). The W-fld `chooseFieldType` helper fires `pointerDown` before the click, because the Select ignores a bare
   virtual click; no assertion changed.

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
| 1.2 | 2026-11-11 | Implementation plan approved by Joao Izidoro, 2026-11-11 (together with SPEC-0001's plan); behavior sections unchanged |
| 1.3 | 2026-11-11 | Implemented per §11: `protected-terms` contract and `forms.fields.*` copy, migration `0003` (three CHECK constraints on `form_fields`), `FieldPolicy` rules in the check order with defaults and locks, and the editor's field list (switch, select, menu and tooltip primitives; rows, type select, protection, options editor, row menu, drag and keyboard reorder, remove dialog). All 52 active criteria have passing tests (AC-0002-17 was withdrawn in 0.7). Partly verified, per Deferred checks: AC-0002-16, -19, -23, -24, -26 (SPEC-0004). Passing before step 4 through SPEC-0001's early rules, besides the plan's step 3 list: AC-0002-04, -18, -39 to -42, -46, -51, -52 (E-fld), and -08, -09 in U-terms through the step 1 contract. Learned during implementation, owner-approved and recorded in §11 "Amendments during implementation": the local database rows, the R18 test data, `draft.ts` sending `sensitive: false`, server error placement. No criterion changed. Status stays Approved until the owner accepts the behavior on a running system |
| 1.4 | 2026-11-11 | Status Implemented: Joao Izidoro tested the behavior on a running system and accepted it, 2026-11-11. Still partly verified, per Deferred checks: AC-0002-16, -19, -23, -24, -26 (SPEC-0004); SPEC-0004 adds `<AC ids> verified with SPEC-0004, <date>` here |
| 1.5 | 2026-11-16 | Field card design (owner, 2026-11-16), pending owner review. Rows become cards with one selected card and a settings panel, a bottom sheet on narrow screens, with the label input in the sheet (§4.6 added; §4.1 steps 2–3, §4.4 and §8 amended). Owner decisions recorded: the panel opens when a field is added, "Texto de ajuda" is ON by default, the whole card is dragged (touch: hold about 300 ms), "Dado protegido" keeps its name, and the design's "Long answer" switch is dropped ("Texto longo" stays a type). AC-0002-21 amended; AC-0002-50 and §4.5 say "card" instead of "row" (wording only); AC-0002-54 to -64 proposed; Q13–Q18 open. Spec review round 1 (8 required changes, applied the same day): §4.6 step 8 (the first error selects its card and opens its panel or sheet), §7 states what an omitted or `null` `helpText` means (the API already behaves this way), every card reachable with Tab (§4.6 step 1, AC-0002-21), touch drag at 300 ms exactly, Givens fixed in AC-0002-60 to -63 ([Publicar] for reorders, focus before Escape, selected card), §4.6 step 6 says what a tap does on narrow screens, Blocks column fixed for Q13, Q15 and Q18; AC-0002-65 to -69 proposed. Status back to Review and plan_status to Draft: §11 Web describes the v1.4 rows and needs a plan amendment after approval |
| 1.6 | 2026-11-16 | Owner Joao Izidoro accepted the proposed answers to Q13–Q18 as written, 2026-11-16: panel title "Configurações do campo", selecting another card closes the panel, sheet below 1024 px, answer preview per type, "Texto de ajuda" OFF clears the help text, and on narrow screens all editing is in the sheet. §4.6 steps 2, 3 and 6 now state these answers. AC-0002-21 and AC-0002-54 to -69 are still pending owner review; status stays Review |
| 1.7 | 2026-11-16 | Approved by Joao Izidoro, 2026-11-16: the field card amendment, AC-0002-21 as amended and AC-0002-54 to -69 as written. The re-check's 11 suggestions were not taken into the spec; the plan lists the ones that affect implementation under Risks. plan_status stays Draft until the §11 amendment is approved |
| 1.8 | 2026-11-16 | Owner decision from the plan review, 2026-11-16: an error with no control (id, `systemKey`, the field as a whole, options on a type without options) shows as an error toast on narrow screens, with the card selected and focused and no sheet. Wide screens keep the message under the card title. §4.6 step 8 narrowed to errors with a control, step 9 added, AC-0002-70 added; the owner reviews AC-0002-70's wording with the plan |
| 1.9 | 2026-11-17 | Implementation plan amendment (§11 "Field-card amendment") approved by Joao Izidoro, 2026-11-17, together with AC-0002-70's wording. plan_status Approved. Plan review suggestions P1–P10 stay follow-ups in §11 Risks 7 |
| 1.10 | 2026-11-17 | Field-card amendment implemented per §11. Built: field cards (`field-card.tsx`, replacing `field-row.tsx`); the answer preview; the "Configurações do campo" panel (`field-settings.tsx`, replacing `field-row-menu.tsx`), shown in a popover on wide screens and a bottom sheet below 1024 px; selection and focus rules; the help-text switch (`""` ON, `null` OFF, sent as `null`); whole-card drag (mouse 4 px, touch 300 ms hold); first-error reveal (panel, sheet or error toast); `useWideScreen`, plus the `popover`, `sheet`, row-look `select`/`menu` and `readOnly` `switch` primitives. All 18 criteria in this amendment have passing tests: AC-0002-21, AC-0002-54 to -67, -69 and -70 (W-fld) and AC-0002-68 (E-fld). AC-0002-01 to -53 still pass (W-fld, E-fld, U-pol, U-terms). Deferred checks unchanged: AC-0002-16, -19, -23, -24, -26 (SPEC-0004). Implementation choices that change no criterion: the sheet's close button is a "Fechar" button after the settings, so the label input is the sheet's first control (AC-0002-55); `matchMedia` is not stubbed in `tests/setup.ts`, because a missing `matchMedia` counts as wide and narrow tests set the width in the harness; a loaded empty help text opens OFF; Enter on "⋯" and "Mover" acts on keydown. Status stays Approved until the owner accepts the behavior on a running system and does the two device checks in §11 (popover placement between 1024 and about 1280 px; a phone swipe versus a 300 ms hold) |
| 1.11 | 2026-11-17 | Drag reordering moved from hand-written pointer handlers to dnd-kit (owner, 2026-11-17): `field-reorder.tsx` replaces `use-field-reorder.ts`, and §11 Web item 8 and New dependencies were updated. The rules are unchanged: 4 px for mouse and pen, a 300 ms hold within 8 px on touch, presses on controls ignored, and a held tap counts as a tap. Added to §4.4 step 1: the page auto-scrolls near the screen edges while a card is dragged. The order now changes on drop, and the cards shift during the drag. The W-fld drag helpers send touch events and wait 50 ms after a drop, with no assertion changed. The card refactor made after 1.10 is kept (owner, 2026-11-17), and §11 Web item 3 now describes it. A button covering the card is the idle card's tab stop and click target, instead of the `<li>`. `aria-invalid` is back on the `<li>`. The cover button is described by the visible error under the title, which replaces the duplicate `sr-only` copy of the message. The W-fld `idleCard` and `tapCard` helpers use the cover button, and no assertion changed. Added §4.4 step 3: dragging a card neither selects nor focuses it, and a click still does (owner, 2026-11-17). The later §4.4 steps were renumbered, and W-fld test "§4.4 a mouse drag neither selects nor focuses the dragged card" covers the new step. All 31 W-fld tests pass, AC-0002-61 to -64 among them. The web suite is green. API checks were not rerun, because the API is unchanged |
| 1.12 | 2026-11-17 | Modal settings panel (owner, 2026-11-17), pending owner approval. Selecting a card opens its panel, and closing the panel deselects the card. A card is selected exactly while its panel is open. Selecting is by click, tap, Enter or Space, and no longer by focus. The panel holds all editing on every screen: label, description and options move off the card on wide screens, and the card only displays. The "⋯" button is removed. While a panel is open, the rest of the page does not respond: no hover, no clicks, no drag, and Tab stays in the panel. A click or tap outside only closes the panel, and nothing under it reacts. An error with a control opens its panel; an error with no control no longer selects the card. Changed: §4.1 step 2, §4.4 steps 1–3, §4.6 (step 10 added), §8, and Q14 (superseded) and Q18 (extended). Added Q19 (page scroll while open; proposed answer, §4.6 step 10 assumed). Amended AC-0002-21, -54, -57, -58, -59, -60, -62, -65 and -70. Added AC-0002-71 to -74. AC-0002-67 and -69 hold as written. Status back to Review and plan_status to Draft, until the owner approves and `/plan` writes the plan amendment. The §11 plan still describes v1.11 |
| 1.13 | 2026-11-17 | Spec review of v1.12, required changes applied, and Q19 decided by the owner (no scroll), 2026-11-17; still pending owner approval. §4.6 step 10: what the panel opens stays usable and does not count as outside it (the "Tipo" and "Mover" lists, the "Dado protegido" info, the lock tooltips, the remove dialog); SPEC-0001's leave prompt responds normally; the page does not scroll. §4.6 step 11 added: "Remover" closes the panel and moves focus to the next card, or to the previous one; for a field with answers, cancelling the dialog keeps the panel open with focus on "Remover". §4.6 step 3, §4.1 step 2 and §4.6 step 8: the page scrolls the card into view before its panel opens. Added AC-0002-75 (focus alone does not select) and AC-0002-76 (wide-screen error with no control). Review should-fix items 5–8 are left as follow-ups |
| 1.14 | 2026-11-17 | Approved by Joao Izidoro, 2026-11-17: the v1.12 modal settings panel amendment with the v1.13 review fixes, including AC-0002-21, -54, -57, -58, -59, -60, -62, -65 and -70 as amended and AC-0002-71 to -76 as written. The "pending" notes now read "approved 2026-11-17". plan_status stays Draft until `/plan` writes the plan amendment and the owner approves it. Review should-fix items 5–8 stay follow-ups |
| 1.15 | 2026-11-17 | `/plan` wrote §11 "Modal panel amendment (v1.14)" for the v1.12–v1.13 amendment. Its scope block is now the first in the file. plan_status stays Draft until the owner approves the plan. The owner decides Decisions 3 and Risks 5 with the plan |
| 1.16 | 2026-11-17 | Plan review of "Modal panel amendment (v1.14)": 8 required changes applied with the owner's picks, 2026-11-17. Web 2 dropped, because base-ui's drawer already closes on the click; `sheet.tsx`, `forms-harness.tsx` and `tests/setup.ts` left the scope. Sequence step 0 added: the owner commits the field-card work first. Steps 3 and 4 merged. The popover's ✕ moves after the content, so the label input is the first control (Decisions 6, AC-0002-72). The card's type-change warning has no id. Decisions 3 confirmed. Risks 5: base-ui focus guard, no new dependency. The `forms.fields.menu` grep is recorded, and the emails typecheck is added. 7 should-fix items listed as follow-ups. plan_status stays Draft |
| 1.17 | 2026-11-17 | Plan approved by Joao Izidoro, 2026-11-17: §11 "Modal panel amendment (v1.14)" as revised in 1.16. plan_status Approved. Sequence step 0 (the owner commits the field-card work) comes before `/implement` |
| 1.18 | 2026-11-17 | Modal panel amendment implemented per §11 "Modal panel amendment (v1.14)". Built: the popover is modal, with a transparent backdrop that closes it on click, so nothing under it reacts; its popup scrolls on its own and its ✕ comes last in tab order. Cards only display on every screen, and the "⋯" button is gone. A button covering each card is its tab stop (`aria-haspopup="dialog"`, `aria-expanded`), and a click, Enter or Space opens the panel; focus alone selects nothing. The panel always holds the label, the description and the options, and the remove dialog opens inside it. The list keeps one open card; closing the panel deselects it and returns focus to the card, or after a removal to the next card, else the previous one. Drag is off while a panel is open. `forms.fields.menu` was removed from pt-BR and en-US. All 15 criteria in scope have passing tests (W-fld 40/40): AC-0002-21, -54, -57 to -60, -62, -65 and -70 to -76. AC-0002-55, -56, -61, -63, -64, -66, -67 and -69 still pass. Test edits beyond the plan's table: AC-0002-22 checks the warning on the card and in the panel (Web 3); "§8 a server fieldOptions.required" looks for the message in the panel, where the options moved (Web 4); AC-0002-70 looks for the copy inside the toast, because Decisions 3 also shows it under the title; the `closePanel` helper reads the dialog once. Choices that change no criterion: the backdrop has `role="presentation"`; the cover button shows a focus ring, because focus no longer highlights the card. Review PASS with 5 should-fix follow-ups. Deferred checks unchanged: AC-0002-16, -19, -23, -24, -26 (SPEC-0004). Status stays Approved until the owner accepts the behavior on a running system and does the §11 manual checks 1–5 |
| 1.19 | 2026-11-17 | Editing in place (owner, 2026-11-17), pending owner approval. On wide screens, an idle card's title and help text are inputs that edit the label and the description in place, without selecting the card or opening the panel. A click elsewhere on the card still selects it and opens the panel, and the panel's editing is unchanged. While a panel is open, these inputs do not respond like the rest of the page: a click on one only closes the panel. Owner decisions, 2026-11-17: wide screens only (narrow screens keep display-only cards and tap to open the sheet); the inputs are always inputs and each is a Tab stop; a press inside them never starts a drag; with "Texto de ajuda" ON and an empty description the card shows "Adicionar descrição", and with it OFF the card shows no description input; Enter or leaving keeps the text, and Escape restores the text from when the input took focus. Changed: §4.4 steps 1 and 3, §4.6 steps 1, 2, 3 and 10, §8 (idle card), and Q18 (narrowed). Added §4.6 step 12, and Q20–Q22 (proposed answers, assumed in §4.6 steps 1 and 12). Amended AC-0002-59. Added AC-0002-77 to -89. Status back to Review and plan_status to Draft, until the owner approves and `/plan` writes the plan amendment. The §11 plans still describe v1.18 |
| 1.20 | 2026-11-17 | Spec review of v1.19: the 8 required changes applied with the owner's picks, 2026-11-17; still pending owner approval. Q20–Q22 decided by the owner as proposed (the type name as the empty title's placeholder; Tab goes card, title input, help-text input, next card; focus stays in the input after Enter or Escape). §4.6 step 12: Escape also restores the draft and runs the label check again; each input has its own accessible name ("Rótulo de <name>", "Texto de ajuda de <name>") and a visible focus indicator; the inputs are read-only while the editor saves; an idle card's invalid input is described by the message under the title. §4.6 step 4 reworded, because the panel no longer holds all editing on wide screens. §8 idle and validation-error rows updated, with the new copy keys `forms.fields.inlineLabel` and `forms.fields.inlineHelpText`. AC-0002-82 and -88 use copy keys, and AC-0002-88 also checks the panel's label input. Added AC-0002-90 to -94. Review follow-ups not taken: a positive focus check in AC-0002-87; Tab past the title input and Shift+Tab; the no-drag rule on the help-text input; Space typed in a title input; older items (file names in changelog rows 1.10, 1.11, 1.16 and 1.18; §3.5 before §3.4; the Given of AC-0002-09, -12 and -13) |
| 1.21 | 2026-11-17 | Approved by Joao Izidoro, 2026-11-17: the v1.19 editing-in-place amendment with the v1.20 review fixes, including AC-0002-59 as amended and AC-0002-77 to -94 as written. The "pending" notes now read "approved 2026-11-17". plan_status stays Draft until `/plan` writes the plan amendment and the owner approves it. Review follow-ups stay follow-ups |
| 1.22 | 2026-11-17 | `/plan` wrote §11 "Editing-in-place amendment (v1.21)" for the v1.19–v1.21 amendment. Its scope block is now the first in the file. plan_status stays Draft until the owner approves the plan |
| 1.23 | 2026-11-17 | Plan review of "Editing-in-place amendment (v1.21)": 4 required changes applied with the owner's picks, 2026-11-17. Web 1: the inline editor is an auto-growing textarea that wraps like the card's text (Decisions 6), it does not take `focus:outline-none` so its focus ring shows, Enter is cancelled so no line break is typed, and pasted line breaks become spaces; the AC-0002-79 helper, manual check 2 and Risks 3 now describe a textarea's Enter. Web 2: an input is described by the message under the title only while its own error is set. Deferred checks: AC-0002-79, -85 and -87 are finished by manual checks 2, 6 and 4, and manual check 6 (Tab order) was added. Should-fix items also taken: i18n before the failing tests (Sequence 1), the text box's spacing matches the text, Escape is left alone during IME composition and while read-only, and the inline helpers pass `{ hidden: true }`. Follow-ups not taken: drop or justify `data-error-slot` on the inline inputs; Sequence 0 should name v1.19–v1.23. plan_status stays Draft |
| 1.24 | 2026-11-17 | Plan approved by Joao Izidoro, 2026-11-17: §11 "Editing-in-place amendment (v1.21)" as revised in 1.23. plan_status Approved. Sequence step 0 (the owner commits the spec changes) is optional, because the spec file is in scope |
| 1.25 | 2026-11-17 | Editing-in-place amendment implemented per §11 "Editing-in-place amendment (v1.21)". Built: on wide screens, an idle card shows its title and help text as auto-growing one-line text boxes that edit the draft in place, without selecting the card or opening the panel. They are named "Rótulo de <name>" and "Texto de ajuda de <name>" (new keys `forms.fields.inlineLabel` and `forms.fields.inlineHelpText` in pt-BR and en-US), with the type name or "Adicionar descrição" as placeholder. Enter types no line break, pasted line breaks become spaces, Escape restores the text from when the box took focus (not during IME composition or while read-only), and focus stays in the box. The boxes are read-only while the editor saves. Each is marked invalid, and described by the message under the title, only for its own error. The selected card and every card on a narrow screen keep plain text. A click elsewhere on the card still opens the panel, and a press inside a box starts no drag. All 19 criteria in scope have passing tests (W-fld 58/58): AC-0002-59 and AC-0002-77 to -94. AC-0002-79, -85 and -87 are also finished by §11 manual checks 2, 6 and 4. AC-0002-01 to -76 and the §4.4, §4.6, §7 and §8 tests still pass. Choices that change no criterion: the text box adds `min-w-[2ch]`, `rounded-sm`, a 2 px focus-ring offset and `autoComplete="off"`, and leaves out `w-auto`, which `field-sizing-content` makes unneeded. Review PASS with 3 should-fix follow-ups for the AC-0002-59 test. Deferred checks unchanged: AC-0002-16, -19, -23, -24, -26 (SPEC-0004). Status stays Approved until the owner accepts the behavior on a running system and does the §11 manual checks 1–7 of this amendment |
| 1.26 | 2026-11-18 | Wide-screen panel without text inputs (owner, 2026-11-18), pending owner approval. On wide screens the settings panel no longer shows the label or the description input; they are edited only in place on an idle card, and the selected card shows them as text while its panel is open. Learned from commit b50aa4d, which removed both inputs from the popover while v1.25 still required them, so 8 W-fld tests fail. Owner decisions, 2026-11-18: while a panel is open the card's title and help text stay read-only; [Novo campo] on a wide screen opens no panel and focuses the new card's title input; a new field's label starts as "Texto curto", fully selected so typing replaces it; new fields start with "Texto de ajuda" OFF on every screen; a first save error on the label or description focuses the card's input with no panel. Changed: §4.1 step 2, §4.6 steps 4, 7, 8 and 12, §8 (panel open, validation error), Q18 (narrowed). Added Q23 (the prefill on narrow screens; AC-0002-55 assumed until decided) and Q24 (the label is kept on a type change). AC-0002-54, -55, -59, -62, -65, -82, -83, -88 and -92 amended; AC-0002-95 to -99 proposed. No contract or API change. Status Review and plan_status Draft until the owner approves and `/plan` writes the plan amendment |
| 1.27 | 2026-11-18 | Spec review of v1.26: required changes 1–3 applied with the owner's pick, 2026-11-18; still pending owner approval. AC-0002-100 added: the narrow-screen sheet shows the description input once "Texto de ajuda" is turned ON, because no criterion covered it after AC-0002-54 and -59 moved to wide screens. AC-0002-88 now replaces the title text instead of typing into it, because a new field's title starts as "Texto curto". AC-0002-98 names a new template and states the 422 response with `fields.4.label`, the cleared selection and the invalid title input. Required change 4 (Q23, which blocks AC-0002-55) and Q24 wait for the owner's decision at approval. Should-fix items 5–14 stay follow-ups |
| 1.28 | 2026-11-18 | Approved by Joao Izidoro, 2026-11-18: the v1.26 wide-screen panel amendment with the v1.27 review fixes, including AC-0002-54, -55, -59, -62, -65, -82, -83, -88 and -92 as amended and AC-0002-95 to -100 as written. Q23 and Q24 decided by the owner as proposed (the "Texto curto" prefill, fully selected, also applies in the narrow sheet; a type change keeps the label). The "pending" notes now read "approved 2026-11-18". plan_status stays Draft until `/plan` writes the plan amendment and the owner approves it. Should-fix items 5–14 stay follow-ups |
| 1.29 | 2026-11-18 | `/plan` wrote §11 "Wide-screen panel amendment (v1.28)" for the v1.26–v1.28 amendment. Its scope block is now the first in the file. Web only: new fields start as "Texto curto" with help text OFF, [Novo campo] and label or help-text errors focus the card's box on wide screens, the text is selected on first focus, and the owner's uncommitted switch-row edit is finished (Decisions 7, the owner's pick). plan_status stays Draft until the owner approves the plan |
| 1.30 | 2026-11-18 | Plan review of "Wide-screen panel amendment (v1.28)": required changes 1–2 applied with the owner's pick, 2026-11-18. Web 2 and Risks 3: the effect after the append reads the new row's key from `rows.at(-1)`, and `pendingFocus` stays queued until its element is found and focused, because the new card renders one render after the append. Tests and Sequence 1: each test says whether it fails first, and why, or passes at once on today's code (AC-0002-10, -59, -62, -72, -95). Should-fix items 3–10 listed under "Plan review follow-ups". plan_status stays Draft |
| 1.31 | 2026-11-18 | Plan approved by Joao Izidoro, 2026-11-18: §11 "Wide-screen panel amendment (v1.28)" as revised in 1.30, with Decisions 7 as written (the owner's uncommitted switch-row edit is finished in this amendment, Web 5). plan_status Approved. Plan review should-fix items 3–10 stay follow-ups |
| 1.32 | 2026-11-18 | Wide-screen panel amendment implemented per §11 "Wide-screen panel amendment (v1.28)". Built: a new field starts with the label "Texto curto" (`forms.fields.types.text`) and "Texto de ajuda" OFF, sent as `helpText: null`, and its label text is selected on its first focus. On wide screens, [Novo campo] opens no panel and focuses the new card's title box; a first save error on the label or the description opens no panel and focuses that card's title or help-text box, marked invalid and described by the message under the title; a selected card keeps such a message under its title. The popover has no label or description input, while the narrow sheet keeps both. A card focus queued in the list now waits until its control is rendered. The owner's switch-row edit was finished (Decisions 7): each switch has its own id and the label no longer repeats its id; the unused imports went. All criteria in scope have passing W-fld tests: AC-0002-54, -55, -59, -62, -65, -82, -83, -88, -92 and -95 to -100, with AC-0002-10, -72 and the §8 test retargeted; AC-0002-01 to -53 and the other v1.5–v1.19 criteria still pass. Deferred checks unchanged: AC-0002-16, -19, -23, -24, -26 (SPEC-0004). Two W-fld helpers left unused by the rewrite (`labelInput`, `shownType`) were removed. Status stays Approved until the owner accepts the behavior on a running system. Review should-fix items 1–5 stay follow-ups |
| 1.33 | 2026-11-18 | Status Implemented: Joao Izidoro accepted the wide-screen panel amendment on a running system, 2026-11-18. Still partly verified, per Deferred checks: AC-0002-16, -19, -23, -24, -26 (SPEC-0004) |
