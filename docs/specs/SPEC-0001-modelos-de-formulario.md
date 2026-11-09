---
id: SPEC-0001
title: Modelos de formulário
status: Draft # Draft | Review | Approved | Implemented | Superseded
plan_status: Draft # Draft | Approved
version: 0.2
owner: TBD
satisfies: [RF-37, RF-39, RN-02, RN-20, RN-24, RN-25]
depends_on: []
phase: MVP # owner decision D-5; RFC still says Pós-MVP
ticket: -
---

# SPEC-0001 — Modelos de formulário

## 1. Purpose

The professional defines **form templates** that describe what is recorded about each client or each service.
A template holds no data. It is the blueprint used later to create clients (SPEC-0004) and services (SPEC-0005).
This addresses RFC §2.2.9 (UC-42, UC-44, UC-45) and RF-07's need for personalised client data. It is pulled
forward from post-MVP because custom forms are the product's main focus (forms-overview.md D-5).

## 2. Scope

**In scope**
- Template list at `/forms` (inside the workspace, e.g. `/orgs/:tenant/forms`).
- Creating a template from `/forms`, and from the "Criar novo modelo" shortcut on `/clients` and `/services`.
- Template attributes: type, name, description, status.
- Saving the template together with its fields (field rules live in SPEC-0002).
- Editing name and description; archiving, unarchiving and deleting a template.
- Protection against two tabs overwriting each other.

**Out of scope**
- Field types, field attributes, ordering and removal: SPEC-0002.
- Creating and editing clients or services from a template: SPEC-0003, SPEC-0004, SPEC-0005.
- `plan` templates: post-MVP, with the plans module (RF-14).
- Duplicating a template, template library or occupation-based suggestions (RN-23): post-MVP.
- Attaching extra forms to an existing client: post-MVP (forms-overview.md D-4, C-4).

## 3. Domain rules

- **R1.** Every template belongs to exactly one tenant and is visible only inside it. (RN-02, RN-20)
- **R2.** A template has a **type**, `client` or `service`. The type is required and cannot change after
  creation. (RN-20; binding rather than "suggested" is an `assumption`, C-3)
- **R3.** A template has a **name**: required, trimmed, internal whitespace collapsed, 1–80 characters. (RN-20)
- **R4.** Names are unique per tenant, ignoring case and accents, across active and archived templates
  of every type. (`assumption`: avoids two "Anamnese" in the same dropdown after unarchiving)
- **R5.** A template may have a **description**: optional, trimmed, at most 500 characters. (RF-37)
- **R6.** Every template always contains the system fields of its type (SPEC-0002 R3). A template with only system
  fields is valid. (`assumption`, D-2)
- **R7.** A template has a status, `active` or `archived`. Only active templates can create new records.
  Existing records of an archived template stay readable and editable. (RN-24, `assumption`)
- **R8.** A template can be deleted only while no client or service was created from it. Otherwise it can only be
  archived. (RN-24)
- **R9.** Deleting a template needs typed confirmation of its name. Archiving needs a confirmation dialog. (RN-25)
- **R10.** Saving a template is all-or-nothing: name, description and every field change are stored together,
  or nothing is. (`assumption`)
- **R11.** A save based on an outdated copy of the template is rejected. It never silently overwrites newer
  changes. (`assumption`)
- **R12.** A template has at most 100 fields, system fields included. (`assumption`, abuse limit)

## 4. Behavior

### 4.1 List templates (`/forms`)
1. The professional opens `/forms`.
2. The system shows the tenant's templates grouped by type ("Clientes", "Serviços"), sorted by name. Each row
   shows name, description (truncated), number of fields, number of records created from it, and an "Arquivado"
   badge when archived.
3. Archived templates are hidden by default. A "Mostrar arquivados" toggle shows them.

### 4.2 Create a template from `/forms`
1. The professional presses **[Novo]**.
2. The system opens a blank editor (`/forms/new`) with: type (required, no default), name (empty), description
   (empty). Choosing a type inserts that type's system fields (SPEC-0002 §3.2) in their default order.
3. Changing the type before the first save replaces the system fields. Custom fields already added are kept.
4. The professional adds and arranges fields (SPEC-0002) and presses **[Salvar]**.
5. The system validates everything and stores the template with its fields (R10). It shows "Modelo salvo" and
   stays on the editor, now at `/forms/:id`.
6. Leaving the editor with unsaved changes asks for confirmation ("Descartar alterações?").

### 4.3 Create a template from `/clients` or `/services` (shortcut)
1. In the **[Novo]** dropdown of `/clients`, the professional picks **"Criar novo modelo"** (SPEC-0004 §4.2).
2. The system opens the same editor with type preset to `client` and locked, and with the client system fields
   inserted.
