export type Theme = "light" | "dark";

const KEY = "sara-theme";
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export function setTheme(theme: Theme) {
  applyTheme(theme);
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
  emit();
}

/**
 * Flip the theme. When the browser supports the View Transitions API (and
 * the person hasn't asked for reduced motion), the switch plays as a circle
 * expanding from `origin` — normally the toggle button itself — revealing
 * the new theme underneath. Falls back to an instant swap everywhere else.
 */
export function toggleTheme(origin?: { x: number; y: number }) {
  const next: Theme = document.documentElement.classList.contains("dark") ? "light" : "dark";
  const reduceMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion || typeof document.startViewTransition !== "function") {
    setTheme(next);
    return;
  }

  const root = document.documentElement;
  const { x, y } = origin ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  root.style.setProperty("--theme-toggle-x", `${x}px`);
  root.style.setProperty("--theme-toggle-y", `${y}px`);
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );
  root.style.setProperty("--theme-toggle-radius", `${radius}px`);

  const transition = document.startViewTransition(() => setTheme(next));
  // The browser rejects `ready` (and then `finished`) if the document goes
  // hidden mid-transition (e.g. a quick tab switch) — expected, not a bug;
  // the theme still applies via the callback above, only the animation is
  // skipped. Swallow both so neither surfaces as an unhandled rejection.
  transition.ready.catch(() => {});
  transition.finished.catch(() => {});
}

export function getTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function subscribeTheme(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${KEY}");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
