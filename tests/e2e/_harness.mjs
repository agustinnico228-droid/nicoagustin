// Tiny test harness for the e2e scripts (plain Node + the installed `playwright` library).
// Each test file: `const t = await harness(import.meta.url); t.test("…", async () => {…}); await t.run();`
//
//   --url http://localhost:3002   use a running server (otherwise `next start -p 3002` is started and stopped)
//   --port 3002                    port for the server it starts
//   --only "substring"             run only tests whose name contains it

import { spawn } from "node:child_process";
import path from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};

export async function harness() {
  const port = Number(flag("port", "3002"));
  const external = flag("url", null);
  const baseUrl = (external ?? `http://localhost:${port}`).replace(/\/$/, "");
  const only = flag("only", null);
  const tests = [];
  /** Console errors, hydration warnings, page errors and failed responses, per test. */
  let problems = [];
  let browser;
  let server;

  async function waitForServer(timeoutMs = 60_000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(baseUrl);
        if (res.status < 500) return;
      } catch {
        // not up yet
      }
      await new Promise((r) => setTimeout(r, 300));
    }
    throw new Error(`Server at ${baseUrl} did not respond within ${timeoutMs}ms`);
  }

  /** A new page that records console errors, hydration warnings, page errors and 4xx/5xx responses. */
  async function newPage(contextOptions = {}) {
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error" || /hydrat/i.test(msg.text())) problems.push(`console.${msg.type()}: ${msg.text().slice(0, 300)}`);
    });
    page.on("pageerror", (err) => problems.push(`pageerror: ${String(err).slice(0, 300)}`));
    page.on("response", (res) => {
      if (res.status() >= 400) problems.push(`http ${res.status()}: ${res.url()}`);
    });
    return { context, page };
  }

  return {
    baseUrl,
    newPage,
    test(name, fn) {
      tests.push({ name, fn });
    },
    async run() {
      if (!external) {
        const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
        server = spawn(process.execPath, [nextBin, "start", "-p", String(port)], { stdio: "ignore" });
      }
      let failed = 0;
      try {
        await waitForServer();
        try {
          browser = await chromium.launch({ channel: "chrome" });
        } catch {
          browser = await chromium.launch();
        }
        for (const { name, fn } of tests) {
          if (only && !name.includes(only)) continue;
          problems = [];
          const started = Date.now();
          try {
            await fn();
            if (problems.length) throw new Error(`console/network problems:\n    ${problems.join("\n    ")}`);
            console.log(`✓ ${name} (${Date.now() - started}ms)`);
          } catch (err) {
            failed++;
            console.log(`✗ ${name}\n    ${String(err?.stack ?? err).split("\n").slice(0, 6).join("\n    ")}`);
          }
        }
      } finally {
        await browser?.close();
        server?.kill();
      }
      console.log(failed ? `\n${failed} test(s) failed.` : "\nAll tests passed.");
      process.exit(failed ? 1 : 0);
    },
  };
}

/** Resolves after `n` animation frames. */
export const frames = (page, n = 2) =>
  page.evaluate(
    (count) =>
      new Promise((resolve) => {
        let left = count;
        const step = () => (--left <= 0 ? resolve() : requestAnimationFrame(step));
        requestAnimationFrame(step);
      }),
    n,
  );
