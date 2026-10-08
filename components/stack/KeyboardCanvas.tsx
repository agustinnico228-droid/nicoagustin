"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

/*
 * Loads the 3D keyboard only when it can help: a wide screen, motion allowed, WebGL available, and the section
 * about to scroll into view. Otherwise (and until the scene is ready) the static poster stays in place, inside
 * a box of fixed aspect ratio so nothing shifts when the canvas arrives.
 */

const KeyboardStage = dynamic(() => import("./KeyboardScene"), { ssr: false, loading: () => null });

const QUERY = "(min-width: 768px) and (prefers-reduced-motion: no-preference)";

let webglSupport: boolean | null = null;
function hasWebGL(): boolean {
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    webglSupport = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const getAllowed = () => window.matchMedia(QUERY).matches && hasWebGL();
const getServerAllowed = () => false;

export function KeyboardCanvas({ poster }: { poster: ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const allowed = useSyncExternalStore(subscribe, getAllowed, getServerAllowed);
  const [near, setNear] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || !allowed || near) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [allowed, near]);

  const showStage = allowed && near;
  const posterHidden = showStage && ready;

  return (
    <div
      ref={boxRef}
      className="relative aspect-[11/5] w-full overflow-hidden rounded-3xl border border-line bg-bg-2 bg-grid md:aspect-[16/9]"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center p-4 transition-[opacity,visibility] duration-500 sm:p-8"
        style={{ opacity: posterHidden ? 0 : 1, visibility: posterHidden ? "hidden" : "visible" }}
      >
        {poster}
      </div>
      {showStage ? (
        <KeyboardStage
          onReady={() => {
            // Give the first frame a moment before the cross-fade.
            window.setTimeout(() => setReady(true), 120);
          }}
        />
      ) : null}
    </div>
  );
}
