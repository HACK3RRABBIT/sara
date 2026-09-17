/**
 * Self-hosted Better Auth for Sara (server-only).
 *
 * Plain email + password sign-in against the app's own Postgres, at
 * same-origin `/api/auth/*` so the session cookie stays on this origin.
 * No OAuth, no broker, no preview fallbacks.
 *
 * NEVER import this from client code — it pulls in `pg` and server-only Better
 * Auth internals. The client uses `@/lib/auth/client`; components read the user
 * via `@/lib/auth/use-current-user`; server functions get a verified id via
 * `@/lib/auth/middleware`.
 */
import { betterAuth } from "better-auth";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { getPool } from "../db";
import { emailAndPasswordEnabled } from "./email-password";

/** Read an env var, treating empty/whitespace as unset. */
const env = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const secret = env("BETTER_AUTH_SECRET");
if (!secret || secret.length < 32) {
  throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters. Generate it with openssl rand -hex 32.");
}

const databaseUrl = env("DATABASE_URL");
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required. Start PostgreSQL and set it in .env (see .env.example).",
  );
}

// Local `npm run dev` (port 8080 contract). Browsers may send Origin as any of
// these for the same server — trusting only `localhost` rejects `127.0.0.1` and
// breaks email/password with "Invalid origin".
const LOCAL_DEV_ORIGINS: string[] = [
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://[::1]:8080",
];

// This app's own Better Auth origin. Set `BETTER_AUTH_URL` to the public URL in
// production (preferably https://…); otherwise it is derived from the request.
const baseURL = env("BETTER_AUTH_URL") ?? {
  allowedHosts: ["localhost", "127.0.0.1", "[::1]"],
  protocol: "auto" as const,
  fallback: "http://localhost:8080",
};

// Origins Better Auth accepts on credentialed POSTs (sign-up/sign-in, etc.).
// Missing entries here surface as FORBIDDEN "Invalid origin".
const trustedOrigins: string[] = [
  ...(env("BETTER_AUTH_URL") ? [env("BETTER_AUTH_URL") as string] : []),
  ...LOCAL_DEV_ORIGINS,
];

/** Session token cookie name. */
export const SESSION_TOKEN_COOKIE = "__Host-sara-auth.session_token";

export const auth = betterAuth({
  baseURL,
  // Deployed apps set BETTER_AUTH_SECRET in .env — a long random string.
  secret,
  // Same pool the app data uses — one Postgres, one schema.
  database: getPool(),

  trustedOrigins,

  // Cache the session in the short-lived signed `session_data` cookie so reads
  // (incl. the client's `/get-session`) skip the DB — this shrinks the "loading"
  // window and reduces auth flicker.
  session: { cookieCache: { enabled: true, maxAge: 300 } },

  // Local email/password — the only sign-in method.
  ...(emailAndPasswordEnabled ? { emailAndPassword: { enabled: true } } : {}),

  // `__Host-` prefixed cookies: the browser REFUSES any same-named cookie that
  // carries a `Domain` attribute. `__Host-` requires Secure + Path=/ + no
  // Domain; Better Auth otherwise uses `__Secure-` (which permits Domain), so
  // we drop its auto prefix (`useSecureCookies: false`) and set the names
  // ourselves. (Browsers allow Secure cookies on `http://localhost`, so local
  // dev still works.)
  advanced: {
    useSecureCookies: false,
    defaultCookieAttributes: { secure: true, sameSite: "lax", path: "/" },
    cookies: {
      session_token: { name: SESSION_TOKEN_COOKIE },
      session_data: { name: "__Host-sara-auth.session_data" },
      dont_remember: { name: "__Host-sara-auth.dont_remember" },
    },
  },

  // Email change is handled by the app itself (src/lib/account-api.ts) with a
  // current-password check and direct SQL — no SMTP dependency. The built-in
  // route stays disabled so its verification-email path can never run.
  user: { changeEmail: { enabled: false } },

  // Bridges Better Auth's Set-Cookie into TanStack Start responses. MUST be
  // last so it runs after every other plugin's hooks.
  plugins: [tanstackStartCookies()],
});
