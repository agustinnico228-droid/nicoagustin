# Nico Agustin · Portfolio

Personal portfolio of **Nico Agustin**, fullstack web developer in Malolos, Bulacan, Philippines: websites, CRMs and operations portals, reporting dashboards, and the marketing data behind them.

## Stack
- Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS 4
- three.js + React Three Fiber + drei: the hero's "data skyline" and the interactive keycap keyboard of the stack (both lazy-loaded after first paint; phones and reduced motion get static posters)
- GSAP + Lenis for motion (prefers-reduced-motion respected)
- Contact form: a server action posting to a Google Apps Script web app (see `docs/CONTACT-SETUP.md`)

## Run it
```bash
pnpm install
pnpm dev            # http://localhost:3002
```
On Windows, double-click `run-local.bat` to build and start the site.

| Script | What it does |
|---|---|
| `pnpm build` | Production build (`CIRCLE_NODE_TOTAL=3 pnpm build` on low-memory machines) |
| `pnpm check:push` | Pre-push privacy and secrets check (run before every push) |
| `pnpm resume` | Rebuilds `public/resume.pdf` from the site's data |
| `pnpm screens` / `pnpm a11y` / `pnpm lighthouse` | Layout, accessibility and performance checks (Playwright, axe, Lighthouse) |

## Content
All facts live in `lib/site.ts` and `content/projects.ts`. The dashboard demos under `public/demos/` run on **sample data** and are labelled "Demo — sample data".

## Credits
Inspired by the work of Tajmirul Islam, Hamish Williams and Naresh Khatri. No code, copy, images, 3D files or fonts from their sites are used; see `THIRD_PARTY_NOTICES.md`.
