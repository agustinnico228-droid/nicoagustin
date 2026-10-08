import { stats } from "@/lib/site";

// Hairlines and padding per cell: 2x2 on phones, one row of four from 1024px.
const cellClasses = [
  "pl-0 pr-4",
  "border-l px-4",
  "border-t pl-0 pr-4 lg:border-t-0 lg:border-l lg:pl-4",
  "border-l border-t px-4 lg:border-t-0",
];

/** Real numbers only, straight from lib/site.ts. */
export function HeroStats() {
  return (
    <dl className="grid grid-cols-2 border-y border-line lg:grid-cols-4">
      {stats.map((s, i) => (
        <div key={s.label} className={`flex flex-col-reverse justify-end gap-1.5 border-line py-5 ${cellClasses[i] ?? "px-4"}`}>
          <dt className="max-w-[22ch] text-[0.82rem] leading-snug text-muted">{s.label}</dt>
          <dd className="font-display text-[clamp(1.9rem,4.6vw,3.25rem)] font-bold leading-none tracking-[-0.04em] text-text">
            {s.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
