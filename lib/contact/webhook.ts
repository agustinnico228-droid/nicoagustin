import type { ContactConfig } from "./config";

/*
 * Posts a submission to the Google Apps Script web app (docs/contact/apps-script.gs).
 * - The shared secret goes in the JSON body: Apps Script's doPost can't read custom headers.
 * - Apps Script answers a POST with a 302 to script.googleusercontent.com; fetch follows it (as a GET) and the
 *   final response is the script's JSON. Only {"ok":true} counts as success. Apps Script always answers 200,
 *   so failures arrive as {"ok":false,"error":"…"}.
 * - Nothing here logs the secret or the message: callers log only `reason`.
 */

export const WEBHOOK_TIMEOUT_MS = 10_000;

export type ContactPayload = {
  /** ISO 8601, when the server received the submission. */
  timestamp: string;
  name: string;
  email: string;
  company: string;
  /** The human label, e.g. "Freelance project". */
  inquiryType: string;
  message: string;
  /** Path on this site the visitor came from. */
  page: string;
};

export type WebhookResult = { ok: true } | { ok: false; reason: string };

export async function sendToWebhook(config: ContactConfig, payload: ContactPayload): Promise<WebhookResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const res = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, secret: config.secret }),
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
    const body = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(body);
    } catch {
      // e.g. a Google sign-in page when the deployment isn't shared with "Anyone"
      return { ok: false, reason: "the response was not JSON (check the deployment's access is Anyone)" };
    }
    if (typeof data === "object" && data !== null && (data as { ok?: unknown }).ok === true) return { ok: true };
    const error = (data as { error?: unknown } | null)?.error;
    const code = typeof error === "string" && /^[a-z_]{1,40}$/.test(error) ? error : "unknown";
    return { ok: false, reason: `the script answered ok:false (${code})` };
  } catch {
    return { ok: false, reason: controller.signal.aborted ? `no answer within ${WEBHOOK_TIMEOUT_MS / 1000}s` : "network error" };
  } finally {
    clearTimeout(timer);
  }
}
