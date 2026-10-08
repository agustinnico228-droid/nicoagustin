// Pre-push gate. Run before every `git push`: `pnpm check:push` (exit code 1 = do not push).
//
// Scans the files a push would publish: everything git tracks (git ls-files) plus untracked files that are not
// ignored (git ls-files --others --exclude-standard), because they are one `git add .` away. It blocks:
//   - .env files (only .env.example may be committed) and anything under nicofiles/, nico-files/ or teardowns/
//   - any file over 50 MB
//   - phone numbers (Philippine mobile formats and international numbers)
//   - street addresses (number + street name + St/Ave/Rd…, and Brgy./Barangay, Purok, Sitio)
//   - Google Apps Script deployment URLs, secrets, tokens and private keys
//   - the reporting app's brand name (the pattern is assembled from parts, so this file never contains it)
//   - dashboard demo pages (public/demos/**/*.html) without a robots noindex meta tag
//
// Binary files are skipped. Under public/demos/ only the .html pages get the phone and address checks (the demo
// data files hold sample numbers); every demo file still gets the brand, URL and secret checks.

import { execFileSync } from "node:child_process";
import { closeSync, openSync, readFileSync, readSync, statSync } from "node:fs";
import path from "node:path";

const MB = 1024 * 1024;
const MAX_FILE = 50 * MB;
/** Larger text files are not content-scanned (nothing this big should be text in this repo). */
const MAX_SCAN = 5 * MB;
const SELF = "scripts/prepush-check.mjs";

const failures = [];
const fail = (rule, where, detail = "") => failures.push({ rule, where, detail });

// ── Which files ──────────────────────────────────────────────────────────────────────────────────────────

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 256 * MB });
}

let files;
try {
  const tracked = git("ls-files", "-z").split("\0");
  const untracked = git("ls-files", "-z", "--others", "--exclude-standard").split("\0");
  files = [...new Set([...tracked, ...untracked])].filter(Boolean).map((f) => f.replace(/\\/g, "/"));
} catch (error) {
  console.error("✗ pre-push check: could not list the files with git (is this a git repository, and is git installed?)");
  console.error(`  ${String(error?.message ?? error).split("\n")[0]}`);
  process.exit(1);
}

// ── Rules ────────────────────────────────────────────────────────────────────────────────────────────────

const BINARY_EXT = /\.(png|jpe?g|gif|webp|avif|ico|bmp|tiff?|psd|mp4|webm|mov|m4v|mp3|wav|ogg|woff2?|ttf|otf|eot|pdf|zip|gz|tgz|7z|rar|glb|gltf|bin|hdr|exr|ktx2|wasm|lockb)$/i;
const SKIP_CONTENT = new Set(["pnpm-lock.yaml", "package-lock.json", "yarn.lock"]);

const FORBIDDEN_DIR = /(^|\/)(nicofiles|nico-files|teardowns?)\//i;

// The brand: assembled from parts so this file never contains it.
const BRAND = new RegExp(["ago", "ra"].join("") + "[\\s\\u00b7·._-]*" + ["atr", "ium"].join(""), "i");

