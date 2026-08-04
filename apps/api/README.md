# WarrantyPass API

Production-oriented Express 5 REST API for WarrantyPass. All business APIs live under `/api/v1`;
Next.js is not used as the domain backend.

Version 0.2 owns authentication, rotating sessions, recovery, business applications, private
verification documents, tenant RBAC, platform verification, email delivery, and audit events.

## Development

From the repository root:

```bash
pnpm db:generate
pnpm --filter @warrantypass/api dev
```

The API requires the root `.env`. See [the API conventions](../../docs/api-conventions.md) and
[security model](../../docs/security.md) before adding a module.
