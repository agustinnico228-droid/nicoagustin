# DECISIONS

A log of design and engineering decisions, newest at the bottom.

## 2026-10-09: the first build (deadline 05:00 PH time)

### Sources and facts
- **Facts** come from Nico's brief, his CVs and LinkedIn export (`nicofiles\resume\`, outside the repo) and the certificate images (`nicofiles\certificates\`). Every certificate's name, date and verify link was checked against its image; all six images are issued to "Nico Agustin". The Microsoft Office Specialist Excel certification has no image or link, so its card shows no date and no Verify link.
- **Name:** "Nico Agustin" on the site and résumé (brief). "Nicole T. Agustin" appears on his old CVs only; it is not published (open question in INTAKE).
- **LinkedIn URL:** LinkedIn's own PDF export prints `linkedin.com/in/nico-agustin-02a64b2b1` (the line breaks after "nico-"), while the brief wrote it without that hyphen. The site uses the export's version until Nico confirms (INTAKE).
- **Projects reused from Ehjay Lorenzo's portfolio** (read-and-copy only): the five sample-data dashboard demos (`public/demos/**`, unchanged, with the `/demos` headers), the Sabbath portal screenshots (ledger already blurred) and the four website recordings + posters. The privacy rules from Ehjay's `docs/ASSETS.md` and `docs/DECISIONS.md` carry over unchanged: no customer or lead data; demos stay on sample data and say "Demo — sample data"; the Sabbath CRM walkthrough video stays out. Ehjay's creative work (static ads, social videos, the campaign's ad images and videos) is not used.
- **Campaign:** the Rooming House Expert lead campaign's real, client-approved results (1 Aug – 1 Sep 2026) are shown as a KPI dashboard card. Nico's part in it was left blank in the brief, so the role is hidden and listed in INTAKE. The ad creative is not shown; the case study credits "Ad creative by Ehjay Lorenzo".
- **Omdena:** facts from the certificate only; an original architecture diagram (voice → speech/NLP → agents → public-service actions) instead of media.

### Design
- **Reference teardowns** (bo-teardown, one subagent each) are in `C:\Users\Client\LPT\nico-teardowns\` (outside the repo). Licences: Tajmirul/portfolio-2.0 MIT; HamishMW/portfolio MIT; Naresh-Khatri/3d-portfolio has no licence file (treated as all rights reserved). **No code, copy, images, 3D files or fonts from any of them are used**: patterns only. The footer credits all three anyway ("Inspired by the work of …"); `THIRD_PARTY_NOTICES.md` records the licences.
- **bo-rebuild was not used** (the brief forbids cloning); one original design blends: oversized name, real-number stat strip, dual CTAs, layered stack, hover-preview rows, email rail, GSAP + Lenis, no preloader (tajmirul); WebGL hero, rotating role, numbered case studies, accessible motion, light/dark (hamishw); an interactive 3D keyboard of the stack (nareshkhatri, rebuilt from scratch in React Three Fiber, no Spline).
- **The frontend-design skill isn't available in this environment**; the visual direction was set here and in the build briefs.
- **Clearly different from Ehjay's site:** midnight navy + electric blue/cyan (not lime on black), Sora / DM Sans / IBM Plex Mono (not his fonts, and not the references' fonts either), no split hero, no command palette.
- **Hero 3D:** an instanced "data skyline" (bars moving like live chart data), lazy-loaded after first paint and idle, only on ≥ 768px with motion allowed and WebGL available; otherwise a static SVG poster. The name (`<h1>`) is plain server HTML and the LCP element.
- **Keyboard:** rows are the stack layers (frontend, backend + database, data & integrations, tools). Pressing a key (or a button in the plain list) selects a tech in a tiny shared store (`lib/tech-store.ts`); the Used-in panel lists the projects, and the Selected work rows highlight them. Legends are drawn on a CanvasTexture (no network fonts). Phones and reduced motion get a static poster; the plain list is the accessible control everywhere.
- **Theme:** dark by default, light on request, stored in `localStorage` and applied before paint by a tiny inline script (no flash). Without JavaScript the site is dark and fully readable; reveal animations only hide content when JS runs.

### Engineering
- Next.js 16.3.8, React 19.2.8, TypeScript 6.0.3, Tailwind CSS 4, pnpm 12.9.1: Ehjay's versions. Added (approved): three, @react-three/fiber, @react-three/drei, gsap, @gsap/react, lenis; dev: playwright, @axe-core/playwright, lighthouse, sharp. zod is used only on the server (contact action), so it doesn't ship to visitors. No MDX/content-collections: case studies are typed data in `content/projects.ts`.
- **Security headers** (all routes except `/demos/*`): CSP same-origin only (`'unsafe-inline'` scripts are needed for Next's inline bootstrap on a static site without per-request nonces), `frame-ancestors 'self'`, X-Frame-Options SAMEORIGIN, nosniff, strict Referrer-Policy, Permissions-Policy, HSTS, COOP. The demos keep their own headers (noindex + ACAO for their fonts in the sandboxed iframe).
- **Memory:** this PC has under 0.5 GB free. Builds use `CIRCLE_NODE_TOTAL=3`; the build agents were told not to run builds or type checks in parallel.
- **Vercel:** new project `nicoagustin` (scope agustinnico228-2616) created with `vercel link --project nicoagustin`; `ENABLE_EXPERIMENTAL_COREPACK=1` set for Production and Preview. The `ehjay-lorenzo` project is untouched.
