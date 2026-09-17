import { createFileRoute } from "@tanstack/react-router";
import { auth } from "@/lib/auth/server";
import { adminExists, promoteFirstUserToAdmin, removeUser } from "@/lib/admin.server";

/**
 * Better Auth catch-all. Sign-up is only allowed while the users table is
 * EMPTY (first-run setup): the first registration is promoted to the admin
 * role, and every later one is refused with 403 — including direct API calls,
 * not just the UI.
 */
async function guarded(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/auth\/?/, "").replace(/\/+$/, "");
  // Better Auth's email-password sign-up endpoint is /api/auth/sign-up/email.
  if ((path === "sign-up" || path === "sign-up/email") && request.method === "POST") {
    if (await adminExists()) {
      return Response.json({ message: "Registration is closed" }, { status: 403 });
    }
    const response = await auth.handler(request);
    if (!response.ok) return response;
    // The successful sign-up response identifies the newly created user.
    // Set-Cookie response headers cannot be used as request Cookie headers.
    const result = (await response.clone().json()) as { user?: { id?: string } };
    const userId = result.user?.id;
    if (!userId) {
      return Response.json({ message: "Setup failed" }, { status: 500 });
    }
    if (userId) {
      try {
        await promoteFirstUserToAdmin(userId);
      } catch {
        // Bootstrap lost the race or the row vanished — undo this sign-up so a
        // non-admin account is never left behind with a valid session.
        await removeUser(userId);
        return Response.json({ message: "Registration is closed" }, { status: 403 });
      }
    }
    return response;
  }
  return auth.handler(request);
}

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: ({ request }) => auth.handler(request),
      POST: ({ request }) => guarded(request),
    },
  },
});
