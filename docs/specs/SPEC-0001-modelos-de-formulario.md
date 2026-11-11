---
id: SPEC-0001
title: Modelos de formulário
status: Approved # Draft | Review | Approved | Implemented | Superseded
plan_status: Draft # Draft | Approved
version: 1.0
owner: Joao Izidoro
satisfies: [RF-37, RF-39, RF-40, RN-01, RN-02, RN-20, RN-21, RN-24, RN-25]
depends_on: []
phase: MVP
ticket: -
---

# SPEC-0001 — Modelos de formulário

## 1. Purpose

The professional defines **form templates** that describe what is recorded about each client or each service.
A template holds no data. It is the blueprint used later to create clients (SPEC-0004) and services (SPEC-0005).
Templates are **versioned**: changing a template's structure publishes a new version, and every record stays
linked to the version it was created or last migrated with. This addresses RFC §2.2.9 (UC-42, UC-44, UC-45),
RF-39 and RN-21.

## 2. Scope

**In scope**
- Template list at `/forms` (inside the workspace, e.g. `/orgs/:tenant/forms`).
- Creating a template from `/forms`, and from the "Criar novo modelo" shortcut on `/clients` and `/services`.
- Template attributes: type, name, description, status.
- The system fields of each template type (§3.2).
- Saving the template together with its fields (field rules live in SPEC-0002).
- Publishing versions: which changes publish a version and which do not (§3.3), and the **Apply** dialog that
  decides what happens to existing records ("Manter existentes" / "Atualizar todos").
- Editing name and description; archiving, unarchiving and deleting a template.
- Protection against two tabs overwriting each other.

**Out of scope**
- Field types, field attributes, ordering and removal: SPEC-0002.
- Creating and editing clients or services from a template: SPEC-0003, SPEC-0004, SPEC-0005.
- `plan` templates: post-MVP, with the plans module (RF-14).
- Duplicating a template, template library or occupation-based suggestions (RN-23): post-MVP.
- Attaching extra forms to an existing client: post-MVP (forms-overview.md D-4).
- Browsing or restoring older versions in the editor, and moving a single record to the latest version:
  post-MVP. In the MVP only "Atualizar todos" moves records between versions.
- Server-side drafts: the draft lives only in the open editor (forms-overview.md D-10).
- Audit events (RFC §6, "Auditoria") for deleting a template with its records, for "Atualizar todos", and for
  deleting clients and services: a separate audit spec, which is MVP (owner decision, 2026-11-09).

**Dependencies**
- This spec depends on no other spec (owner decision, 2026-11-09). SPEC-0002 depends on it and defines what goes
  inside `fields`: field types and attributes, the Field and FieldInput shapes (SPEC-0002 §7) and the field-level
  errors (SPEC-0002 §6). The system fields (§3.2) and the schema/metadata split (§3.3) moved here from SPEC-0002
  so that the dependency runs one way only. SPEC-0001 and SPEC-0002 are approved together, so the `fields`
  contract is approved with this spec (owner decision, 2026-11-09).
- Criteria whose Given has clients or services can seed those records directly. Criteria that read or display
  clients or services in their Then can be verified only once SPEC-0003 and SPEC-0004 are implemented:
  AC-0001-10, -12, -14, -20, -23, -24, -26, -27, -28, -31, -32 and -33.
- AC-0001-34, -57 and -58 also need a record with linked history, which only scheduling or payments can create.

## 3. Domain rules

### 3.1 Rules

- **R1.** Every template belongs to exactly one tenant and is visible only inside it. (RN-02, RN-20)
- **R2.** A template has a **type**, `client` or `service`. The type is required and cannot change after
  creation. (RF-37, RN-20. That the type cannot change after creation is not in the RFC; the owner approved it
  with AC-0001-07.)
- **R3.** A template has a **name**: required, trimmed, internal whitespace collapsed, 1–80 characters. (RN-20; the
  1–80 limit is an owner decision, §9 Q8)
- **R4.** Names are unique per tenant, ignoring case and accents, across active and archived templates
  of every type. (owner decision, §9 Q2: avoids two "Anamnese" in the same dropdown after unarchiving)
- **R5.** A template may have a **description**: optional, trimmed, at most 500 characters. (RF-37; the 500 limit
  is an owner decision, §9 Q8)
- **R6.** Every template always contains the system fields of its type (§3.2). What can change about a system
  field is in SPEC-0002 R3. A template with only system fields is valid. (`assumption`, D-2)
- **R7.** A template has a status, `active` or `archived`. Only active templates can create new records.
  Existing records of an archived template stay readable and editable. (RN-24; owner decision, §9 Q3)
- **R8.** Deleting a template that has records asks whether to delete those records too:
  - **Yes**: the template, all its versions and every client or service created from it are deleted
    permanently, after the template name is typed (R9). This option exists only while **no** record of the
    template has linked history (appointments, payments).
  - **No**: the template is archived instead (R7). Nothing is deleted, and it no longer shows on `/forms` by
    default.

  If any record of the template has linked history, only archiving is offered, and the server rejects a delete
  that asks to delete the records. A template without records is deleted directly, after the same typed
  confirmation. (owner decision D-13 and §9 Q7; RF-39, RN-05, RN-06, RN-24, RN-25)
- **R9.** Deleting a template, with or without its records, needs typed confirmation of its name, and the server
  checks the typed name in both cases. The server compares the typed name with the template name after trimming
  leading and trailing spaces; otherwise the match is exact, including case and accents. Archiving needs a
  confirmation dialog. (RN-25; owner decisions for the server check and the comparison)
- **R10.** Saving is all-or-nothing: metadata changes, the published version and any migration are stored
  together, or nothing is. (RN-21; owner decision, §9 Q9)
- **R11.** Every save states the template **revision** it was based on. A save based on an outdated revision is
  rejected and never silently overwrites newer changes. The revision goes up on every stored change (metadata,
  publication, archive, unarchive). It is not the published version number. (forms-overview.md D-10)
- **R12.** A version has at most 100 fields, system fields included. (abuse limit; owner decision, §9 Q10)
- **R13.** Saving a new template publishes **version 1**. (RF-39, RN-21)
- **R14.** Changes are either **schema** changes or **metadata** changes (§3.3). Applying schema changes
  publishes the next version. Metadata changes (template name, description, field labels, help text, protected
  flag, option labels) apply to every version at once and publish nothing. A save without schema changes
  publishes no version. (RF-39, D-10)
- **R15.** Published versions are immutable and retained for as long as the template exists. (RN-21)
- **R16.** New records use the latest published version at the moment they are created. Existing records are
  displayed and validated against the version they are linked to (SPEC-0003). (RF-40, RN-21)
- **R17.** When schema changes are applied while the template has records, the professional must choose:
  - **Manter existentes**: publishes the new version; every existing record stays linked to its version.
  - **Atualizar todos**: publishes the new version and migrates **every** record of the template, on any older
    version, to it (SPEC-0003 R13). Publication and migration succeed or fail together (R10).

  With zero records, the professional only confirms the publication. (RN-21, D-10)
- **R18.** If "Atualizar todos" would delete answers (answers to fields or `select` options absent from the new
  version), the dialog says how many records lose answers, and the professional must type the template name to
  confirm, compared as in R9. The server rejects the migration without that confirmation. (RN-25, D-10)
- **R19.** A tenant has at most 200 templates, counting active and archived templates of every type, the default
  templates included. Creating one more is rejected. (owner decision, §9 Q11)

### 3.2 System fields

Moved from SPEC-0002 §3.2 in v0.6. Every template carries the system fields of its type (R6), inserted in this
default order. There is no notes system field: "Observações" is an ordinary custom `long_text` field (RF-07 as
amended; owner decision, 2026-11-09, forms-overview.md C-2).

| Template type | System key | Default label | Type | Required |
| --- | --- | --- | --- | --- |
| client | `client.name` | Nome completo | `full_name` | always (RN-04) |
| client | `client.email` | E-mail | `email` | always (RN-04; §9 Q12) |
| client | `client.phone` | Telefone | `phone` | professional chooses (RF-07; system field by owner decision D-14) |
| service | `service.name` | Nome | `text` | always (RN-06) |
| service | `service.duration` | Duração (minutos) | `duration` | always (RN-06) |
| service | `service.price` | Preço | `money` | always (RN-06) |

### 3.3 Schema and metadata

Moved from SPEC-0002 §3.5 in v0.6. This table decides whether a save publishes a version (R14).

| Schema: publishes a new version | Metadata: applies to every version, publishes nothing |
| --- | --- |
| Adding or removing a field | Template name and description |
| Field type (SPEC-0002 R12: a new type is a new field) | Field label and help text |
| Required on or off | "Dado protegido" on or off (SPEC-0002 R5–R7 still apply) |
| Adding or removing a `select` option | Renaming a `select` option |
| Field order | |

Protection is metadata on purpose: whether a value is hidden must never depend on which version a record is on.
(owner decision, forms-overview.md D-10)

## 4. Behavior

### 4.1 List templates (`/forms`)
1. The professional opens `/forms`.
2. The system shows the tenant's templates grouped by type ("Clientes", "Serviços"), sorted by name ignoring case
   and accents. Each row shows name, description (truncated), number of fields, number of records created from
   it, and an "Arquivado" badge when archived.
3. Archived templates are hidden by default. A "Mostrar arquivados" toggle shows them.

### 4.2 Create a template from `/forms`
1. The professional presses **[Novo]**.
2. The system opens a blank editor (`/forms/new`) with: type (required, no default), name (empty), description
   (empty). Choosing a type inserts that type's system fields (§3.2) in their default order.
3. Changing the type before the first save replaces the system fields. Custom fields already added are kept.
4. The professional adds and arranges fields (SPEC-0002) and presses **[Salvar]**.
5. The system validates everything and publishes version 1 (R13). It shows "Modelo publicado" and stays on the
   editor, now at `/forms/:id`, with the badge "Versão 1".
6. If the tenant already has 200 templates (R19), nothing is stored and the editor shows "Limite de 200 modelos
   atingido. Exclua um modelo para criar outro." The draft stays on screen.
7. Leaving the editor with unsaved changes asks for confirmation ("Descartar alterações?").

### 4.3 Create a template from `/clients` or `/services` (shortcut)
1. In the **[Novo]** dropdown of `/clients`, the professional picks **"Criar novo modelo"** (SPEC-0004 §4.2).
2. The system opens the same editor with type preset to `client` and locked, and with the client system fields
   inserted.
3. On **[Salvar]**, the system stores the template and goes straight to creating a new client with it
   (SPEC-0003 §4.1). This removes one step for the most common reason to create a template.
4. On **[Cancelar]**, the system returns to `/clients` and stores nothing.

The same applies to `/services` with type `service`.

### 4.4 Edit a template
1. The professional opens a template from `/forms`. The editor shows the latest version's fields, the badge
   "Versão N", and "X cadastros nesta versão · Y em versões anteriores". If the template cannot be loaded, the
   editor shows "Não foi possível carregar o modelo." with a retry button. An unknown id shows "Modelo não
   encontrado."
2. Name, description and fields are editable. Type is shown read-only. Edits stay in the editor (the draft) until
   saved.
3. On **[Salvar]**:
   - **Only metadata changed** (R14): the changes are stored, the version stays the same, and the toast says
     "Alterações salvas".
   - **Schema changed, template has no records**: a dialog asks "Publicar versão N+1?" On [Publicar], the version
     is published and the toast says "Versão N+1 publicada". While it runs, the dialog cannot be closed. If it
     fails, nothing is published, the dialog stays open and says "Não foi possível publicar a versão. Nada foi
     alterado."
   - **Schema changed, template has records**: the **Apply** dialog (4.7) opens.
4. If the template changed elsewhere since it was opened (another tab), the save is rejected (R11) and the editor
   shows "Este modelo foi alterado em outra janela. Recarregue para ver a versão atual." The local edits stay on
   screen until the professional reloads.
5. If a save fails unexpectedly, nothing is stored (R10). The editor shows "Não foi possível salvar as
   alterações. Nada foi alterado." and the draft stays on screen.

### 4.5 Archive and unarchive
1. From the editor or the list, the professional chooses **"Arquivar"** and confirms (R9).
2. The template disappears from the **[Novo]** dropdowns of `/clients` and `/services` and from the default
   `/forms` view. Records created from it are unaffected.
3. **"Desarquivar"** makes it active again, and the toast says "Modelo desarquivado". Because names are unique
   across active and archived templates (R4), unarchiving never creates a duplicate name.
4. While archiving or unarchiving runs, its button is disabled. If it fails, the template keeps its status and
   the professional sees "Não foi possível arquivar o modelo." or "Não foi possível desarquivar o modelo."

### 4.6 Delete
1. The professional chooses **"Excluir"** from the editor or the list. The dialog shown depends on the template's
   record counts (`recordCount`, `recordsWithHistory`, §7).
2. **No records**: the dialog asks for the template name (R9). On confirm, the template, all its versions and
   their fields are removed permanently. The server rejects the delete if the typed name does not match.
3. **With records, none with linked history**: the dialog says "Este modelo tem N cadastros. Deseja excluir também
   esses cadastros?" and offers:
   - **"Sim, excluir tudo"**: the dialog then says "O modelo e os N cadastros serão excluídos permanentemente." and
     asks for the template name. [Excluir] stays disabled until the name matches (R9). On confirm, the
     template, its versions and all its clients or services are removed permanently, and the toast says "Modelo e
     N cadastros excluídos".
   - **"Não, arquivar o modelo"**: the template is archived (4.5), without a second confirmation, and the toast
     says "Modelo arquivado".
   - [Cancelar] closes the dialog and changes nothing.
4. **Some records have linked history** (appointments, payments): the dialog says "Este modelo tem N cadastros, e
   alguns têm histórico de atendimentos ou pagamentos. Cadastros com histórico não podem ser excluídos." and
   offers only **"Arquivar o modelo"** and [Cancelar] (R8). "Arquivar o modelo" behaves as in step 3.
