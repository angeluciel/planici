# Api Conventions

## Base
- Prefix `/api/v1`. Controllers use URI version 1 and resource roots from `apps/api/src/config/app.routes.ts`; the global `/api` prefix belongs to bootstrap.
- Resource paths are English and plural (`/tenants`); authentication actions live under `/auth` (`/auth/login`, `/auth/email/verify`).
- JSON fields and query parameters use `camelCase`: `refreshToken`, `emailVerificationToken`. Database columns use `snake_case`; that naming does NOT carry into JSON.
- Request and response contracts live in `packages/schemas` and are imported through `@planici/schemas`. Change the shared contract when changing the API.

## Verbs

| Verb   | Use |
| ------ | --- |
| GET    | Reads and availability Checks |
| POST   | Creation and auth actions: login, refresh, logout, verification, password reset. |
| PATCH  | Edit mutable attributes. Tenant updates currently accept only `name`. |
| PUT    | No estrablished endpoint convention. |
| DELETE | No estrablished endpoint convention. |

Tenant creation is `POST /tenants`; renaming is `PATCH /tenants/:tenantId`.
The tenant slug and ID are not changed by rename. Do not expose arbitrary status
changes just because a database column exists.

## Responses
Success returns the endpoint's shared resposne shape directly.
There is no universal `data`, `success` or `message` wrapper.
- Single tenant: the tenant object.
- Availability: `{ "available": true }`.
- Login, registration and refresh: `{ "accessToken": "…", "refreshToken": "…", "expiresIn": 900, "user": { … } }`. The lifetime shown is illustrative.
- Accepted email-code requests and successfull logout return no payload.

Return the public entity projection, not a database row. Internal fields such as password hashes must not appear in user responses.

Errors use this shape:

```json
{
  "error": "tenantSlug.taken",
  "field": "slug"
}
```

- `error` is a stable machine-readable translation key, not a human-readable
  sentence. Preserve existing spelling and casing: `credentials.invalid`,
  `tenant.not-found`, `tenantSlug.taken`.
- `field` is optional and identifies the request field. Nested validation paths
  are dot-separated. Omit it for failures that are not tied to a field.
- The frontend translates the key. Do not add translated prose, an error array,
  a nested error object, or a `statusCode` property.
- Expected failures use `DomainError` subclasses and the global
  `DomainExceptionFilter`. Unhandled failures return
  `500 { "error": "unexpected" }`.

Framework exceptions are a compatibility exception: the filter preserves an
existing Nest exception payload's `error` value. Do not assume every framework
401 or 429 already produces an application translation key.

## Status codes

| Code | Meaning here |
| --- | --- |
| 200 | Successful read, login, refresh, verification, or tenant update. |
| 201 | Resource created: registration or tenant creation. |
| 202 | Email-code request accepted; no payload. |
| 204 | Logout completed; no payload. |
| 400 | Domain rejection using the default status, such as a missing tenant context or invalid verification code. |
| 401 | Invalid credentials or absent, invalid, or expired token. |
| 403 | Inactive account/tenant or insufficient tenant permission. |
| 404 | Tenant not found or inaccessible to the caller; malformed tenant IDs also return this. |
| 409 | Conflict, such as an email or slug already taken. |
| 422 | Request validation failure. |
| 429 | Throttling, account lockout, or verification-attempt limit. |
| 500 | Unexpected server failure. |
| 503 | External authentication provider unavailable. |

Use the status defined by the domain error. Do not convert every business
failure to 409: existing verification-code errors use 400, for example.

## Validation

Validate bodies and query parameters against the shared Zod schemas using
`ZodBody`. Validation returns the first issue as `{ "error": "<key>",
"field": "<path>" }` with status 422.

Normalization is part of the contract:

- Emails are trimmed and lowercased.
- Tenant slugs are trimmed and lowercased, with a maximum of 48 characters.
- Tenant names are trimmed, repeated whitespace is collapsed by the domain
  value object, and the maximum length is 80 characters.

Reuse the shared schemas and constants; do not create a second set of API-only
validation rules. Availability checks are advisory: a subsequent create can
still return 409 if another request claims the value first.

## Lists, filtering, sorting

Deleted tenants and inactive memberships are excluded. Suspended tenants remain
visible in this list, even though they cannot be operated on. The response uses
`Cache-Control: private, no-store`.

