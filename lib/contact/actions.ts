"use server";

import { headers } from "next/headers";
import { getContactConfig } from "./config";
import { HONEYPOT_FIELD, INVALID_MESSAGE, PAGE_FIELD, TOKEN_FIELD, inquiryLabel, sanitizePath, type ContactState } from "./fields";
import { parseContactForm, readSubmittedValues } from "./schema";
import { MIN_FILL_MS, issueToken, verifyToken } from "./token";
import { sendToWebhook } from "./webhook";

/*
 * Server actions for the contact form. Every request is untrusted: the checks below run in this order:
 * configured → honeypot → fields (zod) → signed start time (≥ 3s, ≤ 1 day) → webhook.
 * Logs never include the secret, the webhook URL or anything the visitor typed.
 */

const MESSAGES = {
  notConfigured: "The form isn't connected right now, so your message wasn't sent. Please email me instead:",
  rejected: "Sorry, your message couldn't be sent. Please email me instead:",
  invalid: INVALID_MESSAGE,
  retry: "Almost there. For spam protection, please press Send again.",
  tooFast: "That was quick. Please check your message, then press Send again.",
  failed: "Sorry, your message couldn't be sent. Please try again in a moment, or email me instead:",
};

const text = (value: FormDataEntryValue | null) => (typeof value === "string" ? value : "");

/** A signed start time for the form, requested when a visitor first focuses it. Empty when not configured. */
export async function getContactToken(): Promise<string> {
  const config = getContactConfig();
  return config ? issueToken(config.secret) : "";
}

/** The page the visitor came from when JavaScript is off: the `from` parameter or path of the same-site Referer. */
async function pageFromReferer(): Promise<string | null> {
  const h = await headers();
  const referer = h.get("referer");
  if (!referer) return null;
  try {
    const url = new URL(referer);
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host && url.host !== host) return null;
    return sanitizePath(url.searchParams.get("from")) ?? sanitizePath(url.pathname);
  } catch {
    return null;
  }
}

export async function submitContact(_previous: ContactState, formData: FormData): Promise<ContactState> {
  const values = readSubmittedValues(formData);
  const page = sanitizePath(text(formData.get(PAGE_FIELD))) ?? (await pageFromReferer()) ?? "/";

  const config = getContactConfig();
  if (!config) return { status: "error", message: MESSAGES.notConfigured, offerEmail: true, values, page };

  if (text(formData.get(HONEYPOT_FIELD)).trim()) {
    console.warn("[contact] rejected: honeypot field filled");
    return { status: "error", message: MESSAGES.rejected, offerEmail: true, values, page };
  }

  const token = text(formData.get(TOKEN_FIELD));
  const check = verifyToken(config.secret, token);
  // A missing or stale token (no JavaScript, or a tab left open for a day) gets a fresh one for the next attempt.
  const nextToken = check.ok ? token : issueToken(config.secret);

  const parsed = parseContactForm(formData);
  if (!parsed.ok) {
    return { status: "invalid", message: MESSAGES.invalid, errors: parsed.errors, values, token: nextToken, page };
  }
  if (!check.ok) return { status: "retry", message: MESSAGES.retry, values, token: nextToken, page };
  if (Date.now() - check.issuedAt < MIN_FILL_MS) {
    console.warn("[contact] rejected: submitted too fast");
    return { status: "retry", message: MESSAGES.tooFast, values, token: nextToken, page };
  }

  const { data } = parsed;
  const result = await sendToWebhook(config, {
    timestamp: new Date().toISOString(),
    name: data.name,
    email: data.email,
    company: data.company,
    inquiryType: inquiryLabel(data.inquiryType),
    message: data.message,
    page,
  });
  if (!result.ok) {
    console.error(`[contact] webhook failed: ${result.reason}`);
    return { status: "error", message: MESSAGES.failed, offerEmail: true, values, token: nextToken, page };
  }
  return {
    status: "success",
    message: `Thanks — your message is on its way. Nico will reply to ${data.email}.`,
    token: nextToken,
    page,
  };
}
