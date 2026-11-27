---
id: SPEC-0010
title: Isolamento de tenants garantido pelo banco de dados
status: Draft # Draft | Review | Approved | Implemented | Superseded
plan_status: Draft # Draft | Approved
version: 0.2
owner: Joao Izidoro
satisfies: [RNF-07, RN-02]
depends_on: [SPEC-0001, SPEC-0002, SPEC-0003, SPEC-0004, SPEC-0005, SPEC-0006]
phase: MVP
ticket: -
---

# SPEC-0010 — Isolamento de tenants garantido pelo banco de dados

## 1. Purpose

RNF-07 (RFC §2, "Data Isolation (Multi-tenancy)") asks for tenant isolation "mesmo em caso de erro de aplicação" and
says the isolation "seja garantido na camada de banco de dados", with "Row-Level Security (RLS) obrigatório em todas as
tabelas com `tenant_id` | Zero vazamento entre tenants". RFC §5 ("Tenant module") and RFC §6 ("Isolamento por
Tenant") describe the same: the API propagates the active tenant to the database, and the database itself filters
rows by it. RFC §7 puts this in M1, with RLS validated again in M3 and M6b.

As built (verified 2026-11-27), isolation lives in the API only. The RN-02 membership check resolves the active
tenant, and every query adds its own tenant condition. The API tells the database which tenant it acts for during
writes, but no database rule reads that, and SPEC-0003 C-5 already records this. One query that forgets its tenant
condition would therefore leak or change another tenant's data, and nothing below the API would stop it. On top of
that, references between rows (a record to its template, a value to its field) are checked by the API only, so the
database accepts a row of one tenant that points at a row of another.

This spec makes the database enforce both: a row of tenant data is visible and changeable only while the API acts
for that row's tenant, and a row can only reference rows of its own tenant. The API's HTTP behavior does not change.

## 2. Scope

**In scope**
- Database enforcement of tenant isolation for every kind of tenant data listed in R1.
- Failing closed: database access for tenant data with no tenant context sees no rows and stores none (R3).
- Runtime credentials for the API that cannot switch the enforcement off, separate from the credentials used for
  schema changes (R6).
- Every API operation on tenant data, reads included, running with the active tenant as its context (R4).
- Tenant-aware references: a row of tenant data may only reference a row of the same tenant (R7).
- A check that fails when a table holding tenant data lacks the enforcement (R9).
- Applying the change to existing data without silently fixing or losing anything (R8).

**Out of scope**
- The tenant directory (tenants and memberships): it is what the RN-02 check reads to find the active tenant, before
  any tenant context exists. It stays protected by the API (§9 Q1).
- Account data that belongs to a user, not to a tenant (users, identities, consents, sessions, sign-in attempts,
  e-mail codes, password resets). RN-02 does not list it as tenant data.
- A compromised API process, or a defect that sets the wrong tenant as context. The database trusts the tenant the
  API states after the RN-02 check; this spec protects against queries that forget the tenant, not against a lying
  API (§9 Q6).
- Tenant data that does not exist yet (plans, availability, time blocks, appointments, payments). It comes under R1
  and R7 whichever spec is implemented first: a spec that adds tenant data after this spec is implemented puts that
  data under R1 and R7 itself; if that spec is implemented first, R1 and R7 here are amended to include its data
  before this spec is implemented. R9 fails until either happens.
- Unauthenticated access to tenant data through the public booking link (RN-01): it will need a tenant context taken
  from the link; that belongs to the public booking link spec.
- How and when migrations are applied in production (§9 Q3).
- Whether a client's creator must be a member of the client's tenant (§9 Q7).

## 3. Domain rules

- **R1 — Tenant data.** These kinds of stored data belong to exactly one tenant and are tenant data for this spec
  (RN-02, RNF-07). Names in parentheses are the ones in `docs/schema.dbml`.
  - templates (`forms`), template versions (`form_versions`), template fields (`form_fields`), field options
    (`form_field_options`), version fields (`form_version_fields`), version field options
    (`form_version_field_options`);
  - records (`form_records`) and record values (`form_record_values`);
  - clients (`clients`) and services (`services`).
