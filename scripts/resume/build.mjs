// Builds Nico Agustin's résumé (A4, ATS-friendly) from the site's own data, so it never drifts from the portfolio.
//
// Usage (from the repo root):
//   SITE_URL=https://nicoagustin.vercel.app node scripts/resume/build.mjs
//
//   --public-only       build only public/resume.pdf
//   --private-dir <dir> where the private copy and the PNG previews go (default: ../nicofiles, next to the repo;
//                       it must be outside the repo)
//   --no-previews       skip the PNG previews
//
// Outputs:
//   public/resume.pdf                                   public version: no phone number, city only
//   <private-dir>/nico-agustin-resume-full.pdf          private version: adds the phone number to the contact line
//   <private-dir>/resume-public-pN.png, resume-full-pN.png   page previews (1240 px wide)
//
// Facts come from lib/site.ts and content/projects.ts (imported directly: Node 25 strips TypeScript types).
// The few lines that are not in those files (Agora detail lines, Java, Microsoft Office / Google Workspace) are
// taken from Nico's brief and CV and written below.
//
// Privacy: the phone number is NEVER stored in the repo or printed. It is read at run time from Nico's CV
// (<private-dir>/resume/Resume.pdf, with pdftotext or pypdf) and goes only into the in-memory page and the private
// PDF outside the repo. The script prints only "phone found: yes/no". The public PDF's extracted text is checked
// for anything phone-like and is not written if one is found. No street address anywhere (city only).
//
// Rendering: the generated blocks are split into A4 sheets (.page) in the browser, printed with the local Chrome
// (Playwright, channel "chrome"), then the PDF metadata is reduced to Title + Author with pypdf, and each sheet is
// screenshotted for the previews (identical page breaks, since the PDF prints the same sheets).

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { chromium } from "playwright";
import { loadProjects, loadSite, repoRoot } from "../lib/site-data.mjs";

process.env.SITE_URL ??= "https://nicoagustin.vercel.app";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const has = (name) => args.includes(`--${name}`);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};

function die(message) {
  console.error(`✗ résumé: ${message}`);
  process.exit(1);
}

const PDF_TITLE = "Nico Agustin — Résumé";
const PDF_AUTHOR = "Nico Agustin";
const privateDir = path.resolve(option("private-dir", path.join(repoRoot, "..", "nicofiles")));
const cvPath = path.join(privateDir, "resume", "Resume.pdf");
const publicOut = path.join(repoRoot, "public", "resume.pdf");
const privateOut = path.join(privateDir, "nico-agustin-resume-full.pdf");
const wantPrivate = !has("public-only");
const wantPreviews = !has("no-previews");

const insideRepo = (p) => {
  const rel = path.relative(repoRoot, p);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
};
if (insideRepo(privateDir)) die(`--private-dir must be outside the repo (got ${privateDir})`);

