"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { createSkyline, type Skyline } from "./skyline";
import type { HtmlTheme } from "./useHtmlTheme";

type Props = {
  theme: HtmlTheme;
  /** Normalised pointer position (-1..1), written by HeroCanvas from window pointer events. */
  pointer: React.RefObject<{ x: number; y: number }>;
};

/** Mounts the data skyline into the R3F scene and drives it every frame. */
export function HeroScene({ theme, pointer }: Props) {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const skyline = useRef<Skyline | null>(null);

  useEffect(() => {
    const s = createSkyline(scene, camera);
    skyline.current = s;
    return () => {
      s.dispose();
      skyline.current = null;
    };
  }, [scene, camera]);

  useEffect(() => {
    skyline.current?.setTheme(theme);
  }, [theme]);

  useFrame((state, delta) => {
    skyline.current?.update(state.clock.elapsedTime, delta, pointer.current);
  });

  return null;
}
