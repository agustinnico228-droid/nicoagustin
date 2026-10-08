"use client";

import { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { HeroScene } from "./HeroScene";
import { useHtmlTheme } from "./useHtmlTheme";

/*
 * The hero's WebGL layer (loaded with next/dynamic, ssr:false, only after first paint + idle).
 * Renders only while on screen and while the tab is visible; the pointer is read from window events
 * because the canvas itself never receives pointer events.
 */
export default function HeroCanvas({ onReady }: { onReady?: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const [inView, setInView] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);
  const theme = useHtmlTheme();

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry) setInView(entry.isIntersecting);
    });
    io.observe(el);

    const onVisibility = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);

    const onPointer = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
    };
  }, []);

  const running = inView && tabVisible;

  return (
    <div ref={wrapRef} className="pointer-events-none absolute inset-0">
      <Canvas
        aria-hidden="true"
        frameloop={running ? "always" : "never"}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ fov: 38, near: 0.1, far: 60, position: [0, 5.6, 15] }}
        style={{ pointerEvents: "none" }}
        onCreated={() => {
          // Fade in once the first frames are on screen.
          requestAnimationFrame(() => requestAnimationFrame(() => onReady?.()));
        }}
      >
        <HeroScene theme={theme} pointer={pointer} />
      </Canvas>
    </div>
  );
}
