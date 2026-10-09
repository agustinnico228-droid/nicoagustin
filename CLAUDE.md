# CLAUDE.md: Nico Agustin portfolio

Project root: `C:\Users\Client\LPT\nicoagustin`. Run every command from here.
Read this file, `docs/PROGRESS.md` (where things stand), `docs/DECISIONS.md` (why) and `docs/INTAKE.md` (facts and open questions) before doing anything.
Next.js 16 has breaking changes: read the relevant guide in `node_modules/next/dist/docs/` before writing Next-specific code (async `params`, `proxy` instead of `middleware`, image `qualities` allow-list).

## Who and what
- **Nico Agustin**, Fullstack Web Developer (websites, CRMs/operations portals, reporting dashboards) who also does digital marketing (analytics, tracking, marketing data). Malolos, Bulacan, Philippines.
- **The site**: an original design, midnight navy with electric blue/cyan accents and a light theme. A WebGL "data skyline" in the hero (the only 3D besides the stack keyboard), an interactive React Three Fiber keycap keyboard of the stack, numbered case studies.

## Non-negotiable rules
- **Facts only.** Every fact lives in `lib/site.ts` or `content/projects.ts`. Unknown facts are left out (never placeholders) and listed in `docs/INTAKE.md`.
- **Never publish** Nico's phone number or street address (city only). The résumé generator reads the phone from his CV at run time for the private PDF only; it never enters the repo.
- **No customer or lead data** anywhere. The dashboard demos run on sample data and are labelled "Demo — sample data". The Sabbath portal walkthrough is shown only because it was recorded on the demo build with sample data (its title card says so); Nico asked for it on 2026-10-09. Never add a recording or screenshot of the live CRM (the app on port 3000 may show real customer data).
- **The reporting app's own brand** (from the dashboards' original files) never appears anywhere. "Agora Data Driven", Nico's employer, is fine. `pnpm check:push` enforces it.
- **Personal files** live in `C:\Users\Client\LPT\nicofiles\` (outside the repo, never committed). Teardowns of the reference sites live in `C:\Users\Client\LPT\nico-teardowns\` (outside the repo, never committed).
- **Ehjay Lorenzo's portfolio** (`C:\Users\Client\LPT\assets`) is read-and-copy only: never edit, build, commit or deploy anything there, and never touch the `ehjay-lorenzo` Vercel project.
- **Ehjay's creative work** (static ads, social videos, the campaign's ad images and videos) is not Nico's: not used. If the campaign ad is ever shown, caption it "Ad creative by Ehjay Lorenzo".

## Commands
- `pnpm dev` → http://localhost:3002 (port 3000 is used by another app). Double-click `run-local.bat` for a full local build + start.
- Builds on this PC: `CIRCLE_NODE_TOTAL=3 pnpm build` (little free memory).
- `pnpm check:push` before every push (blocks .env files, files > 50 MB, phones, street addresses, Apps Script URLs, secrets, the banned brand).
- `pnpm resume` rebuilds `public/resume.pdf` and the private `nicofiles\nico-agustin-resume-full.pdf` (+ PNG previews). Set `SITE_URL` to the live URL.
- QA: `BASE_URL=<url> pnpm screens` (layouts at 320–1920, console/overflow/requests), `pnpm a11y` (axe, both themes), `pnpm lighthouse`.
- Git Bash: prefix commands that take "/route" arguments with `MSYS_NO_PATHCONV=1`.

## Deploy
- GitHub: https://github.com/agustinnico228-droid/nicoagustin (account agustinnico228-droid).
- Vercel: project `nicoagustin` (scope agustinnico228-2616), linked from this folder. `npx vercel@latest deploy --prod`. `ENABLE_EXPERIMENTAL_COREPACK=1` is set in the project (pnpm 12 pinned).
- Contact form env vars (Vercel + `.env.local`, never committed): `CONTACT_SECRET`, `CONTACT_WEBHOOK_URL`. Setup: `docs/CONTACT-SETUP.md`.
