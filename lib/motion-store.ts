"use client";

import { useSyncExternalStore } from "react";

/*
 * A user "pause animations" switch shared by the hero role rotation and the hero 3D skyline (WCAG 2.2.2).
 * A tiny external store like lib/tech-store.ts; not persisted, so every visit starts with motion on.
 */

let paused = false;
const listeners = new Set<() => void>();

export function setMotionPaused(value: boolean) {
  if (paused === value) return;
  paused = value;
  listeners.forEach((l) => l());
}

export function toggleMotionPaused() {
  setMotionPaused(!paused);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useMotionPaused(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => paused,
    () => false,
  );
}
