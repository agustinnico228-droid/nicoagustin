// Runs docs/contact/apps-script.gs against mocked Apps Script services (no Google account needed).
//   node tests/e2e/apps-script.test.mjs
// There are no SpreadsheetApp or Session mocks on purpose: the script must not use them. LockService and
// CacheService are mocked for the sending limits (a script lock, and a cache with expiry on a fake clock).

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const SOURCE = readFileSync(new URL("../../docs/contact/apps-script.gs", import.meta.url), "utf8");
const FIELDS = readFileSync(new URL("../../lib/contact/fields.ts", import.meta.url), "utf8");
const SECRET = "a-long-shared-secret-for-tests";
const TO = "agustinnico228@gmail.com";

const results = [];
const check = (name, ok, detail = "") => {
  results.push(ok);
  console.log(`${ok ? "  ✓" : "  ✗"} ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
};

/** Utilities.formatDate: Java-style pattern letters, in the time zone it's given (never the machine's). */
function formatDate(date, timeZone, pattern) {
  if (Object.prototype.toString.call(date) !== "[object Date]") throw new TypeError("formatDate needs a Date");
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  const tokens = { yyyy: parts.year, MM: parts.month, dd: parts.day, HH: parts.hour, mm: parts.minute, ss: parts.second };
  return pattern.replace(/yyyy|MM|dd|HH|mm|ss/g, (t) => tokens[t]);
}

/** CacheService.getScriptCache(): string values with a lifetime in seconds, on the given clock. */
function makeCache(clock) {
  const store = new Map();
  return {
    store,
    get: (key) => {
      const item = store.get(key);
      if (!item) return null;
      if (clock.now >= item.expires) {
        store.delete(key);
        return null;
      }
      return item.value;
    },
    put: (key, value, seconds = 600) => {
      if (typeof value !== "string") throw new TypeError("cache values are strings");
      store.set(key, { value, expires: clock.now + Math.min(seconds, 21600) * 1000 });
    },
  };
}

/**
 * `clock` ({ now } in ms) fixes the script's Date.now, so the hour-bucket tests never straddle an hour boundary;
 * `cache` lets several loads (separate executions) share one script cache; `lockFree: false` makes tryLock fail.
 */
function load({ secret = SECRET, mailError = null, source = SOURCE, quota = 98, clock = null, cache = null, lockFree = true } = {}) {
  const sent = [];
  const logs = [];
  let quotaCalls = 0;
  const lock = { tries: 0, held: 0 };
  const time = clock ?? { now: Date.now() };
  const scriptCache = cache ?? makeCache(time);
  const log = (...a) => logs.push(a.join(" "));
  const context = {
    LockService: {
      getScriptLock: () => ({
        tryLock: (ms) => {
          if (typeof ms !== "number" || ms <= 0 || ms >= 10_000) throw new Error("tryLock needs a wait under the website's 10 s timeout");
          lock.tries++;
          if (!lockFree) return false;
          lock.held++;
          return true;
        },
        releaseLock: () => {
          lock.held = Math.max(0, lock.held - 1);
        },
      }),
    },
    CacheService: { getScriptCache: () => scriptCache },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k === "CONTACT_SECRET" ? secret : null) }) },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: (text) => ({
        text,
        mimeType: null,
        setMimeType(m) {
          this.mimeType = m;
          return this;
        },
      }),
    },
    MailApp: {
      sendEmail: (options) => {
        if (mailError) throw mailError;
        sent.push(options);
      },
      getRemainingDailyQuota: () => (quotaCalls++, quota),
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: "sha256" },
      Charset: { UTF_8: "utf8" },
      // Apps Script returns signed bytes (-128…127)
      computeDigest: (_alg, value) => [...createHash("sha256").update(value, "utf8").digest()].map((b) => (b > 127 ? b - 256 : b)),
      formatDate,
    },
    console: { log, info: log, warn: log, error: log },
  };
  vm.createContext(context);
  if (clock) {
    context.__clock = time;
    vm.runInContext("Date.now = () => __clock.now;", context);
  }
  vm.runInContext(source, context);
  const call = (out) => ({ ...JSON.parse(out.text), mimeType: out.mimeType });
  const post = (body) =>
    call(context.doPost(body === undefined ? undefined : { postData: { contents: typeof body === "string" ? body : JSON.stringify(body) } }));
  return { context, sent, logs, post, lock, cache: scriptCache, quotaCalls: () => quotaCalls, doGet: () => call(context.doGet()) };
}

const valid = {
  secret: SECRET,
  timestamp: "2026-10-08T06:30:00.000Z",
  name: "Ana Cruz",
  email: "ana@example.com",
  company: "Acme Studio",
  inquiryType: "Freelance project",
  message: "Hello Nico,\r\nI'd like to talk about a project.",
  page: "/work/sabbath-spa",
};
/** The subject of the one email a payload produces ("" when none was sent). */
const subjectFor = (payload) => {
  const { post, sent } = load();
  post(payload);
  return sent.length === 1 ? sent[0].subject : "";
};
const bodyFor = (payload) => {
  const { post, sent } = load();
  post(payload);
  return sent.length === 1 ? sent[0].body : "";
};
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/;

console.log("Apps Script (mocked services):");

// Standalone and email only, to Nico only
{
  const leftovers = ["SpreadsheetApp", "getActiveSpreadsheet", "OnlyCurrentDoc", "Session."].filter((s) => SOURCE.includes(s));
  check("the source has no Sheet or session code", leftovers.length === 0, leftovers.join(", "));
  // Comments removed; then no `cc:` / `bcc:` option and no `.cc =` / `.bcc =` assignment anywhere in the code.
  const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  check("the code sets no cc or bcc", !/\b(cc|bcc)\s*:/i.test(code) && !/\.(cc|bcc)\s*=/i.test(code));
  check(
    "no secret in the file (it lives in Script Properties)",
    !/CONTACT_SECRET\s*=\s*['"][^'"]+['"]/.test(SOURCE) && !/[0-9a-f]{32,}/i.test(SOURCE),
  );
}

// The happy path
{
  const { post, sent, logs } = load();
  const res = post(valid);
  check("valid → {ok:true} as JSON", res.ok === true && res.mimeType === "application/json", JSON.stringify(res));
  const mail = sent[0] ?? {};
  check("exactly one email", sent.length === 1, String(sent.length));
  check(
    "To Nico only, Reply-To the visitor, sender name",
    mail.to === TO && mail.replyTo === "ana@example.com" && mail.name === "Portfolio contact form",
    JSON.stringify({ to: mail.to, replyTo: mail.replyTo, name: mail.name }),
  );
  const keys = Object.keys(mail).sort().join(",");
  check("no other options (no cc, no bcc, no HTML body)", keys === "body,name,replyTo,subject,to", keys);
  const expected = [
    "New message from the contact form on Nico Agustin's portfolio.",
    "",
    "Name: Ana Cruz",
    "Email: ana@example.com",
    "Company: Acme Studio",
    "Inquiry type: Freelance project",
    "Page: /work/sabbath-spa",
    "Received: 2026-10-08 14:30 (Philippine time)",
    "",
    "Message:",
    "Hello Nico,",
    "I'd like to talk about a project.",
    "",
    "--",
    "Reply to this email to answer Ana Cruz directly.",
  ].join("\n");
  check("the body lists every field, the page and the Philippine time", mail.body === expected, JSON.stringify(mail.body));
  check("nothing is logged on success", logs.length === 0, logs.join(" | "));
}

// Subjects
{
  const cases = [
    ["Hire full-time", "Acme Studio", "Hiring enquiry: Ana Cruz (Acme Studio)"],
    ["Hire full-time", "", "Hiring enquiry: Ana Cruz"],
    ["Freelance project", "Acme Studio", "Freelance project: Ana Cruz (Acme Studio)"],
    ["Freelance project", "", "Freelance project: Ana Cruz"],
    ["Other", "Acme Studio", "Message: Ana Cruz"],
    ["Other", "", "Message: Ana Cruz"],
    ["", "Acme Studio", "Message: Ana Cruz"],
    ["Something else", "Acme Studio", "Message: Ana Cruz"],
    ["constructor", "Acme Studio", "Message: Ana Cruz"],
  ];
  for (const [inquiryType, company, subject] of cases) {
    const got = subjectFor({ ...valid, inquiryType, company });
    check(`subject: "${inquiryType}"${company ? " with" : " without"} company → ${subject}`, got === subject, JSON.stringify(got));
  }
  check("an empty inquiry type reads “Other” in the body", bodyFor({ ...valid, inquiryType: "" }).includes("\nInquiry type: Other\n"));
  const long = subjectFor({ ...valid, inquiryType: "Hire full-time", name: "N".repeat(100), company: "C".repeat(120) });
  check("the subject is capped at 200 characters", long.length === 200 && long.startsWith("Hiring enquiry: NNN"), String(long.length));
}

// The website's labels and the script's subjects agree
{
  const block = FIELDS.match(/INQUIRY_TYPES\s*=\s*\[([\s\S]*?)\]\s*as const/)?.[1] ?? "";
  const labels = [...block.matchAll(/label:\s*"([^"]+)"/g)].map((m) => m[1]);
  const prefixes = { "Hire full-time": "Hiring enquiry: ", "Freelance project": "Freelance project: ", Other: "Message: " };
  check(
    "lib/contact/fields.ts has the three inquiry labels the script knows",
    labels.length === 3 && labels.every((l) => l in prefixes),
    JSON.stringify(labels),
  );
  const mismatched = labels.filter((l) => !subjectFor({ ...valid, inquiryType: l }).startsWith(prefixes[l] ?? "\0"));
  check("each label gets its own subject", labels.length > 0 && mismatched.length === 0, mismatched.join(", "));
}

// Time, company and page
{
  check(
    "the time is Philippine time, also across midnight",
    bodyFor({ ...valid, timestamp: "2026-10-08T20:15:00.000Z" }).includes("\nReceived: 2026-10-09 04:15 (Philippine time)\n"),
  );
  const before = formatDate(new Date(), "Asia/Manila", "yyyy-MM-dd HH:mm");
  const body = bodyFor({ ...valid, timestamp: "not a date" });
  const after = formatDate(new Date(), "Asia/Manila", "yyyy-MM-dd HH:mm");
  check(
    "a missing or invalid timestamp uses the current time",
    body.includes(`\nReceived: ${before} (Philippine time)\n`) || body.includes(`\nReceived: ${after} (Philippine time)\n`),
    body.split("\n").find((l) => l.startsWith("Received")),
  );
  const bare = bodyFor({ ...valid, company: "", page: "" });
  check("an empty company and page show “-”", bare.includes("\nCompany: -\n") && bare.includes("\nPage: -\n"));
  check("a page that isn't a path on the site shows “-”", bodyFor({ ...valid, page: "https://evil.example/x" }).includes("\nPage: -\n"));
}

// Secret and configuration
{
  const { post, sent } = load();
  check("wrong secret → unauthorized, no email", post({ ...valid, secret: "a-different-secret-of-some-length" }).error === "unauthorized" && sent.length === 0);
  check("missing secret → unauthorized, no email", post({ ...valid, secret: undefined }).error === "unauthorized" && sent.length === 0);
  check("a secret of another type → unauthorized", post({ ...valid, secret: 12345 }).error === "unauthorized" && sent.length === 0);
}
{
  const missing = load({ secret: null });
  check("no CONTACT_SECRET property → not_configured, no email", missing.post(valid).error === "not_configured" && missing.sent.length === 0);
  const short = load({ secret: "short" });
  check("short CONTACT_SECRET property → not_configured", short.post({ ...valid, secret: "short" }).error === "not_configured" && short.sent.length === 0);
  const padded = load({ secret: `  ${SECRET}\n` });
  check("spaces around the stored secret are ignored", padded.post(valid).ok === true);
}

// Bad requests
{
  const { post, context, sent } = load();
  for (const [label, body] of [
    ["bad JSON", "{oops"],
    ["a number", "42"],
    ["null", "null"],
    ["a string", '"hello"'],
    ["an array", "[]"],
    ["an empty body", ""],
  ]) {
    check(`${label} → bad_request`, post(body).error === "bad_request");
  }
  check("no postData → bad_request", JSON.parse(context.doPost({}).text).error === "bad_request");
  check("no event at all → bad_request", post(undefined).error === "bad_request");
  check("a body over 30,000 characters → bad_request", post({ ...valid, message: "x".repeat(30_001) }).error === "bad_request");
  check("no email for any bad request", sent.length === 0, String(sent.length));
}

// Invalid fields
{
  const { post, sent } = load();
  for (const [label, patch] of [
    ["invalid email", { email: "not-an-email" }],
    ["email with a display name", { email: "Ana <ana@example.com>" }],
    ["email without a domain suffix", { email: "ana@example" }],
    ["email with a line break", { email: "ana@example.com\r\nBcc: x@example.com" }],
    ["missing name", { name: undefined }],
    ["name of only control characters", { name: "\u0000\u202E " }],
    ["missing message", { message: undefined }],
    ["blank message", { message: "  \n  " }],
  ]) {
    check(`${label} → invalid`, post({ ...valid, ...patch }).error === "invalid");
  }
  check("no email for invalid fields", sent.length === 0, String(sent.length));
}

// Limits and cleaning
{
  const { post, sent } = load();
  post({ ...valid, inquiryType: "Hire full-time", name: "N".repeat(150), company: "C".repeat(200), message: "m".repeat(6000) });
  const mail = sent[0] ?? { body: "", subject: "" };
  check("name truncated to 100 characters", mail.body.includes(`\nName: ${"N".repeat(100)}\n`), mail.body.slice(0, 300));
  check("company truncated to 120 characters", mail.body.includes(`\nCompany: ${"C".repeat(120)}\n`));
  check("message truncated to 5000 characters", mail.body.includes(`\nMessage:\n${"m".repeat(5000)}\n\n--`) && !mail.body.includes("m".repeat(5001)));
}
{
  const { post, sent } = load();
  post({
    ...valid,
    inquiryType: "Hire full-time",
    name: "Ana\u0000 Cr\u202Euz\u2066",
    company: "Acme\u0007 Studio\u2069",
    message: "First\u0008 line\u202D\r\nsecond line\u0000",
  });
  const mail = sent[0] ?? { body: "", subject: "" };
  check("control and bidi characters stripped", !CONTROL.test(mail.body) && !CONTROL.test(mail.subject), JSON.stringify(mail.body));
  check("cleaned values read normally", mail.subject === "Hiring enquiry: Ana Cruz (Acme Studio)" && mail.body.includes("\nMessage:\nFirst line\nsecond line\n"), JSON.stringify(mail.subject));
}
{
  const { post, sent } = load();
  post({ ...valid, inquiryType: "Hire full-time", name: "Ana\r\nBcc: x@example.com", company: "Acme\nStudio\u2028Ltd" });
  const mail = sent[0] ?? { body: "", subject: "x\n" };
  check("a line break in the name or company never reaches the subject", !/[\r\n\u2028\u2029]/.test(mail.subject), JSON.stringify(mail.subject));
  check("…it becomes a space", mail.subject === "Hiring enquiry: Ana Bcc: x@example.com (Acme Studio Ltd)", JSON.stringify(mail.subject));
  check("the name stays on one line in the body", mail.body.includes("\nName: Ana Bcc: x@example.com\n") && !mail.body.includes("\r"));
}

// Email failure
{
  const error = new Error("Service invoked too many times: ana@example.com Hello Nico");
  error.name = "Exception";
  const { post, logs } = load({ mailError: error });
  const res = post(valid);
  check("MailApp throws → {ok:false, error:'mail_failed'}", res.ok === false && res.error === "mail_failed", JSON.stringify(res));
  check("only the error's name is logged", logs.length === 1 && logs[0].endsWith(": Exception"), logs.join(" | "));
  check(
    "logs never contain the visitor's words, address or the secret",
    logs.every((l) => !l.includes("Hello Nico") && !l.includes("ana@example.com") && !l.includes(SECRET)),
    logs.join(" | "),
  );
}

// Sending limits
{
  // 10:15 UTC: well inside one clock hour, so all of these share one hour bucket.
  const clock = { now: Date.UTC(2026, 9, 8, 10, 15, 0) };
  const cache = makeCache(clock);
  const answers = [];
  let sentCount = 0;
  let unreleased = 0;
  for (let i = 1; i <= 20; i++) {
    const env = load({ clock, cache }); // a fresh execution each time, sharing the script cache
    answers.push(env.post({ ...valid, message: `Message number ${i}` }));
    sentCount += env.sent.length;
    unreleased += env.lock.held;
  }
  check(
    "under the limit: 20 messages in one hour are all sent",
    answers.every((r) => r.ok === true) && sentCount === 20 && unreleased === 0,
    JSON.stringify(answers.filter((r) => r.ok !== true)),
  );
  const env21 = load({ clock, cache });
  const res21 = env21.post({ ...valid, message: "Message number 21" });
  check("the 21st in the same hour → rate_limited, no email", res21.ok === false && res21.error === "rate_limited" && env21.sent.length === 0, JSON.stringify(res21));
  check("…and the lock is released", env21.lock.held === 0 && env21.lock.tries === 1);
  clock.now = Date.UTC(2026, 9, 8, 11, 0, 5);
  const next = load({ clock, cache });
  check("the next hour sends again", next.post({ ...valid, message: "A new hour" }).ok === true && next.sent.length === 1);
  const stored = [...cache.store.entries()].map(([k, v]) => `${k}=${v.value}`).join(" ");
  check(
    "the cache holds only counters and hashes, never the address or the words",
    !stored.includes("ana@example.com") && !stored.includes("Message number") && !stored.includes("A new hour") && !stored.includes(SECRET),
    stored,
  );
  const hourly = [...cache.store.entries()].filter(([k]) => k.startsWith("sent:"));
  check("the hour counter expires about an hour after it is written", hourly.length > 0 && hourly.every(([, v]) => v.expires - clock.now <= 3_660_000));
}
{
  const low = load({ quota: 9 });
  const res = low.post(valid);
  check("fewer than 10 emails of daily quota left → rate_limited, no email", res.error === "rate_limited" && low.sent.length === 0 && low.quotaCalls() === 1, JSON.stringify(res));
  check("…and the lock is released", low.lock.held === 0);
  const edge = load({ quota: 10 });
  check("exactly 10 left still sends", edge.post(valid).ok === true && edge.sent.length === 1);
}
{
  const clock = { now: Date.UTC(2026, 9, 8, 10, 15, 0) };
  const cache = makeCache(clock);
  const first = load({ clock, cache });
  check("a first message sends", first.post(valid).ok === true && first.sent.length === 1);
  const again = load({ clock, cache });
  const dup = again.post({ ...valid, name: "Ana C.", email: "ANA@example.com", timestamp: "2026-10-08T06:31:00.000Z" });
  check("the same address and message again → duplicate, no email", dup.ok === false && dup.error === "duplicate" && again.sent.length === 0, JSON.stringify(dup));
  check("…and the lock is released", again.lock.held === 0);
  const other = load({ clock, cache });
  check("the same address with a different message sends", other.post({ ...valid, message: "A different question." }).ok === true);
  const otherSender = load({ clock, cache });
  check("the same message from another address sends", otherSender.post({ ...valid, email: "ben@example.com" }).ok === true);
  clock.now += 10 * 60 * 1000 + 1000;
  const later = load({ clock, cache });
  check("the same message after 10 minutes sends", later.post(valid).ok === true && later.sent.length === 1);
}
{
  const error = new Error("Service invoked too many times");
  error.name = "Exception";
  const clock = { now: Date.UTC(2026, 9, 8, 10, 15, 0) };
  const cache = makeCache(clock);
  const failing = load({ clock, cache, mailError: error });
  check("a failed send → mail_failed, lock released", failing.post(valid).error === "mail_failed" && failing.lock.held === 0);
  check("…it counts for nothing, so a retry isn't a duplicate", cache.store.size === 0 && load({ clock, cache }).post(valid).ok === true);
}
{
  const busy = load({ lockFree: false });
  const res = busy.post(valid);
  check("the lock not free within the wait → rate_limited, no email", res.error === "rate_limited" && busy.sent.length === 0 && busy.quotaCalls() === 0, JSON.stringify(res));
}
{
  // The secret is checked before any limit: a wrong secret takes no lock, reads no quota and counts for nothing.
  const clock = { now: Date.UTC(2026, 9, 8, 10, 15, 0) };
  const cache = makeCache(clock);
  for (let i = 0; i < 25; i++) load({ clock, cache }).post({ ...valid, secret: "a-different-secret-of-some-length", message: `Spam ${i}` });
  const wrong = load({ clock, cache, quota: 0 });
  const res = wrong.post({ ...valid, secret: "a-different-secret-of-some-length" });
  check(
    "the secret is still checked first: wrong secret → unauthorized, even with no quota left",
    res.error === "unauthorized" && wrong.lock.tries === 0 && wrong.quotaCalls() === 0 && wrong.sent.length === 0,
    JSON.stringify(res),
  );
  check("…and wrong-secret requests use up none of the hourly limit", cache.store.size === 0 && load({ clock, cache }).post(valid).ok === true);
  const invalid = load({ clock, cache });
  check("invalid fields are refused before the limits too", invalid.post({ ...valid, email: "nope" }).error === "invalid" && invalid.lock.tries === 0);
}

// doGet
{
  const { doGet, sent } = load();
  const res = doGet();
  check("doGet → post_only as JSON, no email", res.error === "post_only" && res.ok === false && res.mimeType === "application/json" && sent.length === 0);
}

// checkSetup
{
  const throwsWith = (secret) => {
    const env = load({ secret });
    try {
      env.context.checkSetup();
      return { threw: false, env };
    } catch (err) {
      return { threw: true, message: String(err?.message), env };
    }
  };
  const none = throwsWith(null);
  check("checkSetup without a secret throws a clear error and sends nothing", none.threw && none.message.includes("CONTACT_SECRET") && none.env.sent.length === 0, none.message);
  const short = throwsWith("short");
  check("checkSetup with a short secret throws", short.threw && /too short/.test(short.message), short.message);
  const ok = throwsWith(SECRET);
  const log = ok.env.logs.join(" | ");
  check("checkSetup with a secret logs “Setup OK”, its length and the quota", !ok.threw && log.includes("Setup OK") && log.includes(`(${SECRET.length} characters)`) && log.includes("98") && ok.env.quotaCalls() === 1, log);
  check("checkSetup never logs the secret and sends nothing", !log.includes(SECRET) && ok.env.sent.length === 0);
}

const failed = results.filter((ok) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed.`);
process.exit(failed ? 1 : 0);
