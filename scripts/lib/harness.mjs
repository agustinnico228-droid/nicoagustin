// Shared helpers for the QA scripts (screenshots, a11y, lighthouse).
// They test an already-running server: BASE_URL env (default http://localhost:3002, i.e. `pnpm start` or `pnpm dev`).

import path from "node:path";
import { chromium } from "playwright";
import { loadProjects, repoRoot } from "./site-data.mjs";

export { repoRoot };

const args = process.argv.slice(2);

/** `--name value` → value, else the fallback. */
export function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
}

export const BASE_URL = (process.env.BASE_URL ?? flag("url", "http://localhost:3002")).replace(/\/$/, "");

/** Output folder for a run: .screenshots/<label>/ (gitignored). */
export const outDir = (label) => path.join(repoRoot, ".screenshots", label);

// Git Bash (MSYS) rewrites "/work/x" into "C:/Program Files/Git/work/x"; undo that.
const unmangle = (r) => r.replace(/^[A-Za-z]:[\\/].*?[\\/]Git(?=[\\/]|$)/, "").replace(/\\/g, "/") || "/";

/** "/" plus every /work/<slug> from content/projects.ts, unless --routes a,b,c is given. */
export async function routes() {
  const given = flag("routes", null);
  if (given) return given.split(",").map((r) => unmangle(r.trim())).filter(Boolean);
  const { projects } = await loadProjects();
  return ["/", ...projects.map((p) => `/work/${p.slug}`)];
}

/** File-name-safe label for a route. */
export const routeName = (route) => (route === "/" ? "home" : route.replace(/^\//, "").replace(/[\/?#=&]/g, "_"));

/** The local Chrome (no browser download); Playwright's own Chromium only if Chrome is missing. */
export async function launchBrowser() {
  try {
    return await chromium.launch({ channel: "chrome" });
  } catch {
    return await chromium.launch();
  }
}

/** Fails fast with a clear message when no server answers at BASE_URL. */
export async function assertServer(url = BASE_URL, timeoutMs = 15_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  console.error(`✗ No server at ${url}. Start one first (pnpm build && pnpm start), or set BASE_URL.`);
  process.exit(2);
}

/** Viewport + device flags for a width. */
export function device(width, { theme } = {}) {
  const heights = { 320: 640, 360: 780, 390: 844, 414: 896, 768: 1024, 1024: 768, 1280: 800, 1440: 900, 1920: 1080 };
  const mobile = width < 768;
  return {
    viewport: { width, height: heights[width] ?? 900 },
    isMobile: mobile,
    hasTouch: mobile,
    deviceScaleFactor: 1,
    colorScheme: theme === "light" ? "light" : "dark",
    reducedMotion: "no-preference",
  };
}

/** Sets the stored theme (the key the boot script in app/layout.tsx reads) before any page script runs. */
export async function setTheme(context, theme) {
  await context.addInitScript((t) => {
    try {
      localStorage.setItem("theme", t);
    } catch {
      // storage blocked: the page falls back to its default theme
    }
  }, theme);
}

/** Scrolls through the page once so lazy content and reveal-once sections reach their final state, then waits for images. */
export async function settle(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight / 2) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    // Reveal-on-scroll elements fade in over 0.9s; checks must see their final state, not a frame mid-fade
    // (content-visibility can delay the observer until the last scroll step).
    document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-revealed"));
    // Below-the-fold sections use content-visibility: auto, which skips their layout while off-screen; axe can't
    // compute colours/backgrounds for skipped content, so render everything for the checks.
    const style = document.createElement("style");
    style.textContent = ".cv-auto{content-visibility:visible!important}";
    document.head.appendChild(style);
  });
  await page.waitForTimeout(1200);
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() =>
    Promise.all(
      [...document.images]
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise((done) => {
              img.addEventListener("load", done, { once: true });
              img.addEventListener("error", done, { once: true });
              setTimeout(done, 8000);
            }),
        ),
    ),
  );
}
