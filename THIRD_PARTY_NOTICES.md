# Third-party notices

This site is Nico Agustin's own work. It is built with the open-source software and fonts below, under their licences.

## Fonts
All three are licensed under the **SIL Open Font License 1.1** and are self-hosted at build time by `next/font`
(no requests to Google Fonts when the site runs).

| Font | Use | Licence |
|---|---|---|
| Sora | headings, the name | SIL Open Font License 1.1 |
| DM Sans | body text | SIL Open Font License 1.1 |
| IBM Plex Mono | labels, eyebrows, keycap legends | SIL Open Font License 1.1 |

## Libraries
| Library | Licence |
|---|---|
| Next.js | MIT |
| React, React DOM | MIT |
| three.js | MIT |
| React Three Fiber (`@react-three/fiber`) | MIT |
| drei (`@react-three/drei`) | MIT |
| GSAP (`gsap`, `@gsap/react`, including ScrollTrigger) | GSAP standard "no charge" licence (https://gsap.com/standard-license) |
| Lenis | MIT |
| Zod | MIT |

Development-only tools (not shipped to visitors): TypeScript (Apache-2.0), Tailwind CSS (MIT), ESLint (MIT),
Playwright (Apache-2.0), axe-core and `@axe-core/playwright` (MPL-2.0), Lighthouse (Apache-2.0), sharp (Apache-2.0).
The full licence text of each package ships in its folder under `node_modules/`.

## Design references
The design takes general patterns from three public portfolios. **No code, copy, images, 3D files or fonts from these
sites are used — patterns only.**

| Site | Patterns referenced | Source and licence |
|---|---|---|
| tajmirul.site | oversized display type, a real-number stat strip, project rows with a hover image preview, a sticky email rail, GSAP + Lenis motion | Tajmirul/portfolio-2.0, MIT, "Copyright (c) 2025 Tajmirul Islam" |
| hamishw.com | a WebGL hero, rotating role text, numbered case studies, accessible motion, light and dark themes | HamishMW/portfolio, MIT, "Copyright (c) 2020 Hamish Williams" |
| nareshkhatri.dev | an interactive 3D skills keyboard | Naresh-Khatri/3d-portfolio, no licence file (so nothing from it is copied) |

## Contact system
The contact form, its "Let's talk" pop-up, the Google Apps Script mailer and their tests are adapted from Ehjay Lorenzo's
portfolio, with the permission of the workspace owner.