3. On **[Salvar]**, the system stores the template and goes straight to creating a new client with it
   (SPEC-0003 §4.1). This removes one step for the most common reason to create a template.
4. On **[Cancelar]**, the system returns to `/clients` and stores nothing.

The same applies to `/services` with type `service`.

### 4.4 Edit a template
1. The professional opens a template from `/forms`.
2. Name, description and fields are editable. Type is shown read-only.
3. **[Salvar]** behaves as in 4.2 step 5. If the template changed elsewhere since it was opened (another tab), the
   save is rejected (R11) and the editor shows "Este modelo foi alterado em outra janela. Recarregue para ver a
   versão atual." The local edits stay on screen until the professional reloads.
4. Saving changes never alters values already stored in records (RN-21; details in SPEC-0002 §4.5).

### 4.5 Archive and unarchive
1. From the editor or the list, the professional chooses **"Arquivar"** and confirms (R9).
2. The template disappears from the **[Novo]** dropdowns of `/clients` and `/services` and from the default
   `/forms` view. Records created from it are unaffected.
3. **"Desarquivar"** makes it active again. If an active template now has the same name, unarchiving still
   succeeds, because names are unique across both statuses (R4).

### 4.6 Delete
1. **"Excluir"** is offered only when the template has no records (R8). Otherwise the menu shows only
   "Arquivar", with the hint "Modelos com cadastros não podem ser excluídos".
2. The professional types the template name to enable the button (R9) and confirms.
3. The template and its fields are removed permanently.

## 5. Permissions and tenant isolation

MVP tenants have a single role, `owner` (`api-convention.md`, Tenant context). Collaborators are post-MVP
(RF-05, RF-06, RN-03).

| Action | Unauthenticated | Member | Owner | Other tenant |
| --- | --- | --- | --- | --- |
| List templates | 401 | — (post-MVP) | 200, own tenant only | 404 `tenant.not-found` |
| Read one template | 401 | — | 200 | 404 `form.not-found` |
| Create template | 401 | — | 201 | 404 `tenant.not-found` |
| Update template | 401 | — | 200 | 404 `form.not-found` |
| Archive / unarchive | 401 | — | 200 | 404 `form.not-found` |
| Delete template | 401 | — | 204 | 404 `form.not-found` |

"Other tenant" means two cases. A tenant context the caller has no membership in returns `tenant.not-found`. A
template id that exists but belongs to a different tenant than the active one returns `form.not-found`, the same
as an id that does not exist.

## 6. Errors

| Situation | Status | `error` key | `field` |
| --- | --- | --- | --- |
| Name missing or blank | 422 | `formName.required` | `name` |
| Name over 80 characters | 422 | `formName.too-long` | `name` |
| Name already used in tenant (R4) | 409 | `formName.taken` | `name` |
| Description over 500 characters | 422 | `formDescription.too-long` | `description` |
| Type missing or not `client`/`service` | 422 | `formType.invalid` | `type` |
| Type sent on update | 422 | `formType.immutable` | `type` |
| More than 100 fields | 422 | `formFields.too-many` | `fields` |
| Saved from an outdated version | 409 | `form.version-conflict` | — |
| Template id unknown or in another tenant | 404 | `form.not-found` | — |
| Delete while records exist | 409 | `form.in-use` | — |
| Archive an archived / unarchive an active template | 409 | `form.status-unchanged` | — |

Field-level errors are in SPEC-0002 §6. Every key needs pt-BR and en-US copy under `validation`.

## 7. Contract impact

New, non-breaking. Consumers: `apps/web` (BFF and pages).

- **FormTemplate** (single read, create and update responses): `id` (uuid), `type` (`client | service`),
  `name` (string), `description` (string | null), `status` (`active | archived`), `version` (int),
  `recordCount` (int), `fields` (Field[] in display order, SPEC-0002 §7), `createdAt`, `updatedAt` (ISO-8601 UTC).
- **FormTemplateSummary** (list item): `id`, `type`, `name`, `description`, `status`, `fieldCount`,
  `recordCount`, `updatedAt`.
- **List**: `{ forms: FormTemplateSummary[] }`, optional query `type`, `includeArchived` (boolean, default false).
  There is no pagination: templates per tenant are expected in the tens (cursor pagination applies to records only).
