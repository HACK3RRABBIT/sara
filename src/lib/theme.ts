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

export function toggleTheme() {
  const next: Theme = document.documentElement.classList.contains("dark") ? "light" : "dark";
  setTheme(next);
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
