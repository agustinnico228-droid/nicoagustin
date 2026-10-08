/*
 * Static stand-in for the WebGL skyline: an isometric field of bars with a soft glow, drawn once on the server.
 * Theme-aware through CSS variables. Shown on phones, under reduced motion, without JS, and until the canvas is ready.
 */

const COLS = 10;
const ROWS = 6;
const U = 30; // px per grid unit
const S = 0.56; // bar footprint (grid units)
const COS30 = Math.cos(Math.PI / 6);

type Bar = { key: string; band: 0 | 1 | 2; top: string; left: string; right: string };

function project(x: number, y: number, z: number): [number, number] {
  return [(x - z) * COS30 * U, (x + z) * 0.5 * U - y * U];
}

function poly(points: [number, number, number][]): string {
  return (
    points
      .map(([x, y, z], i) => {
        const [px, py] = project(x, y, z);
        return `${i === 0 ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`;
      })
      .join("") + "Z"
  );
}

function height(i: number, j: number): number {
  // A deterministic "chart" surface, similar to the live scene's wave.
  const a = 0.5 + 0.5 * Math.sin(i * 0.62 + 0.4);
  const b = 0.6 + 0.4 * Math.sin(j * 0.9 - 0.8);
  const c = 0.5 * Math.sin((i + j) * 0.45 + 1.2);
  return Math.max(0.25, 0.5 + 3.2 * a * b + c);
}

function buildBars(): { bars: Bar[]; viewBox: string } {
  const cells: { i: number; j: number }[] = [];
  for (let i = 0; i < COLS; i++) for (let j = 0; j < ROWS; j++) cells.push({ i, j });
  // Painter's order: back (small i + j) first.
  cells.sort((p, q) => p.i + p.j - (q.i + q.j));

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  const bars: Bar[] = cells.map(({ i, j }) => {
    const h = height(i, j);
    const x0 = i + (1 - S) / 2;
    const x1 = x0 + S;
    const z0 = j + (1 - S) / 2;
    const z1 = z0 + S;
    for (const [x, y, z] of [
      [x0, h, z0],
      [x1, 0, z0],
      [x0, 0, z1],
      [x1, 0, z1],
    ] as [number, number, number][]) {
      const [px, py] = project(x, y, z);
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    }
    return {
      key: `${i}-${j}`,
      band: h > 3 ? 2 : h > 1.7 ? 1 : 0,
      top: poly([
        [x0, h, z0],
        [x1, h, z0],
        [x1, h, z1],
        [x0, h, z1],
      ]),
      left: poly([
        [x0, 0, z1],
        [x1, 0, z1],
        [x1, h, z1],
        [x0, h, z1],
      ]),
      right: poly([
        [x1, 0, z0],
        [x1, 0, z1],
        [x1, h, z1],
        [x1, h, z0],
      ]),
    };
  });
  const pad = 40;
  const viewBox = `${(minX - pad).toFixed(0)} ${(minY - pad).toFixed(0)} ${(maxX - minX + pad * 2).toFixed(0)} ${(
    maxY -
    minY +
    pad * 2
  ).toFixed(0)}`;
  return { bars, viewBox };
}

const { bars, viewBox } = buildBars();
const [glowX, glowY] = project(COLS / 2, 0, ROWS / 2);
const bandFill = ["var(--surface-2)", "var(--accent)", "var(--accent-2)"] as const;

export function HeroPoster({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
      className={`h-full w-full ${className}`}
    >
      <defs>
        <radialGradient id="hero-poster-glow" cx="50%" cy="55%" r="50%">
          <stop offset="0" style={{ stopColor: "var(--accent-2)", stopOpacity: 0.28 }} />
          <stop offset="1" style={{ stopColor: "var(--accent-2)", stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <ellipse cx={glowX.toFixed(0)} cy={glowY.toFixed(0)} rx={U * 9} ry={U * 5} fill="url(#hero-poster-glow)" />
      {bars.map((b) => (
        <g key={b.key} style={{ fill: bandFill[b.band] }}>
          <path d={b.right} fillOpacity={0.45} />
          <path d={b.left} fillOpacity={0.7} />
          <path d={b.top} />
        </g>
      ))}
    </svg>
  );
}
