import type { Layer } from "@/lib/site";

/*
 * One colour family per stack layer, derived from the theme tokens (so both themes work):
 * frontend electric blue, backend violet, database cyan, data teal-cyan, tools slate.
 * Each class sets `--layer`; the poster and the list chips mix it with surface colours.
 * Rendered once as a <style> element by the Stack section.
 */

export const layerClass = (layer: Layer) => `stk-l-${layer}`;

export const layerStyles = `
.stk-l-frontend{--layer:var(--accent)}
.stk-l-backend{--layer:var(--accent-3)}
.stk-l-database{--layer:var(--accent-2)}
.stk-l-data{--layer:color-mix(in oklab,var(--accent-2) 72%,var(--muted))}
@supports (color: oklch(from red l c h)){.stk-l-data{--layer:oklch(from var(--accent-2) calc(l - 0.04) calc(c * 0.9) calc(h - 28))}}
.stk-l-tools{--layer:color-mix(in oklab,var(--muted) 80%,var(--surface-2))}
`.trim();
