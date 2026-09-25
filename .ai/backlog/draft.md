# Backlog draft — Tenant foundation, Services, Clients, Agenda outline

Scope: MVP only (RFC §2.7). Excludes RBAC/multiuser (RF-05/06), plans/pacotes (RF-14–17),
notifications (RF-33–36), formulários (RF-37–42), labels/ocupação (RF-43), financial exports/ranking
(RF-30–32), payments/financial-view epic (drafted separately — not in this pass; ID-TMP-11 client
history returns with that epic, see below).

Owner review applied 2026-09-24 (`.ai/backlog/answers.md`, "draft review" section). Web issue notes:
all web-domain issues below are `blocked by Figma frames (owner adding to file
rWWne0gLS6YsVEuz4c7Amg)`; `figma: —` stays until frames land and figma-map.md is regenerated.

---

## EPIC: Tenant foundation (RFC refs: RF-04a, RN-01, RN-02, RNF-07, RFC §5.3.2, §6.1)

Minimum groundwork so every later module can scope data by tenant. Cross-cutting RLS/session pattern
goes first, as its own issue, per plan-backlog rules.

**ID-TMP-02 dropped** (owner decision): `tenant_memberships` already exists in the schema
(`.ai/context/db-schema.md`), and the rest of the original scope (`roles`, `permissions`,
`role_permissions`, `user_roles`) is full RBAC, which is Pós-MVP per RF-05/RF-06. No replacement issue
needed — ID-TMP-03 seeds the Owner role directly on the existing `tenant_memberships` table. Number
ID-TMP-02 stays retired (numbering is stable; not reused).

