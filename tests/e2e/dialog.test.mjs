// E2E for the "Let's talk" pop-up (any ContactLink: header, hero, project pages…).
//
//   node tests/e2e/dialog.test.mjs                 # builds twice (without, then with the contact env vars), runs everything
//   node tests/e2e/dialog.test.mjs --skip-build    # reuse the current .next (built WITH the contact env vars): part 2 only
//   node tests/e2e/dialog.test.mjs --port 3002     # port for `next start` (default 3002)
//   node tests/e2e/dialog.test.mjs --only "axe"
//
// Needs the local Chrome. Leaves .next built with test values: run `pnpm build` again before `pnpm start` or a deploy.
// Openers are found by [data-contact-link] (set by components/contact/ContactLink), so the test doesn't depend on
// the header's wording.

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AxeBuilder } from "@axe-core/playwright";
import { harness } from "./_harness.mjs";
import { startFakeWebhook } from "./fake-webhook.mjs";

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const PART = option("part", null); // set when this file runs itself for part 1
const SKIP_BUILD = args.includes("--skip-build") || PART !== null;
const EMAIL = "agustinnico228@gmail.com";
const NEXT = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const WAIT_PAST_MIN_FILL = 3_300;
const UNCONFIGURED = { CONTACT_WEBHOOK_URL: "", CONTACT_SECRET: "" };
const TITLE = "Let's talk";
const PROJECT = "/work/sabbath-spa";

const LETTER_START = { hire: /^Hi Nico,\n[\s\S]*full-time role/, freelance: /^Hi Nico,\n[\s\S]*project/, other: /^Hi Nico,$/ };
const LABEL = { hire: "Hire full-time", freelance: "Freelance project", other: "Other" };

const DESKTOP = { viewport: { width: 1440, height: 900 } };
const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function runNext(nextArgs, env) {
  return new Promise((resolve, reject) => {
    // CIRCLE_NODE_TOTAL limits Next's build workers (this PC has little free memory).
    const child = spawn(process.execPath, [NEXT, ...nextArgs], {
      env: { CIRCLE_NODE_TOTAL: "3", ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let log = "";
    child.stdout.on("data", (d) => (log += d));
    child.stderr.on("data", (d) => (log += d));
    child.on("exit", (code) => (code === 0 ? resolve(log) : reject(new Error(`next ${nextArgs.join(" ")} failed (${code}):\n${log.slice(-3000)}`))));
  });
}

/** Runs this file again for part 1 (its own `next start`, without the env vars); resolves with its exit code. */
function runPart(part) {
  const passThrough = args.filter((a, i) => a !== "--skip-build" && args[i - 1] !== "--part" && a !== "--part");
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), "--part", part, ...passThrough], {
      env: { ...process.env, ...UNCONFIGURED },
      stdio: "inherit",
    });
    child.on("exit", (code) => resolve(code ?? 1));
  });
}

// ── Orchestration: part 1 (no env vars → "Email me instead"), then part 2 (the form, against the fake webhook) ──
let fallbackExit = 0;
let hook = null;
if (PART === null) {
  const secret = `test-${randomBytes(16).toString("hex")}`;
  hook = await startFakeWebhook({ secret });
  if (!SKIP_BUILD) {
    console.log("Building without CONTACT_* …");
    await runNext(["build"], UNCONFIGURED);
    console.log("\nPart 1: not configured");
    fallbackExit = await runPart("fallback");
    console.log("\nBuilding with CONTACT_* pointing at the fake webhook …");
    await runNext(["build"], { CONTACT_WEBHOOK_URL: hook.url, CONTACT_SECRET: secret });
  }
  console.log("\nPart 2: the form");
  // `next start` (started by the harness) inherits these: the server action posts to the fake webhook.
  process.env.CONTACT_WEBHOOK_URL = hook.url;
  process.env.CONTACT_SECRET = secret;
}

const t = await harness();

// ── Helpers ────────────────────────────────────────────────────────────────────────────────────────────────

const dialog = (page) => page.getByRole("dialog", { name: TITLE });
const SELECTOR = "dialog[aria-labelledby='contact-dialog-title']";

async function load(route, options = DESKTOP) {
  const { context, page } = await t.newPage(options);
  await page.goto(`${t.baseUrl}${route}`, { waitUntil: "networkidle" });
  return { context, page };
}

