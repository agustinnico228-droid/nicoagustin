"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const REDUCE = "(prefers-reduced-motion: reduce)";

function subscribeMotion(onChange: () => void) {
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/*
 * The hero role line: the roles slide up through a masked slot every ~3s.
 * Screen readers get one static sentence; the animated slot is aria-hidden. A pause button satisfies WCAG 2.2.2.
 * Reduced motion (or no JS): the first role, static.
 */
export function RotatingRole({ roles }: { roles: readonly string[] }) {
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  // false on the server and under reduced motion.
  const motionOk = useSyncExternalStore(
    subscribeMotion,
    () => !window.matchMedia(REDUCE).matches,
    () => false,
  );
  const canAnimate = motionOk && roles.length > 1;
  const active = canAnimate ? tick % roles.length : 0;

  useEffect(() => {
    if (!canAnimate || paused) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") setTick((i) => i + 1);
    }, 3000);
    return () => window.clearInterval(id);
  }, [canAnimate, paused]);

  const prev = (active - 1 + roles.length) % roles.length;
  const sentence =
    roles.length > 1 ? `${roles.slice(0, -1).join(", ")} and ${roles[roles.length - 1] ?? ""}.` : `${roles[0] ?? ""}.`;

  return (
    <div className="flex items-center gap-3">
      <p className="min-w-0 font-display text-[clamp(1.3rem,3.2vw,2.1rem)] font-semibold leading-tight tracking-[-0.02em] text-text-2">
        <span className="sr-only">{sentence}</span>
        <span aria-hidden="true" className="inline-grid overflow-hidden py-[0.08em] align-bottom">
          {roles.map((role, i) => {
            const state = i === active ? "active" : i === prev && canAnimate ? "prev" : "next";
            return (
              <span
                key={role}
                className={`text-accent-2 [grid-area:1/1] ${
                  canAnimate ? "transition-[translate,opacity] duration-700 ease-out-expo" : ""
                } ${
                  state === "active"
                    ? "translate-y-0 opacity-100"
                    : state === "prev"
                      ? "-translate-y-full opacity-0"
                      : "translate-y-full opacity-0"
                }`}
              >
                {role}
              </span>
            );
          })}
        </span>
      </p>
      {canAnimate ? (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-label="Pause the role animation"
          aria-pressed={paused}
          title={paused ? "Play" : "Pause"}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-accent hover:text-accent"
        >
          {paused ? (
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M3 1.5v9l7.5-4.5z" />
            </svg>
          ) : (
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" />
            </svg>
          )}
        </button>
      ) : null}
    </div>
  );
}
