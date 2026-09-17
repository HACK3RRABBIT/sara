import { createAuthClient } from "better-auth/react";

/**
 * Better Auth client for this React SPA (browser-side).
 *
 * Talks to this app's OWN Better Auth at same-origin `/api/auth/*` with plain
 * email + password. The session is an HttpOnly cookie on this origin — no
 * bearer tokens, no OAuth.
 *
 * To sign out call `signOut()` below (it redirects after the cookie is cleared).
 */
export const authClient = createAuthClient();

/**
 * Sign out of THIS app's local session, then redirect.
 *
 * Use this, never `authClient.signOut()` alone — the redirect makes the sign-out
 * visible and re-bootstraps the SPA cleanly.
 */
export async function signOut(redirectTo = "/login"): Promise<void> {
  const { error } = await authClient.signOut();
  if (error) throw new Error(error.message ?? "Sign-out failed");
  window.location.href = redirectTo;
}
