# Development guide

## Part 2 quick start

Copy `.env.example` to `.env`, choose a local database password, and create independent
authentication secrets of at least 32 characters.

```bash
docker compose up -d postgres mailpit
pnpm install
pnpm db:generate
pnpm db:migrate:deploy
pnpm db:seed
pnpm dev
```

The seed prints development-only credentials and an invitation token. With a blank
`DEV_SEED_PASSWORD`, it generates a fresh password on each run. Mailpit is at
`http://localhost:8025`.

## First setup

```bash
cp .env.example .env
corepack enable
corepack pnpm install
docker compose up -d postgres
corepack pnpm db:generate
corepack pnpm db:migrate:deploy
corepack pnpm db:seed
corepack pnpm dev
```

For the very first schema creation in a new checkout that does not yet contain a migration, use
`pnpm db:migrate --name init`. Never use `migrate dev` in production.

Replace the `.env` placeholders before starting. Generate local secrets independently:

```bash
openssl rand -base64 48
```

Run it three times for the access, refresh, and cookie secrets. These values remain in ignored `.env`;
never paste them into source, issues, logs, or chat.

## Local service options

Run only PostgreSQL in Docker and Node locally:

```bash
docker compose up -d postgres
pnpm dev
```

Run the complete environment:

```bash
docker compose up --build
```

Run one application:

```bash
pnpm --filter @warrantypass/web dev
pnpm --filter @warrantypass/api dev
```

When running a single app directly, build its workspace dependencies first or use the root Turborepo
command, which does this automatically.

## Quality loop

Before opening a pull request:

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run Playwright after installing its browser once:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

## Adding an API module

1. Define request/response contracts in shared packages when consumed by multiple applications.
2. Add domain-specific route, controller, service, and persistence components under
   `apps/api/src/modules`.
3. Validate all external input with Zod middleware.
4. Keep authorization inside the use-case boundary as well as route middleware.
5. Add OpenAPI paths and isolated service/API tests.
6. Add audit events for security-sensitive state changes.

Do not export Prisma models to the frontend. Do not put business rules in routes, controllers, Next.js
Server Actions, or React components.

## Adding UI

Use semantic HTML first. Reuse `packages/ui` primitives and CSS tokens instead of page-specific control
styles. Every interactive control needs:

- a keyboard path and visible focus;
- an accessible name;
- loading/disabled/error behavior;
- text-based status, not color alone;
- responsive behavior at narrow widths;
- reduced-motion compatibility.

User-visible dates and currency should use shared `Asia/Dhaka` and BDT helpers. Content must be written
so a future translation catalog can replace strings without rebuilding layout assumptions.

## Tests

- API tests use an injected database port unless the behavior specifically needs PostgreSQL.
- Repository and migration integration tests will use a dedicated test database in later phases.
- Frontend tests focus on accessible outcomes and validation, not component internals.
- Shared contract tests prevent web/API drift.
- E2E tests exercise high-value journeys after authentication becomes real.

Tests must not depend on order, production services, existing developer data, or wall-clock locale.

## Git hooks and CI

Husky runs lint-staged on changed code. CI installs with a frozen lockfile, generates Prisma, applies
migrations to an isolated PostgreSQL service, checks formatting/lint/types, runs tests, builds both apps,
and scans for committed secrets. Hooks assist developers but CI remains authoritative.

## Troubleshooting

- `Prisma Client` import errors: run `pnpm db:generate`.
- Database connection refused: confirm `docker compose ps postgres` reports healthy and `.env`
  `DATABASE_URL` uses `localhost` for local Node or `postgres` inside Compose.
- Port already in use: stop the conflicting process or change both the port and corresponding URL/CORS
  values. For PostgreSQL, set `POSTGRES_PORT` and use the same host port in `DATABASE_URL`; the
  container always listens on 5432 internally.
- Workspace module missing: run `pnpm install`, then the root `pnpm build` or `pnpm dev`.
- Stale Docker dependency volumes: run `docker compose down`, then remove only the named Node cache
  volumes you intend to recreate; do not delete the PostgreSQL data volume unless data loss is intended.