5. If the records changed after the dialog opened, the server answers 409 `form.in-use` or
   `form.records-have-history` and deletes nothing. The dialog reloads the template, says "Os cadastros deste
   modelo mudaram. Revise antes de continuar." and shows the step that matches the new counts (3 or 4).
6. While a delete runs, the dialog cannot be closed. If it fails unexpectedly, nothing is deleted and the dialog
   says "Não foi possível excluir o modelo. Nada foi excluído."

### 4.7 Apply dialog
1. The dialog title is "Aplicar alterações". It summarises the schema changes from the change preview (§7: added,
   removed and changed fields, e.g. "2 campos adicionados, 1 removido, 1 alterado") and how many records each
   choice affects.
2. It offers two options, none preselected:
   - **"Manter existentes"**: "Os N cadastros atuais continuam na versão em que estão. Novos cadastros usarão a
     versão N+1."
   - **"Atualizar todos"**: "Todos os N cadastros passam para a versão N+1."
3. If "Atualizar todos" is selected and some records would lose answers (R18), the dialog adds: "M cadastros têm
   respostas em campos removidos. Essas respostas serão excluídas." and a text input "Digite o nome do modelo para
   confirmar". [Aplicar] stays disabled until the name matches (R9).
4. If "Atualizar todos" is selected and the new version adds required fields, the dialog adds: "K cadastros
   ficarão com preenchimento pendente." (SPEC-0003 R6)
5. On [Aplicar], the system publishes and, for "Atualizar todos", migrates. While it runs, the dialog shows
   "Aplicando…" and cannot be closed. On success the toast says "Versão N+1 publicada". On failure nothing is
   published, no record changes, and the dialog says "Não foi possível aplicar as alterações. Nada foi alterado."
6. [Cancelar] closes the dialog and keeps the draft in the editor.

## 5. Permissions and tenant isolation

MVP tenants have a single role, `owner` (`api-convention.md`, Tenant context). Collaborators are post-MVP
(RF-05, RF-06, RN-03).

| Action | Unauthenticated | Member | Owner | Other tenant |
| --- | --- | --- | --- | --- |
| List templates | 401 | — (post-MVP) | 200, active tenant's templates only | 404 `tenant.not-found` |
| Read one template | 401 | — | 200 | 404 `form.not-found` |
| Read a published version | 401 | — | 200 | 404 `form.not-found` |
| Preview changes | 401 | — | 200 | 404 `form.not-found` |
| Create template | 401 | — | 201 | 404 `tenant.not-found` |
| Update template | 401 | — | 200 | 404 `form.not-found` |
| Archive / unarchive | 401 | — | 200 | 404 `form.not-found` |
| Delete template | 401 | — | 204 | 404 `form.not-found` |

"Other tenant" means two cases. A tenant context the caller has no membership in returns `tenant.not-found`. A
template id that exists but belongs to a different tenant than the active one returns `form.not-found`, the same
as an id that does not exist.

Every action above is tenant-scoped and follows `api-convention.md`, Tenant context: a request without tenant
context returns 400 `tenant.required`, and a request whose active tenant is inactive (suspended) returns 403
`tenant.inactive`.

A malformed template id or version number is treated like one that does not exist (404), as `api-convention.md`
does for malformed tenant ids.

## 6. Errors

| Situation | Status | `error` key | `field` |
| --- | --- | --- | --- |
| Name missing or blank | 422 | `formName.required` | `name` |
| Name over 80 characters | 422 | `formName.max` | `name` |
| Name already used in tenant (R4) | 409 | `formName.taken` | `name` |
| Description over 500 characters | 422 | `formDescription.max` | `description` |
| Type missing or not `client`/`service` on create, or `type` filter not `client`/`service` on list | 422 | `formType.invalid` | `type` |
| `includeArchived` filter not `true`/`false` on list | 422 | `includeArchived.invalid` | `includeArchived` |
| Type sent on update | 422 | `formType.immutable` | `type` |
| More than 100 fields | 422 | `formFields.max` | `fields` |
| Tenant already has 200 templates (R19) | 400 | `form.limit-reached` | — |
| Revision missing on update or preview | 422 | `formRevision.required` | `revision` |
| Update or preview based on an outdated revision | 409 | `form.revision-conflict` | `revision` |
| Schema changed while records exist, and no migration mode | 400 | `migration.mode-required` | `migration.mode` |
| Migration mode not `keep` / `update_all` | 422 | `migration.mode-invalid` | `migration.mode` |
| "Atualizar todos" deletes answers and the typed name is missing or wrong | 400 | `migration.confirmation-required` | `migration.confirmName` |
| Publication or migration fails unexpectedly; nothing is stored (R10) | 500 | `unexpected` (existing) | — |
| Template id unknown, malformed or in another tenant | 404 | `form.not-found` | — |
| Version number is not a published version of the template, or not a positive integer | 404 | `formVersion.not-found` | — |
| Delete, with or without records, and the typed name is missing or wrong (R9) | 400 | `deleteConfirmation.required` | `confirmName` |
| Delete while records exist, without `deleteRecords: true` | 409 | `form.in-use` | — |
| `deleteRecords: true` but some record has linked history (R8) | 409 | `form.records-have-history` | — |
| Archive an archived / unarchive an active template | 409 | `form.status-unchanged` | — |

A delete runs its checks in this order and returns the first failure: 404 `form.not-found`, then 400
`deleteConfirmation.required`, then 409 `form.in-use`, then 409 `form.records-have-history`. (owner decision,
2026-11-09)

Field-level errors are in SPEC-0002 §6; they apply to updates and previews alike. Every key needs pt-BR and en-US
copy under `validation`.

## 7. Contract impact

New, non-breaking. Consumers: `apps/web` (BFF and pages).

- **FormTemplate** (single read, create and update responses): `id` (uuid), `type` (`client | service`),
  `name` (string), `description` (string | null), `status` (`active | archived`), `version` (int, latest
  published), `revision` (int, R11), `recordCount` (int), `recordsOnOlderVersions` (int), `recordsWithHistory`
  (int, records with linked history, R8), `fields` (Field[] of the latest version in display order, SPEC-0002
  §7), `createdAt`, `updatedAt` (ISO-8601 UTC).
- **FormTemplateSummary** (list item): `id`, `type`, `name`, `description`, `status`, `version`, `fieldCount`,
  `recordCount`, `recordsWithHistory`, `updatedAt`.
- **List**: `{ forms: FormTemplateSummary[] }`, optional query `type` (`client | service`), `includeArchived`
  (boolean, default false). There is no pagination: a tenant has at most 200 templates (R19), so the list is
  bounded. Cursor pagination applies to records.
- **Create request**: `type`, `name`, `description?`, `fields` (FieldInput[], SPEC-0002 §7).
- **Update request**: `revision` (required), `name?`, `description?`, `fields?` (full list of the next version),
  `migration?` (`{ mode: "keep" | "update_all", confirmName?: string }`, required when R17 applies).
- **Change preview** (for the Apply dialog): request `revision`, `fields`. Response `schemaChanged` (bool),
  `nextVersion` (int), `recordCount`, `recordsLosingAnswers`, `recordsGainingRequiredFields` (int), and the
  schema changes per field:
  - `added`: `{ label, type, required }[]`. New fields, including the new field created by a type change
    (SPEC-0002 R12).
  - `removed`: `{ id, label, valueCount }[]`. Fields absent from the next version, including the field replaced by
    a type change.
  - `changed`: `{ id, label, changes }[]`. Fields kept in the next version with at least one schema change.
    `changes` lists one or more of `required` (required turned on or off), `options` (`select` options added or
    removed) and `position` (its place relative to the other kept fields changed).

  Metadata changes (§3.3) appear in none of the three lists. The preview stores nothing and does not change the
  revision. It validates `revision` and `fields` like an update (§6).
- **Version read** (for records on older versions, SPEC-0003): `{ version, fields }` for one published version,
  addressed by version number. A number that is not a published version returns 404 `formVersion.not-found`.
- **Archive / unarchive**: no body, return FormTemplate.
- **Delete**: body `{ deleteRecords?: boolean, confirmName?: string }`, 204. A matching `confirmName` is always
  required (R9). With records, `deleteRecords: true` is also required, and it is rejected when any record has
  linked history (R8). The checks run in the order given in §6. The dialog's "Não" and "Arquivar o modelo" call
  archive, not delete.

`api-convention.md` has no PUT or DELETE convention yet. `/plan` must propose one for delete and the
archive actions.

## 8. UI states

| Screen | State | Behavior | Copy key |
| --- | --- | --- | --- |
| `/forms` | loading | Skeleton rows | `forms.list.loading` |
| `/forms` | empty (no templates of a type) | "Nenhum modelo de cliente ainda." + [Novo] | `forms.list.empty` |
| `/forms` | error | "Não foi possível carregar os modelos." + retry | `forms.list.error` |
| `/forms` | success | Grouped list (4.1) | `forms.list.title` |
| Editor | loading | Skeleton of header and 3 field rows | `forms.editor.loading` |
| Editor | load error | "Não foi possível carregar o modelo." + retry | `forms.editor.loadError` |
| Editor | not found | "Modelo não encontrado." + back to `/forms` | `forms.editor.notFound` |
| Editor | unsaved changes | [Salvar] enabled, leave prompt active | `forms.editor.unsaved` |
| Editor | saving | [Salvar] disabled with spinner, inputs read-only | `forms.editor.saving` |
| Editor | save failed | Banner "Não foi possível salvar as alterações. Nada foi alterado."; draft kept | `forms.editor.saveFailed` |
| Editor | published v1 | Toast "Modelo publicado" + badge "Versão 1" | `forms.editor.published` |
| Editor | metadata saved | Toast "Alterações salvas" | `forms.editor.saved` |
| Editor | version badge and record counts | "Versão N" · "X cadastros nesta versão · Y em versões anteriores" | `forms.editor.version`, `forms.editor.recordCounts` |
| Publish dialog | no records | "Publicar versão N+1?" | `forms.publish.confirm` |
| Publish dialog | publishing | [Publicar] disabled with spinner; the dialog cannot be closed | `forms.publish.publishing` |
| Publish dialog | failed | "Não foi possível publicar a versão. Nada foi alterado."; dialog stays open, draft kept | `forms.publish.failed` |
| Apply dialog | choose | Two options, none preselected; [Aplicar] disabled until one is chosen | `forms.apply.title`, `forms.apply.keep`, `forms.apply.updateAll` |
| Apply dialog | answers will be deleted | Warning + typed name enables [Aplicar] | `forms.apply.answersDeleted`, `forms.apply.typeName` |
| Apply dialog | pending required fields | "K cadastros ficarão com preenchimento pendente." | `forms.apply.pendingRequired` |
| Apply dialog | applying | "Aplicando…", cannot be closed | `forms.apply.applying` |
| Apply dialog | failed | "Não foi possível aplicar as alterações. Nada foi alterado." | `forms.apply.failed` |
| Toast | version published | "Versão N publicada" | `forms.toast.versionPublished` |
| Editor | validation error | Inline message under the field, focus moves to the first error | `validation.*` |
| Editor | template limit reached | Message above [Salvar] (4.2 step 6); nothing stored, draft kept | `validation.form.limit-reached` |
| Editor | revision conflict | Banner (4.4 step 4) with [Recarregar] | `forms.editor.conflict` |
| Editor | no type chosen | Field list hidden, "Escolha o tipo para começar" | `forms.editor.chooseType` |
| Editor | archived | Banner "Modelo arquivado" + [Desarquivar]; still editable | `forms.editor.archived` |
| Archive dialog | confirm | "Arquivar modelo? Cadastros existentes não são afetados." | `forms.archive.confirm` |
| Archive dialog | archiving | [Arquivar] disabled with spinner | `forms.archive.archiving` |
| Archive dialog | failed | "Não foi possível arquivar o modelo."; status unchanged | `forms.archive.failed` |
| Editor / list | unarchiving | [Desarquivar] disabled with spinner | `forms.unarchive.unarchiving` |
| Editor / list | unarchive failed | Toast "Não foi possível desarquivar o modelo."; status unchanged | `forms.unarchive.failed` |
| Toast | unarchived | "Modelo desarquivado" | `forms.toast.unarchived` |
| Delete dialog | no records | Typed name required to enable [Excluir] | `forms.delete.confirm` |
| Delete dialog | with records: choose | "Este modelo tem N cadastros…" + "Sim, excluir tudo" / "Não, arquivar o modelo" | `forms.delete.withRecords` |
| Delete dialog | with records: confirm | Warning + typed name enables [Excluir] | `forms.delete.confirmWithRecords` |
| Delete dialog | records have history | Explanation (4.6 step 4) + only "Arquivar o modelo" / [Cancelar] | `forms.delete.recordsHaveHistory` |
| Delete dialog | records changed | "Os cadastros deste modelo mudaram. Revise antes de continuar." + the step that matches (4.6 step 5) | `forms.delete.recordsChanged` |
| Delete dialog | deleting | [Excluir] disabled with spinner; the dialog cannot be closed | `forms.delete.deleting` |
| Delete dialog | failed | "Não foi possível excluir o modelo. Nada foi excluído." | `forms.delete.failed` |
| Toast | deleted with records / archived | "Modelo e N cadastros excluídos" / "Modelo arquivado" | `forms.toast.deletedWithRecords`, `forms.toast.archived` |

## 9. Open questions