Availability uses explicit query parameters, such as
`GET /tenants/availability?slug=studio-ana`.

### Pagination

Collections that can grow without bound (clients, services, appointments)
use cursor pagination with `limit` and `after`:
- `limit`: optional integer, 1-100, default 50. Anything else returns `422 { "error": "limit.invalid", "field": "limit" }`.
- `after`: optional opaque cursor from a previous response's `nextCursor`. Omit for the first page.
- Response: the named array plus `nextCursor` (string, or `null` on the last page). Example: `{ "clients": [...], "nextCursor": "eyJr..."}`. These is no total count, no page number and no other envelope.
- Each endpoint documents one fixed, stable sort that always ends with `id` as a tie-breaker, so pages never repeat or skip items.
- The cursor is bound to the filters it was issued with. Sending it with a different filter (for example a new q), or sending a malformed or tampered cursor, returns `422 { "error": "cursor.invalid", "field": "after" }`. Clients restart from the first page when filters change.
- Clients must treat the cursor as opaque and never build or parse it.

## Auth

`Authorization: Bearer <accessToken>`. Protected routes use `JwtAccessGuard`;
a Swagger bearer annotation alone does not protect a route.

The API returns access and refresh tokens in its session response. The web BFF
handles browser httpOnly cookies and forwards the access token as a bearer
header. Do not assume the API reads browser session cookies directly.

Refresh tokens are stored hashed, rotated on use, and grouped into families for
revocation on reuse. Preserve the existing session flow when adding auth paths.

## Tenant context

Tenant-specific routes run `JwtAccessGuard` before `ActiveTenantGuard`.
The tenant is selected by `:tenantId`, or by `X-Tenant-Id` when there is no route
parameter. The route parameter wins if both are present.

- Missing context: `400`, `tenant.required`.
- Invalid ID, missing tenant, or no active membership: `404`, `tenant.not-found`.
- Inactive tenant: `403`, `tenant.inactive`.
- Insufficient management permission: `403`, `tenant.forbidden`.

Use the membership resolved by the guard. Never accept a caller-supplied user ID
or tenant header as proof of access. Management currently requires the `owner`
role; no broader role hierarchy is established.

Creating a tenant, listing the caller's tenants, and checking tenant-slug
availability require authentication but do not require a selected tenant.

## IDs and dates

- User IDs are UUIDs.
- Tenant IDs are strings such as `studio-ana-4f9k2m7x1q`: normalized slug plus a
  ten-character lowercase alphanumeric suffix. Validate with `TenantIdSchema`,
  not a UUID validator. Treat the ID as an identifier, not a slug to reconstruct.
- Public tenant timestamps are ISO-8601 UTC strings from `toISOString()`.
  Nullable timestamps remain `null`; do not replace them with empty strings.

## Money

- Amounts are JSON integers in the currency's minor unit (centavos for BRL): `9999` means R$ 99,99. Never use floats or decimal strings.
- Name the field with a `Cents` suffix (`priceCents`) and send the ISO 4217 code beside it (`"currency": "BRL"`). The MVP accepts only `BRL`.
- Formatting for display (`R$ 99,99`) happens in the frontend.

## Rate limits and tracing

The global limit is 60 requests per 60 seconds. Routes can override it; current
examples are login (10/minute), tenant creation (5/minute), and availability
(20/minute). Nest throttler `ttl` values are in milliseconds.

The tracing interceptor reuses an incoming `x-trace-id` or generates one and
sets it on the response. Keep tracing in the header; there is no correlation-ID
field in the JSON error contract.

## Documentation

OpenAPI is generated by Nest Swagger with Zod schema conversion. Use shared
schemas in request decorators, tag endpoints by resource, and document bearer
authentication where required. Swagger UI is at `/docs`; the JSON document is
at `/docs/openapi.json`.

Production routes use `/api/v1/...`. The current E2E harness uses `/v1/...`;
that is a test-bootstrap difference, not a second public API prefix.

---

Based on [Planici `dev` at `d667305`](https://github.com/angeluciel/planici/tree/d667305d5e01a9612bae9a3428058506ef597c96).
Contract sources: `packages/schemas/src/`, `apps/api/src/modules/`,
`apps/api/src/shared/http/`, and `apps/api/src/main.ts`.
