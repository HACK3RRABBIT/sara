import { getSql, withTransaction } from "@/lib/db";

/**
 * First-run admin bootstrap (server-only).
 *
 * The app is single-admin: registration is open ONLY while the users table is
 * empty. The first sign-up atomically becomes the admin; afterwards the
 * sign-up endpoint refuses everyone. If any user exists but none has the
 * admin role (a legacy or damaged database), everything fails closed — an
 * operator must grant the role in SQL (`update "user" set role='admin' ...`),
 * because guessing who "should" be admin is not the app's call.
 *
 * Concurrency: two simultaneous first sign-ups race the same row-level check,
 * so the whole promote-or-refuse step runs inside one transaction holding a
 * pg advisory lock — exactly one of them wins, the other sees a non-empty
 * users table (its own insert committed first) and is refused.
 */
export async function promoteFirstUserToAdmin(userId: string): Promise<void> {
  const promoted = await withTransaction(async (sql) => {
    // Serialize first-run bootstrap across concurrent requests/processes.
    await sql.query("select pg_advisory_xact_lock(721834557)");
    const rows = await sql<{ count: number }>`
      select count(*)::int as count from "user"
    `;
    const total = rows[0]?.count ?? 0;
    if (total !== 1) return false; // 0 = impossible here, >1 = too late anyway
    await sql.query(`update "user" set role = 'admin' where id = $1`, [userId]);
    return true;
  });
  if (!promoted) {
    throw new Error("Registration is closed");
  }
}

/** True when at least one admin-role user exists (server-only). */
export async function adminExists(): Promise<boolean> {
  const sql = await getSql();
  const rows = await sql<{ count: number }>`
    select count(*)::int as count from "user" where role = 'admin'
  `;
  return (rows[0]?.count ?? 0) > 0;
}

/** Delete a user row (cascades to sessions and credential accounts). */
export async function removeUser(userId: string): Promise<void> {
  const sql = await getSql();
  await sql.query(`delete from "user" where id = $1`, [userId]);
}
