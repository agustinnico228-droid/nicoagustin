// Screenshots + runtime checks for "/" and every /work/<slug>, at nine widths.
//
// Usage (with a server already running, e.g. `pnpm build && pnpm start`):
//   pnpm screens [--label phase-3] [--routes /,/work/sabbath-spa] [--theme light]
//   BASE_URL=https://nicoagustin.vercel.app pnpm screens --label prod
//
// Output: .screenshots/<label>/<route>-<width>.png (full page at 390 and 1440, viewport only otherwise) and report.json.
// Reports console errors (and hydration warnings), page errors, failed requests, 4xx/5xx responses, any request to
// another origin (the CSP allows same-origin only) and horizontal overflow. Exit code 1 if anything was found.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { BASE_URL, assertServer, device, flag, launchBrowser, outDir, repoRoot, routeName, routes as getRoutes, setTheme, settle } from "./lib/harness.mjs";

const WIDTHS = [320, 360, 390, 414, 768, 1024, 1280, 1440, 1920];
const FULL_PAGE = new Set([390, 1440]);

const label = flag("label", "latest");
const theme = flag("theme", "dark");
const dir = outDir(label);
mkdirSync(dir, { recursive: true });

const routes = await getRoutes();
await assertServer();
const origin = new URL(BASE_URL).origin;

const issues = [];
const report = { baseUrl: BASE_URL, theme, takenAt: new Date().toISOString(), routes, widths: WIDTHS, shots: [], issues };

const browser = await launchBrowser();
try {
  for (const route of routes) {
    for (const width of WIDTHS) {
      const context = await browser.newContext(device(width, { theme }));
      await setTheme(context, theme);
      const page = await context.newPage();
      const where = `${route} @${width}`;
      // Requests still in flight when the page is torn down fail with ERR_ABORTED; those aren't site errors.
      let closing = false;

      page.on("console", (msg) => {
        const text = msg.text();
        if (msg.type() === "error" || /hydrat/i.test(text)) {
          const source = msg.location()?.url;
          issues.push({ where, kind: `console.${msg.type()}`, text: `${text.slice(0, 500)}${source ? ` ← ${source}` : ""}` });
        }
      });
      page.on("pageerror", (err) => issues.push({ where, kind: "pageerror", text: String(err).slice(0, 500) }));
      page.on("response", (res) => {
        if (res.status() >= 400) issues.push({ where, kind: `http ${res.status()}`, text: res.url() });
      });
      page.on("requestfailed", (req) => {
        if (closing) return;
        const error = req.failure()?.errorText ?? "unknown";
        // A responsive image or a media element cancelling a fetch it no longer needs is not an error.
        if (error === "net::ERR_ABORTED" && (new URL(req.url()).pathname === "/_next/image" || ["media", "image"].includes(req.resourceType()))) return;
        issues.push({ where, kind: "requestfailed", text: `${req.url()} (${error})` });
      });
      page.on("request", (req) => {
        const url = new URL(req.url());
        if (/^(https?|wss?):$/.test(url.protocol) && url.origin !== origin) {
          issues.push({ where, kind: "external request", text: req.url() });
        }
      });

      try {
        const res = await page.goto(new URL(route, BASE_URL).toString(), { waitUntil: "networkidle", timeout: 60_000 });
        if (!res) issues.push({ where, kind: "navigation", text: "no response" });
        await settle(page);

        // Horizontal overflow: the page must never scroll sideways (320 px included).
        const overflow = await page.evaluate(() => {
          const vw = window.innerWidth;
          const sw = document.documentElement.scrollWidth;
          if (sw <= vw) return null;
          const culprits = [];
          for (const el of document.querySelectorAll("body *")) {
            const r = el.getBoundingClientRect();
            if (r.width && r.right > vw + 1) {
              const id = el.id ? `#${el.id}` : "";
              const cls = typeof el.className === "string" && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}` : "";
              culprits.push(`${el.tagName.toLowerCase()}${id}${cls} (right ${Math.round(r.right)}px)`);
              if (culprits.length >= 5) break;
            }
          }
          return { scrollWidth: sw, innerWidth: vw, culprits };
        });
        if (overflow) {
          issues.push({
            where,
            kind: "horizontal overflow",
            text: `scrollWidth ${overflow.scrollWidth} > innerWidth ${overflow.innerWidth}; ${overflow.culprits.join(", ")}`,
          });
        }

        const file = path.join(dir, `${routeName(route)}-${width}.png`);
        await page.screenshot({ path: file, fullPage: FULL_PAGE.has(width), animations: "disabled" });
        report.shots.push(path.relative(repoRoot, file));
        process.stdout.write(".");
      } catch (error) {
        issues.push({ where, kind: "script", text: String(error?.message ?? error).slice(0, 500) });
      } finally {
        closing = true;
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

writeFileSync(path.join(dir, "report.json"), JSON.stringify(report, null, 2));
console.log(`\nScreenshots: ${report.shots.length} → ${path.relative(repoRoot, dir)}`);
if (issues.length) {
  console.error(`✗ ${issues.length} issue(s):`);
  for (const i of issues) console.error(`  [${i.where}] ${i.kind}: ${i.text}`);
  process.exit(1);
}
console.log("✓ No console errors, page errors, failed or external requests, 4xx/5xx responses or horizontal overflow.");
