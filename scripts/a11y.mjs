// Accessibility scan with axe-core (WCAG 2.0/2.1/2.2 A + AA + best practices) for "/" and every /work/<slug>,
// at 390 and 1440 px, in the dark AND the light theme.
//
// Usage (with a server already running): pnpm a11y [--routes /,/work/sabbath-spa] [--label a11y]
// Prints violations grouped by impact; writes .screenshots/<label>/a11y.json. Exit code 1 on any serious or critical one.

import { AxeBuilder } from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { BASE_URL, assertServer, device, flag, launchBrowser, outDir, routes as getRoutes, setTheme, settle } from "./lib/harness.mjs";

const IMPACTS = ["critical", "serious", "moderate", "minor"];
const label = flag("label", "a11y");
const dir = outDir(label);
mkdirSync(dir, { recursive: true });

const routes = await getRoutes();
await assertServer();

/** @type {{ where: string, impact: string, id: string, help: string, targets: string[] }[]} */
const found = [];
const browser = await launchBrowser();
try {
  for (const route of routes) {
    for (const theme of ["dark", "light"]) {
      for (const width of [390, 1440]) {
        const where = `${route} @${width} ${theme}`;
        const context = await browser.newContext(device(width, { theme }));
        await setTheme(context, theme);
        const page = await context.newPage();
        try {
          await page.goto(new URL(route, BASE_URL).toString(), { waitUntil: "networkidle", timeout: 60_000 });
          const applied = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
          if (applied !== theme) console.warn(`! ${where}: data-theme is "${applied}", not "${theme}"`);
          await settle(page);
          // Demo iframes are separate documents with their own landmarks: scan them on their own
          // (`--routes /demos/<slug>/index.html`), otherwise axe pools their landmarks with the page's.
          const result = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
            .exclude("iframe")
            .analyze();
          for (const v of result.violations) {
            found.push({ where, impact: v.impact ?? "minor", id: v.id, help: v.help, targets: v.nodes.slice(0, 5).map((n) => n.target.join(" ")) });
          }
          if (!result.violations.length) console.log(`✓ ${where}: 0 violations (${result.passes.length} rules passed)`);
        } catch (error) {
          found.push({ where, impact: "critical", id: "script-error", help: String(error?.message ?? error).slice(0, 300), targets: [] });
        } finally {
          await context.close();
        }
      }
    }
  }
} finally {
  await browser.close();
}

for (const impact of IMPACTS) {
  const group = found.filter((f) => f.impact === impact);
  if (!group.length) continue;
  console.log(`\n${impact.toUpperCase()} (${group.length})`);
  for (const v of group) {
    console.log(`  ✗ ${v.where} ${v.id}: ${v.help}`);
    for (const t of v.targets) console.log(`      ${t}`);
  }
}
writeFileSync(path.join(dir, "a11y.json"), JSON.stringify({ baseUrl: BASE_URL, at: new Date().toISOString(), violations: found }, null, 2));

const blocking = found.filter((f) => f.impact === "serious" || f.impact === "critical").length;
console.log(`\n${found.length} violation(s), ${blocking} serious or critical.`);
process.exit(blocking ? 1 : 0);
