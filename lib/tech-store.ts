"use client";

import { useSyncExternalStore } from "react";
import type { TechId } from "./site";

/*
 * The selected technology, shared by the 3D keyboard, the plain stack list and the Selected work rows.
 * Pressing a key (or a list button) selects a tech; the work rows that use it are highlighted.
 * A tiny external store: no extra dependency.
 */

let selected: TechId | null = null;
const listeners = new Set<() => void>();

export function selectTech(id: TechId | null) {
  selected = selected === id ? null : id;
  listeners.forEach((l) => l());
}

export function clearTech() {
  if (selected === null) return;
  selected = null;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSelectedTech(): TechId | null {
  return useSyncExternalStore(
    subscribe,
    () => selected,
    () => null,
  );
}
