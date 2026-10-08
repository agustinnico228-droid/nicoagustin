import type { ReactNode } from "react";

/*
 * A small, original flow-diagram renderer (inline SVG, server-rendered, no JS).
 * One spec draws two SVGs: a horizontal one for wide screens and a vertical stack for phones and tablets.
 * Colours come from the theme (Tailwind fill-/stroke- utilities over the CSS variables), so both themes work.
 * The hidden SVG is display:none, so assistive tech meets one role="img" with a label, plus an ordered text list.
 */

export type FlowBox = {
  title: string;
  items?: string[];
  /** "accent" outlines the box in electric blue (the part Nico built). */
  tone?: "accent" | "plain";
};

export type FlowStage = { boxes: FlowBox[] };

export type FlowSpec = {
  /** Accessible name of the diagram (role="img"). */
  label: string;
  stages: FlowStage[];
  /** A return arrow, e.g. the dashboard's Sync button asking the server to refresh. */
  feedback?: { from: number; to: number; label: string };
  /** The same flow as plain steps, read by screen readers. */
  steps: string[];
  /** A visible note under the diagram. */
  note?: string;
};

type Orientation = "h" | "v";

type Metrics = {
  titleSize: number;
  titleLine: number;
  itemSize: number;
  itemLine: number;
  padX: number;
  padY: number;
};

const METRICS: Record<Orientation, Metrics> = {
  h: { titleSize: 15, titleLine: 19, itemSize: 12.5, itemLine: 18, padX: 14, padY: 14 },
  v: { titleSize: 14, titleLine: 18, itemSize: 12.5, itemLine: 17, padX: 12, padY: 12 },
};

/** Greedy word wrap by an approximate character budget (SVG text doesn't wrap by itself). */
function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

type LaidBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  box: FlowBox;
  titleLines: string[];
  itemLines: string[][];
};

function measure(box: FlowBox, w: number, m: Metrics): { h: number; titleLines: string[]; itemLines: string[][] } {
  const inner = w - m.padX * 2;
  const titleLines = wrap(box.title, Math.max(8, Math.floor(inner / (m.titleSize * 0.58))));
  const itemLines = (box.items ?? []).map((it) => wrap(it, Math.max(8, Math.floor(inner / (m.itemSize * 0.53)) - 2)));
  const itemCount = itemLines.reduce((n, l) => n + l.length, 0);
  const h = m.padY * 2 + titleLines.length * m.titleLine + (itemCount ? 10 + itemCount * m.itemLine : 0);
  return { h, titleLines, itemLines };
}

function Arrowhead({ x, y, dir, className }: { x: number; y: number; dir: "right" | "down" | "up" | "left"; className: string }) {
  const s = 6;
  const pts =
    dir === "right"
      ? `${x},${y} ${x - s * 1.4},${y - s} ${x - s * 1.4},${y + s}`
      : dir === "left"
        ? `${x},${y} ${x + s * 1.4},${y - s} ${x + s * 1.4},${y + s}`
        : dir === "down"
          ? `${x},${y} ${x - s},${y - s * 1.4} ${x + s},${y - s * 1.4}`
          : `${x},${y} ${x - s},${y + s * 1.4} ${x + s},${y + s * 1.4}`;
  return <polygon points={pts} className={className} />;
}

function BoxShape({ lb, m }: { lb: LaidBox; m: Metrics }) {
  const { x, y, w, h, box, titleLines, itemLines } = lb;
  const accent = box.tone === "accent";
  const titleTop = y + m.padY + m.titleSize * 0.85;
  const itemsTop = y + m.padY + titleLines.length * m.titleLine + 10;
  let line = 0;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={10}
        className={accent ? "fill-surface stroke-accent" : "fill-surface stroke-line-strong"}
        strokeWidth={accent ? 1.5 : 1}
      />
      {titleLines.map((t, i) => (
        <text key={i} x={x + m.padX} y={titleTop + i * m.titleLine} fontSize={m.titleSize} fontWeight={600} className="fill-text font-display">
          {t}
        </text>
      ))}
      {itemLines.length > 0 && (
        <line x1={x + m.padX} x2={x + w - m.padX} y1={itemsTop - 4} y2={itemsTop - 4} className="stroke-line" strokeWidth={1} />
      )}
      {itemLines.map((lines, i) =>
        lines.map((t, j) => {
          const yy = itemsTop + (line + 1) * m.itemLine - 4;
          line += 1;
          return (
            <text key={`${i}-${j}`} x={x + m.padX + (j === 0 ? 0 : 10)} y={yy} fontSize={m.itemSize} className="fill-text-2 font-sans">
              {j === 0 ? `· ${t}` : t}
            </text>
          );
        }),
      )}
    </g>
  );
}

