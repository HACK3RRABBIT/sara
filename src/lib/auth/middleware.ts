import { createMiddleware } from "@tanstack/react-start";

/**
 * Auth middleware for server functions — the standard way to get the caller's
 * verified user id.
 *
 *   import { createServerFn } from "@tanstack/react-start";
 *   import { getSql } from "@/lib/db";
 *   import { authMiddleware } from "@/lib/auth/middleware";
 *
 *   export const listTodos = createServerFn({ method: "GET" })
 *     .middleware([authMiddleware])
 *     .handler(async ({ context }) => {
 *       const sql = await getSql();
 *       return sql`select * from todos where user_id = ${context.userId}`;
 *     });
 *
 * Signed out -> throws `UnauthorizedError` (see `verify.server.ts`).
 */
export const authMiddleware = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const { requireUserId } = await import("./verify.server");
    const userId = await requireUserId();
    return next({ context: { userId } });
  },
);