- **R2 — The database scopes tenant data to the context.** While database access acts for tenant A, it sees, changes
  and removes only tenant A's rows of tenant data, whatever conditions the query states, and it stores a row of
  tenant data only when the row belongs to tenant A. A change that would move a row to another tenant is refused
  (RNF-07).
- **R3 — No context, no tenant data.** Database access with no tenant context sees no rows of tenant data, and every
  attempt to store, change or remove one is refused or affects nothing. Forgetting the context fails closed
  (RNF-07: "mesmo em caso de erro de aplicação").
- **R4 — Every operation on tenant data has the active tenant as context.** After the RN-02 check resolves the active
  tenant of a request, every database access of that request for tenant data, reads included, acts for that tenant.
  Creating a tenant acts for the new tenant when it stores the new tenant's default templates (SPEC-0004 R11 and SPEC-0005
  R10) (RN-02).
- **R5 — The context never outlives its unit of work.** A tenant context ends when the unit of work that set it ends,
  whether it succeeds or fails. A pooled connection never carries a tenant context into another unit of work (RFC
  §5, "Tenant module": "a conexão devolvida ao pool não carregue o contexto de um tenant para outro").
- **R6 — The API cannot switch the enforcement off.** The credentials the API uses at runtime cannot disable R2 and
  R3, cannot change the schema, and are not exempt from R2 and R3. Schema changes and data changes that span tenants
  use separate maintenance credentials that the running API does not hold (§9 Q2). `assumption`
- **R7 — References stay inside one tenant.** A row of tenant data that references another row of tenant data
  references a row of the same tenant. The database refuses a row, from any credentials, that breaks this. The
  references are (RN-02):

  | Row | References |
  | --- | --- |
  | template version | its template |
  | template field | its template |
  | field option | its field |
  | version field | its version; its field |
  | version field option | its version; its option; its field (§9 Q4) |
  | record | its template; its template version |
  | record value | its record; its field |
  | client | its record |
  | service | its record |

- **R8 — Existing data is checked, not fixed.** Before R7 applies, existing rows are checked. If any row references a
  row of another tenant or a missing row, the change is not applied at all and the offending rows are reported.
  Nothing is rewritten or removed automatically (§9 Q5). `assumption`
- **R9 — Missing enforcement fails the checks.** The automated checks fail, naming the table, when any table that
  holds a tenant column, other than the tenant directory (§9 Q1), lacks R2 and R3 or lets the credentials that own
  the table bypass them (§9 Q2) (RNF-07: "todas as tabelas com `tenant_id`").
- **R10 — HTTP behavior is unchanged.** Every acceptance criterion of SPEC-0001 to SPEC-0009, and of every other spec
  that is Approved or Implemented when this spec is implemented, keeps passing. Those criteria are checked with the
  runtime credentials for the API, and with the maintenance credentials for the default-template backfills of
  SPEC-0004 R11 and SPEC-0005 R10. In particular another tenant's resource still answers 404 with its resource's
  not-found key, and the RN-02 check keeps answering `tenant.required`, `tenant.not-found` and `tenant.inactive` as
  today.

## 4. Behavior

### 4.1 A request on tenant data

1. The caller is authenticated (RN-01).
2. The RN-02 check reads the tenant directory, confirms the caller's membership and the tenant's state, and
   resolves the active tenant. No tenant context exists yet, and none is needed: the directory is outside R1.
3. Each database access for tenant data opens a unit of work acting for the active tenant (R4). Inside it, the
   database applies R2 to every statement, including those that already state a tenant condition.
4. The unit of work ends. Its tenant context ends with it (R5).

A query that forgets its own tenant condition still sees only the active tenant's rows. An access that forgets to
open a unit of work with a context sees nothing and stores nothing (R3). The HTTP answer for that defect is in §6.

### 4.2 Creating a tenant

Creating a tenant stores the tenant and the owner's membership (tenant directory, no context needed), then acts for
the new tenant to store its default client and service templates (R4). The tenant, its membership and its default
templates are stored together or not at all, as today.

### 4.3 Maintenance

Schema changes, and data changes that span tenants (for example a backfill of default templates for every tenant),
run with the maintenance credentials (R6). R7 still applies to them; R2 and R3 apply as decided in §9 Q2.