- **Create request**: `type`, `name`, `description?`, `fields` (FieldInput[], SPEC-0002 §7).
- **Update request**: `version` (required), `name?`, `description?`, `fields?` (full replacement list).
- **Archive / unarchive**: no body, return FormTemplate.
- **Delete**: no body, 204.

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
| Editor | not found | "Modelo não encontrado." + back to `/forms` | `forms.editor.notFound` |
| Editor | unsaved changes | [Salvar] enabled, leave prompt active | `forms.editor.unsaved` |
| Editor | saving | [Salvar] disabled with spinner, inputs read-only | `forms.editor.saving` |
| Editor | saved | Toast "Modelo salvo" | `forms.editor.saved` |
| Editor | validation error | Inline message under the field, focus moves to the first error | `validation.*` |
| Editor | version conflict | Banner (4.4 step 3) with [Recarregar] | `forms.editor.conflict` |
| Editor | no type chosen | Field list hidden, "Escolha o tipo para começar" | `forms.editor.chooseType` |
| Editor | archived | Banner "Modelo arquivado" + [Desarquivar]; still editable | `forms.editor.archived` |
| Archive dialog | confirm | "Arquivar modelo? Cadastros existentes não são afetados." | `forms.archive.confirm` |
| Delete dialog | confirm | Typed name required to enable [Excluir] | `forms.delete.confirm` |
| Delete action | disabled | Hint when records exist | `forms.delete.inUse` |

## 9. Open questions

| # | Question | Proposed answer | Blocks |
| --- | --- | --- | --- |
| 1 | RFC conflict C-3 (binding type). C-1 is decided (D-5). | Amend the RFC. | Approval |
| 2 | Should names be unique per tenant (R4), per type, or not at all? | Per tenant, across types. Simpler copy, no near-duplicates. | R4, AC-0001-05 |
| 3 | Should an archived template's records still be editable (R7)? | Yes. Archiving only stops new records. | R7 |
| 4 | ~~Default templates per tenant.~~ | **Decided (D-6):** yes, "Cliente" and "Serviço". | — |
| 5 | Delete and archive endpoint convention (no DELETE convention exists). | `DELETE /forms/:id`; `POST /forms/:id/archive` and `/unarchive`. | `/plan` |

## 10. Acceptance criteria

### Agreed criteria

These follow from the RFC or from decisions the owner has already taken (forms-overview.md §3).

```
AC-0001-01
Given an owner of tenant "studio-ana" on the template editor
When  they choose type "client", name "Anamnese inicial", and press Salvar
Then  the response is 201 with type "client", status "active", version 1
And   its fields are exactly the client system fields in default order (SPEC-0002 §3.2)
```

```
AC-0001-02
Given an owner on a new template editor
When  they press Salvar with no type chosen
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
Then  the response is 422 with { "error": "formName.too-long", "field": "name" }
```

```
AC-0001-06
Given tenant "studio-bia" has a template named "Anamnese"
When  the owner of "studio-ana" creates a template named "Anamnese"
Then  the response is 201
```

```
AC-0001-07
Given a client template at version 3
When  its owner sends an update containing "type": "service"
Then  the response is 422 with { "error": "formType.immutable", "field": "type" }
And   the template is still type "client" at version 3
```

```
AC-0001-08
Given a template at version 3, opened in two tabs
When  tab A saves (version becomes 4) and then tab B saves with version 3
Then  tab B receives 409 with { "error": "form.version-conflict" }
And   the stored template matches tab A's save
And   tab B shows the conflict banner with copy key forms.editor.conflict
```

```
AC-0001-09
Given an owner editing a template
When  they save a change to the name together with an invalid field label
Then  the response is 422 for the field label
And   the stored name is unchanged
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
Given an active client template "Ficha nutricional"
When  its owner archives it
Then  the response is 200 with status "archived"
And   "Ficha nutricional" no longer appears in the Novo dropdown on /clients
And   clients created from it remain readable and editable
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
Given a template with one client created from it
When  its owner sends a delete request
Then  the response is 409 with { "error": "form.in-use" }
And   the template still exists
And   the UI offered only "Arquivar", with copy key forms.delete.inUse
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
When  they navigate away
Then  a confirmation with copy key forms.editor.unsaved is shown
And   choosing to stay keeps their changes on screen
```

```
AC-0001-19
Given an owner saving a template with 101 fields
When  the request is sent
Then  the response is 422 with { "error": "formFields.too-many", "field": "fields" }
```

### Provisional criteria

These depend on open questions that are not answered yet. They are **not agreed behavior** and must not be turned into tests until the owner answers. On an answer, each one is confirmed, rewritten, or withdrawn (withdrawn IDs are not reused).

**AC-0001-05**: depends on §9 Q2 (name uniqueness across types and statuses).

```
AC-0001-05
Given tenant "studio-ana" has an archived service template named "Anamnese"
When  its owner creates a client template named " anamnése "
Then  the response is 409 with { "error": "formName.taken", "field": "name" }
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
