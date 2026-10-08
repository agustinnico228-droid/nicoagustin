/*
 * Contact form configuration, from server-only environment variables (never NEXT_PUBLIC_):
 *   CONTACT_WEBHOOK_URL  the Google Apps Script web app URL (…/exec)
 *   CONTACT_SECRET       the shared secret (also stored in the script's properties)
 * Setup: docs/CONTACT-SETUP.md. Missing or invalid → null, and the site shows "Email me instead".
 *
 * The homepage is static, so the form-or-fallback choice is made when the site is built: after changing
 * these variables, rebuild (run-local.bat does) or redeploy.
 * Only server code imports this file (the layout, ContactForm and the server action).
 */

export type ContactConfig = { webhookUrl: string; secret: string };

export const MIN_SECRET_LENGTH = 16;

let warned = false;

function problemWith(url: string, secret: string): string | null {
  if (!url) return "CONTACT_WEBHOOK_URL is not set.";
  if (!secret) return "CONTACT_SECRET is not set.";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "CONTACT_WEBHOOK_URL is not a valid URL.";
  }
  const isLocal = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !(isLocal && parsed.protocol === "http:")) {
    return "CONTACT_WEBHOOK_URL must start with https://.";
  }
  if (secret.length < MIN_SECRET_LENGTH) return `CONTACT_SECRET must be at least ${MIN_SECRET_LENGTH} characters.`;
  return null;
}

export function getContactConfig(): ContactConfig | null {
  const webhookUrl = process.env.CONTACT_WEBHOOK_URL?.trim() ?? "";
  const secret = process.env.CONTACT_SECRET?.trim() ?? "";
  // Not set up yet (or only the secret, as in a fresh .env.local): quietly show the email fallback.
  if (!webhookUrl) return null;
  const problem = problemWith(webhookUrl, secret);
  if (problem) {
    if (!warned) {
      warned = true;
      console.warn(`[contact] ${problem} The contact form shows "Email me instead" until this is fixed.`);
    }
    return null;
  }
  return { webhookUrl, secret };
}

/** True when the contact form can send (both env vars set and valid). Used by the root layout for the pop-up. */
export const isContactConfigured = (): boolean => getContactConfig() !== null;
