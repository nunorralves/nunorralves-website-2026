import fs from "fs";
import path from "path";

// Resolve a path under content/ robustly: prefer process.cwd(), fall back to
// a path relative to this file. Shared by lib/helpers.ts and lib/now.ts so
// posts, projects and the Currently rail all locate content the same way.
export function resolveContentDirectory(name: string): string {
  const preferred = path.join(process.cwd(), "content", name);
  if (fs.existsSync(preferred)) return preferred;

  const alt = path.join(__dirname, "..", "content", name);
  if (fs.existsSync(alt)) return alt;

  return preferred;
}
