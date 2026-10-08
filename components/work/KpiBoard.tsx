import type { Kpi, KpiBoard as KpiBoardData } from "@/content/types";

/*
 * The campaign's results as a dashboard card in the site's own style: emphasis KPIs as big tiles, the rest in a
 * compact grid, a small funnel (Impressions → Link clicks → Leads) and the report's own reading.
 */

const FUNNEL = ["Impressions", "Link clicks", "Leads"] as const;

const toNumber = (value: string) => Number(value.replace(/[^0-9.]/g, ""));

function Tile({ kpi, big }: { kpi: Kpi; big?: boolean }) {
  return (
    <div className={big ? "rounded-xl border border-line-strong bg-surface-2 p-5" : "rounded-xl border border-line bg-bg-2 p-4"}>
      {/* Small tiles reserve two label lines from 2 columns up, so values in a row line up when a label wraps. */}
      <dt className={`font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted ${big ? "" : "xs:min-h-[2lh]"}`}>
        {kpi.label}
      </dt>
      <dd
        className={
          big
            ? "mt-2 font-display text-4xl font-bold tracking-tight text-text sm:text-5xl"
            : "mt-1 font-display text-xl font-semibold text-text"
        }
      >
        {kpi.value}
      </dd>
      {kpi.note && <dd className="mt-1 text-xs text-text-2">{kpi.note}</dd>}
    </div>
  );
}

function Funnel({ kpis }: { kpis: Kpi[] }) {
  const steps = FUNNEL.map((label) => kpis.find((k) => k.label === label)).filter((k): k is Kpi => !!k);
  if (steps.length !== FUNNEL.length) return null;
  const values = steps.map((k) => toNumber(k.value));
  const max = Math.max(...values);
  if (!(max > 1) || values.some((v) => !(v > 0))) return null;
  // Log scale so the smallest stage stays visible next to 223,501 impressions.
  const widths = values.map((v) => Math.max(4, (Math.log10(v) / Math.log10(max)) * 100));
  const aria = `Funnel: ${steps.map((k) => `${k.label} ${k.value}`).join(", then ")}.`;
  return (
    <div className="rounded-xl border border-line bg-bg-2 p-4 sm:p-5">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted" aria-hidden="true">
        Funnel
      </p>
      <div role="img" aria-label={aria} className="mt-3 grid gap-3">
        {steps.map((k, i) => (
          <div key={k.label}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-text-2">{k.label}</span>
              <span className="font-mono text-text">{k.value}</span>
            </div>
            <svg viewBox="0 0 100 8" preserveAspectRatio="none" className="mt-1.5 block h-2.5 w-full" aria-hidden="true">
              <rect x={0} y={0} width={100} height={8} rx={2} className="fill-line" />
              <rect
                x={0}
                y={0}
                width={widths[i] ?? 0}
                height={8}
                rx={2}
                className={i === steps.length - 1 ? "fill-accent-2" : "fill-accent"}
              />
            </svg>
          </div>
        ))}
      </div>
      <p className="sr-only">Bar widths use a logarithmic scale so every stage stays visible.</p>
      <p className="mt-3 text-xs text-muted" aria-hidden="true">
        Log scale
      </p>
    </div>
  );
}

export function KpiBoard({ board }: { board: KpiBoardData }) {
  const big = board.kpis.filter((k) => k.emphasis);
  const rest = board.kpis.filter((k) => !k.emphasis);
  const meta = [
    { label: "Period", value: board.period },
    ...(board.currency ? [{ label: "Currency", value: board.currency }] : []),
    ...(board.attribution ? [{ label: "Attribution", value: board.attribution }] : []),
  ];
  return (
    <section
      aria-labelledby="kpi-board-title"
      className="overflow-hidden rounded-2xl border border-line bg-surface"
      style={{ boxShadow: "var(--shadow)" }}
    >
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line bg-bg-2 bg-grid px-5 py-5 sm:px-6">
        <div>
          <p className="eyebrow">Results</p>
          <h3 id="kpi-board-title" className="mt-1 font-display text-2xl font-semibold text-text">
            {board.title}
          </h3>
        </div>
        <dl className="flex flex-wrap gap-2">
          {meta.map((m) => (
            <div key={m.label} className="chip" style={{ whiteSpace: "normal" }}>
              <dt className="text-muted">{m.label}</dt>
              <dd className="text-text">{m.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="grid gap-4 p-5 sm:p-6">
        {big.length > 0 && (
          <dl className="grid gap-4 sm:grid-cols-2">
            {big.map((k) => (
              <Tile key={k.label} kpi={k} big />
            ))}
          </dl>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
          {rest.length > 0 && (
            <dl className="grid grid-cols-1 gap-3 xs:grid-cols-2 md:grid-cols-3">
              {rest.map((k) => (
                <Tile key={k.label} kpi={k} />
              ))}
            </dl>
          )}
          <Funnel kpis={board.kpis} />
        </div>

        {board.reading && board.reading.length > 0 && (
          <div className="rounded-xl border border-line p-5">
            <h4 className="font-display text-base font-semibold text-text">The report&rsquo;s reading</h4>
            <ul className="mt-3 grid gap-2 text-sm text-text-2">
              {board.reading.map((r) => (
                <li key={r} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-2" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
