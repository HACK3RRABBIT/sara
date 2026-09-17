/**
 * Node test runner shim: maps the "@/..." path alias used in app sources to
 * real paths so `node --test` can run src/lib/*.test.ts without a bundler.
 * Used by `npm test` (see package.json test glob).
 */
import { pathToFileURL } from "node:url";
import { resolve as resolvePath } from "node:path";

const root = process.cwd();

/** @param {string} specifier @param {{ parentURL?: string }} context @param {(s:string,c:unknown)=>Promise<unknown>} next */
export async function resolve(specifier, context, next) {
  if (specifier.startsWith("@/")) {
    let target = resolvePath(root, "src", specifier.slice(2));
    try {
      await import("node:fs").then((fs) => fs.statSync(target));
    } catch {
      target += ".ts"; // app sources are TypeScript; strip-types tests omit extensions in aliases
    }
    return next(pathToFileURL(target).href, context);
  }
  return next(specifier, context);
}