| # | Question | Proposed answer | Blocks |
| --- | --- | --- | --- |
| 1 | ~~RFC conflicts C-1, C-3.~~ | **Resolved:** the RFC marks forms MVP and the type binding (RF-37, RN-20). | — |
| 2 | ~~Should names be unique per tenant (R4), per type, or not at all?~~ | **Decided (owner, 2026-11-09):** per tenant, across types and archived templates. | — |
| 3 | ~~Should an archived template's records still be editable (R7)?~~ | **Decided (owner, 2026-11-09):** yes. Archiving only stops new records. | — |
| 4 | ~~Default templates per tenant.~~ | **Decided (D-6):** yes, "Cliente" and "Serviço". | — |
| 5 | ~~Delete and archive endpoint convention (no DELETE convention exists).~~ | **Decided (owner, 2026-11-09):** `POST /forms/:id/delete` with a JSON body, no `DELETE` fallback; `POST /forms/:id/archive` and `/unarchive`. The delete rule is recorded in `api-convention.md`. | — |
| 6 | ~~Should a single record be movable to the latest version on its own ("Atualizar este cadastro")?~~ | **Decided (owner, 2026-11-09):** not in the MVP (§2). Only "Atualizar todos" moves records. | — |
| 7 | ~~If some records of the template have history (appointments, payments), what does "Sim, excluir tudo" do?~~ | **Decided (owner, 2026-11-09):** it is not offered; only archiving is (R8). | — |
| 8 | ~~Are the name limit of 1–80 characters (R3) and the description limit of 500 (R5) right?~~ | **Decided (owner, 2026-11-09):** yes. | — |
| 9 | ~~Should a save be all-or-nothing (R10)?~~ | **Decided (owner, 2026-11-09):** yes. | — |
| 10 | ~~Is 100 fields per version, system fields included, the right cap (R12)?~~ | **Decided (owner, 2026-11-09):** yes. | — |
| 11 | ~~How many templates can a tenant have?~~ | **Decided (owner, 2026-11-09):** at most 200, active and archived (R19), so the list is not paginated. | — |
| 12 | ~~RN-04 makes client e-mail required, but some clients have none (children, elderly). Keep it?~~ (Moved from SPEC-0002 §9 Q3 together with §3.2.) | **Decided (owner, 2026-11-09):** keep it required, per RN-04. | — |

## 10. Acceptance criteria

### Agreed criteria

These follow from the RFC or from decisions the owner has already taken (forms-overview.md §3 and §9 of this
spec). The owner approved AC-0001-01, -07, -08, -14 and -20 to -33 as written on 2026-11-09, and AC-0001-05,
the rewording of AC-0001-12, -14 and -18, and the index fix in AC-0001-09 in the second review round the same
day, and the rewording of AC-0001-02 as an API request in the third round. The owner approved AC-0001-34 to
-79 as written on 2026-11-09, after the third round.

```
AC-0001-01
Given an owner of tenant "studio-ana" on the template editor
When  they choose type "client", name "Anamnese inicial", and press Salvar
Then  the response is 201 with type "client", status "active", version 1, revision 1
And   its fields are exactly the client system fields in default order (§3.2)
```

```
AC-0001-02
Given an owner of tenant "studio-ana"
When  they send a create request with name "Ficha" and no type
Then  the response is 422 with { "error": "formType.invalid", "field": "type" }
And   no template is stored
```

```
AC-0001-03
Given an owner on a new template editor with type "client"
When  they save with name "   "
Then  the response is 422 with { "error": "formName.required", "field": "name" }
```

```
AC-0001-04
Given an owner on a new template editor with type "client"
When  they save with a name of 81 characters
Then  the response is 422 with { "error": "formName.max", "field": "name" }
```

```
AC-0001-05
Given tenant "studio-ana" has an archived service template named "Anamnese"
When  its owner creates a client template named " anamnése "
Then  the response is 409 with { "error": "formName.taken", "field": "name" }
```

```
AC-0001-06
Given tenant "studio-bia" has a template named "Anamnese"
When  the owner of "studio-ana" creates a template named "Anamnese"
Then  the response is 201
```

```
AC-0001-07
Given a client template at revision 3
When  its owner sends an update containing "type": "service"
Then  the response is 422 with { "error": "formType.immutable", "field": "type" }
And   the template is still type "client" at revision 3
```

```
AC-0001-08
Given a template at revision 3, opened in two tabs
When  tab A saves (revision becomes 4) and then tab B saves with revision 3
Then  tab B receives 409 with { "error": "form.revision-conflict", "field": "revision" }
And   the stored template matches tab A's save
And   tab B shows the conflict banner with copy key forms.editor.conflict
```

```
AC-0001-09
Given an owner editing a client template named "Ficha" whose fields are client.name, client.email, client.phone and custom field "Objetivo"
When  they save name "Ficha nova" with a blank label on "Objetivo" (index 3 of fields)
Then  the response is 422 with { "error": "fieldLabel.required", "field": "fields.3.label" }
And   the stored name is still "Ficha"
```

```
AC-0001-10
Given an owner on /clients
When  they choose "Criar novo modelo", enter name "Ficha nutricional" and press Salvar
Then  the stored template has type "client"
And   the browser shows the new-client page using "Ficha nutricional"
```

```
AC-0001-11
Given an owner on /clients who chose "Criar novo modelo"
When  they press Cancelar
Then  the browser returns to /clients
And   no template is stored
```

```
AC-0001-12
Given an active client template "Ficha nutricional" with a client created from it
When  its owner archives it
Then  the response is 200 with status "archived"
And   "Ficha nutricional" no longer appears in the Novo dropdown on /clients
And   reading that client returns 200, and updating it returns 200
```

```
AC-0001-13
Given a template with no records
When  its owner deletes it after typing its exact name
Then  the response is 204
And   reading it afterwards returns 404 with { "error": "form.not-found" }
```

```
AC-0001-14
Given a template "Ficha" with one client created from it
When  its owner sends a delete request with confirmName "Ficha" and without deleteRecords
Then  the response is 409 with { "error": "form.in-use" }
And   the template and the client still exist
```

```
AC-0001-15
Given a template id that belongs to tenant "studio-bia"
When  the owner of "studio-ana" reads, updates, archives or deletes it with "studio-ana" as active tenant
Then  each response is 404 with { "error": "form.not-found" }
And   the template in "studio-bia" is unchanged
```

```
AC-0001-16
Given a request with no access token
When  it lists templates
Then  the response is 401
```

```
AC-0001-17
Given an owner whose tenant has one active and one archived template
When  they open /forms without "Mostrar arquivados"
Then  only the active template is listed
And   enabling the toggle lists both, the archived one with the "Arquivado" badge
```

```
AC-0001-18
Given an owner on the editor with unsaved changes
When  they follow a link to another page inside the app
Then  a confirmation with copy key forms.editor.unsaved is shown
And   choosing to stay keeps their changes on screen
```

```
AC-0001-19
Given an owner saving a template with 101 fields
When  the request is sent
Then  the response is 422 with { "error": "formFields.max", "field": "fields" }
```

```
AC-0001-20
Given a client template at version 2 with 5 clients
When  its owner renames the template, relabels a field and turns its protected flag on, and saves
Then  the response is 200 with version 2 and the revision increased by 1
And   no Apply dialog was shown
And   all 5 clients still report form version 2
```

```
AC-0001-21
Given a client template at version 1 with no clients
When  its owner adds a custom field and saves
Then  the dialog with copy key forms.publish.confirm is shown, without migration options
And   after [Publicar] the response is 200 with version 2
```

```
AC-0001-22
Given a client template at version 1 with 3 clients
When  its owner adds a custom field and the update request has no migration
Then  the response is 400 with { "error": "migration.mode-required", "field": "migration.mode" }
And   the template is still at version 1
```

```
AC-0001-23
Given a client template at version 1 with 3 clients
When  its owner adds field "Objetivo" and applies with "Manter existentes"
Then  the response is 200 with version 2
And   the 3 clients still report form version 1 and show no "Objetivo" field
And   a client created afterwards reports form version 2 and shows "Objetivo"
```

```
AC-0001-24
Given a client template at version 3, with 2 clients on version 1 and 1 client on version 3
When  its owner adds field "Objetivo" and applies with "Atualizar todos"
Then  the response is 200 with version 4
And   all 3 clients report form version 4
```

```
AC-0001-25
Given a client template at version 1 named "Ficha", with 4 clients of which 2 have an answer for field "Hobby"
When  its owner removes "Hobby" and chooses "Atualizar todos"
Then  the Apply dialog says 2 records will lose answers (forms.apply.answersDeleted)
And   [Aplicar] stays disabled until "Ficha" is typed exactly
```

```
AC-0001-26
Given the situation of AC-0001-25
When  the update request has migration { "mode": "update_all" } without confirmName
Then  the response is 400 with { "error": "migration.confirmation-required", "field": "migration.confirmName" }
And   the template is still at version 1 and both "Hobby" answers still exist
```

```
AC-0001-27
Given the situation of AC-0001-25
When  the update request has migration { "mode": "update_all", "confirmName": "Ficha" }
Then  the response is 200 with version 2
And   all 4 clients report form version 2 and none has a "Hobby" answer
```

```
AC-0001-28
Given a client template at version 1 with 3 clients
And   migrating one of the clients fails during "Atualizar todos"
When  its owner applies a schema change with "Atualizar todos"
Then  the response is 500 with { "error": "unexpected" }
And   the template is still at version 1 and all 3 clients still report form version 1
And   the dialog shows copy key forms.apply.failed and the draft is still in the editor
```

```
AC-0001-29
Given a client template whose version 1 had field "Hobby", now at version 2 without it, applied with "Manter existentes"
When  its owner reads version 1 of the template
Then  the response contains version 1 with field "Hobby", unchanged
```

```
AC-0001-30
Given a client template "Ficha" with 3 clients and no history
When  its owner chooses "Excluir"
Then  the dialog with copy key forms.delete.withRecords offers "Sim, excluir tudo" and "Não, arquivar o modelo"
```

```
AC-0001-31
Given a client template "Ficha" with 3 clients and no history
When  its owner chooses "Sim, excluir tudo", types "Ficha" and confirms
Then  the response is 204
And   reading the template returns 404 with { "error": "form.not-found" }
And   reading each of the 3 clients returns 404 with { "error": "client.not-found" }
```

```
AC-0001-32
Given a client template "Ficha" with 3 clients
When  its owner chooses "Excluir" and then "Não, arquivar o modelo"
Then  the template has status "archived" and is not listed on /forms by default
And   the 3 clients still exist, unchanged
```

```
AC-0001-33
Given a client template "Ficha" with 3 clients
When  its owner sends a delete request with deleteRecords true and confirmName "ficha x"
Then  the response is 400 with { "error": "deleteConfirmation.required", "field": "confirmName" }
And   the template and the 3 clients still exist
```

```
AC-0001-34
Given a client template "Ficha" with a client that has a linked appointment (once scheduling exists)
When  its owner sends a delete request with deleteRecords true and confirmName "Ficha"
Then  the response is 409 with { "error": "form.records-have-history" }
And   nothing is deleted
```

```
AC-0001-35
Given a template "Ficha" with no records
When  its owner sends a delete request with confirmName "ficha x"
Then  the response is 400 with { "error": "deleteConfirmation.required", "field": "confirmName" }
And   reading the template still returns 200
```

```
AC-0001-36
Given a client template at version 2
When  its owner reads version 3 of it
Then  the response is 404 with { "error": "formVersion.not-found" }
```

```
AC-0001-37
Given a client template "Ficha" at version 1 and revision 4, with 4 clients of which 2 have an answer for field "Hobby"
When  its owner previews, with revision 4, a change that removes "Hobby" and adds a required field "Objetivo"
Then  the response is 200 with schemaChanged true, nextVersion 2, recordCount 4, recordsLosingAnswers 2 and recordsGainingRequiredFields 4
And   the template is still at version 1 and revision 4
```

```
AC-0001-38
Given a template at revision 4
When  its owner previews a change with revision 3
Then  the response is 409 with { "error": "form.revision-conflict", "field": "revision" }
```

```
AC-0001-39
Given a client template at revision 4 whose fields are client.name, client.email, client.phone and custom field "Objetivo"
When  its owner previews a change with a blank label on "Objetivo" (index 3 of fields)
Then  the response is 422 with { "error": "fieldLabel.required", "field": "fields.3.label" }
```

```
AC-0001-40
Given an archived template id that belongs to tenant "studio-bia"
When  the owner of "studio-ana", with "studio-ana" as active tenant, unarchives it, reads its version 1 or previews a change to it
Then  each response is 404 with { "error": "form.not-found" }
And   the template in "studio-bia" is still archived and unchanged
```

```
AC-0001-41
Given tenant "studio-ana" has a template "Anamnese" and tenant "studio-bia" has a template "Avaliação"
When  the owner of "studio-ana" lists templates with includeArchived true and "studio-ana" as active tenant
Then  the list contains "Anamnese"
And   the list does not contain "Avaliação"
```

```
AC-0001-42
Given a user who owns "studio-ana" and has no membership in "studio-bia"
When  they create a template with "studio-bia" as tenant context
Then  the response is 404 with { "error": "tenant.not-found" }
And   "studio-bia" has no new template
```

```
AC-0001-43
Given tenant "studio-ana" is suspended
When  its owner lists templates
Then  the response is 403 with { "error": "tenant.inactive" }
```

```
AC-0001-44
Given an owner on a new template editor with type "client" and name "Ficha"
When  they save with a description of 501 characters
Then  the response is 422 with { "error": "formDescription.max", "field": "description" }
```

```
AC-0001-45
Given a template at revision 3
When  its owner sends an update with name "Ficha nova" and no revision
Then  the response is 422 with { "error": "formRevision.required", "field": "revision" }
And   the template is unchanged at revision 3
```

```
AC-0001-46
Given a client template at version 1 with 3 clients
When  its owner adds a custom field and the update request has migration { "mode": "replace" }
Then  the response is 422 with { "error": "migration.mode-invalid", "field": "migration.mode" }
And   the template is still at version 1
```

```
AC-0001-47
Given an archived template
When  its owner archives it again
Then  the response is 409 with { "error": "form.status-unchanged" }
```

```
AC-0001-48
Given tenant "studio-ana" has 200 templates, some of them archived
When  its owner creates another template
Then  the response is 400 with { "error": "form.limit-reached" }
And   the tenant still has 200 templates
```

```
AC-0001-49
Given an archived client template "Ficha nutricional"
When  its owner unarchives it
Then  the response is 200 with status "active"
And   listing templates without includeArchived includes "Ficha nutricional"
```

```
AC-0001-50
Given an owner on a new template editor with type "client" and a custom field "Objetivo" added
When  they change the type to "service" before the first save
Then  the field list shows the service system fields (§3.2) and none of the client system fields
And   "Objetivo" is still in the field list
```

