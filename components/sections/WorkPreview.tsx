import Image from "next/image";
import type { WorkItem } from "./WorkList";

/*
 * What a Selected work row shows as its picture: the cover image, or (for projects without one) an original
 * stand-in: the campaign's headline numbers, or a small diagram of the Omdena prototype's flow.
 * Always decorative here (the row's link is named by the project title), so images use an empty alt.
 */

type Variant = "card" | "thumb";

export function PreviewMedia({ item, variant, sizes }: { item: WorkItem; variant: Variant; sizes: string }) {
  if (item.cover) {
    return (
      <Image
        src={item.cover.src}
        width={item.cover.width}
        height={item.cover.height}
        alt=""
        quality={82}
        sizes={sizes}
        loading="lazy"
        className="h-full w-full object-cover object-top"
      />
    );
  }
  if (item.kpis && item.kpis.length > 0) {
    return <KpiTile kpis={item.kpis} period={item.kpiPeriod} variant={variant} />;
  }
  return <FlowDiagram variant={variant} />;
}

function KpiTile({ kpis, period, variant }: { kpis: { label: string; value: string }[]; period?: string; variant: Variant }) {
  const first = kpis[0];
  const rest = kpis.slice(1, 2);
  if (!first) return null;
  if (variant === "thumb") {
    return (
      <div className="bg-grid flex h-full w-full flex-col items-center justify-center bg-bg-2 text-center">
        <span className="font-display text-lg font-bold leading-none text-accent-2 sm:text-xl">{first.value}</span>
        <span className="mt-1 font-mono text-[0.6rem] uppercase tracking-wider text-text-2">{first.label}</span>
      </div>
    );
  }
  return (
    <div className="bg-grid flex h-full w-full flex-col justify-between bg-bg-2 p-6">
      <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-text-2">Campaign results{period ? ` · ${period}` : ""}</span>
      <div className="flex items-end gap-8">
        <div>
          <p className="font-display text-6xl font-bold leading-none tracking-tight text-accent-2">{first.value}</p>
          <p className="mt-2 font-mono text-xs uppercase tracking-wider text-text-2">{first.label}</p>
        </div>
        {rest.map((k) => (
          <div key={k.label}>
            <p className="font-display text-2xl font-semibold leading-none text-text">{k.value}</p>
            <p className="mt-2 font-mono text-xs uppercase tracking-wider text-text-2">{k.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const NODES = [
  { x: 52, label: "Voice" },
  { x: 152, label: "NLP" },
  { x: 252, label: "Agents" },
  { x: 352, label: "Services" },
] as const;

/** Voice → NLP → agents → services: the Omdena prototype's flow, drawn as four linked nodes. */
export function FlowDiagram({ variant }: { variant: Variant }) {
  const small = variant === "thumb";
  return (
    <svg viewBox="0 0 404 252" className="block h-full w-full bg-bg-2" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={`flow-grid-${variant}`} width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M28 0H0V28" fill="none" className="stroke-line" strokeWidth="1" />
        </pattern>
        <marker id={`flow-arrow-${variant}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0L10 5L0 10z" className="fill-accent" />
        </marker>
      </defs>
      <rect width="404" height="252" fill={`url(#flow-grid-${variant})`} />
      {!small && (
        <text x="24" y="40" className="fill-text-2 font-mono" fontSize="12" letterSpacing="1.6">
          OMDENA · PROTOTYPE FLOW
        </text>
      )}
      {NODES.slice(0, -1).map((n, i) => {
        const next = NODES[i + 1];
        if (!next) return null;
        return (
          <line
            key={n.label}
            x1={n.x + 30}
            y1={126}
            x2={next.x - 32}
            y2={126}
            className="stroke-accent"
            strokeWidth={small ? 4 : 2}
            markerEnd={`url(#flow-arrow-${variant})`}
          />
        );
      })}
      {NODES.map((n, i) => (
        <g key={n.label}>
          <circle cx={n.x} cy={126} r={small ? 30 : 26} className="fill-surface stroke-accent-2" strokeWidth={small ? 4 : 2} />
          <text x={n.x} y={small ? 138 : 132} textAnchor="middle" className="fill-accent-2 font-mono" fontSize={small ? 32 : 16}>
            {i + 1}
          </text>
          {!small && (
            <text x={n.x} y={182} textAnchor="middle" className="fill-text font-mono" fontSize="13">
              {n.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}
