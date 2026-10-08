import { CAP_DEPTH, keyboardBounds, keys } from "./keyboard-layout";
import { layerClass } from "./layer-styles";

/*
 * Static, theme-aware rendering of the same keyboard (server-rendered SVG, no JavaScript). Shown on phones, with
 * reduced motion, without WebGL and while the 3D scene loads. Decorative: the stack list is the accessible control.
 */

const S = 100;
const PAD = 0.45;
const SKIRT = 9;

export function KeyboardPoster() {
  const x0 = (keyboardBounds.minX - PAD) * S;
  const z0 = (keyboardBounds.minZ - PAD) * S;
  const w = (keyboardBounds.width + PAD * 2) * S;
  const d = (keyboardBounds.depth + PAD * 2) * S;

  return (
    <svg
      viewBox={`${x0 - 4} ${z0 - 4} ${w + 8} ${d + 26}`}
      className="h-auto max-h-full w-full font-mono md:[transform:perspective(1400px)_rotateX(22deg)]"
      aria-hidden="true"
      focusable="false"
    >
      {/* Deck */}
      <rect x={x0} y={z0 + 16} width={w} height={d} rx={30} style={{ fill: "var(--bg)" }} />
      <rect
        x={x0}
        y={z0}
        width={w}
        height={d}
        rx={30}
        strokeWidth={2}
        style={{ fill: "color-mix(in oklab, var(--surface) 72%, var(--bg))", stroke: "var(--line-strong)" }}
      />
      <rect
        x={x0 + PAD * S * 0.5}
        y={z0 + PAD * S * 0.5}
        width={w - PAD * S}
        height={d - PAD * S}
        rx={14}
        style={{ fill: "color-mix(in oklab, var(--bg) 80%, var(--surface))" }}
      />

      {keys.map((k) => {
        const cw = k.width * S;
        const cd = CAP_DEPTH * S;
        const cx = k.x * S;
        const cz = k.z * S;
        const left = cx - cw / 2;
        const top = cz - cd / 2;
        const fontSize = Math.min(24, (cw - 26) / (Math.max(k.legend.length, 2) * 0.62));
        return (
          <g key={k.id} className={layerClass(k.layer)}>
            <rect
              x={left}
              y={top + SKIRT}
              width={cw}
              height={cd}
              rx={12}
              style={{ fill: "color-mix(in oklab, var(--layer) 28%, var(--bg))" }}
            />
            <rect
              x={left}
              y={top}
              width={cw}
              height={cd}
              rx={12}
              style={{ fill: "color-mix(in oklab, var(--layer) 40%, var(--surface))" }}
            />
            <rect
              x={left + 8}
              y={top + 5}
              width={cw - 16}
              height={cd - 18}
              rx={9}
              style={{ fill: "color-mix(in oklab, var(--layer) 22%, var(--surface-2))" }}
            />
            <text
              x={cx}
              y={top + 5 + (cd - 18) / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fontSize}
              fontWeight={500}
              style={{ fill: "var(--text)" }}
            >
              {k.legend}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
