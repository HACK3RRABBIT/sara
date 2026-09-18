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

// The port the BROWSER actually connects to. Inside Docker, `PORT` is only
// used for the host-side port mapping (compose maps it to the container's
// fixed internal 8080) — it is never passed into the container itself, so
// reading `PORT` here would silently fall back to the wrong port. The one
// value that reliably carries the real external port is `BETTER_AUTH_URL`
// (set to exactly the address the browser opens), so parse it from there
// first; `PORT` only matters for `npm run dev`, where there is no remapping.
const port = (() => {
  const authUrl = env("BETTER_AUTH_URL");
  if (authUrl) {
    try {
      return new URL(authUrl).port || "80";
    } catch {
      // fall through
    }
  }
  return env("PORT") ?? "8080";
})();

// Same-machine origins at the app's actual port. Browsers may send Origin as
// any of these for the same server — trusting only `localhost` rejects
// `127.0.0.1` and breaks email/password with "Invalid origin". `0.0.0.0` is
// included too: it's not a real routable address, but some setups resolve a
// browser request to it anyway (it reaches this server, so it must be trusted
// the same as localhost — nothing further away can use it).
const LOCAL_ORIGINS: string[] = [
  `http://localhost:${port}`,
  `http://127.0.0.1:${port}`,
  `http://[::1]:${port}`,
  `http://0.0.0.0:${port}`,
];

// This app's own Better Auth origin. Set `BETTER_AUTH_URL` to the public URL in
// production (preferably https://…); otherwise it is derived from the request.
const baseURL = env("BETTER_AUTH_URL") ?? {
  allowedHosts: ["localhost", "127.0.0.1", "[::1]"],
  protocol: "auto" as const,
  fallback: `http://localhost:${port}`,
};

// Extra origins to trust beyond localhost/127.0.0.1 — e.g. the machine's LAN
// IP, so phones/other devices on the network can sign in too. Comma-separated
// full origins (scheme://host:port), set in .env. See .env.example.
const extraOrigins = (env("BETTER_AUTH_TRUSTED_ORIGINS") ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Origins Better Auth accepts on credentialed POSTs (sign-up/sign-in, etc.).
// Missing entries here surface as FORBIDDEN "Invalid origin".
const trustedOrigins: string[] = [
  ...(env("BETTER_AUTH_URL") ? [env("BETTER_AUTH_URL") as string] : []),
  ...LOCAL_ORIGINS,
  ...extraOrigins,
];

// Browsers only ever store a `Secure` cookie over a "potentially trustworthy"
// origin: `https://` (any host), or plain `http://` but ONLY on the exact
// loopback names `localhost` / `127.0.0.1` / `[::1]`. Every other plain-HTTP
// address — a LAN IP, or `0.0.0.0` — is NOT on that allowlist, so a `Secure`
// cookie is accepted by the server (sign-in returns 200) and then silently
// DROPPED by the browser: no session ever sticks, and every next page looks
// signed-out (surfacing as "wrong email or password" once the app collapses
// the error). This bit us for real — self-hosting almost always means plain
// HTTP on a LAN, so `Secure` + `__Host-` cookies (which browsers refuse
// outright without Secure) only make sense when `BETTER_AUTH_URL` is itself
// `https://` (a real TLS domain, e.g. behind a reverse proxy).
const usesHttps = env("BETTER_AUTH_URL")?.startsWith("https://") ?? false;
const cookiePrefix = usesHttps ? "__Host-" : "";

/** Session token cookie name. */
export const SESSION_TOKEN_COOKIE = `${cookiePrefix}sara-auth.session_token`;

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
  // we drop its auto prefix (`useSecureCookies` below) and set the names
  // ourselves. Both the prefix and `secure` follow `usesHttps` together —
  // see the comment above `cookiePrefix`; a `__Host-` name without `secure`
  // (or vice versa) is simply rejected by the browser, so they can't diverge.
  advanced: {
    useSecureCookies: false,
    defaultCookieAttributes: { secure: usesHttps, sameSite: "lax", path: "/" },
    cookies: {
      session_token: { name: SESSION_TOKEN_COOKIE },
      session_data: { name: `${cookiePrefix}sara-auth.session_data` },
      dont_remember: { name: `${cookiePrefix}sara-auth.dont_remember` },
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