// Phone-like text: the general pattern (groups separated by spaces, dots or dashes) plus Philippine mobiles.
const PHONE_GENERAL = /(?<![\w.#/-])(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)\s?|\d{2,4}[\s.-])\d{3,4}[\s.-]\d{3,4}(?![\w.-])/;
// Philippine mobile: +63 / (+63) / 0, then 9 and nine more digits in any grouping (3-3-4, 3-4-3 ...).
const PHONE_PH = /(?:\(?\+?63\)?[\s.-]?|\b0)9(?:[\s.-]?\d){9}(?!\d)/;
const looksLikePhone = (text) => PHONE_GENERAL.test(text) || PHONE_PH.test(text);

const MM = 96 / 25.4; // CSS px per mm
const A4_WIDTH_PX = 210 * MM;
const PREVIEW_WIDTH = 1240;

// ── Helpers ────────────────────────────────────────────────────────────────────────────────────────────────────

const esc = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const bare = (url) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
const link = (url, text = bare(url)) => `<a href="${esc(url)}" class="url">${esc(text)}</a>`;

function pdftotextBin() {
  for (const bin of ["pdftotext", "C:\\Program Files\\Git\\mingw64\\bin\\pdftotext.exe"]) {
    // `pdftotext -v` exits 99 even when it works, so only "not found" counts as missing.
    const run = spawnSync(bin, ["-v"], { stdio: "ignore" });
    if (!run.error) return bin;
  }
  return null;
}
const PDFTOTEXT = pdftotextBin();

/** Text of a PDF (pdftotext -layout, else pypdf). Kept in memory only. */
function pdfText(file) {
  if (PDFTOTEXT) {
    try {
      return execFileSync(PDFTOTEXT, ["-layout", "-enc", "UTF-8", file, "-"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    } catch {
      // fall through to pypdf
    }
  }
  const code = "import sys\nfrom pypdf import PdfReader\nsys.stdout.reconfigure(encoding='utf-8')\nprint('\\n'.join((p.extract_text() or '') for p in PdfReader(sys.argv[1]).pages))";
  return execFileSync("python", ["-c", code, file], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

/** Rewrites the PDF with only Title and Author in its metadata (no producer, creator, dates or XMP). Returns page count. */
function finalisePdf(src, dst) {
  const code = [
    "import sys",
    "from pypdf import PdfReader, PdfWriter",
    "src, dst, title, author = sys.argv[1:5]",
    "w = PdfWriter(clone_from=src)",
    "root = w.root_object",
    "if '/Metadata' in root: del root['/Metadata']",
    "w.metadata = None",
    "w.add_metadata({'/Title': title, '/Author': author})",
    "w.write(dst)",
    "r = PdfReader(dst)",
    "keys = sorted(k for k in (r.metadata or {}).keys())",
    "print(len(r.pages), ','.join(keys))",
  ].join("\n");
  const out = execFileSync("python", ["-c", code, src, dst, PDF_TITLE, PDF_AUTHOR], {
    encoding: "utf8",
    env: { ...process.env, PYTHONIOENCODING: "utf-8", PYTHONUTF8: "1" },
  }).trim();
  const [pages, keys = ""] = out.split(" ");
  return { pages: Number(pages), keys };
}

/** The phone number from Nico's CV, or "" if none. Never printed. */
function readPhone() {
  if (!existsSync(cvPath)) return "";
  let text = "";
  try {
    text = pdfText(cvPath);
  } catch {
    return "";
  }
  const hit = text.match(PHONE_PH);
  return hit ? hit[0].replace(/\s+/g, " ").trim() : "";
}

// ── Content ────────────────────────────────────────────────────────────────────────────────────────────────────

const site = await loadSite();
const { projects } = await loadProjects();
const { profile, experience, education, certificates, stack, layers, seminars, volunteering, SITE_URL } = site;

const forbidden = new RegExp(["Agora", "Atrium"].join("\\s+"), "i");

/** Every block is a direct child of the flow, so the paginator can move it between sheets. */
function buildBlocks({ phone }) {
  const blocks = [];
  const section = (title) => blocks.push(`<h2 data-keep="next">${esc(title)}</h2>`);

  // Header: name, title, contact line, photo (top right).
  const contact = [
    link(`mailto:${profile.email}`, profile.email),
    ...(phone ? [esc(phone)] : []),
    link(profile.links.linkedin),
    link(SITE_URL),
    esc(profile.location),
  ].join(" · ");
  blocks.push(`<header class="header">
  <div class="header-text">
    <h1>${esc(profile.name)}</h1>
    <p class="title">${esc(profile.title)}</p>
    <p class="contact">${contact}</p>
  </div>
  <img class="photo" src="{{PHOTO}}" alt="${esc(profile.name)}" width="98" height="98" />
</header>`);

  // Summary (facts from lib/site.ts only).
  const agora = experience.find((e) => e.org === "Agora Data Driven");
  const freelance = experience.find((e) => e.role === "Freelance Web Developer");
  const degree = education[0];
  section("Summary");
  blocks.push(`<div class="entry"><p>Fullstack web developer who builds websites, CRMs and reporting dashboards, and the tracking that shows whether they work. ${
    agora ? "One year full-time at Agora Data Driven, building one reporting system for five client businesses. " : ""
  }${freelance ? "Freelancing since September 2026 with PERN, MERN and Next.js. " : ""}${
    degree ? `${esc(degree.degree)}, ${esc(degree.school)} (${esc(degree.note)}).` : ""
  }</p></div>`);

  // Experience. Detail lines: lib/site.ts plus the facts in Nico's brief (content/projects.ts, project 01).
  const details = {
    "Freelance Web Developer": (e) => [e.summary ?? ""],
    "Fullstack Web Developer": () => [
      "Built the client reporting dashboards: one reporting system for five client businesses, with KPI cards, charts, tables, the ads that ran and written insights.",
      "Front end in HTML, CSS and vanilla JavaScript with inline SVG charts, no framework and no chart library.",
      "Data from a Python export and from Windsor.ai (Meta Ads, Shopify), ActiveCampaign, Campaign Monitor and Klaviyo.",
    ],
  };
  section("Experience");
  for (const e of experience) {
    const org = e.org === "Self-employed" ? "Self-employed" : e.org;
    const lines = (details[e.role]?.(e) ?? e.points ?? []).filter(Boolean);
    blocks.push(`<div class="entry">
  <p class="row"><span><strong>${esc(e.role)}</strong>, ${esc(org)}</span><span class="date">${esc(e.dates.replace(" · ", ", "))}</span></p>
  ${lines.map((l) => `<p class="line">${esc(l)}</p>`).join("\n  ")}
</div>`);
  }

  // Selected projects (content/projects.ts): title, kind, year; then the stack (or the summary / real results).
  section("Selected projects");
  for (const p of projects) {
    const kind = p.kind
      .split(" · ")
      .filter((part) => !/real results/i.test(part))
      .join(", ");
    const context = p.context && !kind.includes(p.context) ? `, ${esc(p.context)}` : "";
    const head = `<strong>${esc(p.title)}</strong>, ${esc(kind)}${context}`;
    let second;
    if (p.kpis) {
      const kpi = (label) => p.kpis.kpis.find((k) => k.label === label)?.value;
      const leads = kpi("Leads");
      const cpl = kpi("Cost per lead");
      // Results are claimed only when Nico's role is recorded (content/projects.ts `role`).
      const results = leads && cpl ? `${esc(leads)} leads at ${esc(cpl)} per lead, ${esc(p.kpis.period)}. ` : "";
      second = p.role
        ? `${esc(p.role)}: ${results}${esc(p.stack.join(", "))}.`
        : `${esc(p.stack.join(", "))}. Case study with the client-approved results on the portfolio.`;
    } else if (p.stack.length && !p.verify) {
      second = `Stack: ${esc(p.stack.join(", "))}.`;
    } else {
      second = esc(p.summary);
    }
    blocks.push(`<div class="entry tight">
  <p class="row"><span>${head}</span>${p.year ? `<span class="date">${esc(p.year)}</span>` : ""}</p>
  <p class="line">${second}</p>
</div>`);
  }
  blocks.push(`<div class="entry tight"><p class="line">Case studies and live dashboard demos (sample data): ${link(`${SITE_URL}/#work`)}</p></div>`);

  // Certifications (lib/site.ts order: Omdena first), with the verify URL as visible text.
  section("Certifications");
  for (const c of certificates) {
    // "Meta · Coursera" reads as "Meta (Coursera)"; every other "·" becomes a comma.
    const issuer = c.issuer.replace(/^(.+?) · (.+)$/, "$1 ($2)");
    const meta = [issuer, c.kind.replace(/ · /g, ", "), c.date].filter(Boolean).map(esc).join(", ");
    blocks.push(`<div class="entry tight">
  <p><strong>${esc(c.title)}</strong>, ${meta}</p>
  ${c.verify ? `<p class="line">Verify: ${link(c.verify, c.verify)}</p>` : ""}
</div>`);
  }

  // Education.
  section("Education");
  for (const ed of education) {
    blocks.push(`<div class="entry tight">
  <p class="row"><span><strong>${esc(ed.degree)}</strong>, ${esc(ed.school)}</span><span class="date">${esc(ed.dates)}</span></p>
  <p class="line">${esc(ed.note)}</p>
</div>`);
  }

  // Skills, grouped by layer (lib/site.ts), plus Java and office suites from Nico's CV.
  section("Skills");
  for (const layer of layers) {
    const items = stack.filter((t) => t.layer === layer.id).map((t) => t.label);
    if (items.length) blocks.push(`<div class="entry tight"><p><strong>${esc(layer.label)}:</strong> ${esc(items.join(", "))}</p></div>`);
  }
  blocks.push(`<div class="entry tight"><p><strong>Also:</strong> Java, Microsoft Office, Google tools</p></div>`);

  // Seminars and training, volunteering.
  section("Seminars and training");
  blocks.push(`<div class="entry tight">${[...seminars, ...volunteering].map((s) => `<p class="line">${esc(s)}</p>`).join("")}</div>`);

  // Languages.
  section("Languages");
  blocks.push(`<div class="entry tight"><p>${esc(profile.languages.join(", "))}</p></div>`);

  return blocks.join("\n");
}

// ── Render ─────────────────────────────────────────────────────────────────────────────────────────────────────

const templateHtml = readFileSync(path.join(here, "resume.html"), "utf8");
const photoFile = path.join(repoRoot, "public", profile.photo.src.replace(/^\//, ""));
if (!existsSync(photoFile)) die(`photo not found: ${photoFile}`);
// 26 mm at ~300 dpi is ~310 px; a small JPEG keeps the PDF light.
const photoBuf = await sharp(photoFile).resize(320, 320, { fit: "cover" }).jpeg({ quality: 85, mozjpeg: true }).toBuffer();
const photoUri = `data:image/jpeg;base64,${photoBuf.toString("base64")}`;

async function launch() {
  try {
    return await chromium.launch({ channel: "chrome" });
  } catch {
    return await chromium.launch();
  }
}

/** Renders one version. Returns { pages, size } or throws. Writes nothing if a check fails. */
async function render(browser, { phone, out, previewPrefix, isPublic }) {
  // Function replacers, so "$" in the content (A$25.01) is never read as a replacement pattern.
  const blocks = buildBlocks({ phone }).replace("{{PHOTO}}", () => photoUri);
  const html = templateHtml.replace('<div id="flow">{{CONTENT}}</div>', () => `<div id="flow">${blocks}</div>`);
  if (html === templateHtml) throw new Error("the template has no #flow placeholder");
  if (forbidden.test(html)) throw new Error("the résumé contains a forbidden brand name");

  const context = await browser.newContext({
    viewport: { width: Math.ceil(A4_WIDTH_PX) + 40, height: 1200 },
    deviceScaleFactor: PREVIEW_WIDTH / A4_WIDTH_PX,
  });
  const page = await context.newPage();
  const problems = [];
  page.on("pageerror", (e) => problems.push(`page error: ${e.name}`));
  page.on("requestfailed", () => problems.push("a request failed"));

  try {
    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMedia({ media: "print" });

    // Paginate: move each block into A4 sheets; a heading never ends a sheet (it travels with the next block).
    const result = await page.evaluate(() => {
      const flow = document.getElementById("flow");
      const doc = document.getElementById("doc");
      if (!flow || !doc) return { sheets: 0, issues: ["template is missing #flow or #doc"] };
      const blocks = [...flow.children];
      flow.remove();
      const issues = [];
      let body;
      const newSheet = () => {
        const sheet = document.createElement("section");
        sheet.className = "page";
        body = document.createElement("div");
        body.className = "page-body";
        sheet.append(body);
        doc.append(sheet);
      };
      const overflows = () => body.scrollHeight > body.clientHeight + 0.5;
      newSheet();
      for (const block of blocks) {
        body.append(block);
        if (!overflows()) continue;
        if (body.children.length === 1) {
          issues.push(`a block is taller than one page (${block.tagName.toLowerCase()})`);
          continue;
        }
        block.remove();
        const carry = [];
        while (body.lastElementChild && body.lastElementChild.getAttribute("data-keep") === "next" && body.children.length > 1) {
          carry.unshift(body.lastElementChild);
          body.lastElementChild.remove();
        }
        newSheet();
        body.append(...carry, block);
        if (overflows()) issues.push(`a block does not fit on a fresh page (${block.tagName.toLowerCase()})`);
      }
      // Horizontal overflow and out-of-flow elements (they would scramble the PDF's reading order).
      for (const el of doc.querySelectorAll(".page-body *")) {
        const s = getComputedStyle(el);
        if (s.position !== "static" || s.float !== "none" || s.transform !== "none") issues.push(`${el.tagName.toLowerCase()} is out of normal flow`);
      }
      for (const b of doc.querySelectorAll(".page-body")) {
        if (b.scrollWidth > b.clientWidth + 0.5) issues.push("something overflows the right margin");
      }
      const free = [...doc.querySelectorAll(".page-body")].map((b) => {
        const last = b.lastElementChild;
        if (!last) return 0;
        return (b.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom) / (96 / 25.4);
      });
      return { sheets: doc.querySelectorAll(".page").length, issues, free };
    });
    problems.push(...result.issues);
    if (result.sheets < 1 || result.sheets > 2) problems.push(`the résumé needs ${result.sheets} pages (must be 1–2)`);

    const imagesOk = await page.evaluate(() => [...document.images].every((img) => img.complete && img.naturalWidth > 0));
    if (!imagesOk) problems.push("the photo did not load");

    if (isPublic) {
      const text = await page.evaluate(() => document.body.innerText);
      if (looksLikePhone(text)) problems.push("the public version contains something phone-like");
    }
    if (problems.length) throw new Error(problems.join("; "));

    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "resume-"));
    try {
      const tmp = path.join(tmpDir, "raw.pdf");
      await page.pdf({ path: tmp, format: "A4", printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" }, tagged: true });
      mkdirSync(path.dirname(out), { recursive: true });
      const fin = finalisePdf(tmp, out);
      if (fin.pages !== result.sheets) throw new Error(`the PDF has ${fin.pages} page(s) but ${result.sheets} sheet(s) were laid out`);
      if (fin.keys !== "/Author,/Title") throw new Error(`unexpected PDF metadata keys: ${fin.keys}`);

      const text = pdfText(out);
      if (!text.includes("Nico Agustin")) throw new Error("the PDF has no selectable text");
      if (forbidden.test(text)) throw new Error("the PDF contains a forbidden brand name");
      if (isPublic && looksLikePhone(text)) {
        rmSync(out, { force: true });
        throw new Error("the public PDF's text contains something phone-like (file removed)");
      }
      if (!isPublic) {
        const digits = (s) => s.replace(/\D/g, "");
        if (!digits(text).includes(digits(phone))) throw new Error("the private PDF is missing the phone number");
      }

      const label = isPublic ? "public" : "private";
      console.log(`✓ ${label} résumé: ${out} (${(statSync(out).size / 1024).toFixed(0)} KB, ${fin.pages} page${fin.pages === 1 ? "" : "s"})`);
      result.free.forEach((mm, i) => console.log(`  page ${i + 1}: ${mm.toFixed(1)} mm free above the bottom margin`));
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }

    if (previewPrefix) {
      await page.emulateMedia({ media: "print" });
      const sheets = page.locator(".page");
      const n = await sheets.count();
      for (let i = 0; i < n; i++) {
        const file = `${previewPrefix}-p${i + 1}.png`;
        await sheets.nth(i).screenshot({ path: file, animations: "disabled" });
        console.log(`  preview: ${file}`);
      }
    }
    return { pages: result.sheets };
  } finally {
    await context.close();
  }
}

const browser = await launch();
let failed = false;
try {
  try {
    await render(browser, {
      phone: "",
      out: publicOut,
      previewPrefix: wantPreviews ? path.join(privateDir, "resume-public") : undefined,
      isPublic: true,
    });
  } catch (error) {
    failed = true;
    console.error(`✗ public résumé: ${error.message}`);
  }

  if (wantPrivate) {
    const phone = readPhone();
    console.log(`phone found: ${phone ? "yes" : "no"}`);
    if (!phone) {
      failed = true;
      console.error(`✗ private résumé skipped: no phone number found in ${cvPath}`);
    } else {
      try {
        await render(browser, {
          phone,
          out: privateOut,
          previewPrefix: wantPreviews ? path.join(privateDir, "resume-full") : undefined,
          isPublic: false,
        });
      } catch (error) {
        failed = true;
        // Error messages never include page text, so the number cannot leak here.
        console.error(`✗ private résumé: ${error.message}`);
      }
    }
  }
} finally {
  await browser.close();
}
process.exitCode = failed ? 1 : 0;
