// Loads the site's own TypeScript data (lib/site.ts, content/projects.ts) from plain Node scripts.
// Node 25 strips TypeScript types natively; both files only use erasable syntax (type-only imports, `as const`).
// The repo's package.json has no "type" field, so Node warns that the .ts files are ES modules: that one warning is
// silenced here, every other warning still prints.

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, "..", "..");

let silenced = false;
function silenceTypelessWarning() {
  if (silenced) return;
  silenced = true;
  const listeners = process.listeners("warning");
  process.removeAllListeners("warning");
  process.on("warning", (warning) => {
    if (warning?.code === "MODULE_TYPELESS_PACKAGE_JSON") return;
    if (listeners.length) for (const l of listeners) l(warning);
    else console.warn(`${warning.name}: ${warning.message}`);
  });
}

const load = (rel) => {
  silenceTypelessWarning();
  return import(pathToFileURL(path.join(repoRoot, rel)).href);
};

/** lib/site.ts (profile, experience, education, certificates, stack, layers, seminars, volunteering, SITE_URL ...). */
export const loadSite = () => load("lib/site.ts");

/** content/projects.ts (projects, projectBySlug). */
export const loadProjects = () => load("content/projects.ts");