function layoutHorizontal(spec: FlowSpec) {
  const m = METRICS.h;
  const W = 1000;
  const pad = 20;
  const gap = 64;
  const n = spec.stages.length;
  const cw = Math.min(250, (W - pad * 2 - gap * (n - 1)) / n);
  const used = cw * n + gap * (n - 1);
  const x0 = (W - used) / 2;
  const vGap = 16;

  const measured = spec.stages.map((s) => s.boxes.map((b) => ({ box: b, ...measure(b, cw, m) })));
  const stageH = measured.map((boxes) => boxes.reduce((sum, b) => sum + b.h, 0) + vGap * Math.max(0, boxes.length - 1));
  const maxH = Math.max(...stageH);
  const top = pad;
  const centerY = top + maxH / 2;

  const laid: LaidBox[][] = measured.map((boxes, si) => {
    const x = x0 + si * (cw + gap);
    let y = centerY - (stageH[si] ?? 0) / 2;
    return boxes.map((b) => {
      const lb: LaidBox = { x, y, w: cw, h: b.h, box: b.box, titleLines: b.titleLines, itemLines: b.itemLines };
      y += b.h + vGap;
      return lb;
    });
  });

  const fb = spec.feedback;
  const laneY = top + maxH + 34;
  const H = fb ? laneY + 40 : top + maxH + pad;

  const connectors: ReactNode[] = [];
  for (let i = 0; i < laid.length - 1; i++) {
    const from = laid[i] ?? [];
    const to = laid[i + 1] ?? [];
    const firstFrom = from[0];
    const firstTo = to[0];
    if (!firstFrom || !firstTo) continue;
    const jx = firstFrom.x + cw + gap / 2;
    const ys = [...from, ...to].map((b) => b.y + b.h / 2);
    connectors.push(
      <g key={`c${i}`}>
        {from.map((b, k) => (
          <line key={`f${k}`} x1={b.x + b.w} x2={jx} y1={b.y + b.h / 2} y2={b.y + b.h / 2} className="stroke-accent" strokeWidth={1.5} />
        ))}
        <line x1={jx} x2={jx} y1={Math.min(...ys)} y2={Math.max(...ys)} className="stroke-accent" strokeWidth={1.5} />
        {to.map((b, k) => (
          <g key={`t${k}`}>
            <line x1={jx} x2={b.x - 2} y1={b.y + b.h / 2} y2={b.y + b.h / 2} className="stroke-accent" strokeWidth={1.5} />
            <Arrowhead x={b.x - 1} y={b.y + b.h / 2} dir="right" className="fill-accent" />
          </g>
        ))}
      </g>,
    );
  }

  let feedback: ReactNode = null;
  if (fb) {
    const fromStage = laid[fb.from] ?? [];
    const toStage = laid[fb.to] ?? [];
    const f0 = fromStage[0];
    const t0 = toStage[0];
    if (f0 && t0) {
      const fx = f0.x + cw / 2;
      const tx = t0.x + cw / 2;
      const fBottom = Math.max(...fromStage.map((b) => b.y + b.h));
      const tBottom = Math.max(...toStage.map((b) => b.y + b.h));
      feedback = (
        <g>
          <path
            d={`M ${fx} ${fBottom} V ${laneY} H ${tx} V ${tBottom + 3}`}
            fill="none"
            className="stroke-accent-2"
            strokeWidth={1.5}
            strokeDasharray="5 5"
          />
          <Arrowhead x={tx} y={tBottom + 1} dir="up" className="fill-accent-2" />
          <text x={(fx + tx) / 2} y={laneY + 22} textAnchor="middle" fontSize={12.5} className="fill-accent-2 font-mono">
            {fb.label}
          </text>
        </g>
      );
    }
  }

  return { W, H, laid, connectors, feedback, m };
}

