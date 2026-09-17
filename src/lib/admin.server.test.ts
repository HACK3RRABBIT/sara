/**
 * Integration tests for first-run admin bootstrap (src/lib/admin.server.ts).
 * Runs against a real Postgres (DATABASE_URL) — skipped otherwise. Uses the
 * `@/` alias loader shim, same as export-model.test.mjs.
 *
 *   DATABASE_URL=... node --experimental-strip-types \
 *     --experimental-loader ./src/lib/admin.server.test.mjs \
 *     --test src/lib/admin.server.test.ts
 */
import { strict as assert } from "node:assert";
import { after, before, describe, it } from "node:test";

const dbUrl = process.env.DATABASE_URL;
const { getSql } = await import("@/lib/db.ts");
const { promoteFirstUserToAdmin, adminExists, removeUser } = await import(
  "@/lib/admin.server.ts"
);

/** Reset the users table between cases. */
async function resetUsers() {
  const sql = await getSql();
  await sql.query(`delete from "user"`);
}

/** Insert a user row the way Better Auth would. */
async function insertUser(id: string, email: string) {
  const sql = await getSql();
  await sql.query(
    `insert into "user" (id, name, email, "emailVerified") values ($1, $2, $3, false)`,
    [id, "مدیر", email],
  );
}

describe("first-run admin bootstrap", () => {
  before(async () => {
    if (!dbUrl) return;
    await resetUsers();
  });

  after(async () => {
    if (!dbUrl) return;
    await resetUsers();
  });

  it("promotes the only existing user to admin", async () => {
    if (!dbUrl) return;
    await resetUsers();
    await insertUser("u1", "first@sara.local");
    await promoteFirstUserToAdmin("u1");
    assert.equal(await adminExists(), true);
    const sql = await getSql();
    const rows = await sql`select role from "user" where id = 'u1'`;
    assert.equal(rows[0].role, "admin");
  });

  it("refuses when more than one user exists (fail closed)", async () => {
    await resetUsers();
    await insertUser("u1", "a@sara.local");
    await insertUser("u2", "b@sara.local");
    await assert.rejects(() => promoteFirstUserToAdmin("u1"), /Registration is closed/);
    assert.equal(await adminExists(), false);
  });

  it("racing promotions leave at most one admin and no stray members", async () => {
    // Model the worst interleaving: both sign-ups committed their users before
    // either promotion ran (the initial adminExists() guard passed for both).
    await resetUsers();
    await insertUser("u1", "race-a@sara.local");
    await insertUser("u2", "race-b@sara.local");
    const results = await Promise.allSettled([
      promoteFirstUserToAdmin("u1"),
      promoteFirstUserToAdmin("u2"),
    ]);
    // Both must be refused — a promote only succeeds against a 1-user table.
    const sql = await getSql();
    const admins = await sql`select count(*)::int as c from "user" where role = 'admin'`;
    assert.equal(admins[0].c, 0);
    assert.equal(results.every((r) => r.status === "rejected"), true);
    // In production the handler then removeUser()s every rejected sign-up, so
    // the table empties and setup reopens — no non-admin account is left with
    // a valid session. Verify that rollback path works from this state.
    await removeUser("u1");
    await removeUser("u2");
    const left = await sql`select count(*)::int as c from "user"`;
    assert.equal(left[0].c, 0);
  });

  it("removeUser deletes the row", async () => {
    await resetUsers();
    await insertUser("u9", "gone@sara.local");
    await removeUser("u9");
    const sql = await getSql();
    const rows = await sql`select count(*)::int as c from "user"`;
    assert.equal(rows[0].c, 0);
  });
});
