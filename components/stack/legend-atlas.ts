/*
 * One canvas atlas holding every keycap legend, drawn in IBM Plex Mono (the self-hosted next/font face, never a
 * network font) once the font has loaded. Text is white on transparent so the material colour tints it per theme.
 * Browser only.
 */

export const ATLAS_COLS = 4;
export const CELL_W = 256;
export const CELL_H = 128;

export type CellUv = { u0: number; v0: number; u1: number; v1: number };

export function atlasRows(count: number): number {
  return Math.max(1, Math.ceil(count / ATLAS_COLS));
}

/** UV rectangle of cell `index` (flipY textures: canvas top is v = 1). */
export function cellUv(index: number, count: number): CellUv {
  const rows = atlasRows(count);
  const col = index % ATLAS_COLS;
  const row = Math.floor(index / ATLAS_COLS);
  return {
    u0: col / ATLAS_COLS,
    u1: (col + 1) / ATLAS_COLS,
    v0: 1 - (row + 1) / rows,
    v1: 1 - row / rows,
  };
}

/** The mono font stack as next/font exposes it on <html>, with a system fallback. */
function monoFamily(): string {
  try {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--font-plex-mono").trim();
    if (value) return `${value}, ui-monospace, monospace`;
  } catch {
    /* ignore */
  }
  return "ui-monospace, monospace";
}

/** Waits (briefly) for the mono face so legends never render in a fallback font, then draws the atlas. */
export async function createLegendAtlas(legends: readonly string[]): Promise<HTMLCanvasElement> {
  const family = monoFamily();
  try {
    await Promise.race([
      document.fonts.load(`500 56px ${family}`).then(() => document.fonts.ready),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch {
    /* draw with whatever is available */
  }

  const canvas = document.createElement("canvas");
  canvas.width = ATLAS_COLS * CELL_W;
  canvas.height = atlasRows(legends.length) * CELL_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const maxWidth = CELL_W - 28;
  legends.forEach((text, i) => {
    const col = i % ATLAS_COLS;
    const row = Math.floor(i / ATLAS_COLS);
    let size = 56;
    ctx.font = `500 ${size}px ${family}`;
    const measured = ctx.measureText(text).width;
    if (measured > maxWidth) {
      size = Math.max(22, Math.floor((size * maxWidth) / measured));
      ctx.font = `500 ${size}px ${family}`;
    }
    ctx.fillText(text, col * CELL_W + CELL_W / 2, row * CELL_H + CELL_H / 2 + 2, maxWidth);
  });

  return canvas;
}