// Phones. Philippine mobiles: +63 9xx xxx xxxx, 63 9xx…, 09xx xxx xxxx (spaces, dots or dashes optional).
const PH_MOBILE = /(?<![\w.\/#-])(?:\+63|\b63|\b0)[\s.-]?\(?9\d{2}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?![\w.-]*\d)/;
// Philippine landlines written with the area code: (0N) NNNN NNNN, (0NN) NNN NNNN.
const PH_LANDLINE = /\(0\d{1,3}\)\s?\d{3,4}[\s.-]?\d{4}\b/;
// International numbers written with a leading +: +C NNN NNN NNNN (any grouping).
const INTERNATIONAL = /(?<![\w)\]+])\+\d{1,3}(?:[\s.-]?\(?\d{1,4}\)?){2,5}(?![\w.-]*\d)/;
// Generic formatted numbers (content, docs and demo pages only): NNNN-NNN-NNNN, NNN NNN NNNN.
const FORMATTED = /(?<![\w.#/:=-])(?:\(\d{2,4}\)\s?|\d{3,4}[\s.-])\d{3,4}[\s.-]\d{4}(?![\w.:-])/;

/** Numbers that look like phones but aren't: dates, times, ISO stamps, versions, ids in URLs. */
function plausiblePhone(match, line) {
  const digits = match.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return false;
  if (/\b(19|20)\d{2}[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/.test(match)) return false; // a date
  if (/^\+?\d+(\.\d+){2,}$/.test(match.trim())) return false; // a version or IP-ish
  const at = line.indexOf(match);
  const before = line.slice(Math.max(0, at - 12), at);
  if (/(viewBox|points|d)=["'][^"']*$/.test(before) || /[?&][\w-]+=$/.test(before)) return false; // SVG paths, query ids
  return true;
}

// Street addresses: "12 Rizal Street", "4B Mabini St.", "1200 Ayala Ave" (capitalised street name, 1–4 words).
const STREET =
  /\b\d{1,5}[A-Za-z]?\s+(?:[A-Z][A-Za-z.'-]*\s+){1,4}(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Drive|Dr|Lane|Ln|Highway|Hwy)\b\.?/;
// Filipino address parts: Brgy. Santo Niño, Barangay 5, Purok 3, Sitio Malinis.
const BARANGAY = /\b(?:Brgy\.?|Bgy\.|Barangay|Purok|Sitio)\s+[A-Z0-9][\wñÑ.-]*/;

const SECRET_PATTERNS = [
  ["Apps Script deployment URL", /script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}/],
  ["Apps Script content URL", /script\.googleusercontent\.com\/macros\/[^\s"'`)<>]+/],
  ["Google Sheets URL", /docs\.google\.com\/spreadsheets\/d\/[A-Za-z0-9_-]{20,}/],
  ["contact secret value", /\bCONTACT_SECRET\s*=\s*["']?[A-Za-z0-9+/_=.-]{16,}/],
  ["GitHub token", /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/],
  ["Vercel token", /\b(?:VERCEL_TOKEN|VERCEL_OIDC_TOKEN)\s*[=:]\s*["']?[A-Za-z0-9._-]{20,}|--token[=\s]+[A-Za-z0-9]{20,}/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["Slack token", /\bxox[abprs]-[0-9A-Za-z-]{10,}/],
  ["Stripe key", /\b[sr]k_(?:live|test)_[0-9A-Za-z]{16,}/],
  ["Resend API key", /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/],
  ["Meta access token", /\bEAA[A-Za-z0-9]{30,}/],
  ["JWT", /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["bearer token", /\bBearer\s+[A-Za-z0-9._~+/-]{24,}/],
];

// A long hex or base64 value right after a secret-ish word: secret=…, "token": "…", apiKey: '…'.
const KEYED_VALUE = /\b(?:secret|token|api[_-]?key|access[_-]?key|private[_-]?key|password|passwd|auth)\w*["']?\s*[:=]\s*["'`]?([A-Za-z0-9+/_=-]{32,})/i;
function looksLikeSecret(value) {
  if (/^[0-9a-f]{32,}$/i.test(value)) return true; // hex
  // base64-ish: long, with letters and digits mixed (not a word or an identifier)
  return value.length >= 40 && /[A-Za-z]/.test(value) && /\d/.test(value) && !/^[a-z_]+$/i.test(value);
}

// ── Scan ─────────────────────────────────────────────────────────────────────────────────────────────────

function isBinary(file) {
  if (BINARY_EXT.test(file)) return true;
  const fd = openSync(file, "r");
  try {
    const buffer = Buffer.alloc(8000);
    const read = readSync(fd, buffer, 0, buffer.length, 0);
    return buffer.subarray(0, read).includes(0);
  } finally {
    closeSync(fd);
  }
}

let scanned = 0;
for (const file of files) {
  const stat = statSync(file, { throwIfNoEntry: false });
  if (!stat || !stat.isFile()) continue; // deleted in the working tree

  if (/(^|\/)\.env(\.|$)/.test(file) && path.posix.basename(file) !== ".env.example") fail(".env file", file, "only .env.example may be committed");
  if (FORBIDDEN_DIR.test(file)) fail("personal files / teardown folder", file, "nicofiles/, nico-files/ and teardowns/ stay outside the repo");
  if (stat.size > MAX_FILE) fail("file over 50 MB", file, `${(stat.size / MB).toFixed(1)} MB`);
  if (BRAND.test(file)) fail("banned brand in a file name", file);

  if (SKIP_CONTENT.has(path.posix.basename(file)) || stat.size > MAX_SCAN || isBinary(file)) continue;

  const isDemo = file.startsWith("public/demos/");
  const isDemoPage = isDemo && /\.html?$/i.test(file);
  const checkPeople = (!isDemo || isDemoPage) && file !== SELF;
  const formattedScope = /^(content|docs|public\/demos)\//.test(file) || /\.(md|mdx|txt|html?)$/i.test(file);

  const text = readFileSync(file, "utf8");
  scanned++;
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    const at = `${file}:${i + 1}`;
    if (BRAND.test(line)) fail("banned brand name", at);
    for (const [name, re] of SECRET_PATTERNS) if (re.test(line)) fail(name, at);
    const keyed = line.match(KEYED_VALUE);
    if (keyed?.[1] && looksLikeSecret(keyed[1])) fail("secret-like value", at, `${keyed[1].slice(0, 6)}…`);

    if (!checkPeople) return;
    for (const [name, re] of [
      ["phone number (PH mobile)", PH_MOBILE],
      ["phone number (PH landline)", PH_LANDLINE],
      ["phone number (international)", INTERNATIONAL],
      ...(formattedScope ? [["phone-like number", FORMATTED]] : []),
    ]) {
      const m = line.match(re);
      if (m && plausiblePhone(m[0], line)) {
        fail(name, at, m[0].trim());
        break;
      }
    }
    const street = line.match(STREET) ?? line.match(BARANGAY);
    if (street) fail("street address", at, street[0].trim());
  });

  if (isDemoPage && !/<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(text) && !/<meta[^>]+content=["'][^"']*noindex[^>]+name=["']robots["']/i.test(text)) {
    fail("demo page without noindex", file, 'add <meta name="robots" content="noindex, nofollow">');
  }
}

// ── Report ───────────────────────────────────────────────────────────────────────────────────────────────

if (failures.length) {
  console.error(`\n✗ Pre-push check failed: ${failures.length} problem(s). Do not push until they are fixed.\n`);
  const byRule = new Map();
  for (const f of failures) byRule.set(f.rule, [...(byRule.get(f.rule) ?? []), f]);
  for (const [rule, list] of byRule) {
    console.error(`  ${rule} (${list.length})`);
    for (const f of list.slice(0, 25)) console.error(`    - ${f.where}${f.detail ? `  →  ${f.detail}` : ""}`);
    if (list.length > 25) console.error(`    … and ${list.length - 25} more`);
  }
  console.error("\n  Real values (phone, address, secrets, script URLs) belong only in Vercel or .env.local, never in the repo.\n");
  process.exit(1);
}
console.log(`✓ Pre-push check passed: ${files.length} files (${scanned} text files scanned).`);