Deleting a tenant with the maintenance credentials removes every row of tenant data of that tenant and no row of
tenant data of any other tenant.

### 4.4 Applying this change to an existing database

1. Existing rows are checked against R7. If any row references a row of another tenant or a missing row, the change
   stops before altering anything and reports those rows (R8).
2. Otherwise R7, R2 and R3 are put in place for every table in R1, and the runtime credentials are given exactly the
   access the API needs on them (R6).
3. The API switches to the runtime credentials only after step 2 has completed (§9 Q3).

## 5. Permissions and tenant isolation

| Action | No tenant context | Acting for tenant A | Rows of tenant B while acting for A | Maintenance credentials (§9 Q2, proposed (c)) |
| --- | --- | --- | --- | --- |
| Read tenant data | No rows | A's rows only | Never visible | No context: no rows. Acting for a tenant: that tenant's rows only |
| Store tenant data | Refused | Only rows of A | Storing a row of B is refused | No context: refused. Acting for a tenant: only rows of that tenant. R7 applies |
| Change or remove tenant data | Affects nothing | A's rows only | Affects nothing | No context: affects nothing. Acting for a tenant: that tenant's rows only. R7 applies |
| Move a row to another tenant | Refused | Refused | Refused | Refused |
| Switch the enforcement off | Refused (runtime credentials) | Refused | Refused | Allowed |
| Read the tenant directory | Allowed (API checks RN-02) | Allowed | n/a | Allowed |

The maintenance column follows the proposed answer (c) to §9 Q2 and is revised if the owner decides otherwise. Under
it, data changes that span tenants act for each tenant in turn (§4.3).

HTTP access keeps today's rules: unauthenticated 401, no membership 404 `tenant.not-found`, another tenant's resource
404 with its not-found key (R10).

## 6. Errors

No new error keys or statuses. R2 and R3 only refuse what the API already never does on a correct path, so a
database refusal on an API path is a defect, not a domain outcome.

