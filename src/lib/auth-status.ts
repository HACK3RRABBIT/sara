import { createServerFn } from "@tanstack/react-start";
import { getSql } from "@/lib/db";

/**
 * Public (no session needed): is first-run setup still open?
 * Setup is open only while the users table is completely empty — the first
 * account to register becomes the administrator, and registration then closes.
 */
export const getAuthStatus = createServerFn({ method: "GET" }).handler(
  async () => {
    const sql = await getSql();
    const rows = await sql<{ count: number }>`
      select count(*)::int as count from "user"
    `;
    return { needsSetup: (rows[0]?.count ?? 0) === 0 };
  },
);
