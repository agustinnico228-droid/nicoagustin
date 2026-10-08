// Lighthouse (mobile preset with default simulated throttling, then the desktop preset) for a list of URLs,
// using the locally installed Chrome. Prints the four category scores plus lab vitals and saves each JSON report.
//
// Usage (with a server already running):
//   pnpm lighthouse                                   # "/" and every /work/<slug> at BASE_URL (default :3002)
//   pnpm lighthouse --routes /,/work/sabbath-spa      # selected routes at BASE_URL
//   pnpm lighthouse https://nicoagustin.vercel.app/   # explicit URLs (any positional http(s) arguments)
//   pnpm lighthouse --only mobile|desktop --label lh-prod
//
// Reports: .screenshots/<label>/<route>-<mobile|desktop>.json (gitignored).
// Exit code 1 if a mobile Performance score is under 85, or Accessibility / Best Practices / SEO under 90 on either preset.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { BASE_URL, assertServer, flag, outDir, repoRoot, routeName, routes as getRoutes } from "./lib/harness.mjs";

const label = flag("label", "lighthouse");
const only = flag("only", null);
const presets = ["mobile", "desktop"].filter((p) => !only || p === only);
const dir = outDir(label);
mkdirSync(dir, { recursive: true });

const lhBin = path.join(repoRoot, "node_modules", "lighthouse", "cli", "index.js");
if (!existsSync(lhBin)) {
  console.error("✗ lighthouse is not installed (node_modules/lighthouse missing)");
  process.exit(2);
}

// chrome-launcher (bundled with lighthouse) finds Chrome itself; point it at the usual install paths when they exist.
const chromeCandidates = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe"),
].filter(Boolean);
const chromePath = chromeCandidates.find((p) => existsSync(p));

// Positional URLs win; otherwise the routes at BASE_URL.
const positional = process.argv.slice(2).filter((a, i, all) => /^https?:\/\//.test(a) && !(all[i - 1] ?? "").startsWith("--"));
const urls = positional.length ? positional : (await getRoutes()).map((r) => new URL(r, BASE_URL).toString());
if (!positional.length) await assertServer();

const fileName = (url) => {
  const u = new URL(url);
  return `${u.host.replace(/[:.]/g, "-")}-${routeName(u.pathname)}`;
};

const summary = [];
for (const url of urls) {
  for (const preset of presets) {
    const out = path.join(dir, `${fileName(url)}-${preset}.json`);
    const lhArgs = [lhBin, url, "--quiet", "--output=json", `--output-path=${out}`, "--chrome-flags=--headless=new --no-first-run"];
    if (preset === "desktop") lhArgs.push("--preset=desktop");
    try {
      execFileSync(process.execPath, lhArgs, {
        stdio: "inherit",
        env: { ...process.env, ...(chromePath ? { CHROME_PATH: chromePath } : {}) },
      });
    } catch {
      console.error(`✗ lighthouse failed for ${url} (${preset})`);
      summary.push({ url, preset, failed: true });
      continue;
    }
    const r = JSON.parse(readFileSync(out, "utf8"));
    const score = (k) => Math.round((r.categories?.[k]?.score ?? 0) * 100);
    const num = (k) => r.audits?.[k]?.numericValue ?? Number.NaN;
    const row = {
      url,
      preset,
      performance: score("performance"),
      accessibility: score("accessibility"),
      bestPractices: score("best-practices"),
      seo: score("seo"),
      fcpMs: Math.round(num("first-contentful-paint")),
      lcpMs: Math.round(num("largest-contentful-paint")),
      tbtMs: Math.round(num("total-blocking-time")),
      cls: Number(num("cumulative-layout-shift").toFixed(3)),
      below100: Object.values(r.audits ?? {})
        .filter((a) => a.score !== null && a.score < 1 && !["informative", "manual", "notApplicable"].includes(a.scoreDisplayMode))
        .map((a) => a.id),
    };
    summary.push(row);
    console.log(
      `${url} [${preset}]: Performance ${row.performance} · Accessibility ${row.accessibility} · Best Practices ${row.bestPractices} · SEO ${row.seo}` +
        ` · FCP ${row.fcpMs}ms · LCP ${row.lcpMs}ms · TBT ${row.tbtMs}ms · CLS ${row.cls}`,
    );
    if (row.below100.length) console.log(`    audits below 100%: ${row.below100.join(", ")}`);
  }
}

writeFileSync(path.join(dir, "summary.json"), JSON.stringify({ at: new Date().toISOString(), chromePath: chromePath ?? "auto", summary }, null, 2));
const failed = summary.some(
  (s) => s.failed || (s.preset === "mobile" && s.performance < 85) || s.accessibility < 90 || s.bestPractices < 90 || s.seo < 90,
);
console.log(failed ? "✗ Below target (mobile Performance ≥ 85; Accessibility, Best Practices, SEO ≥ 90)." : "✓ All targets met.");
process.exit(failed ? 1 : 0);
