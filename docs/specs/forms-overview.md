# Custom forms, clients and services: overview

> Not a spec. This page maps the specs below, fixes the vocabulary, records the decisions already
> taken, and lists the conflicts with the RFC that the owner must resolve. Specs are normative; this page is not.

| Spec | Capability | Depends on |
| --- | --- | --- |
| [SPEC-0001](SPEC-0001-modelos-de-formulario.md) | Form templates: create, list, edit, archive, delete; system fields per type; which changes publish a version | — |
| [SPEC-0002](SPEC-0002-campos-de-formulario.md) | Template fields: types, required, sensitive data, order, removal | SPEC-0001 |
| [SPEC-0003](SPEC-0003-preenchimento-de-cadastro.md) | Filling a record from a template: validation, display, template changes | SPEC-0001, SPEC-0002 |
| [SPEC-0004](SPEC-0004-clientes.md) | Clients (`/clients`) | SPEC-0003 |
| [SPEC-0005](SPEC-0005-servicos.md) | Services (`/services`) | SPEC-0003 |

Suggested build order: 0001 + 0002 together (one editor screen), then 0003, then 0004 and 0005 in parallel.

## 1. Vocabulary

| pt-BR (UI) | English (code) | Meaning |
| --- | --- | --- |
| Modelo de formulário | form template (`form`) | The template. Holds no client or service data. |
| Tipo do modelo | form type | What the template creates: `client` or `service` (MVP); `plan` post-MVP. Fixed at creation. |
| Campo | field (`form field`) | One question in a template. One field holds exactly one value per record. |
| Campo do sistema | system field | A field every template of a type carries, which the rest of the product depends on (e.g. a client's e-mail). It can be renamed and moved, but not removed. |
| Campo personalizado | custom field | Any field the professional added. |
| Versão do modelo | template version | A published, immutable snapshot of a template's structure (SPEC-0001 R13–R15). |
| Submissão | submission | Only the set of answers sent when the professional presses [Salvar]. It is not stored as its own thing: a submission creates or updates a record. |
| Cadastro | record | What the original draft called a "form instance": one client or one service, created from one template. The UI never says "instância"; it says "cliente" or "serviço". |
| Valor / resposta | field value | What was typed into one field of one record. |
| Dado protegido | sensitive field | A field whose values are hidden by default and kept out of lists, search and logs. See SPEC-0002 §3 (name decided, D-7). |

**What "protected" does in the MVP.** Its visible effect is small: values are masked on the record's view page
until revealed, and they never appear in lists or search. Its real value is that it marks the data that later
features must treat carefully (custom-field search, export, sharing, collaborator permissions, audit of reveals).

**Rename "form instance" to "record" (cadastro).** For a client, the record *is* the client, so the user never
needs a third word. "Cadastro" is the everyday pt-BR word for it ("cadastro de cliente").

## 2. Conceptual model

```
Tenant 1──* Form template (type: client | service, name, description, status, revision)
                 1──* Template version (number; immutable once published)
                          1──* Version field (field, position, required, options)  ← schema
                 1──* Field (identity, type, label, help text, protected)           ← metadata shared by all versions

Tenant 1──* Client  ──* 1 Template version (of a client template)    one template per client, fixed
Tenant 1──* Service ──* 1 Template version (of a service template)   one template per service, fixed

Client / Service 1──* Field value  ──* 1 Field              at most one value per (record, field)
```

- System-field values (client name, e-mail, phone; service name, duration, price) belong to the client or
  service itself, because scheduling, search, finance and uniqueness rules read them.
- Custom-field values belong to the record and point at the template field they answer.
- A record is linked to one template version. It moves to another version only through "Atualizar todos".

## 3. Decisions already taken (owner, 2026-11-09)

| # | Decision |
| --- | --- |
| D-1 | Forms move into the MVP, because clients and services are created from them. The RFC is not edited yet (see §4). |
| D-2 | Each type has system fields that are locked into every template of that type. Their values are real attributes of the client or service. |
| D-3 | For text-like fields, the sensitive-data check runs on the field **label** (templates hold no data). Personal-data field types are always sensitive. |
| D-4 | A client or service is created from exactly one template and stays bound to it. Attaching extra forms later (an anamnesis, say) is post-MVP. |
| D-5 | Custom forms are the product's main focus and are MVP regardless of the RFC (resolves C-1). The RFC text still needs amending. |
| D-6 | Every tenant starts with a default "Cliente" and a default "Serviço" template (resolves Q-C). |
| D-7 | The switch is called **"Dado protegido"** (resolves Q-A). |
| D-8 | The field-type catalog in SPEC-0002 §3.1 is accepted as proposed, without "first name" (resolves Q-B, C-6). |
| D-9 | Money is an integer in centavos (`9999` = R$ 99,99), and lists use `limit` + `after` cursor pagination. Both now live in `docs/architecture/api-convention.md` (resolves Q-D, Q-E). |
| D-10 | Templates are **versioned** (RF-39, RN-21). Saving a new template publishes v1; applying schema changes publishes the next version; metadata (names, labels, help text, protection, option labels) is shared by all versions and publishes nothing. When records exist, the Apply dialog offers "Manter existentes" or "Atualizar todos". Deleting answers in a migration needs the template name typed. Migrated records missing a new required field are flagged pending. The draft lives only in the editor. A separate `revision` counter protects against two tabs. |
| D-11 | A **record** is the saved client or service. A **submission** is only the answers sent on [Salvar]. The RFC's "many dated submissions per client" is replaced by "one record per client, linked to a template version" (RFC amended in the same change). |
| D-12 | Consent is attested once per client, **when the client record is saved for the first time** (RFC §6 wording changed from "antes da primeira submissão"). No spec covers the attestation yet. |
| D-13 | Deleting a template that has records asks whether to delete them too. Yes: type the template name, and the template and all its records are deleted. No: the template is archived and hidden from `/forms`. (SPEC-0001 R8) |
| D-14 | Telefone is a locked client system field, like Nome and E-mail, so clients are easier to search by it. |
| D-15 | The spec owner is **Joao Izidoro**. |

Anything else in the specs (protected-terms list, uniqueness rules, limits, the delete pattern for clients and services)
is a **proposal**. The criteria rewritten for D-10 (each spec's 0.3 changelog line) are
awaiting the owner's review. Each spec's acceptance criteria that depend on a proposal are
kept apart under "Provisional criteria" until the owner answers.

## 4. Conflicts with the RFC (owner must resolve)

| # | RFC says | These specs say | Proposed resolution |
| --- | --- | --- | --- |
| C-1 | ~~RF-37–RF-42 Pós-MVP.~~ | Forms are MVP. | **Resolved:** the RFC now marks them MVP. |
| C-2 | ~~RF-07: client has fixed fields (name, phone, e-mail, notes); "custom forms are post-MVP". RF-11: service has name, duration, default price.~~ | Those become **system fields** of the template, and everything else is custom. "Observações" (notes) becomes an ordinary long-text custom field. | **Resolved (owner, 2026-11-09):** RF-07 amended; its fixed fields are name, phone and e-mail, and notes are an ordinary custom long-text field (SPEC-0001 §3.2). RF-11 already lists only the service system fields. |
| C-3 | ~~RF-37/RN-20: target entity "sugerida".~~ | The type is binding. | **Resolved:** the RFC now makes the type mandatory and binding. |
| C-4 | RF-40–RF-42, RN-21: many dated **submissions** per client or service, filled on its page. | One record per client or service, created from one template and linked to one version (D-4, D-11). | **Decided (D-11).** RFC amended in the same change as these specs. Extra forms per client stay post-MVP. |
| C-7 | RF-39: "Modelos com cadastros são arquivados em vez de removidos". | Deleting asks whether to delete the records too, or archive (D-13). | **Decided for templates (D-13);** RF-39 amended in the same change. Clients and services still open (SPEC-0004 Q5). |
| C-5 | `schema.dbml`: `forms.default_entity_type` is nullable. `form_fields.sort_order int`. `clients.custom_fields jsonb` is an "ad-hoc fallback". | The type is required. Order uses fractional keys. No ad-hoc fallback. | Update `schema.dbml` during data modelling (§6). |
| C-6 | `field_type` enum: text, textarea, number, date, select, multiselect, checkbox, radio, image, file, url, phone, email. | MVP catalog in SPEC-0002 §3.1 (adds cpf, full name, address, yes/no; defers multiselect, radio, image, file, url). | **Decided (D-8).** Update the enum during data modelling. |

## 5. Cross-cutting open questions

These affect more than one spec. Each spec's §9 refers back to these by ID.

| # | Question | Proposed answer | Blocks |
| --- | --- | --- | --- |
| ~~Q-A~~ | **Decided (D-7).** "Dado sensível" has a strict LGPD meaning (art. 5 II: health, religion, ethnicity...). CPF and e-mail are *personal* data, not *sensitive* data. What should the switch be called? | UI label **"Dado protegido"**, help text: "Oculta o valor nas listas e só o mostra quando você pedir. Use para documentos, contatos e informações de saúde." | SPEC-0002 copy |
| ~~Q-B~~ | **Decided (D-8).** Is the MVP field-type catalog (SPEC-0002 §3.1) right? Why do we need both "full name" and "first name"? | Keep the catalog. Drop "first name" unless there is a concrete use. | SPEC-0002 |
| ~~Q-C~~ | **Decided (D-6).** Should every tenant start with one default template per type, so the first client can be created without building a template? | Yes: "Cliente" and "Serviço", with system fields only. Seed them on tenant creation and backfill existing tenants. This touches the tenants module. | SPEC-0004/0005 first-use flow |
| ~~Q-D~~ | **Decided (D-9).** Lists had no pagination contract (`api-convention.md`). Clients can reach the thousands. | `limit` + `after` cursor, default 50, max 100 (`api-convention.md`, Pagination). | SPEC-0004/0005 lists |
| ~~Q-E~~ | **Decided (D-9).** There was no monetary JSON representation yet (`api-convention.md`). | Integer centavos plus ISO currency: `priceCents: 15000, currency: "BRL"` (`api-convention.md`, Money). | SPEC-0005 |
| Q-F | The RFC (§6, "Dados Sensíveis") requires encryption at rest for form answers. All answers, or only sensitive ones? | All custom-field values, as the RFC says. The sensitive flag adds hiding, not encryption. | data modelling |

## 6. Notes for data modelling and `/plan` (non-normative)

These are inputs for modelling the database. They are not requirements.

- **Ordering (fractional indexing).** Each field gets a string position key. Moving a field writes only that
  field's key (between its new neighbours), and other rows are untouched. Keys are unique per template and
  compared bytewise. Caveat: if [Save] sends the whole template at once (SPEC-0001 §4), the array order already
  carries the order and the server can regenerate the keys. Fractional keys pay off when reorders are saved one at
  a time, or when edits from two tabs are merged. Decide in `/plan`; the spec only requires that order is
  preserved (RN-20).
- **Field identity is stable.** A field keeps its id for its whole life. Values point at field ids, never at
  labels or positions, so renaming and moving fields never touches values.
- **Versions.** A `form_versions` table (template, number, published at) plus a version-field join (version,
  field, position, required, options) holds the schema. Field rows hold identity, type and the shared metadata
  (label, help text, protected). Records point at a version id. "Atualizar todos" is one transaction: insert the
  version, repoint every record, delete answers to fields not in the new version.
- **Ordering per version.** Each version stores its own order. Since a version is published whole, array order
  is enough to write it, so fractional keys (above) are optional.
- **Value storage.** Two realistic options: (a) one row per (record, field) with a typed or JSON value; (b) one
  JSON document per record keyed by field id (as `form_attachments.responses` does today). (a) makes "does
  this field have any values?" (needed by SPEC-0002) and per-value encryption simpler. (b) is simpler to read
  and write whole. Decide in `/plan`.
- **System-field values** are columns on `clients` / `services` (`name`, `email`, `phone`; `name`,
  `duration_minutes`, `price`). The template stores the system field's label, position and (for phone) required
  flag. A `system_key` (`client.name`, `client.email`, ...) on the field row links the two.
- **Tenant isolation.** Every new table carries `tenant_id`, including field and value tables, even though the
  tenant could be derived through the template. This keeps RLS (RFC §6) simple and allows tenant-scoped
  unique indexes.
- **Optimistic concurrency.** A `revision` integer on the template, separate from the published version number,
  supports the 409 conflict in SPEC-0001 R11.
