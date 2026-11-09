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
| 5 | Delete and archive endpoint convention (no DELETE convention exists). | `DELETE /forms/:id`; `POST /forms/:id/archive` and `/unarchive`. | `/plan` |
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

Written by `/plan` after the spec is Approved. Empty until then.

```

```

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
