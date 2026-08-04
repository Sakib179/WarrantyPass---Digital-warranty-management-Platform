# WarrantyPass Web

Next.js App Router frontend for WarrantyPass. It consumes API-facing DTOs from shared packages and
keeps core business logic in the Express API.

Version 0.2 includes customer/business registration and login, verification and recovery links,
protected account/session settings, business verification and team workspaces, and a separately
authorized platform review console. Access tokens remain in memory.

## Development

From the repository root:

```bash
pnpm --filter @warrantypass/web dev
```

Open [http://localhost:3000](http://localhost:3000). Authentication forms intentionally perform only
client-side validation in Part 1; they never store or transmit credentials.

## Design foundation

Design tokens live in `src/app/globals.css`. Shared accessible primitives live in
`packages/ui`. The system supports light/dark tokens, reduced motion, keyboard navigation, a
Bangla-capable font stack, Asia/Dhaka formatting, and BDT currency helpers.