```
AC-0001-51
Given a client template at version 1 with 3 clients
When  its owner adds a required custom field, saves and selects "Atualizar todos" in the Apply dialog
Then  the dialog shows "3 cadastros ficarão com preenchimento pendente." with copy key forms.apply.pendingRequired
```

```
AC-0001-52
Given an owner whose tenant has active client templates "Ética", "anamnese" and "Ficha", and active service template "Serviço"
When  they open /forms
Then  the "Clientes" group lists "anamnese", "Ética", "Ficha" in that order
And   the "Serviços" group lists "Serviço"
```

```
AC-0001-53
Given an owner whose tenant has client templates and no service template
When  they open /forms
Then  the "Serviços" group shows copy key forms.list.empty with a [Novo] button
```

```
AC-0001-54
Given an owner on /forms
And   the template list request fails
When  the page renders
Then  it shows copy key forms.list.error with a retry button
And   pressing retry requests the list again
```

```
AC-0001-55
Given an owner of "studio-ana"
When  they open the editor for a template id that does not exist in "studio-ana"
Then  the editor shows copy key forms.editor.notFound with a link back to /forms
```

```
AC-0001-56
Given an owner who pressed [Aplicar] in the Apply dialog
When  they press Escape or click outside the dialog before the response arrives
Then  the dialog stays open with copy key forms.apply.applying
```

```
AC-0001-57
Given a client template "Ficha" with a client that has a linked appointment (once scheduling exists)
When  its owner chooses "Excluir"
Then  the dialog with copy key forms.delete.recordsHaveHistory offers only "Arquivar o modelo" and [Cancelar]
```

```
AC-0001-58
Given a client template with 3 clients, one of which has a linked appointment (once scheduling exists)
When  its owner reads the template and lists templates
Then  both responses report recordCount 3 and recordsWithHistory 1 for it
```

```
AC-0001-59
Given tenant "studio-ana" has client templates "Cliente" and "Ficha" and service template "Serviço"
When  its owner lists templates with type "client"
Then  the list contains exactly "Cliente" and "Ficha"
```

```
AC-0001-60
Given an owner of "studio-ana"
When  they list templates with type "plan"
Then  the response is 422 with { "error": "formType.invalid", "field": "type" }
```

```
AC-0001-61
Given an owner of "studio-ana"
When  they list templates with includeArchived "maybe"
Then  the response is 422 with { "error": "includeArchived.invalid", "field": "includeArchived" }
```

```
AC-0001-62
Given an authenticated owner
When  they list templates without a tenant context
Then  the response is 400 with { "error": "tenant.required" }
```

```
AC-0001-63
Given an owner opening an existing template in the editor
And   reading the template fails with a server error
When  the editor renders
Then  it shows copy key forms.editor.loadError with a retry button
And   pressing retry reads the template again
```

```
AC-0001-64
Given an owner on the editor who changed only the template name
When  they press Salvar and the response is 500
Then  the editor shows copy key forms.editor.saveFailed
And   the changed name is still in the editor
```

```
AC-0001-65
Given an owner in the dialog with copy key forms.publish.confirm
When  they press [Publicar] and the response is 500
Then  the dialog stays open with copy key forms.publish.failed
And   the draft is still in the editor
```

```
AC-0001-66
Given an owner in the dialog with copy key forms.archive.confirm
When  they confirm and the response is 500
Then  the dialog shows copy key forms.archive.failed
And   the template is still shown as active
```

```
AC-0001-67
Given an owner in the delete dialog who typed the template name
When  they press [Excluir] and the response is 500
Then  the dialog shows copy key forms.delete.failed
And   the template is still listed on /forms
```

```
AC-0001-68
Given an owner in the delete dialog of a template that had no records when the dialog opened
And   a client was created from that template since then
When  they type the template name and press [Excluir]
Then  the dialog shows copy key forms.delete.recordsChanged with the options "Sim, excluir tudo" and "Não, arquivar o modelo"
And   the template still exists
```

```
AC-0001-69
Given an owner viewing an archived template in the editor
When  they press [Desarquivar] and the response is 500
Then  a toast with copy key forms.unarchive.failed is shown
And   the "Modelo arquivado" banner is still shown
```

```
AC-0001-70
Given a template "Ficha" with no records
When  its owner sends a delete request with confirmName "ficha"
Then  the response is 400 with { "error": "deleteConfirmation.required", "field": "confirmName" }
And   reading the template still returns 200
```

```
AC-0001-71
Given a client template at version 1 and revision 4 with custom fields "Hobby" and "Objetivo", "Objetivo" not required
When  its owner previews, with revision 4, a change that removes "Hobby", adds a "text" field "Peso" and makes "Objetivo" required
Then  the response lists "Peso" under added, "Hobby" under removed, and "Objetivo" under changed with changes ["required"]
```

```
AC-0001-72
Given an owner of "studio-ana"
When  they read the template with id "abc"
Then  the response is 404 with { "error": "form.not-found" }
```

```
AC-0001-73
Given a client template at version 2
When  its owner reads its version "abc"
Then  the response is 404 with { "error": "formVersion.not-found" }
```

```
AC-0001-74
Given tenant "studio-ana" has a template "Ficha" at revision 2 and a template "Anamnese"
When  its owner updates "Ficha" with name "anamnese" and revision 2
Then  the response is 409 with { "error": "formName.taken", "field": "name" }
And   the template is still named "Ficha" at revision 2
```

```
AC-0001-75
Given a template "Ficha" at revision 2
When  its owner updates it with name "FICHA" and revision 2
Then  the response is 200 with name "FICHA" and revision 3
```

```
AC-0001-76
Given a client template at version 3, with 2 clients on version 1 and 1 client on version 3
When  its owner reads the template
Then  the response has version 3, recordCount 3 and recordsOnOlderVersions 2
```

```
AC-0001-77
Given the template of AC-0001-76
When  its owner opens it in the editor
Then  the editor shows the badge "Versão 3" and copy key forms.editor.recordCounts with 1 record on this version and 2 on older versions
```

```
AC-0001-78
Given an owner opening /forms
When  the template list has not arrived yet
Then  the page shows skeleton rows with copy key forms.list.loading
```

```
AC-0001-79
Given an owner opening an existing template in the editor
When  the template has not arrived yet
Then  the editor shows a skeleton of the header and 3 field rows with copy key forms.editor.loading
```

## 11. Implementation plan

Drafted by `/plan` on 2026-11-09. `plan_status: Draft` until the owner approves it.

### Scope

```scope
packages/schemas/src/forms/*
packages/schemas/src/index.ts
packages/i18n/messages/pt-BR.json
packages/i18n/messages/en-US.json
apps/api/src/modules/forms/*
apps/api/src/shared/crypto/field-value.cipher.ts
apps/api/src/shared/crypto/field-value.cipher.spec.ts
apps/api/src/shared/http/zod-validation.pipe.ts
apps/api/src/config/app.routes.ts
apps/api/src/config/env.schema.ts
apps/api/src/app.module.ts
apps/api/src/database/schema/enums.ts
apps/api/src/database/schema/forms.ts
apps/api/src/database/schema/form-records.ts
apps/api/src/database/schema/index.ts
apps/api/drizzle/0002_forms_templates.sql
apps/api/drizzle/meta/*
apps/api/.env.example
apps/api/test/setup/env.ts
apps/api/test/setup/test-app.ts
apps/api/test/utils/forms-fixtures.ts
apps/api/test/e2e/forms*
apps/web/src/app/api/_lib/http.ts
apps/web/src/app/api/forms/*
apps/web/src/lib/api/forms.ts
apps/web/src/app/*/orgs/*/forms/*
apps/web/src/app/*/orgs/_components/sidebar/sidebar.tsx
apps/web/src/app/*/orgs/_components/shell.tsx
apps/web/src/components/ui/dialog.tsx
apps/web/src/components/ui/toast.tsx
apps/web/src/components/ui/skeleton.tsx
apps/web/src/hooks/use-leave-guard.ts
apps/web/tests/forms*
apps/web/tests/form-editor*
apps/web/tests/form-dialogs*
docs/schema.dbml
```

`apps/api/drizzle/meta/*` is in the lock because `drizzle-kit generate` writes it and `task-lock.sh check` reports
every changed file; `guard-paths.sh` still blocks hand edits there. Paths with `[lang]` and `[tenant]` are written with `*`, because the lock matches bash globs and
`[...]` would be read as a character class.

### Boundary with SPEC-0002 and SPEC-0003

- **This plan** builds the forms module: templates, versions, fields as stored data, the schema/metadata diff,
  publish, Apply ("Manter existentes" / "Atualizar todos"), archive, unarchive, delete, list, read, version read
  and preview. It also adds the whole Field / FieldInput contract (approved with this spec) and its shape-level
  checks, because AC-0001-09 and -39 expect `fieldLabel.required`.
- **SPEC-0002's plan** (next) adds the field domain rules (protection by type and label, locks, option counts and
  duplicates, `fieldType.immutable`, `systemField.locked`) to the `FieldPolicy` module created here, and the field
  editor controls (add, type, reorder, remove, "Dado protegido"). The editor shell here renders a field list
  whose add/remove controls SPEC-0002 provides. UI tests in this plan prepare drafts that already contain fields.
- **SPEC-0003's plan** builds the in-process record service (`RecordService`) on the record tables created here
  (`form_records`, `form_record_values`). The record endpoints that call it belong to SPEC-0004 and SPEC-0005
  (SPEC-0003 §2; owner, 2026-11-10, SPEC-0003 G-6). This plan only creates them and uses them to count, migrate
  and delete records, so the record criteria here can seed rows directly (§2 Dependencies).

### Contracts (`packages/schemas/src/forms/`)

New, non-breaking. Consumers: `apps/api`, `apps/web` (BFF routes and pages).

- `fields.ts`: `FIELD_TYPES` (SPEC-0002 §3.1 keys plus `duration`, `money`), `CUSTOM_FIELD_TYPES`, `SYSTEM_KEYS`
  per type (§3.2), `FieldSchema` (response, SPEC-0002 §7), `FieldInputSchema` (request). Shape checks only:
  label trimmed 1–80 (`fieldLabel.required`, `fieldLabel.max`), help text ≤ 200 (`fieldHelpText.max`), `type` in
  the catalog (`fieldType.invalid`), options `{ id?, label }` with label 1–80 (`fieldOptionLabel.required`,
  `.max`). Field and option ids, and `systemKey`, are plain strings in the contract: whether an id exists,
  malformed or not, and whether a system key belongs to the template's type, are `FieldPolicy` rules (400
  `field.unknown`, 422 `fieldOptionId.unknown`, 422 `systemField.locked`), so no uuid or system-key error key is
  needed.
- `text-key.ts`: `textKey(value)`, lowercase, accents stripped, whitespace trimmed and collapsed. One helper for
  `name_key` here and for label and option uniqueness in SPEC-0002.
- `requests.ts`: `FormIdSchema` (uuid; failure maps to 404 `form.not-found`), `FormVersionParamSchema` (positive
  integer; failure maps to 404 `formVersion.not-found`), `FormTypeSchema`, `FormNameSchema` (trim, collapse
  internal whitespace, 1–80), `FormDescriptionSchema` (trim, ≤ 500, blank becomes null),
  `CreateFormRequestSchema` (`type`, `name`, `description?`, `fields` ≤ 100 → `formFields.max`),
  `UpdateFormRequestSchema` (`revision` → `formRevision.required`, `name?`, `description?`, `fields?` ≤ 100 →
  `formFields.max`, `migration?` with `mode` → `migration.mode-invalid`; a `type` key → `formType.immutable`),
  `PreviewFormChangesRequestSchema` (`revision`, `fields` ≤ 100 → `formFields.max`; R12 applies to every request
  that carries `fields`), `ListFormsQuerySchema` (`type?` → `formType.invalid`,
  `includeArchived?` as `"true"`/`"false"` → `includeArchived.invalid`), `DeleteFormRequestSchema`
  (`deleteRecords?`, `confirmName?`).
- `responses.ts`: `FormTemplateSchema`, `FormTemplateSummarySchema`, `FormListResponseSchema`,
  `FormVersionResponseSchema`, `FormChangePreviewResponseSchema` (§7, including `added` / `removed` / `changed`).
- **Locks before SPEC-0002.** `FieldSchema` already has `requiredLock` and `sensitiveLock` (SPEC-0002 §7), and the
  BFF's `parseUpstream` answers 502 when a response misses them. Until SPEC-0002's `FieldPolicy.locks()` lands, the
  aggregate (API point 3) returns `requiredLock` true for system fields other than `client.phone` and false for
  every other field, and `sensitiveLock` null. SPEC-0002's plan replaces both with the full rules.
- `errors.ts`: `FORM_ERROR_CODES` (every key of §6) and `FIELD_ERROR_CODES` (every key of SPEC-0002 §6, so
  SPEC-0002 adds rules, not contract).
- `index.ts` re-exports. i18n: the `forms` namespace and the `validation.*` entries of the Copy table below, in
  pt-BR and en-US.

### Copy

Every §8 key, the labels §4 uses, and a `validation.*` entry for every key of §6 and SPEC-0002 §6 (owner,
2026-11-11). The spec gives pt-BR for only part of §4 and §8 and no en-US, so every en-US string, and every pt-BR
string marked **proposed**, is proposed; the owner approves them with this plan (Decision 5). Counts use ICU
plurals, as the existing messages do. [Salvar] and [Cancelar] reuse `common.save` and `common.cancel`;
`validation.unexpected` already exists.