/**
 * The first visible contact link (header first). On a phone it may sit in a menu: then the header's first
 * expandable button (the menu) is opened first. The link is marked [data-test-opener] so focus return can be checked.
 */
async function opener(page) {
  const visible = async () => {
    const links = page.locator("header a[data-contact-link], a[data-contact-link]");
    const n = await links.count();
    for (let i = 0; i < n; i++) if (await links.nth(i).isVisible()) return links.nth(i);
    return null;
  };
  let link = await visible();
  if (!link) {
    const menu = page.locator("header button[aria-expanded]").first();
    if (await menu.count()) {
      await menu.click();
      await page.waitForTimeout(400);
      link = await visible();
    }
  }
  assert.ok(link, "a visible contact link ([data-contact-link])");
  await page.evaluate(() => document.querySelectorAll("[data-test-opener]").forEach((el) => el.removeAttribute("data-test-opener")));
  await link.evaluate((el) => el.setAttribute("data-test-opener", ""));
  return link;
}

async function openDialog(page) {
  const link = await opener(page);
  await link.click();
  await opened(page);
  return link;
}

/** Waits for the dialog to be open and its open animation (if any) to finish. */
async function opened(page) {
  await dialog(page).waitFor({ state: "visible" });
  await page.waitForFunction((sel) => {
    const d = document.querySelector(sel);
    return d?.open && d.getAnimations({ subtree: false }).every((a) => a.playState !== "running");
  }, SELECTOR);
}

async function closed(page) {
  await dialog(page).waitFor({ state: "hidden" });
  // Focus is handed back once the close event has landed.
  await page.waitForFunction((sel) => !document.querySelector(sel)?.open, SELECTOR);
  await page.waitForTimeout(50);
}

/** The dialog and where focus is. */
const state = (page) =>
  page.evaluate((sel) => {
    const d = document.querySelector(sel);
    const a = document.activeElement;
    const box = d?.getBoundingClientRect();
    return {
      open: !!d?.open,
      modal: !!d?.matches(":modal"),
      focusInside: !!(d && a && d.contains(a)),
      active: a ? { tag: a.tagName, id: a.id, name: a.getAttribute("name"), text: (a.textContent ?? "").trim().slice(0, 40) } : null,
      // Focus went back to the opener (or, for a link inside a phone menu, to the menu's button).
      onOpener: !!a?.hasAttribute("data-test-opener") || (!!a?.closest("header") && a?.hasAttribute("aria-expanded")),
      box: box ? { x: box.x, y: box.y, width: box.width, height: box.height } : null,
      // The page's own area: the scrollbar's gutter stays reserved while the dialog is open (scrollbar-gutter: stable).
      viewport: { width: document.body.clientWidth, height: document.documentElement.clientHeight },
      url: location.href,
    };
  }, SELECTOR);

