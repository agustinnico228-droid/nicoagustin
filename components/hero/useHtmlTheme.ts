"use client";

import { useSyncExternalStore } from "react";

export type HtmlTheme = "dark" | "light";

function read(): HtmlTheme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/** The current <html data-theme>, kept in sync with a MutationObserver ("dark" on the server). */
export function useHtmlTheme(): HtmlTheme {
  return useSyncExternalStore(subscribe, read, () => "dark");
}
