"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const HeroCanvas = dynamic(() => import("./HeroCanvas"), { ssr: false, loading: () => null });

let webglSupport: boolean | null = null;

function hasWebGL(): boolean {
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ?? canvas.getContext("webgl")) as WebGLRenderingContext | null;
    webglSupport = !!gl;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

/*
 * Holds the server-rendered poster (children) and, when allowed, swaps in the WebGL canvas:
 * after first paint + idle, only at ≥ 768px, without reduced motion, and with WebGL available.
 */
export function HeroVisual({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const wide = window.matchMedia("(min-width: 768px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let idleId: number | undefined;
    let timeoutId: number | undefined;
    let armed = false;

    const evaluate = () => {
      armed = true;
      const ok = wide.matches && !reduce.matches && hasWebGL();
      setAllowed(ok);
      if (!ok) setReady(false);
    };

    const schedule = () => {
      if (typeof window.requestIdleCallback === "function") idleId = window.requestIdleCallback(evaluate, { timeout: 1200 });
      else timeoutId = window.setTimeout(evaluate, 1200);
    };

    const onMediaChange = () => {
      if (armed) evaluate();
    };

    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    wide.addEventListener("change", onMediaChange);
    reduce.addEventListener("change", onMediaChange);

    return () => {
      window.removeEventListener("load", schedule);
      if (idleId !== undefined && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      wide.removeEventListener("change", onMediaChange);
      reduce.removeEventListener("change", onMediaChange);
    };
  }, []);

  const showCanvas = allowed && ready;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className={`absolute inset-0 transition-opacity duration-1000 ${showCanvas ? "opacity-0" : "opacity-100"}`}>{children}</div>
      {allowed ? (
        <div className={`absolute inset-0 transition-opacity duration-[1400ms] ${showCanvas ? "opacity-100" : "opacity-0"}`}>
          <HeroCanvas onReady={() => setReady(true)} />
        </div>
      ) : null}
    </div>
  );
}
