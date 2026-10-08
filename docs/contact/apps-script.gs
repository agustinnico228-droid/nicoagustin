/**
 * Contact form → email (Nico Agustin's portfolio).
 *
 * A standalone Apps Script project (created at script.google.com, not attached to any file), owned by
 * agustinnico228@gmail.com and deployed as a web app. The website posts each message here; the script checks it and
 * emails it to Nico. Nobody else gets a copy (no CC, no BCC). It stores nothing but short-lived counters and hashes.
 * Setup: docs/CONTACT-SETUP.md in the website's repository.
 *
 * Needs one script property (Project Settings → Script properties):
 *   CONTACT_SECRET   the same long random value as the website's CONTACT_SECRET variable.
 *                    It lives only in the script properties, never in this file.
 *
 * What it does with each POST from the website:
 *   1. parses the JSON body and checks the shared secret (constant-time comparison);
 *   2. validates and length-limits every field and strips control characters;
 *   3. applies the sending limits (one at a time, under a script lock): at most 20 emails per clock hour, none when
 *      fewer than 10 of today's Gmail quota are left ("rate_limited"), and no second copy of the same message from
 *      the same address within 10 minutes ("duplicate"). Only counters and a SHA-256 hash are cached, never the text;
 *   4. sends one plain-text email: To Nico only, Reply-To the visitor;
 *   5. answers {"ok":true}, or {"ok":false,"error":"…"} ("mail_failed" when the email couldn't be sent).
 * It never logs what a visitor wrote, and the website never logs the secret.
 */

/** Who gets each message: Nico only. The email has no CC and no BCC. */
const TO = 'agustinnico228@gmail.com';
/** Times in the email are Philippine time ("Received: … (Philippine time)"), whatever the project's time zone is. */
const TIME_ZONE = 'Asia/Manila';
const SENDER_NAME = 'Portfolio contact form';
const LIMITS = { name: 100, email: 254, company: 120, inquiryType: 40, message: 5000, page: 200 };
const MAX_SUBJECT_LENGTH = 200;
const MIN_SECRET_LENGTH = 16;
const MAX_BODY_LENGTH = 30000;
/** Sending limits: they keep a script that replays the form from using up the day's Gmail quota. */
const MAX_PER_HOUR = 20;
const MIN_DAILY_QUOTA = 10;
const DUPLICATE_WINDOW_SECONDS = 600;
const HOUR_MS = 3600000;
/** How long a request waits for another one to finish sending (the website gives up after 10 seconds). */
const LOCK_WAIT_MS = 5000;
const EMAIL_PATTERN = /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[A-Za-z]{2,}$/;
// C0/C1 control characters and the bidi override/isolate controls.
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\u202A-\u202E\u2066-\u2069]/g;

/** The website posts here. */
function doPost(e) {
  try {
    const raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > MAX_BODY_LENGTH) return reply_({ ok: false, error: 'bad_request' });

    let body;
    try {
      body = JSON.parse(raw);
    } catch (err) {
      return reply_({ ok: false, error: 'bad_request' });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reply_({ ok: false, error: 'bad_request' });

    const secret = getSecret_();
    if (secret.length < MIN_SECRET_LENGTH) return reply_({ ok: false, error: 'not_configured' });
    if (typeof body.secret !== 'string' || !sameSecret_(body.secret, secret)) {
      return reply_({ ok: false, error: 'unauthorized' });
    }

    const entry = cleanEntry_(body);
    if (!entry) return reply_({ ok: false, error: 'invalid' });

    // One request at a time, so two at once can't both pass the limits below.
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(LOCK_WAIT_MS)) return reply_({ ok: false, error: 'rate_limited' });
    try {
      const cache = CacheService.getScriptCache();
      const hourKey = 'sent:' + Math.floor(Date.now() / HOUR_MS);
      const duplicateKey = 'dup:' + messageHash_(entry);
      if (cache.get(duplicateKey)) return reply_({ ok: false, error: 'duplicate' });
      const sentThisHour = Number(cache.get(hourKey)) || 0;
      if (sentThisHour >= MAX_PER_HOUR) return reply_({ ok: false, error: 'rate_limited' });
      if (MailApp.getRemainingDailyQuota() < MIN_DAILY_QUOTA) return reply_({ ok: false, error: 'rate_limited' });

      // Email is the only delivery: if it fails, say so, and the website offers Nico's address instead.
      try {
        MailApp.sendEmail({
          to: TO,
          replyTo: entry.email,
          name: SENDER_NAME,
          subject: subject_(entry),
          body: emailBody_(entry),
        });
      } catch (err) {
        console.error('Sending the email failed: ' + errorName_(err)); // the name only: the error text can quote the visitor
        return reply_({ ok: false, error: 'mail_failed' });
      }
      // Counted only once sent, so a failed send can be retried at once.
      cache.put(hourKey, String(sentThisHour + 1), HOUR_MS / 1000 + 60);
      cache.put(duplicateKey, '1', DUPLICATE_WINDOW_SECONDS);
      return reply_({ ok: true });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    console.error('doPost failed: ' + errorName_(err)); // no form contents in the log
    return reply_({ ok: false, error: 'server_error' });
  }
}

