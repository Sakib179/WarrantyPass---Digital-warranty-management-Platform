# API conventions

Authenticated requests use `Authorization: Bearer <access-token>`. Tenant requests add
`X-Business-ID`. Mutations include `X-CSRF-Token` matching the readable CSRF cookie.

Stable authentication codes include `AUTH_INVALID_CREDENTIALS`, `AUTH_EMAIL_NOT_VERIFIED`,
`AUTH_SESSION_INVALID`, and `AUTH_REFRESH_REUSE`. Authorization failures do not reveal inaccessible
tenant resources.

## Versioning and URLs

All business API routes begin with `/api/v1`. Swagger is served at `/api/docs`; the machine-readable
document is `/api/openapi.json`. A future breaking contract requires a new major path while the previous
supported version remains operational during migration.

Use plural resource nouns and HTTP semantics:

```text
GET    /api/v1/warranties
POST   /api/v1/warranties
GET    /api/v1/warranties/:warrantyId
PATCH  /api/v1/warranties/:warrantyId
POST   /api/v1/warranties/:warrantyId/revoke
```

Named action endpoints are reserved for state transitions that are not ordinary field updates.

## Successful responses

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Collections include `page`, `pageSize`, `totalItems`, and `totalPages` in `meta`. Timestamps are ISO 8601
UTC strings. Public monetary DTOs include decimal amount and ISO currency; the frontend localizes BDT
for display.

## Error responses

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid data.",
    "details": [
      {
        "path": "email",
        "message": "Enter a valid email address",
        "code": "invalid_format"
      }
    ]
  }
}
```

Error codes are stable machine contracts; messages are human-readable and may be localized later.
Validation details never contain submitted secrets. Production responses never contain stacks, SQL,
configuration, internal hostnames, or provider payloads.

Recommended status mapping:

- `200` read/update/action success;
- `201` resource created;
- `204` successful deletion with no response body;
- `400` malformed or invalid request;
- `401` missing/invalid authentication;
- `403` authenticated but unauthorized;
- `404` absent or deliberately concealed resource;
- `409` uniqueness or state-transition conflict;
- `413` body/upload too large;
- `422` valid syntax but rejected domain rule;
- `429` rate limit;
- `503` required dependency unavailable.

## Request correlation and logging

Clients may send `X-Request-ID` using 8–80 safe alphanumeric/punctuation characters. The API generates a
UUID otherwise and returns it. Structured logs record route, method, response status, latency, request
ID, release, and environment. Passwords, cookies, authorization headers, tokens, document URLs, and
private content are redacted or omitted.

## Validation and DTOs

Routes call shared/domain Zod schemas before controllers. Controllers translate HTTP to use cases.
Services return explicit DTOs rather than Prisma models. Unknown input fields should be stripped or
rejected according to the endpoint contract; sensitive mutations should prefer strict schemas.

Enums in public contracts need additive compatibility review. Database enum addition does not
automatically authorize a public API value.

## Pagination, filtering, and ordering

Part 1 provides page/page-size validation. Initial collection APIs use one-indexed page pagination with
a maximum page size of 100. High-volume audit and notification streams may adopt opaque cursor
pagination later. Sort fields must be allowlisted; raw column or SQL fragments are never accepted.

Filters use clear query names:

```text
?page=1&pageSize=20&status=ACTIVE&search=refrigerator&sort=-createdAt
```

## Idempotency and concurrency

Warranty issuance, claim creation, payments, transfers, and signed upload intents will support
idempotency keys. Mutable resources that risk lost updates should use version checks or conditional
requests. Database transactions enforce multi-record state transitions.

## Security headers and cookies

API clients must use HTTPS in production. Refresh cookies are `HttpOnly`, `Secure`, `SameSite=Strict`,
and scoped to the auth path. CORS origins are exact. Authorization decisions are made against current
database membership and permission state, never trusted from client input.
