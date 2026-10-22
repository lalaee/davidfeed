// Resolve the app's "@/..." alias to its src directory, and add the .ts
// extension the TypeScript sources omit on their own imports.
import { existsSync } from "node:fs";
const SRC = "/Users/olalekanisaac/Downloads/Code/davidfeed/src/";

export function resolve(specifier, context, next) {
  let s = specifier;
  if (s.startsWith("@/")) s = SRC + s.slice(2);
  if (!/\.[a-z]+$/i.test(s)) {
    for (const ext of [".ts", ".tsx", "/index.ts"]) {
      const base = s.startsWith("/") ? s : null;
      if (base && existsSync(base + ext)) { s = base + ext; break; }
      if (!base && context.parentURL) {
        const dir = new URL(".", context.parentURL);
        const cand = new URL(s + ext, dir);
        if (existsSync(cand.pathname)) { s = cand.pathname; break; }
      }
    }
  }
  return next(s, context);
}
