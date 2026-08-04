# Testing strategy

Vitest covers packages, Supertest covers API behavior, React Testing Library covers accessible UI,
and Playwright is reserved for full browser journeys. Database integration tests must use
`TEST_DATABASE_URL`, pointing to a disposable database separate from development.

```bash
pnpm db:generate
pnpm db:migrate:deploy
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Future Playwright tests should isolate schemas per worker, use deterministic seeds, and consume
verification/invitation messages through Mailpit's API. Never clean a non-test database.
