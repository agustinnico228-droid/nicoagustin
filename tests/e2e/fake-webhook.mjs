// A tiny stand-in for the Google Apps Script web app (docs/contact/apps-script.gs), for local tests.
//
// Like the real thing it:
//   - accepts POST …/exec with a JSON body that carries the shared secret,
//   - answers the POST with a 302 to another host (Apps Script redirects to script.googleusercontent.com),
//   - serves the script's JSON ({"ok":true} or {"ok":false,"error":"…"}) on the redirected GET.
// It records every accepted payload (with the secret removed) so a test can inspect it.
//
// Modes (setMode): "ok" (default) · "fail" (ok:false) · "html" (a sign-in page, as when access isn't "Anyone")
//                  · "slow" (answers after 12s, past the site's 10s timeout)

import http from "node:http";
import { timingSafeEqual, createHash } from "node:crypto";
import { pathToFileURL } from "node:url";

const digest = (s) => createHash("sha256").update(String(s)).digest();
const sameSecret = (a, b) => timingSafeEqual(digest(a), digest(b));

export async function startFakeWebhook({ secret, port = 0 }) {
  const received = [];
  const echoes = new Map();
  let mode = "ok";
  let nextId = 1;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "POST" && /^\/macros\/s\/[^/]+\/exec$/.test(url.pathname)) {
      let body = "";
      req.setEncoding("utf8");
      req.on("data", (chunk) => {
        body += chunk;
        if (body.length > 100_000) req.destroy();
      });
      req.on("end", async () => {
        let answer;
        let data = null;
        try {
          data = JSON.parse(body);
        } catch {
          answer = { ok: false, error: "bad_request" };
        }
        if (data) {
          if (typeof data.secret !== "string" || !sameSecret(data.secret, secret)) {
            answer = { ok: false, error: "unauthorized" };
          } else if (mode === "fail") {
            answer = { ok: false, error: "server_error" };
          } else {
            const payload = { ...data, contentType: req.headers["content-type"] ?? "" };
            delete payload.secret;
            received.push(payload);
            answer = { ok: true };
          }
        }
        if (mode === "slow") await new Promise((r) => setTimeout(r, 12_000));
        if (res.destroyed) return;
        const id = String(nextId++);
        echoes.set(id, mode === "html" ? "html" : answer);
        // A different host name, like Apps Script's hop to script.googleusercontent.com.
        res.writeHead(302, { Location: `http://localhost:${server.address().port}/macros/echo?user_content_key=${id}` });
        res.end();
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/macros/echo") {
      const answer = echoes.get(url.searchParams.get("user_content_key") ?? "");
      if (answer === "html") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end("<!doctype html><title>Sign in</title><p>Sign in to continue</p>");
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(answer ?? { ok: false, error: "not_found" }));
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("not found");
  });

  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  const { port: actualPort } = server.address();

  return {
    url: `http://127.0.0.1:${actualPort}/macros/s/fake-deployment/exec`,
    received,
    setMode: (m) => {
      mode = m;
    },
    close: () =>
      new Promise((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  };
}

// Run on its own: `node tests/e2e/fake-webhook.mjs <secret> [port]` prints its URL and logs each payload.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [secret = "local-test-secret-123", port = "3399"] = process.argv.slice(2);
  const hook = await startFakeWebhook({ secret, port: Number(port) });
  console.log(`Fake webhook: ${hook.url}`);
  setInterval(() => {
    while (hook.received.length) console.log("received:", JSON.stringify(hook.received.shift()));
  }, 500);
}