| Key | pt-BR | en-US | Source |
| --- | --- | --- | --- |
| `forms.list.title` | Modelos de formulário | Form templates | **proposed** |
| `forms.list.loading` | Carregando modelos… | Loading templates… | **proposed** (accessible name of the skeleton) |
| `forms.list.empty` | Nenhum modelo de {type, select, client {cliente} other {serviço}} ainda. | No {type, select, client {client} other {service}} templates yet. | §8; service wording **proposed** |
| `forms.list.error` | Não foi possível carregar os modelos. | Couldn't load the templates. | §8 |
| `forms.list.groupClient` / `.groupService` | Clientes / Serviços | Clients / Services | §4.1 |
| `forms.list.archivedBadge` / `.showArchived` | Arquivado / Mostrar arquivados | Archived / Show archived | §4.1 |
| `forms.list.fieldCount` / `.recordCount` | {count, plural, one {# campo} other {# campos}} / {count, plural, one {# cadastro} other {# cadastros}} | {count, plural, one {# field} other {# fields}} / {count, plural, one {# record} other {# records}} | **proposed** (§4.1 row counts) |
| `forms.actions.new` / `.archive` / `.unarchive` / `.delete` / `.publish` / `.apply` / `.reload` | Novo / Arquivar / Desarquivar / Excluir / Publicar / Aplicar / Recarregar | New / Archive / Unarchive / Delete / Publish / Apply / Reload | §4, §8 |
| `forms.actions.retry` | Tentar novamente | Try again | **proposed** (retry in the §8 error states) |
| `forms.editor.type` / `.name` / `.description` | Tipo / Nome / Descrição | Type / Name / Description | §4.2 |
| `forms.editor.typeClient` / `.typeService` | Cliente / Serviço | Client / Service | **proposed** |
| `forms.editor.loading` | Carregando modelo… | Loading template… | **proposed** |
| `forms.editor.loadError` | Não foi possível carregar o modelo. | Couldn't load the template. | §8 |
| `forms.editor.notFound` | Modelo não encontrado. | Template not found. | §8 |
| `forms.editor.unsaved` | Descartar alterações? | Discard changes? | §4.2 step 7 |
| `forms.editor.saving` | Salvando… | Saving… | **proposed** |
| `forms.editor.saveFailed` | Não foi possível salvar as alterações. Nada foi alterado. | Couldn't save your changes. Nothing was changed. | §8 |
| `forms.editor.published` | Modelo publicado | Template published | §8 |
| `forms.editor.saved` | Alterações salvas | Changes saved | §8 |
| `forms.editor.version` | Versão {version} | Version {version} | §8 |
| `forms.editor.recordCounts` | {current, plural, one {# cadastro} other {# cadastros}} nesta versão · {older} em versões anteriores | {current, plural, one {# record} other {# records}} on this version · {older} on older versions | §8; plurals **proposed** |
| `forms.editor.conflict` | Este modelo foi alterado em outra janela. Recarregue para ver a versão atual. | This template was changed in another window. Reload to see the current version. | §4.4 step 4 |
| `forms.editor.chooseType` | Escolha o tipo para começar | Choose a type to start | §8 |
| `forms.editor.archived` | Modelo arquivado | Template archived | §8 |
| `forms.publish.confirm` | Publicar versão {version}? | Publish version {version}? | §8 |
| `forms.publish.publishing` | Publicando… | Publishing… | **proposed** |
| `forms.publish.failed` | Não foi possível publicar a versão. Nada foi alterado. | Couldn't publish the version. Nothing was changed. | §8 |
| `forms.apply.title` | Aplicar alterações | Apply changes | §4.7 |
| `forms.apply.summary` | {added, plural, one {# campo adicionado} other {# campos adicionados}}, {removed, plural, one {# removido} other {# removidos}}, {changed, plural, one {# alterado} other {# alterados}} | {added, plural, one {# field added} other {# fields added}}, {removed} removed, {changed} changed | §4.7 step 1; key and plurals **proposed** |
| `forms.apply.keep` / `.keepDescription` | Manter existentes / Os {count} cadastros atuais continuam na versão em que estão. Novos cadastros usarão a versão {next}. | Keep existing / The {count} current records stay on their version. New records will use version {next}. | §4.7 step 2; `keepDescription` key **proposed** |
| `forms.apply.updateAll` / `.updateAllDescription` | Atualizar todos / Todos os {count} cadastros passam para a versão {next}. | Update all / All {count} records move to version {next}. | §4.7 step 2; `updateAllDescription` key **proposed** |
| `forms.apply.answersDeleted` | {count, plural, one {# cadastro tem} other {# cadastros têm}} respostas em campos removidos. Essas respostas serão excluídas. | {count, plural, one {# record has} other {# records have}} answers in removed fields. Those answers will be deleted. | §4.7 step 3; plurals **proposed** |
| `forms.apply.typeName` | Digite o nome do modelo para confirmar | Type the template name to confirm | §4.7 step 3 |
| `forms.apply.pendingRequired` | {count, plural, one {# cadastro ficará} other {# cadastros ficarão}} com preenchimento pendente. | {count, plural, one {# record will have} other {# records will have}} required fields left to fill. | §8; plurals **proposed** |
| `forms.apply.applying` | Aplicando… | Applying… | §8 |
| `forms.apply.failed` | Não foi possível aplicar as alterações. Nada foi alterado. | Couldn't apply the changes. Nothing was changed. | §8 |
| `forms.archive.confirm` | Arquivar modelo? Cadastros existentes não são afetados. | Archive template? Existing records are not affected. | §8 |
| `forms.archive.archiving` / `forms.unarchive.unarchiving` | Arquivando… / Desarquivando… | Archiving… / Unarchiving… | **proposed** |
| `forms.archive.failed` | Não foi possível arquivar o modelo. | Couldn't archive the template. | §8 |
| `forms.unarchive.failed` | Não foi possível desarquivar o modelo. | Couldn't unarchive the template. | §8 |
| `forms.delete.confirm` | Excluir o modelo permanentemente? Digite o nome do modelo para confirmar. | Delete the template permanently? Type the template name to confirm. | **proposed** (§4.6 step 2) |
| `forms.delete.withRecords` | Este modelo tem {count, plural, one {# cadastro. Deseja excluir também esse cadastro?} other {# cadastros. Deseja excluir também esses cadastros?}} | This template has {count, plural, one {# record. Delete that record too?} other {# records. Delete those records too?}} | §4.6 step 3; plurals **proposed** |
| `forms.delete.deleteAll` / `.archiveInstead` / `.archiveOnly` | Sim, excluir tudo / Não, arquivar o modelo / Arquivar o modelo | Yes, delete everything / No, archive the template / Archive the template | §4.6; keys **proposed** |
| `forms.delete.confirmWithRecords` | O modelo e {count, plural, one {o # cadastro será excluído} other {os # cadastros serão excluídos}} permanentemente. | The template and {count, plural, one {# record} other {# records}} will be deleted permanently. | §4.6 step 3; plurals **proposed** |
| `forms.delete.recordsHaveHistory` | Este modelo tem {count, plural, one {# cadastro} other {# cadastros}}, e alguns têm histórico de atendimentos ou pagamentos. Cadastros com histórico não podem ser excluídos. | This template has {count, plural, one {# record} other {# records}}, and some have appointment or payment history. Records with history can't be deleted. | §4.6 step 4 |
| `forms.delete.recordsChanged` | Os cadastros deste modelo mudaram. Revise antes de continuar. | This template's records changed. Review before continuing. | §8 |
| `forms.delete.deleting` | Excluindo… | Deleting… | **proposed** |
| `forms.delete.failed` | Não foi possível excluir o modelo. Nada foi excluído. | Couldn't delete the template. Nothing was deleted. | §8 |
| `forms.toast.versionPublished` | Versão {version} publicada | Version {version} published | §8 |
| `forms.toast.unarchived` / `.archived` | Modelo desarquivado / Modelo arquivado | Template unarchived / Template archived | §8 |
| `forms.toast.deletedWithRecords` | {count, plural, one {Modelo e # cadastro excluídos} other {Modelo e # cadastros excluídos}} | Template and {count, plural, one {# record} other {# records}} deleted | §8; plurals **proposed** |
| `validation.formName.required` / `.max` / `.taken` | Informe o nome do modelo. / O nome deve ter no máximo 80 caracteres. / Já existe um modelo com esse nome. | Enter the template name. / The name must be at most 80 characters. / A template with this name already exists. | **proposed** |
| `validation.formDescription.max` | A descrição deve ter no máximo 500 caracteres. | The description must be at most 500 characters. | **proposed** |
| `validation.formType.invalid` / `.immutable` | Escolha o tipo do modelo. / O tipo do modelo não pode ser alterado. | Choose the template type. / The template type can't be changed. | **proposed** |
| `validation.includeArchived.invalid` | Filtro inválido. | Invalid filter. | **proposed** |
| `validation.formFields.max` | Limite de 100 campos atingido. | Limit of 100 fields reached. | **proposed**; same text as SPEC-0002's `forms.fields.limitReached` |
| `validation.form.limit-reached` | Limite de 200 modelos atingido. Exclua um modelo para criar outro. | Limit of 200 templates reached. Delete a template to create another. | §4.2 step 6 |
| `validation.formRevision.required` | Não foi possível salvar. Recarregue o modelo e tente novamente. | Couldn't save. Reload the template and try again. | **proposed** |
| `validation.form.revision-conflict` | Este modelo foi alterado em outra janela. Recarregue para ver a versão atual. | This template was changed in another window. Reload to see the current version. | §4.4 step 4 |
| `validation.migration.mode-required` / `.mode-invalid` | Escolha como aplicar as alterações aos cadastros existentes. / Opção de aplicação inválida. | Choose how to apply the changes to existing records. / Invalid apply option. | **proposed** |
| `validation.migration.confirmation-required`, `validation.deleteConfirmation.required` | Digite o nome do modelo para confirmar. | Type the template name to confirm. | §4.7 step 3 |
| `validation.form.not-found` / `validation.formVersion.not-found` | Modelo não encontrado. / Versão não encontrada. | Template not found. / Version not found. | §8; the version text **proposed** |
| `validation.form.in-use`, `validation.form.records-have-history` | Os cadastros deste modelo mudaram. Revise antes de continuar. | This template's records changed. Review before continuing. | §4.6 step 5 |
| `validation.form.status-unchanged` | O status deste modelo já foi alterado. Recarregue a página. | This template's status already changed. Reload the page. | **proposed** |
| `validation.fieldLabel.required` / `.max` / `.duplicate` | Informe o rótulo do campo. / O rótulo deve ter no máximo 80 caracteres. / Já existe um campo com esse rótulo neste modelo. | Enter the field label. / The label must be at most 80 characters. / Another field in this template has this label. | **proposed** |
| `validation.fieldType.invalid` / `.immutable` | Escolha um tipo de campo válido. / O tipo de um campo publicado não pode ser alterado. Crie um novo campo. | Choose a valid field type. / A published field's type can't be changed. Create a new field. | **proposed** |
| `validation.fieldSensitive.locked` / `.not-allowed` | Este campo precisa ser protegido. / Campos do sistema não podem ser protegidos. | This field must be protected. / System fields can't be protected. | **proposed** |
| `validation.fieldRequired.locked` | A obrigatoriedade deste campo não pode ser alterada. | Whether this field is required can't be changed. | **proposed** |
| `validation.fieldHelpText.max` | O texto de ajuda deve ter no máximo 200 caracteres. | The help text must be at most 200 characters. | **proposed** |
| `validation.fieldOptions.required` / `.max` / `.not-allowed` | Adicione pelo menos 2 opções. / Use no máximo 50 opções. / Este tipo de campo não tem opções. | Add at least 2 options. / Use at most 50 options. / This field type has no options. | **proposed** |
| `validation.fieldOptionLabel.required` / `.max` / `.duplicate` | Informe o texto da opção. / A opção deve ter no máximo 80 caracteres. / Já existe uma opção com esse texto. | Enter the option text. / The option must be at most 80 characters. / Another option has this text. | **proposed** |
| `validation.fieldOptionId.unknown` / `.duplicate` | Esta opção não existe mais. Recarregue o modelo. / Esta opção aparece duas vezes. Recarregue o modelo. | This option no longer exists. Reload the template. / This option appears twice. Reload the template. | **proposed** |
| `validation.systemField.missing` / `.locked` | Um campo do sistema está faltando. Recarregue o modelo. / Este campo do sistema não pode ser alterado assim. Recarregue o modelo. | A system field is missing. Reload the template. / This system field can't be changed this way. Reload the template. | **proposed** |
| `validation.fieldSystemKey.not-allowed`, `validation.field.unknown`, `validation.fieldId.duplicate` | Não foi possível salvar este campo. Recarregue o modelo. / Este campo não existe mais neste modelo. Recarregue o modelo. / Este campo aparece duas vezes. Recarregue o modelo. | Couldn't save this field. Reload the template. / This field no longer exists in this template. Reload the template. / This field appears twice. Reload the template. | **proposed** |

### Persistence

New tables (migration `0002_forms_templates.sql`, generated with
`pnpm --filter api exec drizzle-kit generate --name forms_templates`). Every table has `tenant_id text
not null` referencing `tenants(id)` with `ON DELETE CASCADE`, and an index on it. Ids are uuid
(`defaultRandom()`).

| Table | Columns | Constraints and indexes |
| --- | --- | --- |
| `forms` | `id`, `tenant_id`, `type form_type`, `name`, `name_key`, `description null`, `status form_status default 'active'`, `latest_version int`, `revision int default 1`, `created_at`, `updated_at` | unique `idx_forms_tenant_name_key (tenant_id, name_key)` for R4; `idx_forms_tenant_type_status`; checks `latest_version >= 1`, `revision >= 1` |
| `form_versions` | `id`, `tenant_id`, `form_id → forms ON DELETE CASCADE`, `number int`, `published_at` | unique `idx_form_versions_form_number (form_id, number)` |
| `form_fields` | `id`, `tenant_id`, `form_id → forms CASCADE`, `type field_type`, `system_key null`, `label`, `help_text null`, `sensitive bool`, `created_at`, `updated_at` | unique `(form_id, system_key)` where `system_key is not null`; `idx_form_fields_form_id` |
| `form_field_options` | `id`, `tenant_id`, `field_id → form_fields CASCADE`, `label`, `created_at` | `idx_form_field_options_field_id` |
| `form_version_fields` | `version_id → form_versions CASCADE`, `field_id → form_fields CASCADE`, `tenant_id`, `position int`, `required bool` | PK `(version_id, field_id)`; unique `(version_id, position)` |
| `form_version_field_options` | `version_id → form_versions CASCADE`, `option_id → form_field_options CASCADE`, `field_id`, `tenant_id`, `position int` | PK `(version_id, option_id)`; unique `(version_id, field_id, position)` |
| `form_records` | `id`, `tenant_id`, `form_id → forms ON DELETE RESTRICT`, `form_version_id → form_versions ON DELETE RESTRICT`, `revision int default 1`, `created_at`, `updated_at` | `idx_form_records_tenant_form (tenant_id, form_id)`, `idx_form_records_version` |
| `form_record_values` | `form_record_id → form_records CASCADE`, `field_id → form_fields RESTRICT`, `tenant_id`, `key_version smallint not null`, `value_ciphertext bytea not null`, `updated_at` | unique `(form_record_id, field_id)`, as the primary key; `idx_form_record_values_field_id`; check `key_version >= 1` |

- New enums `form_type`, `form_status`, `field_type` in `enums.ts`.
- Labels, help text, protection and option labels live on the field and option rows, so a metadata change is one
  row update that every version sees (§3.3). Required, order and option membership live on the version rows, so
  published versions never change (R15).
- `name_key` is the name lowercased, accents stripped and whitespace collapsed, computed by the `FormName` value
  object with the shared `textKey`. The unique index makes R4 safe under concurrent saves; a unique violation becomes 409
  `formName.taken`.
- Field order: each version stores `position` (int), written from the array order of the saved field list.
  Fractional keys (forms-overview.md §6, C-5) are not used: [Salvar] sends the whole list, and a version is
  written once and never reordered.
- `form_records` is the shared record of SPEC-0003. **One-to-one link (owner, 2026-11-09):** each client
  (SPEC-0004) and each service (SPEC-0005) links to exactly one form record through
  `form_record_id uuid not null unique references form_records(id) on delete cascade`. They are deleted together:
  every delete path deletes the `form_records` row, and the cascade removes the client or service row and its
  values in the same transaction. Those plans add the column and test both rows are gone after a delete; this plan
  fixes the rule. `RESTRICT` on `form_id` means no template delete can remove records by accident: "Sim, excluir
  tudo" deletes them explicitly in the same transaction, and the cascade takes their clients or services with
  them.
- `form_record_values` holds **custom-field values only** (SPEC-0003 R5). System-field values (client name, e-mail,
  phone; service name, duration, price) are columns on the client and service rows, added by SPEC-0004 and SPEC-0005.
- Values are one row per (record, field), with `tenant_id` on the row, encrypted with AES-256-GCM (SPEC-0003 R11)
  by `FieldValueCipher` (`node:crypto`). Each value gets a new random 12-byte nonce.
  - **Plaintext (owner, 2026-11-10; SPEC-0003 G-1, G-2):** the cipher takes and returns the UTF-8 JSON of the
    normalised contract value (SPEC-0003 §7). A `select` value is its option id. A `yes_no` value is stored only
    when it is `true`, because no value already reads as `false` (SPEC-0003 §3.1). The fixtures seed values in this
    format, and "Atualizar todos" matches removed options on the decrypted option id.
  - **Associated data (owner, 2026-11-09):** the GCM associated data is a fixed-format string of `key_version`,
    `tenant_id`, `form_record_id` and `field_id`. A ciphertext copied to another record, field or tenant fails
    authentication instead of decrypting. Those three ids never change for a stored value ("Atualizar todos"
    repoints the record's version, not its id or its field ids), so no value is re-encrypted by a migration.
  - **Key version (owner, 2026-11-09):** `key_version` on every encrypted row says which key wrote it. The MVP
    has one key, version 1. Rotation (a second key, re-encrypting rows) stays post-MVP; the column makes it
    possible without a schema change.
  - **Key:** `FIELD_VALUES_KEY`, 32 random bytes in base64, validated at startup by `env.schema.ts`. In deployed
    environments the real key lives in a secret manager and reaches the API as an environment variable; it is never
    committed. `.env.example` gets an empty placeholder with the command that generates a key.
    `test/setup/env.ts` generates a random key for each test run.
  - **Lost answers** (R18, SPEC-0003 R13; owner, 2026-11-11) are every value row of the template's records, on any
    version, whose field is absent from the next version, or whose `select` value is an option absent from the
    next version. A record kept on an older version by "Manter existentes" can hold answers to fields or options
    that are already missing from the latest version, so the diff against the latest version is not enough.
    `recordsLosingAnswers` counts the distinct records with at least one such row, and "Atualizar todos" deletes
    exactly those rows.
  - **Pending required fields**: `recordsGainingRequiredFields` counts the distinct records, on any version, that
    have no value for a field required in the next version (custom fields from `form_record_values`,
    `client.phone` through `SystemFieldPresence`).
  - Finding answers to absent fields needs no decryption. Only `select` fields kept in the next version whose
    options differ from those of a version some record is on need their values decrypted.
- **Row-level security is deferred (owner, 2026-11-09)** to a separate platform spec covering all tables, written
  before launch (forms-overview.md C-8, against RFC §6 "Isolamento por Tenant", RNF-07 and M6b). In this plan,
  tenant isolation stays on `tenant_id` filters in every query, covered by the isolation criteria (AC-0001-15,
  -40, -41, -42).
  - Writes run in `TenantScope.run`, which sets `app.current_tenant` for its transaction only.
  - Reads do not (owner, 2026-11-10). Wrapping each read in a transaction costs three extra round trips for a
    feature this plan does not ship. So enabling RLS also means wrapping the reads, as part of the platform spec.
  - Every repository and store method takes the tenant id as an argument, so that change stays inside
    `infrastructure/persistence/`.
- **Tenant erasure (RNF-14; owner, 2026-11-10).** In the MVP, erasure is a manual hard delete of the tenant row,
  handled through the DPO channel. Every table above references `tenants(id)` directly with `ON DELETE CASCADE`, so
  that one delete removes all of the tenant's rows, even though `form_records` restricts template, version and
  field deletes. A probe on Postgres 17 with these foreign keys confirmed it on 2026-11-10, and an E-crud test keeps
  it true (Tests). A later table under a template or a record must keep its own direct cascade from `tenants`.
- **Rollback.** The migration only creates tables and enums. Rolling back means a new migration that drops them,
  which loses every template, version, field, record link and stored value. That is destructive and needs the
  owner's authorization. Before any record spec ships, the loss is limited to templates.
- `docs/schema.dbml` is updated to match: `forms`, `form_fields` replaced, `form_attachments` removed, new tables
  added. `clients.custom_fields` / `clients.notes` are left for SPEC-0004's plan (forms-overview.md C-5).

### API (`apps/api/src/modules/forms/`)

Module layout as `auth` and `tenants`: `domain/` (`FormTemplate` aggregate, `FormName`, `schema-diff.ts`,
`field-policy.ts`, errors), `ports/` (`FormRepository`, `FormRecordStore`, `RecordHistoryReader`,
`SystemFieldPresence`, `FieldValueCipher`), `infrastructure/persistence/` (Drizzle repositories and mappers),
`commands/`, `queries/`. Six points that SPEC-0002's plan relies on, so that its API changes stay in `domain/`
(points 4–6: owner, 2026-11-10):
1. the preview handler is a query (`queries/preview-form-changes/`), because it stores nothing;
2. handlers store and diff the field list that `FieldPolicy` returns, never the raw request list;
3. the aggregate builds the FormTemplate and Field responses (`toPublic()`, as `Tenant` does), so the Field shape is
   built in one place under `domain/`;
4. create, update and preview give `FieldPolicy` the template's type, whether the request is a create or an
   update, and, for each field of the latest version (none on create), its id, type, `systemKey`, stored
   `required` and `sensitive`, and option ids. This plan's own checks use only part of it;
5. `FieldInputSchema.systemKey` is a plain string (Contracts), so an unknown system key reaches `FieldPolicy`;
6. an update without `fields` runs no field rule, and the latest version's fields stay as they are.
Route root `forms` in `app.routes.ts`; `FormsModule` registered in `app.module.ts`. Every route uses
`JwtAccessGuard` then `ActiveTenantGuard` (tenant from `X-Tenant-Id`), and the guard's membership supplies the
tenant id. Path ids go through a param pipe that turns a malformed id into the 404 domain error (new
`ZodParam` next to `ZodBody`).

| Method and path | Success | Main errors | ACs |
| --- | --- | --- | --- |
| `GET /v1/forms?type&includeArchived` | 200 `{ forms }`, sorted by type then `name_key`, then `id` | 401, 400 `tenant.required`, 403 `tenant.inactive`, 404 `tenant.not-found`, 422 `formType.invalid`, `includeArchived.invalid` | 16, 41, 43, 52, 58, 59, 60, 61, 62 |
| `POST /v1/forms` | 201 FormTemplate | 422 shape errors, 409 `formName.taken`, 400 `form.limit-reached`, 404 `tenant.not-found` | 01–06, 19, 42, 44, 48 |
| `GET /v1/forms/:formId` | 200 FormTemplate | 404 `form.not-found` | 15, 72, 76 |
| `PATCH /v1/forms/:formId` | 200 FormTemplate | 422 (`formType.immutable`, `formRevision.required`, `migration.mode-invalid`, field shapes), 404, 409 `form.revision-conflict`, 409 `formName.taken`, 400 `migration.mode-required`, 400 `migration.confirmation-required`, 400 `field.unknown`, 500 | 07, 08, 09, 15, 20–24, 26–28, 45, 46, 74, 75 |
| `POST /v1/forms/:formId/preview` | 200 change preview; stores nothing | same validation as PATCH, 404, 409 | 37, 38, 39, 40, 71 |
| `GET /v1/forms/:formId/versions/:version` | 200 `{ version, fields }` with current metadata | 404 `form.not-found`, 404 `formVersion.not-found` | 29, 36, 40, 73 |
| `POST /v1/forms/:formId/archive` | 200 FormTemplate | 404, 409 `form.status-unchanged` | 12, 15, 32, 47 |
| `POST /v1/forms/:formId/unarchive` | 200 FormTemplate | 404, 409 `form.status-unchanged` | 40, 49 |
| `POST /v1/forms/:formId/delete` with body `{ deleteRecords?, confirmName }` | 204 | in the order of §6: 404, 400 `deleteConfirmation.required`, 409 `form.in-use`, 409 `form.records-have-history` | 13, 14, 15, 31, 33, 34, 35, 70 |

This answers §9 Q5 (owner, 2026-11-09): a delete that needs a confirmation uses `POST /<resource>/:id/delete`
with a JSON body, with no `DELETE` fallback. `docs/architecture/api-convention.md` records that rule; SPEC-0004's
client delete uses it too.

How the handlers work:
- **Create**, in this order (Decision 3): contract shape (422, in the pipe); then `FieldPolicy`'s field rules,
  including the system-field presence check; then, in one `TenantScope` transaction, lock the tenant row
  (`FOR UPDATE`) so two creates cannot both pass the cap, count the tenant's templates (400 `form.limit-reached`,
  R19), and insert the template (revision 1, version 1), its fields, options and version-1 rows. The name check is
  the insert itself: a unique violation on `name_key` becomes 409 `formName.taken`.
- **Update**: shape errors come from the contract (422). Then, in one transaction with the template row locked:
  404 if absent; 409 if `revision` is outdated; field rules (`FieldPolicy`); 409 on a name clash; diff the next
  fields against the latest version (`schema-diff.ts`, §3.3); with schema changes and records, 400 without a
  migration mode, and 400 when "Atualizar todos" would delete answers and `confirmName` does not match (R9
  comparison). Then store metadata and publish the next version if the schema changed. For "Atualizar todos", first
  repoint every record and raise its revision (SPEC-0003 R14) in one statement that also sets `updated_at`, then
  delete the lost answers of every record, on any version (Persistence, "Lost answers") (owner, 2026-11-10;
  SPEC-0003 G-4). In that order, a record update holding its row lock makes the repoint wait, and its lost answers
  are deleted afterwards; a record update that starts later sees the new version and revision. Everything commits
  together or not at all (R10); the template revision goes up by 1.
- **Preview** runs the same checks and diff without writing, then counts `recordsLosingAnswers` and
  `recordsGainingRequiredFields` through `FormRecordStore`, as defined under Persistence ("Lost answers", "Pending
  required fields"). Custom fields are counted from `form_record_values`. `client.phone` is the only system field
  that can gain "required" (SPEC-0002 R3), and records missing it come from `SystemFieldPresence` (owner,
  2026-11-10). That port has one method, for `client.phone` only: given the template, it returns the ids of its
  records with no phone (owner, 2026-11-11). Preview merges them with the ids of records missing a required custom
  field, so a record missing both counts once. The default adapter returns no ids until SPEC-0004 provides the
  real one (Deferred checks). SPEC-0004 implements against this signature.
- **Registering `SystemFieldPresence`** (owner, 2026-11-10): `app.module.ts` imports `FormsModule.forRoot({
  systemFieldPresence })`. This plan passes the zero adapter. SPEC-0004's plan passes its clients adapter class
  from `app.module.ts`. `DatabaseModule` is global, so the adapter needs no module import, and `FormsModule` and
  `ClientsModule` never import each other.
- **All records at once** (owner, 2026-11-10): preview and "Atualizar todos" run one statement per step across all
  of the template's records, on any version (count; repoint the version and raise revisions together; delete lost
  answers), never one query per record. For `select` options absent from the next version, one query reads the
  affected values, they are decrypted in memory, and one statement deletes the matching rows.
- **Archive and unarchive** change the status and raise the template revision by 1 (R11), so an editor still open
  on the old revision gets 409 `form.revision-conflict` on its next save.
- **Delete** reads the template row `for update` first, then follows the §6 order in the same transaction (owner,
  2026-11-10; SPEC-0003 G-3). A record insert takes a key-share lock on the template row through its foreign key, so
  a record created at the same time either commits before the count, which then includes it, or waits for the
  delete and then fails its foreign-key check (SPEC-0003 handles that case). With records and
  `deleteRecords: true`, it deletes the record values, records and template in that transaction.
- **Counts**: `recordCount` and `recordsOnOlderVersions` come from `form_records`; `valueCount` from
  `form_record_values`, where a `yes_no` field has rows only for `true` answers (Persistence; SPEC-0003 G-2).
  `recordsWithHistory` comes from `RecordHistoryReader`, whose adapter returns 0 until
  scheduling and payments exist. E2e tests can pass a fake reader to `createTestApp({ recordHistory })`, which
  overrides the provider only when a fake is given, so the real adapter runs everywhere else (owner, 2026-11-10).

### Web (`apps/web`)

- Routes: `/[lang]/orgs/[tenant]/forms` (list), `/forms/new?type=client|service&from=clients|services` (editor;
  `from` locks the type and sets where [Salvar] and [Cancelar] go, §4.3), `/forms/[formId]` (editor). The sidebar
  item "Formulários" gets the `forms` path.
- BFF routes under `src/app/api/forms/` mirror the API table. They read the active tenant cookie
  (`requireActiveTenant`) and forward it as `X-Tenant-Id`. `api()` in `_lib/http.ts` accepts the `forms`
  resource. The browser client lives in `src/lib/api/forms.ts`.
- BFF request bodies go through `readBody(request, z.unknown())` (owner, 2026-11-10). That keeps the 415 and
  bad-JSON checks, and the API's 422 with the full `field` path (`fields.3.label`) passes through `toHttpError`
  unchanged. `parseInput` is not changed. Its 400 with only `path[0]` in the auth and tenants routes is a separate
  follow-up.
- Components in `forms/_components/`: `forms-list`, `form-editor` (header with type, name, description, version
  badge and record counts; the field list region SPEC-0002 fills), `publish-dialog`, `apply-dialog`,
  `archive-dialog`, `delete-dialog`, and `use-form-draft` (draft state with react-hook-form, dirty flag, leave
  guard).
- New UI primitives built on `@base-ui/react`, which is already a dependency: `components/ui/dialog.tsx` (can be
  made not dismissible while a request runs, AC-0001-56), `toast.tsx` (provider mounted in the org shell),
  `skeleton.tsx`.
- The leave prompt (AC-0001-18) is a shared hook, `apps/web/src/hooks/use-leave-guard.ts` (owner, 2026-11-10;
  SPEC-0003 G-7). The App Router has no navigation-blocking API, so while a form is dirty the hook intercepts in-app
  link clicks, shows a confirmation whose copy key the caller passes, and uses `beforeunload` for tab close and
  reload. It also covers the browser's back and forward buttons, because §4.2 step 7 asks for confirmation on any
  leave (owner, 2026-11-11): while dirty it keeps a guard entry on top of the history and listens for `popstate`;
  "stay" restores the guard entry, and leaving goes back past it. `use-form-draft` uses it with
  `forms.editor.unsaved`; SPEC-0003's fill-in page reuses it with `{entity}.form.discard`.
- Every §8 state and copy key is implemented. Server errors show through `useFieldError`.

### Tests

Files:
- **E-crud** `apps/api/test/e2e/forms.e2e-spec.ts`: create, list, read, tenant isolation.
- **E-ver** `apps/api/test/e2e/forms-versions.e2e-spec.ts`: update, publish, Apply, preview, version read.
- **E-life** `apps/api/test/e2e/forms-lifecycle.e2e-spec.ts`: archive, unarchive, delete.
- **U-diff** `apps/api/src/modules/forms/domain/schema-diff.spec.ts`; **U-name**
  `apps/api/src/modules/forms/domain/value-objects/form-name.vo.spec.ts`; **U-upd**
  `apps/api/src/modules/forms/commands/update-form/update-form.handler.spec.ts`; **U-del**
  `apps/api/src/modules/forms/commands/delete-form/delete-form.handler.spec.ts`; **U-arch**
  `apps/api/src/modules/forms/commands/archive-form/archive-form.handler.spec.ts` and
  `.../unarchive-form/unarchive-form.handler.spec.ts`; **U-ciph** `apps/api/src/shared/crypto/field-value.cipher.spec.ts`.
- **W-list** `apps/web/tests/forms-list.test.tsx`; **W-ed** `apps/web/tests/form-editor.test.tsx`; **W-dlg**
  `apps/web/tests/form-dialogs.test.tsx`.
- Fixtures: `apps/api/test/utils/forms-fixtures.ts` seeds templates, versions, records and encrypted values
  directly, as §2 Dependencies allows. `apps/api/test/setup/test-app.ts` gains an options argument,
  `createTestApp({ recordHistory })`, that overrides `RecordHistoryReader` only when a fake is passed.

Every test name starts with its AC ID, e.g. `it('AC-0001-13 deletes a template without records after the typed
name', …)`. Where a criterion reads clients in its Then, this plan checks the stored record rows; SPEC-0004's
plan adds the same check through the client API. Those criteria are listed under "Deferred checks".

Checks outside the AC table (owner: the first two 2026-11-10, the last two 2026-11-11):
- **Tenant erasure** (E-crud, named `RNF-14 …`, because no criterion covers it): a tenant seeded with templates,
  versions, fields, options, records and values is deleted directly in SQL. None of its rows remain in the eight
  tables, and another tenant's rows are unchanged (Persistence, "Tenant erasure").
- **SPEC-0002 input rules.** The requests these tests send, the payloads W-ed asserts and the fixtures already
  follow SPEC-0002's field input rules, so they keep passing when SPEC-0002's plan enforces them:
  - no `sensitive` on a system field, and no `systemKey` on an update;
  - a custom field of an always-protected type (SPEC-0002 R5), or whose label contains a SPEC-0002 §3.4 term
    ("Peso" in AC-0001-71), is sent without `sensitive` or with `sensitive: true`, and seeded with `sensitive` true.
- **Records on older versions** (E-ver, named `R18 …`): a record kept on version 1 by "Manter existentes" holds a
  "Hobby" answer, and version 2 already removed "Hobby". A preview of version 3 counts that record in
  `recordsLosingAnswers`, and in `recordsGainingRequiredFields` when version 3 adds a required field it has no
  value for. "Atualizar todos" then deletes its "Hobby" answer (Persistence, "Lost answers").
- **Browser back** (W-ed, named `§4.2 step 7 …`): with unsaved changes, the browser back button shows
  `forms.editor.unsaved`; "stay" keeps the draft and the editor's URL (Web, leave prompt).

| AC | Test | What it checks here |
| --- | --- | --- |
| 01 | E-crud, W-ed | 201 with version 1, revision 1 and the client system fields in order; the editor sends them and shows "Versão 1" |
| 02 | E-crud | no type → 422 `formType.invalid`, nothing stored |
| 03 | E-crud | blank name → 422 `formName.required` |
| 04 | E-crud | 81 characters → 422 `formName.max` |
| 05 | E-crud, U-name | archived "Anamnese" vs " anamnése " → 409 `formName.taken` |
| 06 | E-crud | same name in another tenant → 201 |
| 07 | E-ver | `type` on update → 422 `formType.immutable`, still revision 3 |
| 08 | E-ver, W-ed | stale revision → 409 `form.revision-conflict`; editor shows `forms.editor.conflict` |
| 09 | E-ver | blank label at index 3 → 422 `fieldLabel.required` at `fields.3.label`, name unchanged |
| 10 | W-ed | after saving from the `/clients` shortcut, navigates to `/clients/new?form=<id>` (SPEC-0003's fill-in form on SPEC-0004's route) |
| 11 | W-ed | Cancelar from the shortcut returns to `/clients`, no request sent |
| 12 | E-life | archive → 200 `archived`; the seeded record row is unchanged. The dropdown and the client read/update are checked in SPEC-0004 |
| 13 | E-life, U-del | delete without records → 204, then 404 |
| 14 | E-life, U-del | delete with records, no `deleteRecords` → 409 `form.in-use`; rows still exist |
| 15 | E-crud | read, update, archive, delete of another tenant's id → 404 `form.not-found`, unchanged |
| 16 | E-crud | no token → 401 |
| 17 | W-list | archived hidden by default; toggle shows it with "Arquivado" |
| 18 | W-ed | dirty draft + in-app link → `forms.editor.unsaved`; "stay" keeps the draft |
| 19 | E-crud, E-ver | 101 fields → 422 `formFields.max`. E-ver: an update with 101 fields → the same 422, template unchanged |
| 20 | E-ver, U-diff, W-ed | metadata-only save → 200, same version, revision + 1; seeded records still on version 2. W-ed: the save shows `forms.editor.saved` and neither the publish nor the Apply dialog |
| 21 | E-ver, W-dlg | no records + schema change → 200 version 2; the dialog is `forms.publish.confirm` without migration options |
| 22 | E-ver, U-upd | records + schema change without migration → 400 `migration.mode-required`, still version 1 |
| 23 | E-ver | "Manter existentes" → version 2; records stay on version 1; `latest_version` is 2. The new-client part is checked in SPEC-0004 |
| 24 | E-ver | "Atualizar todos" → version 4; all three records on version 4 |
| 25 | W-dlg | preview with 2 records losing answers → `forms.apply.answersDeleted`; Aplicar disabled until "Ficha" typed exactly |
| 26 | E-ver, U-upd | `update_all` without `confirmName` → 400 `migration.confirmation-required`; both answers kept |
| 27 | E-ver | `update_all` + "Ficha" → version 2; no "Hobby" answers left |
| 28 | E-ver, W-dlg | a test trigger fails one record's update → 500, still version 1, all records on 1; the dialog shows `forms.apply.failed` with the draft kept |
| 29 | E-ver | version 1 still returns "Hobby" after "Manter existentes" |
| 30 | W-dlg | 3 records, no history → `forms.delete.withRecords` with both options |
| 31 | E-life | "Sim, excluir tudo" → 204; template 404; record rows gone. The client 404 is checked in SPEC-0004 |
| 32 | E-life, W-dlg | "Não, arquivar o modelo" calls archive; status `archived`; a list without `includeArchived` leaves it out; records unchanged |
| 33 | E-life, U-del | `deleteRecords` + "ficha x" → 400 `deleteConfirmation.required`; nothing deleted |
| 34 | E-life | a fake `RecordHistoryReader` reports history for one record → 409 `form.records-have-history`; nothing deleted (partial, see Deferred checks) |
| 35 | E-life | no records + "ficha x" → 400; template still readable |
| 36 | E-ver | version 3 of a version-2 template → 404 `formVersion.not-found` |
| 37 | E-ver, U-diff | preview counts: `schemaChanged`, `nextVersion` 2, `recordCount` 4, losing 2, gaining 4; nothing changed |
| 38 | E-ver | preview with revision 3 → 409 |
| 39 | E-ver | preview with a blank label → 422 `fieldLabel.required` at `fields.3.label` |
| 40 | E-crud | unarchive, version read and preview of another tenant's id → 404; still archived |
| 41 | E-crud | list shows only the active tenant's templates |
| 42 | E-crud | create in a tenant without membership → 404 `tenant.not-found`, nothing stored |
| 43 | E-crud | suspended tenant → 403 `tenant.inactive` |
| 44 | E-crud | 501-character description → 422 `formDescription.max` |
| 45 | E-ver | no revision → 422 `formRevision.required`, unchanged |
| 46 | E-ver | mode "replace" → 422 `migration.mode-invalid` |
| 47 | E-life | archive twice → 409 `form.status-unchanged` |
| 48 | E-crud | 200 templates → 400 `form.limit-reached`; still 200 |
| 49 | E-life | unarchive → 200 `active`; listed without `includeArchived` |
| 50 | W-ed | type change before the first save swaps system fields and keeps "Objetivo" |
| 51 | W-dlg | "Atualizar todos" with `recordsGainingRequiredFields` 3 → `forms.apply.pendingRequired` |
| 52 | E-crud, W-list | sorted "anamnese", "Ética", "Ficha"; grouped by type |
| 53 | W-list | no service templates → `forms.list.empty` with Novo |
| 54 | W-list | list error → `forms.list.error`; retry requests again |
| 55 | W-ed | unknown id → `forms.editor.notFound` with a link to `/forms` |
| 56 | W-dlg | Escape or outside click while applying → dialog stays with `forms.apply.applying` |
| 57 | W-dlg | `recordsWithHistory` 1 (mocked response) → `forms.delete.recordsHaveHistory` with only "Arquivar o modelo" and Cancelar |
| 58 | E-crud | a fake `RecordHistoryReader` reports 1 of 3 records → read and list return `recordCount` 3, `recordsWithHistory` 1 (partial, see Deferred checks) |
| 59 | E-crud | `type=client` → exactly "Cliente" and "Ficha" |
| 60 | E-crud | `type=plan` → 422 `formType.invalid` |
| 61 | E-crud | `includeArchived=maybe` → 422 `includeArchived.invalid` |
| 62 | E-crud | no tenant context → 400 `tenant.required` |
| 63 | W-ed | read error → `forms.editor.loadError`; retry reads again |
| 64 | W-ed | 500 on a name-only save → `forms.editor.saveFailed`; name kept |
| 65 | W-dlg | 500 on Publicar → `forms.publish.failed`; dialog open, draft kept |
| 66 | W-dlg | 500 on archive → `forms.archive.failed`; still shown active |
| 67 | W-dlg | 500 on delete → `forms.delete.failed`; template still listed |
| 68 | W-dlg | 409 `form.in-use` after the dialog opened → `forms.delete.recordsChanged` with both options |
| 69 | W-ed | 500 on Desarquivar → toast `forms.unarchive.failed`; banner still shown |
| 70 | E-life, U-del | no records + "ficha" → 400 (case matters) |
| 71 | E-ver, U-diff | preview lists "Peso" added, "Hobby" removed, "Objetivo" changed with `["required"]` |
| 72 | E-crud | id "abc" → 404 `form.not-found` |
| 73 | E-ver | version "abc" → 404 `formVersion.not-found` |
| 74 | E-ver | rename to "anamnese" → 409 `formName.taken`; still "Ficha" at revision 2 |
| 75 | E-ver | rename "Ficha" → "FICHA" → 200, revision 3 |
| 76 | E-ver | version 3, `recordCount` 3, `recordsOnOlderVersions` 2 |
| 77 | W-ed | badge "Versão 3" and `forms.editor.recordCounts` with 1 and 2 |
| 78 | W-list | list pending → skeleton with `forms.list.loading` |
| 79 | W-ed | template pending → header and 3 field-row skeleton with `forms.editor.loading` |

Unit specs also cover: the diff for every §3.3 row (U-diff), name keys (U-name), the update check order (U-upd),
the delete check order (U-del), archive and unarchive each raising the revision by 1 (U-arch, R11), and the cipher
(U-ciph): round-trip, a changed ciphertext fails, and a
ciphertext decrypted with another tenant, record, field or key version fails.

### Deferred checks

These criteria can only be verified once another spec is implemented. Under `/done` step 4 they may stay
unverified when this spec is set `Implemented`: `/done` reports them as unrun or partly verified, never as passing,
and lists them in the changelog line. The verifying spec's plan lists them in its test table, includes this file in
its scope, and adds `<AC ids> verified with SPEC-XXXX, <date>` to this changelog.

| AC | Status after this plan | Verified by |
| --- | --- | --- |
| 34 | partly: the 409 is checked with a fake `RecordHistoryReader`; a real linked appointment is not | owner waiver (2026-11-10): the first scheduling or payments spec, tracked in forms-overview.md §7 |
| 57 | partly: the dialog is checked with a mocked `recordsWithHistory` 1; a real linked appointment is not | owner waiver (2026-11-11), as for 34 and 58: the first scheduling or payments spec |
| 58 | partly: `recordsWithHistory` 1 is checked with a fake `RecordHistoryReader`; a real linked appointment is not | owner waiver (2026-11-10): the first scheduling or payments spec, tracked in forms-overview.md §7 |
| 10 | partly: the redirect to `/clients/new?form=<id>` is checked; the page it opens is not | SPEC-0003: the fill-in form opened with the new template's id. SPEC-0004: the `/clients/new` route and its "Criar novo modelo" entry (§4.2, §4.3). Owner, 2026-11-10 (SPEC-0003 G-5) |
| 12 | partly: archive and the unchanged record are checked; the Novo dropdown and the client read/update are not | SPEC-0004 |
| 14 | partly: record rows still exist; "the client still exists" through the client API is not checked | SPEC-0004 |
| 20 | partly: records stay on version 2; "clients report form version 2" through the client API is not checked | SPEC-0004 |
| 23 | partly: records stay on version 1; showing no "Objetivo" and a client created afterwards are not checked | SPEC-0004 |
| 24 | partly: records move to version 4; the client API read is not checked | SPEC-0004 |
| 26 | partly: both "Hobby" value rows still exist; the client API read is not checked | SPEC-0004 |
| 27 | partly: records move to version 2 with no "Hobby" value rows; the client API read is not checked | SPEC-0004 |
| 28 | partly: records stay on version 1; the client API read is not checked | SPEC-0004 |
| 31 | partly: record rows are gone; reading each client → 404 `client.not-found` is not checked | SPEC-0004 |
| 32 | partly: record rows are unchanged; the client API read is not checked | SPEC-0004 |
| 33 | partly: record rows still exist; the client API read is not checked | SPEC-0004 |
| — (§4.7 step 4) | partly: with the zero `SystemFieldPresence` adapter, `client.phone` turned required adds no record; custom-field counts are checked on the server by 37 (51 is a UI test with a mocked response) | SPEC-0004 |

### Sequence

0. **Gate** (Decision 1): SPEC-0003's plan is drafted and reviewed (`/spec-review SPEC-0003 plan`) before step 2.
   It does not need to be approved.
1. **Contracts**: `packages/schemas/src/forms/*`, `index.ts`, i18n keys (both locales); build the package.
2. **Persistence**: enums, `forms.ts`, `form-records.ts`, `index.ts`; generate `0002_forms_templates.sql` and read
   its SQL; update `docs/schema.dbml`.
2b. **Test foundations** (owner, 2026-11-11): the production code step 3's fixtures and test app need, so its
   tests fail only because behavior is missing, never because setup is broken. `FieldValueCipher`, with U-ciph
   written first; `FIELD_VALUES_KEY` in `env.schema.ts`, `.env.example` and `test/setup/env.ts`; the port
   interfaces and injection tokens (`FormRepository`, `FormRecordStore`, `RecordHistoryReader`,
   `SystemFieldPresence`, `FieldValueCipher`), with the zero `RecordHistoryReader` and `SystemFieldPresence`
   adapters.
3. **Failing tests**: the three e2e files, the unit specs and the three web test files, one test per AC as mapped
   above (written by `test-author`); `createTestApp({ recordHistory })`; confirm each fails because the behavior
   is missing.
4. **API, part 1**: domain (`FormName`, `schema-diff`, `FieldPolicy`, errors), repositories, `ZodParam`,
   `FormsModule.forRoot` in `app.module.ts`.
5. **API, part 2**, three commits. Routes are added with their handlers.
   - **5a** create, list, read, version read: AC-0001-01 to -06, -16, -19, -36, -41 to -44, -48, -52, -58 to -62,
     -72, -73, -76.
   - **5b** update, preview, Apply: AC-0001-07 to -09, -20 to -24, -26 to -29, -37 to -39, -45, -46, -71, -74, -75.
     Then the one-off timing run (Decision 4): `apps/api/test/e2e/forms-apply-timing.e2e-spec.ts` with 5,000 seeded
     records, some of them on an older version with answers to fields and `select` options already absent from
     the latest version, run once with `FORMS_TIMING=1`. RNF-02 thresholds: preview under 500 ms, "Atualizar
     todos" under 1 s. `/done` reports both numbers; a number over its threshold goes to the owner as a risk.
   - **5c** archive, unarchive, delete: AC-0001-12 to -15, -31 to -35, -40, -47, -49, -70.
6. **Web, part 1**: BFF routes, `lib/api/forms.ts`, dialog, toast and skeleton primitives, sidebar link.
7. **Web, part 2**, three commits.
   - **7a** list page: AC-0001-17, -52, -53, -54, -78.
   - **7b** editor (new and existing), publish and Apply dialogs, leave guard: AC-0001-01, -08, -10, -11, -18, -20,
     -21, -25, -28, -50, -51, -55, -56, -63 to -65, -77, -79.
   - **7c** archive and delete dialogs, unarchive: AC-0001-30, -32, -57, -66 to -69.
8. **Checks**: `pnpm --filter @planici/schemas build`, `pnpm lint`, `pnpm typecheck`, `pnpm --filter api test`,
   `pnpm --filter api test:e2e`, `pnpm --filter web exec vitest run`. `apps/web` has no `test` script, so
   `pnpm --filter web test` cannot run and turbo's `pnpm test` skips the web tests.
   - **Owner action:** add a `test` script to `apps/web/package.json` so CI runs the web tests. It also turns on CI
     for `registration*.test.tsx` and `tenant-gate.test.tsx`, which have never run there. Run on 2026-11-10 with
     `pnpm --filter web exec vitest run`: `tenant-gate.test.tsx` passed (4 tests), and `registration.test.tsx` and
     `registration-state.test.ts` failed with "No test suite found", because both files are empty (0 bytes). CI
     goes red with the script until those two files get tests or are removed.

### Decisions this plan makes (owner to confirm with the plan)

The spec leaves these open.

1. **Step 0 gate.** SPEC-0003's plan must be drafted and reviewed, but not approved, before step 2, because the
   record tables created here bind SPEC-0003 (Risks 1).
2. **`textKey` collapses internal whitespace**, as well as ignoring case and accents. R4 and SPEC-0002 R2 only say
   case and accents. Template names are already collapsed by `FormNameSchema`, so this changes nothing for names;
   for field and option labels, "Data  de nascimento" and "Data de nascimento" are the same label.
3. **Create check order**: contract shape → field rules → template cap → name check. SPEC-0002's plan uses the same
   order.
4. **Timing run outside CI.** The timing file sits with the e2e files so it can use `createTestApp` and the
   fixtures. It runs only when `FORMS_TIMING=1` (`describe.runIf`, with its own timeout above the e2e 15 s
   default), so CI skips it.
5. **Proposed copy** (Copy): every en-US string, and every pt-BR string marked **proposed**, including the new
   keys for labels and plurals that §8 does not name.

### Risks

1. **The record storage chosen here binds SPEC-0003, -0004 and -0005** (`form_records` as the shared record, one
   encrypted row per value, the one-to-one link). The owner accepted it on 2026-11-09. Cheapest check for gaps:
   SPEC-0003's plan, drafted and reviewed against it before step 2 (Sequence step 0, Decision 1).
2. **`FIELD_VALUES_KEY` must exist in every environment.** The real key lives in a secret manager; I cannot create
   `.env` files or secrets, so the owner provisions it wherever the API runs. Losing the key loses every stored
   value. Rotation is post-MVP; `key_version` keeps it possible.
3. **Removed `select` options need decryption.** Preview and "Atualizar todos" decrypt the values of affected select
   fields. Cheapest check: the one-off timing run after step 5b, against RNF-02 (preview under 500 ms, "Atualizar
   todos" under 1 s at 5,000 records). `/done` reports the numbers.
4. **Leave prompt in the App Router.** There is no official navigation-blocking API, so link interception and the
   back/forward guard entry are workarounds. The guard entry can surprise users (an extra history step) and break
   with a Next.js upgrade. Cheapest check: build the shared hook, AC-0001-18's test and the browser-back test first
   in step 7. If the back/forward guard is not reliable, that half goes to the owner as a proposed spec change,
   never shipped silently.
5. **SPEC-0002 overlap.** The editor and `FieldPolicy` are shared. SPEC-0002's plan is drafted. It relies on the
   six points under API and on the create order (Decision 3). A change to either amends both plans.
6. **No RLS until the platform spec (RNF-07, forms-overview.md C-8).** Isolation relies on `tenant_id` filters,
   covered by AC-0001-15, -40, -41 and -42. A missed filter is not caught by the database until then. Enabling
   it needs the reads wrapped in `TenantScope.run` too (Persistence).
7. **Deferred checks** (section above) stay open until their specs ship.
8. **E2e needs Docker** (Testcontainers). Without it, step 8 can only run the unit and web tests, and that is
   reported.

### New dependencies

None. `@base-ui/react` (dialog, toast), `react-hook-form`, `node:crypto` (AES-256-GCM, `randomUUID`) and Drizzle
are already in use.

## 12. Changelog

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | 2026-11-09 | Draft |
| 0.2 | 2026-11-09 | Owner answers D-5, D-6 recorded |
| 0.3 | 2026-11-09 | Template versioning (owner, D-10): publishing, schema vs metadata, Apply dialog, revision for concurrency; AC-0001-01, -07, -08 updated; AC-0001-20 to -29 added; RFC traces fixed; criteria changes pending owner review |
| 0.4 | 2026-11-09 | Owner Joao Izidoro set. Deleting a template with records asks whether to delete them too (D-13): R8, R9, §4.6, errors, contract, UI states; AC-0001-14 rewritten and AC-0001-30 to -33 added, pending owner review; AC-0001-34 provisional (Q7) |
| 0.5 | 2026-11-09 | Owner Joao Izidoro approved AC-0001-01, -07, -08, -14 and -20 to -33 as written. Owner decisions: Q3 yes (R7); Q7, deleting records is offered only when none has linked history (R8, §4.6; AC-0001-34 moves from provisional to pending owner review); the server checks the typed name on every delete (R9); length and count keys use `.max` (AC-0001-04, -19); rejections that depend on stored data use 400 (AC-0001-22, -26, -33); at most 200 templates per tenant (R19, list stays unpaginated). Spec review: version read and preview get permissions, errors and criteria; tenant-context errors stated; AC-0001-09 made specific; depends_on SPEC-0002 and dependency notes in §2; assumptions listed as Q8–Q10; AC-0001-34 and new AC-0001-35 to -56 pending owner review |
| 0.6 | 2026-11-09 | Owner decisions, review round 2: system fields (§3.2) and schema vs metadata (§3.3) moved here from SPEC-0002, depends_on cleared, references updated (AC-0001-01, -50 included); Q2 decided (R4), AC-0001-05 agreed; Q6 and Q8–Q10 decided (R3, R5, R10, R12); delete check order (§6) and AC-0001-14 sends confirmName; AC-0001-12 and -18 reworded; audit events out of scope. Review fixes: AC-0001-09 and -39 use index 3; `recordsWithHistory` in FormTemplate and FormTemplateSummary (§4.6 step 1); load-error, in-progress and failure states for the editor and the publish, archive, unarchive and delete actions; delete race (§4.6 step 5); list query errors (`formType.invalid`, `includeArchived.invalid`); AC-0001-34 split, UI part is AC-0001-57; §3 split into §3.1–§3.3; §4.7 moved after §4.6; R2 trace; names sorted ignoring case and accents; SPEC-0002 Q3 moved here as Q12. AC-0001-57 to -69 added, pending owner review |
| 0.7 | 2026-11-09 | Owner decisions, review round 3: Q12 decided (client e-mail stays required, RN-04); RF-07 amended, no notes system field (§3.2, forms-overview.md C-2 resolved); typed names compared after trimming, otherwise exactly (R9, R18); the audit spec is MVP (§2); SPEC-0001 and SPEC-0002 approved together (§2); AC-0001-02 reworded as an API request. Review fixes: change-preview `added` / `removed` / `changed` shapes (§7, §4.7 step 1); malformed template ids and version numbers return 404 (§5, §6); AC-0001-52 tests sorting that ignores case and accents; AC-0001-26 added to the §2 list. AC-0001-70 to -79 added, pending owner review |
| 0.8 | 2026-11-09 | Owner Joao Izidoro approved AC-0001-34 to -79 as written; all criteria are now agreed. Status stays Draft |
| 1.0 | 2026-11-09 | Approved by Joao Izidoro, 2026-11-09 (together with SPEC-0002) |