| Situation | Status | `error` key | `field` |
| --- | --- | --- | --- |
| A database access for tenant data ran without a tenant context and was refused (defect) | 500 | `unexpected` | — |
| A stored row referenced a row of another tenant and the database refused it (defect: the API's own checks run first and answer the existing 400/422 keys, e.g. `formId.invalid`) | 500 | `unexpected` | — |

A read without context is not an error: it returns no rows, so the defect shows as an empty list or a 404 (§9 Q8).

## 7. Contract impact

No change to any request or response in `packages/schemas`. Breaking: no. Consumers: none.

Deployment impact: the API needs runtime credentials distinct from the maintenance credentials (R6). The owner
creates them and sets them in the deployment; agents do not touch environment files.

## 8. UI states

—

## 9. Open questions

| # | Question | Proposed answer | Blocks |
| --- | --- | --- | --- |
| 1 | RNF-07 says "todas as tabelas com `tenant_id`", which literally includes memberships. But the RN-02 check reads memberships (and tenant state) before any tenant context exists, "my tenants" lists one user's memberships across tenants, and the slug check reads every tenant. Enforce on the tenant directory too? | No, not in this spec: the tenant directory stays protected by the API, which always filters it by the authenticated user or by the slug. Enforcing on it needs a user context in the database as well; revisit when multi-user (RF-05/RF-06) arrives. R9 lists it as the only exception. | R1, R9, AC-0010-12, AC-0010-20, AC-0010-24 |
| 2 | How does the API's database access stay subject to R2 and R3? Today the API and the migrations use the same credentials, which own the tables, and an owner is exempt by default. Options: (a) separate runtime credentials that do not own the tables; (b) make the enforcement apply to the owner too; (c) both. | (c) both. (a) is the actual protection; (b) makes a deploy misconfigured with the maintenance credentials fail closed instead of open. Under (b) data changes that span tenants (§4.3) act for each tenant in turn. Needs the owner to create the runtime credentials in the database provider and in the deployment. | R6, R9 (its bypass clause exists only under (b) or (c)), the §5 maintenance column, AC-0010-10, AC-0010-11, AC-0010-22, AC-0010-24 |
| 3 | RFC §5.5 says migrations are "aplicadas automaticamente no pipeline antes da publicação"; the deploy pipeline has no migration step today. How are they applied in production, and with which credentials? | Out of scope here; the owner states the current practice. This spec only needs the order of §4.4: the change applied with the maintenance credentials before the API switches to the runtime credentials. | No |
| 4 | A version field option stores its field, but the database has no reference for it at all today. Add one under R7? | Yes: a tenant-aware reference to the field, like the others. If the owner prefers to leave it, drop it from R7, AC-0010-13 and the missing-field example of AC-0010-16. | R7, AC-0010-13, AC-0010-16 |
| 5 | What happens if production already holds a cross-tenant reference? None is known: the API checks references before storing. | R8: stop, report, change nothing; the owner decides the fix. Run the check against production before the release. | No |
| 6 | The database trusts the tenant the API states. A defect that states the wrong tenant still leaks. Accept? | Yes. The RN-02 check is the only source of the tenant context, and its tests (the tenant isolation suite) stay. A per-request signed context is not proportionate for the MVP. | No |
| 7 | A client stores the user who created it; nothing requires that user to be a member of the client's tenant. | Out of scope: users are not tenant data. Note it for the multi-user work. | No |
| 8 | RFC §5 describes "um interceptor abre uma transação" for the whole request. The API instead opens one unit of work per database operation. Is that acceptable? | Yes. The required behavior is R4 and R5, not the mechanism; one unit of work per request would hold a transaction open for the whole request. Align the RFC wording in an editorial change. | No |
| 9 | SPEC-0003 C-5 says no database rule reads the tenant context. | Editorial amendment of SPEC-0003 C-5 when this spec is implemented. | No |

## 10. Acceptance criteria

"Runtime credentials" are the credentials the API uses when it runs. "Acting for A" means a unit of work whose tenant
context is tenant A. Tenants A and B are separate tenants with separate owners unless stated.

```gherkin
AC-0010-01
Given tenants A and B with rows of <kind> each
And   runtime credentials acting for A
When  they read every row of <kind> with no condition on the tenant
Then  they receive A's rows of <kind> and none of B's

Examples:
  | kind                     |
  | templates                |
  | template versions        |
  | template fields          |
  | field options            |
  | version fields           |
  | version field options    |
  | records                  |
  | record values            |
  | clients                  |
  | services                 |
```

```gherkin
AC-0010-02
Given tenants A and B with rows of <kind> each
And   runtime credentials with no tenant context
When  they read every row of <kind>
Then  they receive no rows

Examples:
  | kind                     |
  | templates                |
  | template versions        |
  | template fields          |
  | field options            |
  | version fields           |
  | version field options    |
  | records                  |
  | record values            |
  | clients                  |
  | services                 |
```

```gherkin
AC-0010-03
Given tenant B's client "Bruno" with phone "11900000001"
And   runtime credentials acting for A
When  they change the phone of the client with Bruno's id to "11900000002"
Then  no row is changed
And   Bruno's phone is still "11900000001"
```

```gherkin
AC-0010-04
Given tenant B's service "Corte"
And   runtime credentials acting for A
When  they remove the service with Corte's id
Then  no row is removed
And   tenant B still has the service "Corte"
```

```gherkin
AC-0010-05
Given runtime credentials acting for A
When  they store a client that belongs to tenant B
Then  the database refuses it
And   neither tenant A nor tenant B has a new client
```

```gherkin
AC-0010-06
Given tenant A's client "Ana"
And   runtime credentials acting for A
When  they change Ana's tenant to B
Then  the database refuses it
And   Ana still belongs to tenant A
```

```gherkin
AC-0010-07
Given runtime credentials with no tenant context
When  they store a template that belongs to tenant A
Then  the database refuses it
And   tenant A has no new template
```

```gherkin
AC-0010-08
Given tenant A with one client
And   a pooled connection that has just finished a unit of work acting for A, successfully
When  a new unit of work on that same connection reads every client without setting a tenant context
Then  it receives no rows
```

```gherkin
AC-0010-09
Given tenant A with one client
And   a pooled connection whose last unit of work acting for A failed and was undone
When  a new unit of work on that same connection reads every client without setting a tenant context
Then  it receives no rows
```

```gherkin
AC-0010-10
Given the runtime credentials
When  they try to switch off the tenant enforcement on the clients table
Then  the database refuses it
And   AC-0010-02 still holds for clients
```

```gherkin
AC-0010-11
Given tenants A and B with one client each
And   the maintenance credentials with no tenant context
When  they read every client
Then  they receive no rows
# Applies only if §9 Q2 is decided as (b) or (c).
```

```gherkin
AC-0010-12
Given a database where one table that holds a tenant column, other than the tenant directory, <gap>
When  the automated checks run
Then  they fail
And   the failure names that table

Examples:
  | gap                                                                  |
  | has no tenant enforcement at all                                     |
  | enforces R2 and R3 when rows are read, but not when they are stored  |
  | enforces R2 and R3 when rows are read, but not when they are changed |
  | enforces R2 and R3 when rows are read, but not when they are removed |
```

```gherkin
AC-0010-13
Given tenant B's <parent>
And   tenant A
When  <credentials> store a <row> of tenant A that references B's <parent>
Then  the database refuses it
And   tenant A has no new <row>

Examples:
  | row                  | parent           | credentials                          |
  | template version     | template         | runtime credentials acting for A     |
  | template version     | template         | maintenance credentials acting for A |
  | template field       | template         | runtime credentials acting for A     |
  | template field       | template         | maintenance credentials acting for A |
  | field option         | template field   | runtime credentials acting for A     |
  | field option         | template field   | maintenance credentials acting for A |
  | version field        | template version | runtime credentials acting for A     |
  | version field        | template version | maintenance credentials acting for A |
  | version field        | template field   | runtime credentials acting for A     |
  | version field        | template field   | maintenance credentials acting for A |
  | version field option | template version | runtime credentials acting for A     |
  | version field option | template version | maintenance credentials acting for A |
  | version field option | field option     | runtime credentials acting for A     |
  | version field option | field option     | maintenance credentials acting for A |
  | version field option | template field   | runtime credentials acting for A     |
  | version field option | template field   | maintenance credentials acting for A |
  | record               | template         | runtime credentials acting for A     |
  | record               | template         | maintenance credentials acting for A |
  | record               | template version | runtime credentials acting for A     |
  | record               | template version | maintenance credentials acting for A |
  | record value         | record           | runtime credentials acting for A     |
  | record value         | record           | maintenance credentials acting for A |
  | record value         | template field   | runtime credentials acting for A     |
  | record value         | template field   | maintenance credentials acting for A |
  | client               | record           | runtime credentials acting for A     |
  | client               | record           | maintenance credentials acting for A |
  | service              | record           | runtime credentials acting for A     |
  | service              | record           | maintenance credentials acting for A |
```

```gherkin
AC-0010-14
Given tenant A's published client template and its version 1
And   runtime credentials acting for A
When  they store a record of tenant A on that template and version, with a value for one of its fields
Then  the record and the value are stored
```

```gherkin
AC-0010-15
Given tenants A and B, each with templates, records, clients and services
When  tenant A is deleted with the maintenance credentials
Then  no row of tenant data of tenant A remains
And   every row of tenant data of tenant B remains unchanged
```

```gherkin
AC-0010-16
Given an existing database where one <row> of tenant A references <target>
When  this change is applied
Then  the change exits with a failure whose output names the table of that <row> and the <row>'s id
And   the schema and every row are as they were before

Examples:
  | row                  | target                               |
  | record               | a template of tenant B               |
  | version field option | a template field that does not exist |
```

```gherkin
AC-0010-17
Given tenant A with client "Ana", service "Escova" and client template "Ficha" (version 1, field "Alergias")
And   tenant B with client "Bruno", service "Corte" and client template "Anamnese"
And   the API using the runtime credentials
When  A's owner calls <read> with A as the active tenant
Then  the response is 200 and <shows>

Examples:
  | read                      | shows                                               |
  | list clients              | lists "Ana" and not "Bruno"                         |
  | read the client "Ana"     | shows "Ana" and her record's values                 |
  | list services             | lists "Escova" and not "Corte"                      |
  | read the service "Escova" | shows "Escova" and its record's values              |
  | list templates            | lists "Ficha" and not "Anamnese"                    |
  | read the template "Ficha" | shows "Ficha" and its field "Alergias"              |
  | read version 1 of "Ficha" | shows version 1 of "Ficha" and its field "Alergias" |
```

```gherkin
AC-0010-18
Given tenant A's active client template "Ficha", its default service template "Serviço" (SPEC-0005 R10)
And   tenant A's client "Ana", who has no linked history
And   the API using the runtime credentials
When  A's owner calls <write> with A as the active tenant
Then  the response is <status>
And   every row it stored, changed or removed belongs to tenant A

Examples:
  | write                                               | status |
  | create a client on "Ficha"                          | 201    |
  | update the client "Ana"                             | 200    |
  | delete the client "Ana"                             | 204    |
  | create a service on "Serviço"                       | 201    |
  | create a template                                   | 201    |
  | update "Ficha" with a schema change (SPEC-0001 R14) | 200    |
```

```gherkin
AC-0010-19
Given a signed-in user and the API using the runtime credentials
When  the user creates the tenant "studio-ana"
Then  the response is 201
And   "studio-ana" has its default client template "Cliente" (SPEC-0004 R11) and its default service template "Serviço" (SPEC-0005 R10)
```

```gherkin
AC-0010-20
Given a user who is a member of tenants A and B, and the API using the runtime credentials
When  the user lists their tenants
Then  the response lists A and B
```

```gherkin
AC-0010-21
Given tenant A's client "Ana" with phone "11900000001"
And   runtime credentials with no tenant context
When  they <write>
Then  no row is changed or removed
And   tenant A still has the client "Ana" with phone "11900000001"

Examples:
  | write                                                         |
  | change the phone of the client with Ana's id to "11900000002" |
  | remove the client with Ana's id                               |
```

```gherkin
AC-0010-22
Given the runtime credentials
When  they try to add a column to the clients table
Then  the database refuses it
And   the clients table has the same columns as before
```

```gherkin
AC-0010-23
Given tenant A's record on its client template "Ficha", version 1
And   tenant B's client template "Anamnese" and its version 1
And   <credentials>
When  they change A's record to reference version 1 of "Anamnese"
Then  the database refuses it
And   A's record still references version 1 of "Ficha"

Examples:
  | credentials                          |
  | runtime credentials acting for A     |
  | maintenance credentials acting for A |
```

```gherkin
AC-0010-24
Given a database where one table that holds a tenant column, other than the tenant directory, enforces R2 and R3 but exempts the credentials that own the table
When  the automated checks run
Then  they fail
And   the failure names that table
```

```gherkin
AC-0010-25
Given tenant B's client "Bruno", and the API using the runtime credentials
When  A's owner reads the client with Bruno's id, with A as the active tenant
Then  the response is 404 with { "error": "client.not-found" }
```

## 11. Implementation plan

Written by `/plan` after the spec is Approved. Empty until then.

```scope
```

## 12. Changelog

| Version | Date | Change |
| --- | --- | --- |
| 0.1 | 2026-11-27 | Draft. As-built state verified the same day: no database rule reads the tenant context (SPEC-0003 C-5), the API and the migrations share one set of credentials that own the tables, references between tenant data are checked by the API only, and version field options have no reference to their field. |
| 0.2 | 2026-11-27 | Review fixes. §5 maintenance column rewritten to follow §9 Q2's proposed answer (c). §9 Blocks completed: Q1 adds AC-0010-24; Q2 adds R9, the §5 maintenance column, AC-0010-22 and -24; Q4 now blocks R7, AC-0010-13 and -16. R9 says "the credentials that own the table". R8 and §4.4 also cover references to a missing row. R10 names the credentials the earlier specs' criteria run with and covers every spec Approved or Implemented when this one is. §4.3 states what deleting a tenant removes (rule behind AC-0010-15). §2 says how future tenant data comes under R1 and R7 in either implementation order. §6 cites the existing 400/422 keys. AC-0010-03, -12, -13, -16, -17 and -18 changed; AC-0010-21 to -25 added. Pending on the owner: §9 Q1 and Q2 (they block R1, R6, R9, the §5 maintenance column and AC-0010-10, -11, -12, -20, -22 and -24; AC-0010-11 keeps its Q2 note until Q2 is decided) and Q4 (R7, AC-0010-13, -16). |