### [ID-TMP-01] Establish tenant-scoped RLS pattern (session tenant context)
- domains: db, api
- size: M
- blocked by: —
- figma: —
- acceptance criteria:
  - Given an authenticated request resolves an active tenant, when the API handles it inside a
    transaction, then it executes `SET LOCAL app.current_tenant = <tenant_id>` before any query
    (RFC §5.3.2, RN-02).
  - Given a table with `tenant_id` and an RLS policy `USING (tenant_id = current_setting('app.current_tenant')::uuid)`,
    when a query runs without that session variable set, then zero rows are returned (RNF-07 "zero
    vazamento entre tenants").
  - Given the pattern, when a later module (clients, services, agenda) adds RLS to its own table, then
    it reuses a documented migration helper/policy template instead of writing custom SQL (groundwork
    for later epics).
- out of scope: applying the policy to any domain table (done per-table in each epic); read replicas.

### [ID-TMP-03] Create tenant during onboarding
- domains: contracts, db, api, web
- size: M
- blocked by: ID-TMP-01
- figma: —
- notes: blocked by Figma frames (owner adding to file rWWne0gLS6YsVEuz4c7Amg)
- acceptance criteria:
  - Given an authenticated user with no tenant, when they submit a tenant name on the onboarding step,
    then a `tenant` row and a `tenant_membership` (role Owner) linking the user are created using the
    existing `tenant_memberships` table (RF-04a, UC-04a).
  - Given the flow login → register → create tenant → dashboard (RF-04a, RFC §3.1), when tenant
    creation succeeds, then the user is redirected to the dashboard with that tenant as active.
  - Given RN-02, when the created tenant is persisted, then all operational data created afterward
    must reference it (contract requirement for later epics, no domain tables yet in this issue).
- out of scope: selecting among / switching multiple tenants — one tenant per user in MVP (owner
  decision, RF-04a's multi-tenant selector is Pós-MVP); inviting collaborators (Pós-MVP).

### [ID-TMP-04] Resolve active tenant context per request
- domains: api
- size: S
- blocked by: ID-TMP-01, ID-TMP-03
- figma: —
- acceptance criteria:
  - Given a JWT identifying a user, when a tenant-scoped endpoint is called, then a guard/interceptor
    resolves the user's `tenant_membership`, validates `status = active`, and injects the tenant id
    used for `SET LOCAL app.current_tenant` (RN-02, RFC §5.3.2).
  - Given a user without an authorized membership for the requested tenant, when they call a
    tenant-scoped endpoint, then the API returns 403 (RN-02: "não pode... salvo se possuir vínculo
    autorizado").
  - Given RN-01, when an unauthenticated request hits a tenant-scoped endpoint, then it is rejected
    before tenant resolution runs.
- out of scope: tenant switcher UI — one tenant per user in MVP (owner decision, see ID-TMP-03).

---

## Shared web component (blocks Services + Clients delete issues)

### [ID-TMP-21] RN-25 delete confirmation dialog
- domains: web
- size: S
- blocked by: —
- figma: —
- notes: blocked by Figma frames (owner adding to file rWWne0gLS6YsVEuz4c7Amg)
- acceptance criteria:
  - Given a destructive delete action on a service or client, when the profissional triggers it, then
    a shared confirmation dialog opens requiring the entity name / "EXCLUIR" typed confirmation before
    the delete request fires (RN-25).
  - Given this component exists, when Services (ID-TMP-07) or Clients (ID-TMP-10) need a delete
    confirmation, then they reuse this single component instead of each building their own (RN-24,
    RN-25).
- out of scope: soft-delete/inactivate confirmation copy differences (each caller supplies its own
  text/labels through props).

---

## EPIC: Services (RFC refs: RF-11–RF-13, RN-06, RN-24, RN-25)

### [ID-TMP-05] Create service
- domains: contracts, db, api, web
- size: S
- blocked by: ID-TMP-01, ID-TMP-04
- figma: —
- notes: blocked by Figma frames (owner adding to file rWWne0gLS6YsVEuz4c7Amg)
- acceptance criteria:
  - Given the profissional is authenticated with an active tenant, when they submit name, duration and
    default price, then the service is created linked to that tenant (RF-11, RN-06 — "no mínimo, nome,
    duração estimada e valor padrão").
  - Given RN-06, when the submitted price is negative, then the API rejects the request.
- out of scope: currency selection UI (schema defaults `BRL`, accepted by owner — no MVP requirement
  to change it).

### [ID-TMP-06] List services
- domains: contracts, api, web
- size: S
- blocked by: ID-TMP-05
- figma: —
- notes: blocked by Figma frames (owner adding to file rWWne0gLS6YsVEuz4c7Amg)
- acceptance criteria:
  - Given services exist for the active tenant, when the profissional opens the services screen, then
    all of that tenant's services are listed (RF-13) and none from other tenants appear (RN-02).
  - Given RNF-23, when the list grows, then it is paginated (max 50 per page).
- out of scope: search/filter (not required by RF-13; clients have search per RF-09, services do not).

### [ID-TMP-07] Edit / inactivate / delete service
- domains: contracts, db, api, web
- size: M
- blocked by: ID-TMP-05, ID-TMP-21
- figma: —
- notes: blocked by Figma frames (owner adding to file rWWne0gLS6YsVEuz4c7Amg)
- acceptance criteria:
  - Given an existing service, when the profissional updates its fields, then the change is saved
    (RF-12).
  - Given a service with no linked appointments/plans/financial history, when the profissional
    requests deletion, then it is permanently removed after the shared confirmation dialog (ID-TMP-21)
    + typed confirmation text (RN-06, RN-24, RN-25 — destructive/irreversible operation).
  - Given a service with linked history, when deletion is requested, then the system inactivates
    (soft delete) it instead, keeping it selectable in historical records but not in new appointments
    (RF-12, RN-06, RN-24).
- out of scope: plans referencing services (RF-15, Pós-MVP).

---

## EPIC: Clients (RFC refs: RF-07–RF-10, RN-04, RN-05, RN-24, RN-25, RFC §6.2)

### [ID-TMP-22] Field-level encryption groundwork (sensitive free text)
- domains: db, api
- size: S
- blocked by: ID-TMP-01
- figma: —
- notes: scope revised 2026-09-24 (`.ai/backlog/answers.md`, "encryption scope revised") — supersedes
  the earlier "encrypt every client field" decision. The MVP `clients` table (`docs/schema.dbml`) has
  no CPF/government-id column, so the HMAC blind index for CPF described in the revised decision does
  not apply to this pass; it is dropped entirely rather than deferred.
- acceptance criteria:
  - Given a client's `notes`/observations field (or any other free-text field that can hold health or
    otherwise sensitive data), when the API persists it, then it is encrypted at rest via an
    app-level AES-256-GCM envelope with the data key sourced from env — not plaintext (RFC §6.2
    "Dados Sensíveis (art. 11)", LGPD Art. 11).
  - Given the ciphertext format, when a value is encrypted, then it is stored with a key-version/id
    prefix so keys can rotate without a full re-encryption migration (key-rotation-ready format).
  - Given RFC §6.2 / LGPD Art. 11, when a sensitive field is read, then it is only decrypted after
    tenant-scoped authorization succeeds (no plaintext exposure outside an authorized request).
  - Given an encrypted field's value, when it would otherwise appear in application logs, error
    reports or audit trails, then it is masked/omitted instead — sensitive fields are never logged
    (RFC §6.1 "Dados Sensíveis e Credenciais de Integração").
- out of scope: encrypting/rotating pre-existing rows (none exist yet); masking decrypted values in
  the UI for the owning tenant; name/email/phone, which stay plaintext and searchable/sortable in SQL
  (see ID-TMP-08/09/10); a blind index for CPF (no such field exists in the MVP client model).

### [ID-TMP-08] Create client
- domains: contracts, db, api, web
- size: S
- blocked by: ID-TMP-01, ID-TMP-04, ID-TMP-22
- figma: —
- notes: blocked by Figma frames (owner adding to file rWWne0gLS6YsVEuz4c7Amg)
- acceptance criteria:
  - Given the profissional is authenticated with an active tenant, when they submit name and at least
    one valid contact (RN-04: name + email required; phone/notes optional), then the client is created
    linked to the active tenant (RF-07, RFC §3.3.1).
  - Given ID-TMP-22, when the client is created, then `notes`/observations (and any other free-text
    field that can hold health data) is written through the app-level encryption helper; name, email
    and phone are stored as plaintext columns (RFC §6.2, LGPD Art. 11).
  - Given RN-04, when the submitted e-mail already belongs to another client in the same tenant, then
    the API rejects the request (uniqueness enforced by a tenant-scoped unique constraint/query on the
    plaintext `email` column).
  - Given the client is created, when the profissional opens the client list, then it appears there and
    can be selected in a future appointment (RFC §3.3.1); it must not be visible to any other tenant
    (RN-02).
- out of scope: custom forms (RF-37–42, Pós-MVP).

### [ID-TMP-09] Search / list clients
- domains: contracts, api, web
- size: S
- blocked by: ID-TMP-08
- figma: —
- notes: blocked by Figma frames (owner adding to file rWWne0gLS6YsVEuz4c7Amg)
- acceptance criteria:
  - Given clients exist for the active tenant, when the profissional searches by name, e-mail or
    phone, then the API matches directly in SQL (equality/`ILIKE` on the plaintext, tenant-scoped
    columns) — no decryption or blind index involved — and only that tenant's matches are returned
    (RF-09, RN-02).
  - Given RNF-23, when the list grows, then it is paginated (max 50 per page) and can be sorted (e.g.
    by name) directly in SQL.

### [ID-TMP-10] Edit / inactivate / delete client
- domains: contracts, db, api, web
- size: M
- blocked by: ID-TMP-08, ID-TMP-21
- figma: —
- notes: blocked by Figma frames (owner adding to file rWWne0gLS6YsVEuz4c7Amg)
- acceptance criteria:
  - Given an existing client, when the profissional updates its fields, then the change is saved
    (RF-08); `notes`/observations updates go through the app-level encryption helper (ID-TMP-22,
    RFC §6.2), while name/email/phone are updated as plaintext columns.
  - Given a client with no linked appointments/payments, when deletion is requested, then it is
    permanently removed after the shared confirmation dialog (ID-TMP-21) + typed confirmation text
    (RN-05, RN-24, RN-25).
  - Given a client with linked history, when deletion is requested, then the system inactivates
    (soft delete) it instead, preserving history for reports/finance (RF-08, RN-05, RN-24).

**ID-TMP-11 (client history) removed from this pass** — owner decision. It required the not-yet-drafted
Payments epic; it returns as part of that epic (RF-10: past appointments, services performed, amounts
paid, shown on the client record).

---

## EPIC: Agenda (RFC refs: RF-18–RF-22, RF-25, RN-09, RN-10, RN-12, RFC §5.3.2)

Full vertical slices (contracts+db+api+web, Given/When/Then) to be detailed in a later pass once
Tenant foundation + Clients + Services are approved. Titles, dependencies and RF/RN refs only.

| ID | Title | RF/RN refs | domains | blocked by | notes |
|---|---|---|---|---|---|
| ID-TMP-12 | Configure fixed availability | RF-18, RN-09 | contracts, db, api, web | ID-TMP-04 | blocked by Figma frames (rWWne0gLS6YsVEuz4c7Amg) |
| ID-TMP-13 | Configure free/one-off availability windows | RF-19, RN-09 | contracts, db, api, web | ID-TMP-12 | blocked by Figma frames (rWWne0gLS6YsVEuz4c7Amg) |
| ID-TMP-14 | Manual time blocks (block a slot) | RF-25, RN-09 | contracts, db, api, web | ID-TMP-12 | blocked by Figma frames (rWWne0gLS6YsVEuz4c7Amg) |
| ID-TMP-15 | Availability resolution engine (fixed+free+blocks, precedence per RN-09) | RN-09 | api | ID-TMP-12, ID-TMP-13, ID-TMP-14 | — |
| ID-TMP-16 | Create manual appointment (+ overbooking DB constraint) | RF-20, RN-10, RFC §5.3.2 (`EXCLUDE USING gist`) | contracts, db, api, web | ID-TMP-15, ID-TMP-05, ID-TMP-08 | blocked by Figma frames (rWWne0gLS6YsVEuz4c7Amg) |
| ID-TMP-17 | Edit / cancel appointment | RF-21, RN-12 | contracts, db, api, web | ID-TMP-16 | blocked by Figma frames (rWWne0gLS6YsVEuz4c7Amg) |
| ID-TMP-18 | Daily/weekly agenda view | RF-22 | contracts, api, web | ID-TMP-16 | blocked by Figma frames (rWWne0gLS6YsVEuz4c7Amg) |

---

## EPIC: Public booking (RFC refs: RF-23, RF-24, RN-11, RFC §6.2)

Split out from Agenda per owner review — unauthenticated-facing booking flow, distinct surface/risk
profile (privacy notice, RFC §6.2) from the profissional-facing agenda above.

| ID | Title | RF/RN refs | domains | blocked by | notes |
|---|---|---|---|---|---|
| ID-TMP-19 | Public booking link (unauthenticated view + request) | RF-23, RN-11, RFC §6.2 (aviso de privacidade) | contracts, db, api, web | ID-TMP-15 | blocked by Figma frames (rWWne0gLS6YsVEuz4c7Amg) |
| ID-TMP-20 | Confirm / decline pending request | RF-24, RN-11 | contracts, api, web | ID-TMP-19, ID-TMP-16 | blocked by Figma frames (rWWne0gLS6YsVEuz4c7Amg) |

---

## Open questions for the owner

None open for encryption scope — resolved 2026-09-24 (see "Resolved this pass" below).

## Resolved this pass (see `.ai/backlog/answers.md`, "draft review")
- Tenant switcher: out of scope, one tenant per user in MVP (ID-TMP-03, ID-TMP-04).
- Client-field encryption: scope revised 2026-09-24 (`.ai/backlog/answers.md`, "encryption scope
  revised") — only `notes`/observations and other free-text fields that can hold health data are
  encrypted (RFC §6.2, LGPD Art. 11); name/email/phone stay plaintext, searchable/sortable in SQL
  (ID-TMP-22, size reduced to S; ID-TMP-08/09/10 updated to match, blind-index/in-app-filter
  assumptions removed). No CPF field exists in the MVP `clients` schema, so no blind index applies.
- ID-TMP-11 (client history): removed, returns with the Payments epic.
- RN-25 confirm dialog: extracted as shared web issue ID-TMP-21, blocks ID-TMP-07 and ID-TMP-10.
- Services currency (`BRL` fixed): accepted, no MVP change.
- Agenda epic split into "Agenda" (ID-TMP-12–18) and "Public booking" (ID-TMP-19–20).
- ID-TMP-02 (tenant membership + role schema): dropped — `tenant_memberships` already exists; full
  RBAC is Pós-MVP (RF-05/RF-06). Number retired, not reused.
</content>
