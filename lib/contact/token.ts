import { createHmac, timingSafeEqual } from "node:crypto";

/*
 * Minimum-fill-time token: "v1.<issued-at in base36 ms>.<HMAC>", signed with a key derived from CONTACT_SECRET,
 * so it can't be forged or back-dated. The page is static, so the token is issued per visitor by the server
 * action (when the form is first focused, or by the first no-JS submission), never baked into the HTML.
 */

/** Submissions faster than this after the token was issued are treated as automated. */
export const MIN_FILL_MS = 3_000;
/** Tokens older than this are refused (the visitor gets a fresh one and presses Send again). */
export const MAX_AGE_MS = 24 * 60 * 60 * 1000;
/** Allowed clock difference between server instances. */
const CLOCK_SKEW_MS = 60_000;
const VERSION = "v1";

/** A key used only for these tokens, so the raw secret is never used to sign anything public. */
const signingKey = (secret: string) => createHmac("sha256", secret).update("contact-form-token").digest();
const sign = (secret: string, payload: string) => createHmac("sha256", signingKey(secret)).update(payload).digest("base64url");

export function issueToken(secret: string, now = Date.now()): string {
  const issuedAt = Math.floor(now).toString(36);
  return `${VERSION}.${issuedAt}.${sign(secret, `${VERSION}.${issuedAt}`)}`;
}

export type TokenCheck =
  | { ok: true; issuedAt: number }
  | { ok: false; reason: "missing" | "malformed" | "signature" | "expired" };

export function verifyToken(secret: string, token: string, now = Date.now()): TokenCheck {
  if (!token) return { ok: false, reason: "missing" };
  const [version, issuedAt36, signature, ...rest] = token.split(".");
  if (version !== VERSION || !issuedAt36 || !signature || rest.length || !/^[0-9a-z]{1,11}$/.test(issuedAt36)) {
    return { ok: false, reason: "malformed" };
  }
  const expected = Buffer.from(sign(secret, `${VERSION}.${issuedAt36}`));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: "signature" };
  const issuedAt = parseInt(issuedAt36, 36);
  if (issuedAt > now + CLOCK_SKEW_MS || now - issuedAt > MAX_AGE_MS) return { ok: false, reason: "expired" };
  return { ok: true, issuedAt };
}
