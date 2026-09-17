import { getRequest } from "@tanstack/react-start/server";
import { auth } from "./server";

/**
 * Server-side session resolution (server-only).
 *
 * The app runs its own Better Auth at same-origin `/api/auth/*`, so the session
 * cookie rides along with every request to this app — server functions and SSR
 * loaders included. The user is resolved straight from the request cookies via
 * `auth.api.getSession`. Never trust a client-supplied user id — only the result
 * of this verification.
 */

/**
 * Thrown by `requireUserId` when the caller has no valid session. Carries
 * `status: 401`; the message is a stable contract — match
 * `err.message === "Unauthorized"` client-side to send the visitor to sign-in.
 */
export class UnauthorizedError extends Error {
  readonly status = 401;
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

export type VerifiedUser = { id: string; email: string | null };

/** Resolve the signed-in user from the current request, or `null`. */
export async function getSessionUser(): Promise<VerifiedUser | null> {
  const request = getRequest();
  if (!request) return null;
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return null;
  return { id: session.user.id, email: session.user.email ?? null };
}

/**
 * Resolve the current user id for a server function, or throw when unauthorized.
 * Prefer `authMiddleware` (`./middleware`), which calls this for you.
 */
export async function requireUserId(): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user.id;
}
