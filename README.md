# WarrantyPass

WarrantyPass is a centralized digital warranty-management platform for Bangladesh. This repository
contains the production-oriented Part 2 identity and trust foundation: a Next.js web application,
Express REST API, PostgreSQL/Prisma domain model, secure authentication and sessions, business
verification, tenant RBAC, platform administration, email, private storage adapters, testing,
Docker, CI, and architecture documentation.

Part 2 intentionally stops before subscriptions, warranty issuance, claims, repair/service-centre
operations, ownership transfer, and recall workflows.

## Repository map

```text
.
├── apps
│   ├── api                 # Express 5 API and generated Prisma Client
│   └── web                 # Next.js 16 App Router application
├── packages
│   ├── eslint-config       # Shared ESLint flat configurations
│   ├── shared              # API DTOs, statuses, permissions, locale utilities
│   ├── typescript-config   # Strict shared TypeScript configurations
│   ├── ui                  # Accessible React design-system components
│   └── validation          # Shared Zod request/form contracts
├── prisma                  # Domain schema, migrations, and development seed
├── docs                    # Architecture, security, database, API, and development guides
├── docker                  # API and web multi-stage Dockerfiles
├── tests/e2e               # Playwright foundation
└── .github                 # CI and dependency update configuration
```

## Prerequisites

- Node.js 24 LTS-compatible runtime (minimum supported: 22.14)
- Corepack and pnpm 11
- Docker Desktop with Docker Compose v2/v5
- Git

## Local applications with PostgreSQL in Docker

```bash
cp .env.example .env
# Replace all local placeholder passwords/secrets in .env and make DATABASE_URL match POSTGRES_PASSWORD.
corepack enable
corepack pnpm install
docker compose up -d postgres mailpit
corepack pnpm db:generate
corepack pnpm db:migrate:deploy
corepack pnpm db:seed
corepack pnpm dev
```

Use `corepack pnpm db:migrate --name <change-name>` only while authoring a new schema change in
development. Fresh checkouts should apply the committed migrations with `db:migrate:deploy`.

## Entire stack in Docker

```bash
cp .env.example .env
# Replace local placeholders in .env.
docker compose up --build
docker compose exec api pnpm db:seed
```

Start the optional pgAdmin service:

```bash
docker compose --profile tools up -d pgadmin
```

Stop containers without deleting database data:

```bash
docker compose down
```

## Commands

| Command                         | Purpose                                               |
| ------------------------------- | ----------------------------------------------------- |
| `pnpm dev`                      | Run web and API development servers through Turborepo |
| `pnpm build`                    | Build packages and both production applications       |
| `pnpm lint`                     | Run strict ESLint checks                              |
| `pnpm format`                   | Format supported files                                |
| `pnpm format:check`             | Check formatting without changes                      |
| `pnpm typecheck`                | Type-check every workspace                            |
| `pnpm test`                     | Run shared, frontend, and API tests                   |
| `pnpm test:coverage`            | Run tests with V8 coverage                            |
| `pnpm test:e2e`                 | Start the web app and run Playwright                  |
| `pnpm db:generate`              | Generate the Prisma 7 TypeScript client               |
| `pnpm db:migrate --name <name>` | Create and apply a development migration              |
| `pnpm db:migrate:deploy`        | Apply committed migrations without prompts            |
| `pnpm db:seed`                  | Insert idempotent development-only sample data        |
| `pnpm db:studio`                | Open Prisma Studio                                    |

## Local URLs

- Web application: <http://localhost:3000>
- Customer dashboard shell: <http://localhost:3000/dashboard>
- Business dashboard shell: <http://localhost:3000/business/dashboard>
- Account security: <http://localhost:3000/account/profile>
- Business application: <http://localhost:3000/business/application>
- Platform administration: <http://localhost:3000/admin>
- API: <http://localhost:4000>
- API health: <http://localhost:4000/api/v1/health>
- Database health: <http://localhost:4000/api/v1/health/database>
- OpenAPI/Swagger: <http://localhost:4000/api/docs>
- OpenAPI JSON: <http://localhost:4000/api/openapi.json>
- Mailpit inbox: <http://localhost:8025>
- Optional pgAdmin: <http://localhost:5050>

## Documentation

- [Architecture](docs/architecture.md)
- [Database](docs/database.md)
- [Security and storage](docs/security.md)
- [Development workflow](docs/development.md)
- [API conventions](docs/api-conventions.md)
- [Authentication](docs/authentication.md)
- [Authorization](docs/authorization.md)
- [Business verification](docs/business-verification.md)
- [Email delivery](docs/email.md)
- [Testing strategy](docs/testing.md)
- [Web application](apps/web/README.md)
- [API application](apps/api/README.md)

## Development seed safety

Seed records use `.local` addresses and `DEV —` business names. Login passwords are Argon2id
hashes; the seed prints the development-only password and invitation token. With a blank
`DEV_SEED_PASSWORD`, a password is generated each run. The seed exits when `NODE_ENV=production`.