function layoutVertical(spec: FlowSpec) {
  const m = METRICS.v;
  const W = 340;
  const pad = 10;
  const lane = spec.feedback ? 30 : 0;
  const contentW = W - pad * 2 - lane;
  const hGap = 10;
  const gap = 44;

  let y = pad;
  const laid: LaidBox[][] = spec.stages.map((s) => {
    const k = s.boxes.length;
    const bw = (contentW - hGap * (k - 1)) / k;
    const measured = s.boxes.map((b) => ({ box: b, ...measure(b, bw, m) }));
    const rowH = Math.max(...measured.map((b) => b.h));
    const row = measured.map((b, i) => ({
      x: pad + i * (bw + hGap),
      y,
      w: bw,
      h: rowH,
      box: b.box,
      titleLines: b.titleLines,
      itemLines: b.itemLines,
    }));
    y += rowH + gap;
    return row;
  });
  const H = y - gap + pad;

  const connectors: ReactNode[] = [];
  for (let i = 0; i < laid.length - 1; i++) {
    const from = laid[i] ?? [];
    const to = laid[i + 1] ?? [];
    const firstFrom = from[0];
    const firstTo = to[0];
    if (!firstFrom || !firstTo) continue;
    const jy = firstFrom.y + firstFrom.h + gap / 2;
    const xs = [...from, ...to].map((b) => b.x + b.w / 2);
    connectors.push(
      <g key={`c${i}`}>
        {from.map((b, k) => (
          <line key={`f${k}`} x1={b.x + b.w / 2} x2={b.x + b.w / 2} y1={b.y + b.h} y2={jy} className="stroke-accent" strokeWidth={1.5} />
        ))}
        <line x1={Math.min(...xs)} x2={Math.max(...xs)} y1={jy} y2={jy} className="stroke-accent" strokeWidth={1.5} />
        {to.map((b, k) => (
          <g key={`t${k}`}>
            <line x1={b.x + b.w / 2} x2={b.x + b.w / 2} y1={jy} y2={b.y - 2} className="stroke-accent" strokeWidth={1.5} />
            <Arrowhead x={b.x + b.w / 2} y={b.y - 1} dir="down" className="fill-accent" />
          </g>
        ))}
      </g>,
    );
  }

  let feedback: ReactNode = null;
  const fb = spec.feedback;
  if (fb) {
    const fromStage = laid[fb.from] ?? [];
    const toStage = laid[fb.to] ?? [];
    const fLast = fromStage[fromStage.length - 1];
    const tLast = toStage[toStage.length - 1];
    if (fLast && tLast) {
      const laneX = W - pad - 12;
      const fy = fLast.y + fLast.h / 2;
      const ty = tLast.y + tLast.h / 2;
      const fRight = fLast.x + fLast.w;
      const tRight = tLast.x + tLast.w;
      feedback = (
        <g>
          <path
            d={`M ${fRight} ${fy} H ${laneX} V ${ty} H ${tRight + 3}`}
            fill="none"
            className="stroke-accent-2"
            strokeWidth={1.5}
            strokeDasharray="5 5"
          />
          <Arrowhead x={tRight + 1} y={ty} dir="left" className="fill-accent-2" />
          <text
            x={laneX + 14}
            y={(fy + ty) / 2}
            textAnchor="middle"
            fontSize={11}
            transform={`rotate(-90 ${laneX + 14} ${(fy + ty) / 2})`}
            className="fill-accent-2 font-mono"
          >
            {fb.label}
          </text>
        </g>
      );
    }
  }

  return { W, H, laid, connectors, feedback, m };
}

function FlowSvg({ spec, orientation, className }: { spec: FlowSpec; orientation: Orientation; className: string }) {
  const { W, H, laid, connectors, feedback, m } = orientation === "h" ? layoutHorizontal(spec) : layoutVertical(spec);
  return (
    <svg
      viewBox={`0 0 ${W} ${Math.ceil(H)}`}
      role="img"
      aria-label={spec.label}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {connectors}
      {feedback}
      {laid.flat().map((lb, i) => (
        <BoxShape key={i} lb={lb} m={m} />
      ))}
    </svg>
  );
}

export function Flow({ spec }: { spec: FlowSpec }) {
  return (
    <figure className="rounded-2xl border border-line bg-bg-2 bg-grid p-4 sm:p-6">
      <FlowSvg spec={spec} orientation="h" className="hidden h-auto w-full lg:block" />
      <FlowSvg spec={spec} orientation="v" className="mx-auto block h-auto w-full max-w-[26rem] lg:hidden" />
      <ol className="sr-only">
        {spec.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      {spec.note && (
        <figcaption className="mt-4 font-mono text-xs uppercase tracking-[0.14em] text-muted">{spec.note}</figcaption>
      )}
    </figure>
  );
}
