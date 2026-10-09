// Pre-renders the hero's static skyline poster (shown on phones, under reduced motion and before the 3D loads)
// as two small SVG files, one per theme. Usage: node scripts/hero-poster.mjs
// Colours mirror the --surface-2 / --accent / --accent-2 tokens in app/globals.css: change them together.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const out = (name) => fileURLToPath(new URL(`../public/media/hero-poster-${name}.svg`, import.meta.url));
const COLS = 10, ROWS = 6, U = 30, S = 0.56, COS30 = Math.cos(Math.PI / 6);
const project = (x, y, z) => [(x - z) * COS30 * U, (x + z) * 0.5 * U - y * U];
const poly = (pts) => pts.map(([x, y, z], i) => { const [px, py] = project(x, y, z); return `${i === 0 ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`; }).join("") + "Z";
const height = (i, j) => { const a = 0.5 + 0.5 * Math.sin(i * 0.62 + 0.4); const b = 0.6 + 0.4 * Math.sin(j * 0.9 - 0.8); const c = 0.5 * Math.sin((i + j) * 0.45 + 1.2); return Math.max(0.25, 0.5 + 3.2 * a * b + c); };
const cells = []; for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) cells.push({ i, j });
cells.sort((p, q) => p.i + p.j - (q.i + q.j));
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
const bars = cells.map(({ i, j }) => {
  const h = height(i, j); const x0 = i + (1 - S) / 2, x1 = x0 + S, z0 = j + (1 - S) / 2, z1 = z0 + S;
  for (const [x, y, z] of [[x0, h, z0], [x1, 0, z0], [x0, 0, z1], [x1, 0, z1]]) { const [px, py] = project(x, y, z); minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py); }
  return { band: h > 3 ? 2 : h > 1.7 ? 1 : 0,
    top: poly([[x0, h, z0], [x1, h, z0], [x1, h, z1], [x0, h, z1]]),
    left: poly([[x0, 0, z1], [x1, 0, z1], [x1, h, z1], [x0, h, z1]]),
    right: poly([[x1, 0, z0], [x1, 0, z1], [x1, h, z1], [x1, h, z0]]) };
});
const pad = 40;
const vb = [(minX - pad).toFixed(0), (minY - pad).toFixed(0), (maxX - minX + pad * 2).toFixed(0), (maxY - minY + pad * 2).toFixed(0)];
const [gx, gy] = project(COLS / 2, 0, ROWS / 2);
// Resolved from the --surface-2 / --accent / --accent-2 tokens in app/globals.css.
const themes = { dark: ["#11204a", "#4d8dff", "#2ee6ff"], light: ["#e3eafb", "#1d4ed8", "#0e7490"] };
for (const [name, fills] of Object.entries(themes)) {
  const body = bars.map((b) => `<g fill="${fills[b.band]}"><path d="${b.right}" fill-opacity=".45"/><path d="${b.left}" fill-opacity=".7"/><path d="${b.top}"/></g>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(" ")}" width="${vb[2]}" height="${vb[3]}"><defs><radialGradient id="g" cx="50%" cy="55%" r="50%"><stop offset="0" stop-color="${fills[2]}" stop-opacity=".28"/><stop offset="1" stop-color="${fills[2]}" stop-opacity="0"/></radialGradient></defs><ellipse cx="${gx.toFixed(0)}" cy="${gy.toFixed(0)}" rx="${U * 9}" ry="${U * 5}" fill="url(#g)"/>${body}</svg>\n`;
  writeFileSync(out(name), svg);
  console.log(name, svg.length, vb.join(" "));
}
