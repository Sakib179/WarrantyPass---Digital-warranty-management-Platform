/**
 * One-off script: reset the platform admin password.
 * Usage: pnpm tsx scripts/reset-admin-password.ts
 * Optional env overrides: PLATFORM_ADMIN_EMAIL, NEW_ADMIN_PASSWORD
 */
import 'dotenv/config';

import argon2 from 'argon2';
import { Pool } from 'pg';

const ADMIN_EMAIL = process.env.PLATFORM_ADMIN_EMAIL ?? 'dev.admin@warrantypass.local';
const NEW_PASSWORD = process.env.NEW_ADMIN_PASSWORD ?? 'AdminPass123!';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not set.');

const pool = new Pool({ connectionString });

async function run(): Promise<void> {
  const hash = await argon2.hash(NEW_PASSWORD, { type: argon2.argon2id });

  const result = await pool.query<{ email: string }>(
    `UPDATE "User" SET "passwordHash" = $1, "passwordChangedAt" = NOW()
     WHERE email = $2 AND "deletedAt" IS NULL
     RETURNING email`,
    [hash, ADMIN_EMAIL],
  );

  if (result.rowCount === 0) {
    console.error(`❌  No active user found with email: ${ADMIN_EMAIL}`);
    console.error(`    Check PLATFORM_ADMIN_EMAIL env var or confirm the user exists.`);
  } else {
    console.log(`✅  Password reset successful for: ${result.rows[0].email}`);
    console.log(`    New password: ${NEW_PASSWORD}`);
    console.log(`    Change this immediately after logging in.`);
  }

  await pool.end();
}

run().catch((err: unknown) => {
  console.error('❌  Script failed:', err);
  process.exit(1);
});