async function axe(page) {
  const result = await new AxeBuilder({ page }).withTags(AXE_TAGS).exclude("iframe").exclude("canvas").analyze();
  return result.violations.map((v) => `${v.id} (${v.impact}): ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
}

// ── Part 1: not configured → "Email me instead" in the pop-up ─────────────────────────────────────────────

if (PART === "fallback") {
  t.test("not configured: the pop-up shows “Email me instead” under its heading; focus on the heading; Esc returns focus", async () => {
    const { context, page } = await load("/");
    await openDialog(page);
    const fallback = dialog(page).locator("[data-contact-fallback]");
    assert.match(await fallback.innerText(), /email me instead/i);
    assert.equal(await fallback.locator(`a[href="mailto:${EMAIL}"]`).count(), 1, "mailto link");
    assert.equal(await dialog(page).locator("form").count(), 0, "no form in the pop-up");
    assert.ok(await dialog(page).getByRole("heading", { name: TITLE }).isVisible());
    const s = await state(page);
    assert.ok(s.modal, "opened with showModal");
    assert.ok(s.focusInside && s.active.id === "contact-dialog-title", `focus on the heading (${JSON.stringify(s.active)})`);
    assert.ok(s.box.height < 360 && Math.abs(s.box.y + s.box.height / 2 - s.viewport.height / 2) <= 2, `a centred panel that hugs its content (${JSON.stringify(s.box)})`);
    await page.keyboard.press("Escape");
    await closed(page);
    const after = await state(page);
    assert.ok(after.onOpener, `focus back on the opener (${JSON.stringify(after.active)})`);
    await context.close();
  });

  t.test("not configured: same fallback on a phone (full screen, opened in place on a project page)", async () => {
    const { context, page } = await load(PROJECT, MOBILE);
    await openDialog(page);
    assert.match(await dialog(page).locator("[data-contact-fallback]").innerText(), /email me instead/i);
    const s = await state(page);
    assert.ok(Math.abs(s.box.width - s.viewport.width) <= 1 && Math.abs(s.box.height - s.viewport.height) <= 1, `full screen (${JSON.stringify(s.box)})`);
    assert.equal(new URL(s.url).pathname, PROJECT, "opened in place");
    await context.close();
  });

  t.test("not configured: axe finds 0 violations with the pop-up open", async () => {
    for (const device of [DESKTOP, MOBILE]) {
      const { context, page } = await load("/", device);
      await openDialog(page);
      const violations = await axe(page);
      assert.deepEqual(violations, [], `@${device.viewport.width}: ${violations.join("\n      ")}`);
      await context.close();
    }
  });
}

// ── Part 2: configured → the form ─────────────────────────────────────────────────────────────────────────

if (PART === null) {
  t.test("desktop: opens in place on /, a modal dialog named “Let's talk”, focus in Name", async () => {
    const { context, page } = await load("/");
    const link = await opener(page);
    assert.equal(await link.getAttribute("href"), "/#contact");
    assert.equal(await link.getAttribute("aria-haspopup"), "dialog");
    await link.click();
    await opened(page);
    assert.equal(await dialog(page).count(), 1, "role=dialog with the accessible name “Let's talk”");
    assert.equal(await dialog(page).getAttribute("aria-labelledby"), "contact-dialog-title");
    assert.ok(await dialog(page).getByRole("heading", { name: TITLE }).isVisible(), "visible heading");
    const s = await state(page);
    assert.ok(s.modal, "showModal (aria-modal semantics, page inert)");
    assert.ok(s.focusInside && s.active.name === "name", `focus in the Name field (${JSON.stringify(s.active)})`);
    assert.equal(s.url, `${t.baseUrl}/`, "URL unchanged");
    assert.equal(await dialog(page).locator("form#contact-dialog-form").count(), 1, "the form, not the fallback");
    assert.equal(await dialog(page).locator("[data-contact-fallback]").count(), 0);
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY), "hidden", "the page behind doesn't scroll");
    const privacy = await dialog(page).getByText("Your message goes only to Nico and is used to reply.", { exact: true }).count();
    assert.equal(privacy, 1, "the privacy line");
    await context.close();
  });

  t.test("Tab and Shift+Tab stay inside (the page behind is inert)", async () => {
    const { context, page } = await load("/");
    await openDialog(page);
    for (const key of ["Tab", "Shift+Tab"]) {
      const seen = new Set();
      for (let i = 0; i < 14; i++) {
        await page.keyboard.press(key);
        const s = await state(page);
        assert.ok(s.focusInside || s.active?.tag === "BODY", `${key} ${i + 1}: focus left the dialog (${JSON.stringify(s.active)})`);
        if (s.focusInside) seen.add(`${s.active.tag}#${s.active.id}`);
      }
      assert.ok(seen.size >= 5, `${key} reaches the dialog's controls (${[...seen].join(", ")})`);
    }
    await context.close();
  });

  t.test("Esc, Close and the backdrop close it and focus returns to the opener", async () => {
    const { context, page } = await load("/");
    const link = await openDialog(page);
    await page.keyboard.press("Escape");
    await closed(page);
    let s = await state(page);
    assert.ok(s.onOpener, `Esc: focus on the opener (${JSON.stringify(s.active)})`);
    assert.notEqual(await page.evaluate(() => getComputedStyle(document.documentElement).overflowY), "hidden", "scrolling is back");
    await link.click();
    await opened(page);
    await dialog(page).getByRole("button", { name: "Close", exact: true }).first().click();
    await closed(page);
    s = await state(page);
    assert.ok(s.onOpener, `Close: focus on the opener (${JSON.stringify(s.active)})`);
    // Keyboard: Enter on the focused link reopens it.
    await page.keyboard.press("Enter");
    await opened(page);
    assert.ok((await state(page)).focusInside);
    // A text selection dragged out of a field onto the backdrop doesn't close it; a click on the backdrop does.
    const field = await page.locator("#cd-company").boundingBox();
    assert.ok(field, "the Company field");
    await page.mouse.move(field.x + 20, field.y + field.height / 2);
    await page.mouse.down();
    await page.mouse.move(40, 450, { steps: 5 });
    await page.mouse.up();
    assert.ok((await state(page)).open, "still open after a drag out to the backdrop");
    await page.mouse.click(40, 450);
    await closed(page);
    s = await state(page);
    assert.ok(s.onOpener, `backdrop: focus on the opener (${JSON.stringify(s.active)})`);
    await context.close();
  });

  t.test("typed text survives closing and reopening", async () => {
    const { context, page } = await load("/");
    const link = await openDialog(page);
    await page.locator("#cd-name").fill("Kept Name");
    await page.locator("#cd-message").fill("Kept message, long enough to count.");
    await page.keyboard.press("Escape");
    await closed(page);
    await link.click();
    await opened(page);
    assert.equal(await page.locator("#cd-name").inputValue(), "Kept Name");
    assert.equal(await page.locator("#cd-message").inputValue(), "Kept message, long enough to count.");
    await context.close();
  });

  t.test("on a project page it opens in place (URL unchanged) and the link records the page", async () => {
    const { context, page } = await load(PROJECT);
    const link = await opener(page);
    assert.equal(await link.getAttribute("href"), `/?from=${encodeURIComponent(PROJECT)}#contact`);
    await link.click();
    await opened(page);
    const s = await state(page);
    assert.equal(s.url, `${t.baseUrl}${PROJECT}`, "URL unchanged");
    assert.ok(s.focusInside, "focus inside");
    await page.keyboard.press("Escape");
    await closed(page);
    await context.close();
  });

  t.test("opens on the opener's inquiry type with its letter; a send from a project page reaches the webhook; Close gives a fresh form", async () => {
    const { context, page } = await load(PROJECT);
    const link = await opener(page);
    const inquiry = (await link.getAttribute("data-inquiry")) ?? "freelance";
    await link.click();
    await opened(page);
    const form = page.locator("#contact-dialog-form");
    const radio = form.getByRole("radio", { name: LABEL[inquiry] });
    const message = page.locator("#cd-message");
    assert.ok(await radio.isChecked(), `“${LABEL[inquiry]}” is preselected`);
    const letter = await message.inputValue();
    assert.match(letter, LETTER_START[inquiry], "the type's letter is in the message box");

    // The Name field has focus, which starts the form's signed clock.
    await page.waitForFunction(() => document.querySelector("#contact-dialog-form input[name=t]")?.value.length > 10, null, { timeout: 10_000 });
    await page.locator("#cd-name").fill("Dialog Visitor");
    await page.locator("#cd-email").fill("dialog@example.com");
    // A letter with nothing added is refused: add a detail.
    await message.fill(`${letter}\n\nA landing page and a lead dashboard.`);
    await sleep(WAIT_PAST_MIN_FILL);
    const before = hook.received.length;
    await form.locator("button[type=submit]").click();
    const start = Date.now();
    while (hook.received.length === before && Date.now() - start < 15_000) await sleep(100);
    const p = hook.received.at(-1);
    assert.equal(hook.received.length, before + 1, "one payload reached the webhook");
    assert.equal(p.page, PROJECT, "page = where the pop-up was opened");
    assert.equal(p.name, "Dialog Visitor");
    assert.equal(p.inquiryType, LABEL[inquiry]);

    // The thank-you panel, with focus on its text, and its own Close button.
    const sent = dialog(page).locator("[data-contact-sent]");
    await sent.waitFor({ state: "visible", timeout: 10_000 });
    assert.match(await sent.innerText(), /Thanks — your message is on its way\. Nico will reply to dialog@example\.com\./);
    assert.ok((await state(page)).focusInside, "focus stays in the dialog");
    await sent.getByRole("button", { name: "Close" }).click();
    await closed(page);
    assert.ok((await state(page)).onOpener, "focus back on the opener");

    // Reopened: a fresh form (the sent one was replaced while closed).
    await link.click();
    await opened(page);
    assert.equal(await dialog(page).locator("[data-contact-sent]").count(), 0, "no thank-you panel");
    assert.equal(await page.locator("#cd-name").inputValue(), "", "Name is empty");
    assert.equal(await message.inputValue(), letter, "the letter is back, untouched");
    assert.ok(await radio.isChecked(), "the type is preselected again");
    assert.equal((await form.locator("[role=status]").innerText()).trim(), "", "no status message");
    await context.close();
  });

  t.test("a different opener's inquiry type replaces an untouched letter, never the visitor's words", async () => {
    const { context, page } = await load("/");
    const types = await page.locator("a[data-contact-link]").evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("data-inquiry")))]);
    if (types.length < 2) {
      console.log(`    (skipped: the home page has contact links for ${types.length} inquiry type(s) only)`);
      await context.close();
      return;
    }
    const [first, second] = types;
    const openWith = async (type) => {
      const link = page.locator(`a[data-contact-link][data-inquiry="${type}"]`).first();
      await link.scrollIntoViewIfNeeded();
      await link.click();
      await opened(page);
    };
    await openWith(first);
    await page.keyboard.press("Escape");
    await closed(page);
    await openWith(second);
    assert.ok(await page.locator("#contact-dialog-form").getByRole("radio", { name: LABEL[second] }).isChecked(), `“${LABEL[second]}” is preselected`);
    assert.match(await page.locator("#cd-message").inputValue(), LETTER_START[second]);
    await page.locator("#cd-message").fill("My own words.");
    await page.keyboard.press("Escape");
    await closed(page);
    await openWith(first);
    assert.equal(await page.locator("#cd-message").inputValue(), "My own words.", "the visitor's words are kept");
    await context.close();
  });

  t.test("mobile 390: a full-screen dialog; Close returns focus", async () => {
    const { context, page } = await load("/", MOBILE);
    await openDialog(page);
    let s = await state(page);
    assert.ok(Math.abs(s.box.x) <= 1 && Math.abs(s.box.y) <= 1, `at the top left (${JSON.stringify(s.box)})`);
    assert.ok(Math.abs(s.box.width - s.viewport.width) <= 1 && Math.abs(s.box.height - s.viewport.height) <= 1, `full screen (${JSON.stringify(s.box)} vs ${JSON.stringify(s.viewport)})`);
    assert.ok(s.focusInside, `focus inside (${JSON.stringify(s.active)})`);
    assert.equal(s.url, `${t.baseUrl}/`, "URL unchanged");
    const scrollWidth = await page.evaluate((sel) => document.querySelector(sel).scrollWidth, SELECTOR);
    assert.ok(scrollWidth <= s.viewport.width + 1, `no sideways scroll inside the dialog (${scrollWidth})`);
    await dialog(page).getByRole("button", { name: "Close", exact: true }).first().tap();
    await closed(page);
    s = await state(page);
    assert.ok(s.onOpener, `focus returned (${JSON.stringify(s.active)})`);
    await context.close();
  });

  t.test("desktop: a centred panel narrower than the viewport", async () => {
    const { context, page } = await load("/");
    await openDialog(page);
    const { box, viewport } = await state(page);
    assert.ok(box.width < viewport.width - 100 && Math.abs(box.width - 672) <= 2, `about 42rem wide (${box.width})`);
    assert.ok(Math.abs(box.x + box.width / 2 - viewport.width / 2) <= 2, `centred horizontally (${JSON.stringify(box)})`);
    assert.ok(Math.abs(box.y + box.height / 2 - viewport.height / 2) <= 2, `centred vertically (${JSON.stringify(box)})`);
    assert.ok(box.height <= viewport.height * 0.9 + 1, `at most 90dvh tall (${box.height})`);
    await context.close();
  });

  t.test("touch targets in the dialog are at least 44px tall", async () => {
    const { context, page } = await load("/", MOBILE);
    await openDialog(page);
    const small = await page.evaluate((sel) => {
      const d = document.querySelector(sel);
      return [...d.querySelectorAll("button, input:not([type=hidden]):not([type=radio]):not([tabindex='-1']), textarea, label:has(input[type=radio])")]
        .map((el) => ({ el: `${el.tagName}#${el.id || el.textContent?.trim().slice(0, 20)}`, h: el.getBoundingClientRect().height }))
        .filter((x) => x.h > 0 && x.h < 44);
    }, SELECTOR);
    assert.deepEqual(small, [], JSON.stringify(small));
    await context.close();
  });

  t.test("ids stay unique on the home page with the pop-up open (two forms on the page)", async () => {
    const { context, page } = await load("/");
    await openDialog(page);
    const ids = await page.evaluate(() => [...document.querySelectorAll("[id]")].map((el) => el.id));
    const duplicates = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
    assert.deepEqual(duplicates, [], "no duplicate ids");
    assert.ok(ids.includes("contact-form") && ids.includes("contact-dialog-form"), "both forms are on the page");
    await context.close();
  });

  t.test("axe finds 0 violations with the pop-up open (1440 and 390, dark and light)", async () => {
    for (const device of [DESKTOP, MOBILE]) {
      for (const theme of ["dark", "light"]) {
        const { context, page } = await t.newPage(device);
        await page.addInitScript((value) => {
          try {
            localStorage.setItem("theme", value);
          } catch {}
        }, theme);
        await page.goto(`${t.baseUrl}/`, { waitUntil: "networkidle" });
        await openDialog(page);
        const violations = await axe(page);
        assert.deepEqual(violations, [], `@${device.viewport.width} ${theme}: ${violations.join("\n      ")}`);
        await context.close();
      }
    }
  });

  t.test("desktop: the wheel scrolls the dialog, not the page", async () => {
    // A shorter window, so the form overflows the panel.
    const { context, page } = await load("/", { viewport: { width: 1280, height: 640 } });
    await openDialog(page);
    const scroller = await page.evaluateHandle((sel) => [...document.querySelectorAll(`${sel} *`)].find((el) => getComputedStyle(el).overflowY === "auto"), SELECTOR);
    const room = await scroller.evaluate((el) => el.scrollHeight - el.clientHeight);
    assert.ok(room > 100, `the dialog's content overflows (${room}px)`);
    const startY = await page.evaluate(() => scrollY);
    const box = await dialog(page).boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.6);
    for (let i = 0; i < 3; i++) await page.mouse.wheel(0, 240);
    await page.waitForTimeout(800);
    const inside = await scroller.evaluate((el) => el.scrollTop);
    assert.ok(inside > 100, `the dialog scrolled (${inside}px)`);
    assert.equal(await page.evaluate(() => scrollY), startY, "the page didn't");
    // Over the backdrop: nothing moves.
    await page.mouse.move(30, 320);
    for (let i = 0; i < 3; i++) await page.mouse.wheel(0, 240);
    await page.waitForTimeout(800);
    assert.equal(await page.evaluate(() => scrollY), startY, "the page didn't scroll under the backdrop");
    await context.close();
  });

  t.test("motion: an open animation with motion on; none when reduced motion is requested", async () => {
    const animation = async (options) => {
      const { context, page } = await t.newPage({ ...DESKTOP, ...options });
      await page.goto(`${t.baseUrl}/`, { waitUntil: "networkidle" });
      const link = await opener(page);
      await link.click();
      await dialog(page).waitFor({ state: "visible" });
      const name = await dialog(page).evaluate((d) => getComputedStyle(d).animationName);
      await context.close();
      return name;
    };
    assert.match(await animation({}), /dialogIn/);
    assert.equal(await animation({ reducedMotion: "reduce" }), "none");
  });

  t.test("without JavaScript a contact link is a plain link to the Contact section", async () => {
    for (const [route, href] of [["/", "/#contact"], [PROJECT, `/?from=${encodeURIComponent(PROJECT)}#contact`]]) {
      const { context, page } = await load(route, { ...DESKTOP, javaScriptEnabled: false });
      const link = page.locator(`a[data-contact-link][href="${href}"]`).first();
      assert.equal(await link.count(), 1, `${route}: a contact link to ${href}`);
      assert.equal(await link.getAttribute("aria-haspopup"), null, "not announced as a pop-up without the script");
      await link.click();
      await page.waitForURL(`${t.baseUrl}${href}`);
      assert.equal(await page.locator("#contact").count(), 1, "lands on the Contact section");
      assert.equal(await page.locator(SELECTOR).count(), 0, "no pop-up");
      await context.close();
    }
  });
}

if (PART === null && fallbackExit !== 0) {
  t.test("part 1 (not configured) passed", async () => {
    assert.fail(`part 1 exited with ${fallbackExit} (see its output above)`);
  });
}

await t.run();
