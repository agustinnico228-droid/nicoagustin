"use client";

import gsap from "gsap";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { techById, type TechId } from "@/lib/site";
import { clearTech, useSelectedTech } from "@/lib/tech-store";
import { PreviewMedia } from "./WorkPreview";

/** The slim, serialisable shape the server passes in (built from content/projects.ts). */
export type WorkItem = {
  slug: string;
  index: string;
  title: string;
  kind: string;
  year?: string;
  summary: string;
  /** Up to 4 short stack labels. */
  chips: string[];
  techs: TechId[];
  cover?: { src: string; width: number; height: number; alt: string };
  /** Headline numbers for projects without a cover (shown as a typographic tile). */
  kpis?: { label: string; value: string }[];
  kpiPeriod?: string;
};

/* The floating preview only exists on wide screens with a mouse; elsewhere each row shows a small thumbnail. */
const PREVIEW_QUERY = "(min-width: 64rem) and (pointer: fine)";

function subscribePreview(onChange: () => void) {
  const mq = window.matchMedia(PREVIEW_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

type Mover = { x: (v: number) => void; y: (v: number) => void };

export function WorkList({ items }: { items: WorkItem[] }) {
  const selected = useSelectedTech();
  const canPreview = useSyncExternalStore(
    subscribePreview,
    () => window.matchMedia(PREVIEW_QUERY).matches,
    () => false,
  );
  const [hovered, setHovered] = useState<number | null>(null);
  // Preview images mount on the first hover of the list, not on page load.
  const [armed, setArmed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const moverRef = useRef<Mover | null>(null);
  const placedRef = useRef(false);
  const uid = useId();

  const active = canPreview ? hovered : null;
  const tech = selected ? techById[selected] : undefined;
  const matchCount = selected ? items.filter((it) => it.techs.includes(selected)).length : 0;

  useEffect(() => {
    const el = cardRef.current;
    if (!canPreview || !el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      moverRef.current = { x: (v) => gsap.set(el, { x: v }), y: (v) => gsap.set(el, { y: v }) };
    } else {
      moverRef.current = {
        x: gsap.quickTo(el, "x", { duration: 0.4, ease: "power3.out" }),
        y: gsap.quickTo(el, "y", { duration: 0.4, ease: "power3.out" }),
      };
    }
    return () => {
      moverRef.current = null;
      placedRef.current = false;
      gsap.killTweensOf(el);
    };
  }, [canPreview]);

  function onMove(e: ReactPointerEvent<HTMLElement>) {
    if (e.pointerType !== "mouse") return;
    const el = cardRef.current;
    const mover = moverRef.current;
    if (!el || !mover) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const gap = 28;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Sit to the right of the cursor, flipping to the left near the right edge; stay inside the viewport.
    const x = e.clientX + gap + w < vw - 8 ? e.clientX + gap : e.clientX - gap - w;
    const y = Math.min(Math.max(e.clientY - h / 2, 8), Math.max(8, vh - h - 8));
    if (!placedRef.current) {
      gsap.set(el, { x, y });
      placedRef.current = true;
    }
    mover.x(x);
    mover.y(y);
  }

  function onLeave() {
    setHovered(null);
    placedRef.current = false;
  }

  return (
    <div>
      <div aria-live="polite" className="mb-6 empty:mb-0">
        {selected && tech ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line-strong bg-surface px-4 py-2 sm:px-5">
            <p className="py-2 text-sm text-text-2">
              {matchCount > 0 ? (
                <>
                  Highlighting projects that use <strong className="font-semibold text-text">{tech.label}</strong>
                  <span className="font-mono text-xs text-muted"> · {matchCount} found</span>
                </>
              ) : (
                <>
                  None of these projects uses <strong className="font-semibold text-text">{tech.label}</strong>
                  {tech.alsoIn ? (
                    <>
                      . You&apos;ll find it in: <span className="text-text">{tech.alsoIn}</span>
                    </>
                  ) : (
                    "."
                  )}
                </>
              )}
            </p>
            <button
              type="button"
              onClick={() => clearTech()}
              className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 font-mono text-xs uppercase tracking-wider text-text transition-colors hover:border-accent hover:text-accent"
            >
              Clear<span className="sr-only"> the {tech.label} highlight</span>
            </button>
          </div>
        ) : null}
      </div>

      <ul
        className="border-t border-line"
        onPointerEnter={(e) => {
          if (canPreview && e.pointerType === "mouse") setArmed(true);
        }}
        onPointerMove={canPreview ? onMove : undefined}
        onPointerLeave={onLeave}
      >
        {items.map((item, i) => {
          const matches = selected ? item.techs.includes(selected) : false;
          const techDim = selected !== null && !matches;
          const hoverDim = active !== null && active !== i;
          const titleId = `${uid}-t-${i}`;
          const descId = `${uid}-d-${i}`;
          return (
            <li key={item.slug} data-reveal className="border-b border-line">
              <Link
                href={`/work/${item.slug}`}
                aria-labelledby={titleId}
                aria-describedby={descId}
                onPointerEnter={(e) => {
                  if (canPreview && e.pointerType === "mouse") setHovered(i);
                }}
                className={[
                  "group relative -mx-3 grid grid-cols-[1fr_auto] items-start gap-x-4 rounded-2xl px-3 py-7 no-underline transition-[opacity,background-color,box-shadow] duration-300 sm:-mx-5 sm:grid-cols-[4.5rem_1fr_auto] sm:gap-x-8 sm:px-5 sm:py-9 lg:grid-cols-[6rem_1fr_auto]",
                  matches ? "bg-surface ring-1 ring-accent shadow-[0_0_48px_-16px_var(--glow)]" : "",
                  hoverDim ? "opacity-60" : "opacity-100",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className={[
                    "col-span-full mb-2 font-display text-lg font-semibold tabular-nums leading-none transition-colors sm:col-span-1 sm:mb-0 sm:pt-1 sm:text-3xl lg:text-4xl",
                    matches ? "text-accent-2" : "text-muted group-hover:text-accent",
                  ].join(" ")}
                >
                  {item.index}
                </span>

                <div className="min-w-0">
                  <h3
                    id={titleId}
                    className={[
                      "hyphens-auto font-display text-[clamp(1.375rem,4.2vw,2.75rem)] font-bold leading-[1.08] tracking-[-0.02em] transition-colors",
                      techDim ? "text-muted" : "text-text",
                    ].join(" ")}
                  >
                    {item.title}
                  </h3>
                  <div id={descId}>
                    <p className="mt-2 font-mono text-xs uppercase tracking-[0.1em] text-muted">
                      {item.kind}
                      {item.year ? <span> · {item.year}</span> : null}
                    </p>
                    <p className="mt-3 hidden max-w-2xl text-text-2 xs:block">{item.summary}</p>
                    {item.chips.length > 0 || (matches && tech) ? (
                      <p className="mt-4 flex flex-wrap gap-2">
                        {matches && tech ? <span className="chip border-accent text-accent">uses {tech.label}</span> : null}
                        {item.chips.map((c) => (
                          <span key={c} className="chip">
                            {c}
                          </span>
                        ))}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-4 self-stretch sm:self-start">
                  <div
                    aria-hidden="true"
                    className="relative aspect-[4/3] w-20 overflow-hidden rounded-lg border border-line bg-bg-2 sm:w-32 lg:pointer-fine:hidden"
                  >
                    <PreviewMedia item={item} variant="thumb" sizes="(min-width: 640px) 128px, 80px" />
                  </div>
                  <span
                    aria-hidden="true"
                    className="grid size-11 place-items-center rounded-full border border-line-strong text-text-2 transition-[transform,color,border-color] duration-300 ease-out group-hover:translate-x-1.5 group-hover:border-accent group-hover:text-accent group-focus-visible:translate-x-1.5"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {canPreview ? (
        <div
          ref={cardRef}
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-30 w-[22rem] will-change-transform"
        >
          <div
            className={[
              "relative aspect-[16/10] overflow-hidden rounded-2xl border border-line-strong bg-bg-2 shadow-[var(--shadow)] transition-[opacity,scale] duration-300 ease-out",
              active !== null ? "scale-100 opacity-100" : "scale-90 opacity-0",
            ].join(" ")}
          >
            {armed
              ? items.map((item, i) => (
                  <div
                    key={item.slug}
                    className={[
                      "absolute inset-0 transition-opacity duration-300",
                      active === i ? "opacity-100" : "opacity-0",
                    ].join(" ")}
                  >
                    <PreviewMedia item={item} variant="card" sizes="352px" />
                  </div>
                ))
              : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