/** Opening the web app URL in a browser shows this: it proves the deployment is live. */
function doGet() {
  return reply_({ ok: false, error: 'post_only' });
}

/**
 * Run this once from the editor (choose checkSetup → Run): Google asks for permission to send email as you.
 * It checks the secret is set (without showing it) and logs today's remaining email quota. It sends nothing.
 */
function checkSetup() {
  const secret = getSecret_();
  if (!secret) throw new Error('Add the script property CONTACT_SECRET (Project Settings → Script properties).');
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error('CONTACT_SECRET is too short: use at least ' + MIN_SECRET_LENGTH + ' characters.');
  }
  const quota = MailApp.getRemainingDailyQuota();
  console.log(
    'Setup OK. The secret is set (' + secret.length + ' characters). Messages go to ' + TO +
      ' (no CC, no BCC). Email quota left today: ' + quota + ' recipients.'
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────────────────────

function reply_(result) {
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

/** The CONTACT_SECRET script property, or '' when it isn't set. */
function getSecret_() {
  const value = PropertiesService.getScriptProperties().getProperty('CONTACT_SECRET');
  return typeof value === 'string' ? value.trim() : '';
}

function errorName_(err) {
  return err && err.name ? String(err.name) : 'error';
}

/** Constant-time comparison: compares SHA-256 digests byte by byte, so timing reveals nothing about the secret. */
function sameSecret_(given, expected) {
  const a = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, given, Utilities.Charset.UTF_8);
  const b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, expected, Utilities.Charset.UTF_8);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** SHA-256 (hex) of the visitor's address and message: the duplicate check caches this, never the text itself. */
function messageHash_(entry) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    entry.email.toLowerCase() + ' ' + entry.message, // the address never contains a space
    Utilities.Charset.UTF_8
  );
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += ((bytes[i] & 0xff) + 0x100).toString(16).slice(1);
  return hex;
}

/** One line of text: no line breaks or control characters, single spaces, at most `max` characters. */
function line_(value, max) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\r\n\t\u2028\u2029]+/g, ' ')
    .replace(CONTROL_CHARS, '')
    .replace(/ {2,}/g, ' ')
    .trim()
    .slice(0, max);
}

/** Multi-line text: line breaks and tabs kept, control characters removed, at most `max` characters. */
function text_(value, max) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\r\n?|[\u2028\u2029]/g, '\n')
    .replace(CONTROL_CHARS, '')
    .trim()
    .slice(0, max);
}

/** The validated message, or null when a required field is missing or the email address isn't valid. */
function cleanEntry_(body) {
  const entry = {
    name: line_(body.name, LIMITS.name),
    email: line_(body.email, LIMITS.email),
    company: line_(body.company, LIMITS.company),
    inquiryType: line_(body.inquiryType, LIMITS.inquiryType) || 'Other',
    message: text_(body.message, LIMITS.message),
    page: line_(body.page, LIMITS.page),
  };
  if (!entry.name || !entry.message || !EMAIL_PATTERN.test(entry.email)) return null;
  if (entry.page && entry.page.charAt(0) !== '/') entry.page = '';
  const time = new Date(typeof body.timestamp === 'string' ? body.timestamp : '');
  entry.timestamp = isNaN(time.getTime()) ? new Date() : time;
  return entry;
}

/**
 * The subject depends on the inquiry type. The website sends the label shown in the form
 * (INQUIRY_TYPES in lib/contact/fields.ts): keep these in step with it.
 */
function subject_(entry) {
  const company = entry.company ? ' (' + entry.company + ')' : '';
  let subject;
  switch (entry.inquiryType) {
    case 'Hire full-time':
      subject = 'Hiring enquiry: ' + entry.name + company;
      break;
    case 'Freelance project':
      subject = 'Freelance project: ' + entry.name + company;
      break;
    default:
      subject = 'Message: ' + entry.name;
  }
  return subject.slice(0, MAX_SUBJECT_LENGTH); // one line: name and company never contain line breaks
}

function emailBody_(entry) {
  return [
    "New message from the contact form on Nico Agustin's portfolio.",
    '',
    'Name: ' + entry.name,
    'Email: ' + entry.email,
    'Company: ' + (entry.company || '-'),
    'Inquiry type: ' + entry.inquiryType,
    'Page: ' + (entry.page || '-'),
    'Received: ' + Utilities.formatDate(entry.timestamp, TIME_ZONE, 'yyyy-MM-dd HH:mm') + ' (Philippine time)',
    '',
    'Message:',
    entry.message,
    '',
    '--',
    'Reply to this email to answer ' + entry.name + ' directly.',
  ].join('\n');
}
