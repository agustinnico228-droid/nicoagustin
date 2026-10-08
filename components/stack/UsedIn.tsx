"use client";

import Link from "next/link";
import { useRef } from "react";
import type { TechId } from "@/lib/site";
import { clearTech, useSelectedTech } from "@/lib/tech-store";

export type UsedInEntry = {
  label: string;
  layerLabel: string;
  alsoIn?: string;
  projects: { index: string; title: string; slug: string }[];
};

/** What the selected key is used for: the projects on this site, plus where else it shows up. */
export function UsedIn({ techs }: { techs: Record<TechId, UsedInEntry> }) {
  const selected = useSelectedTech();
  const panelRef = useRef<HTMLDivElement>(null);
  const entry = selected ? techs[selected] : null;

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      className="flex min-h-full flex-col rounded-3xl border border-line bg-surface p-6 outline-none sm:p-7"
    >
      <p className="eyebrow">Used in</p>

      <div aria-live="polite" aria-atomic="true" className="mt-4 flex-1">
        {entry ? (
          <>
            <p className="font-display text-2xl font-semibold tracking-tight text-text">{entry.label}</p>
            <p className="mt-1 font-mono text-xs tracking-[0.08em] text-muted uppercase">{entry.layerLabel}</p>

            {entry.projects.length > 0 ? (
              <>
                <p className="mt-6 text-sm text-text-2">
                  {entry.projects.length === 1 ? "One project on this site:" : `${entry.projects.length} projects on this site:`}
                </p>
                <ul className="mt-3 divide-y divide-line border-y border-line" role="list">
                  {entry.projects.map((p) => (
                    <li key={p.slug}>
                      <Link
                        href={`/work/${p.slug}`}
                        className="group flex min-h-11 items-baseline gap-3 py-3 text-text no-underline hover:text-accent"
                      >
                        <span className="font-mono text-xs text-muted">{p.index}</span>
                        <span className="font-medium underline-offset-4 group-hover:underline">{p.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            {entry.alsoIn ? (
              <p className="mt-5 text-sm text-text-2">
                <span className="text-muted">{entry.projects.length > 0 ? "Also: " : "Used in: "}</span>
                {entry.alsoIn}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-text-2">
            Press a key on the keyboard, or pick a name in the list below, to see the projects it shows up in.
          </p>
        )}
      </div>

      {entry ? (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn btn-ghost cursor-pointer"
            onClick={() => {
              clearTech();
              panelRef.current?.focus();
            }}
          >
            Clear
          </button>
          {entry.projects.length > 0 ? (
            <a href="#work" className="inline-flex min-h-11 items-center text-sm font-medium text-accent underline underline-offset-4">
              See them in Selected work
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
