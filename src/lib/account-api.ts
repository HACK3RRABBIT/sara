import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authMiddleware } from "@/lib/auth/middleware";

export const changeAdminPassword = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(8).max(128),
  }))
  .handler(async ({ data }) => {
    const { auth } = await import("@/lib/auth/server");
    const { getRequest } = await import("@tanstack/react-start/server");
    // Built-in route: verifies the current password, then rewrites the
    // credential and revokes every session including this one — the browser
    // must sign in again with the new password.
    try {
      await auth.api.changePassword({
        headers: getRequest().headers,
        body: {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
          revokeOtherSessions: true,
        },
      });
      return { ok: true as const };
    } catch {
      return { ok: false as const, message: "رمز تغییر نکرد. رمز فعلی را بررسی کنید؛ رمز تازه دست‌کم ۸ نویسه است." };
    }
  });

export const changeAdminEmail = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({
    newEmail: z.string().trim().email().max(254),
    currentPassword: z.string().min(1).max(128),
  }))
  .handler(async ({ data, context }) => {
    const { auth } = await import("@/lib/auth/server");
    const { getRequest } = await import("@tanstack/react-start/server");
    const { withTransaction } = await import("@/lib/db");
    // SMTP is not required: ownership is confirmed with the current password.
    // The built-in email-change route remains disabled, so it cannot bypass this.
    try {
      await auth.api.verifyPassword({
        headers: getRequest().headers,
        body: { password: data.currentPassword },
      });
      await withTransaction(async (sql) => {
        const rows = await sql.query<{ id: string }>(
          `update "user" set email = $1, "emailVerified" = false, "updatedAt" = now()
           where id = $2 and role = 'admin' returning id`,
          [data.newEmail.toLowerCase(), context.userId],
        );
        if (rows.length !== 1) throw new Error("Forbidden");
        await sql.query(`delete from "session" where "userId" = $1`, [context.userId]);
      });
      return { ok: true as const };
    } catch {
      return { ok: false as const, message: "ایمیل تغییر نکرد. رمز فعلی و ایمیل جدید را بررسی کنید؛ در صورت نیاز دوباره وارد شوید." };
    }
  });
