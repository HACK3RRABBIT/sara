import { useState, type ReactNode } from "react";
import { Navigate } from "@tanstack/react-router";
import { signOut } from "./client";
import { useCurrentUser, useCurrentUserState } from "./use-current-user";

/**
 * Auth state components — plain wrappers around `useCurrentUserState()`.
 *
 * Visitors are signed out until they authenticate with email and password.
 * While the session is still resolving, gates that care about signed-out state
 * render nothing so there's no signed-out flash on hard reload.
 */

/** Where `RedirectToSignIn` sends signed-out visitors. */
export const SIGN_IN_PATH = "/login";

/** Render children only when a user is present. */
export function SignedIn({ children }: { children: ReactNode }) {
  const { user } = useCurrentUserState();
  return user ? <>{children}</> : null;
}

/**
 * Render children only once we KNOW the visitor is signed out (`isPending` has
 * cleared and there is no user). Hidden while the session is still loading.
 */
export function SignedOut({ children }: { children: ReactNode }) {
  const { user, isPending } = useCurrentUserState();
  if (isPending || user) return null;
  return <>{children}</>;
}

/**
 * Client-side redirect to the sign-in route (TanStack `<Navigate>` — NOT a full
 * `window.location` reload). Guard routes by waiting out `isPending` first (see
 * `use-current-user`), then render this.
 */
export function RedirectToSignIn({ to = SIGN_IN_PATH }: { to?: string }) {
  return <Navigate to={to} />;
}

/**
 * Signed-in identity chip + sign-out button.
 */
export function UserButton() {
  const user = useCurrentUser();
  const [signingOut, setSigningOut] = useState(false);
  if (!user) return null;
  const label = user.displayName ?? user.primaryEmail ?? "حساب";
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-black/10 text-sm font-medium dark:bg-white/20">
        {label.charAt(0).toUpperCase()}
      </span>
      <span className="hidden text-sm font-medium sm:inline">{label}</span>
      <button
        type="button"
        disabled={signingOut}
        onClick={() => {
          setSigningOut(true);
          // Success navigates away; on failure re-enable so it can be retried.
          void signOut().catch(() => setSigningOut(false));
        }}
        className="cursor-pointer rounded-md px-2 py-1 text-sm underline-offset-4 opacity-70 hover:bg-muted hover:underline disabled:cursor-wait disabled:no-underline"
      >
        {signingOut ? "در حال خروج…" : "خروج"}
      </button>
    </div>
  );
}
