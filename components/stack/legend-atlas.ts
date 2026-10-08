/*
 * One canvas atlas holding every keycap legend, drawn in IBM Plex Mono (the self-hosted next/font face, never a
 * network font) at 600 weight when that face exists, otherwise 500 thickened with a hairline stroke, otherwise a bold
 * system monospace. Text is white on transparent so the material colour sets the ink per cap.
 *
 * Each legend gets its own cell, sized like the flat top of its cap (world units × texels per unit), shelf-packed into
 * one texture. Cells are ≥ 256 px tall (more on high-DPR screens). Text is auto-fitted: as large as the cap allows up
 * to a common maximum, long legends shrink to fit the cap width, and "a/b" or "a b" legends may stack on two lines
 * when that makes them clearly larger. Browser only.
 */

/** Largest legend em size, in world units (single line / two lines). */
const EM_MAX = 0.3;
const EM_MAX_TWO = 0.25;
/** Share of the flat cap top the text may span. */
const TEXT_SPAN = 0.9;
/** Letter spacing in em (Plex Mono is generous; a little tighter fits longer legends). */
const TRACKING = -0.03;
/** Monospace advance (em) used to size cells before the font is measured. */
const ADVANCE = 0.6 + TRACKING;
/** Empty texels around every cell, so mip levels never bleed between neighbours. */
const GUTTER = 12;

export type LegendInput = {
  text: string;
  /** Flat area of the cap top the legend may use (world units). */
  width: number;
  depth: number;
};

export type LegendCell = {
  /** Plane size in world units. */
  width: number;
  height: number;
  /** Texture rectangle (flipY: canvas top is v = 1). */
  u0: number;
  u1: number;
  v0: number;
  v1: number;
  /** Pixel rectangle in the atlas (without gutter). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Max text width in pixels. */
  textW: number;
};

export type LegendPlan = { width: number; height: number; texelsPerUnit: number; cells: LegendCell[] };

/** Packs one cell per legend. Pure: depends only on cap sizes and the pixel ratio, never on the font. */
export function planLegendAtlas(
  inputs: readonly LegendInput[],
  { pixelRatio, maxTextureSize }: { pixelRatio: number; maxTextureSize: number },
): LegendPlan {
  const depth = inputs.reduce((d, l) => Math.max(d, l.depth), 0.1);
  const planeH = depth * 0.96;
  const cellPx = pixelRatio >= 1.25 ? 320 : 256;
  const maxW = Math.max(512, Math.min(2048, maxTextureSize));
  let rho = cellPx / planeH;

  for (let attempt = 0; attempt < 8; attempt++) {
    const cells: LegendCell[] = [];
    let x = 0;
    let y = 0;
    const h = Math.round(planeH * rho);
    const slotH = h + GUTTER * 2;
    for (const input of inputs) {
      const needed = Math.max(1, input.text.length) * ADVANCE * EM_MAX + 0.1;
      const planeW = Math.min(input.width * 0.98, Math.max(needed, input.depth * 0.6));
      const w = Math.round(planeW * rho);
      const slotW = w + GUTTER * 2;
      if (x + slotW > maxW && x > 0) {
        x = 0;
        y += slotH;
      }
      cells.push({
        width: planeW,
        height: planeH,
        u0: 0,
        u1: 0,
        v0: 0,
        v1: 0,
        x: x + GUTTER,
        y: y + GUTTER,
        w,
        h,
        textW: Math.min(w, input.width * TEXT_SPAN * rho),
      });
      x += slotW;
    }
    const width = maxW;
    const height = y + slotH;
    if (height <= maxTextureSize || attempt === 7) {
      for (const c of cells) {
        c.u0 = c.x / width;
        c.u1 = (c.x + c.w) / width;
        c.v1 = 1 - c.y / height;
        c.v0 = 1 - (c.y + c.h) / height;
      }
      return { width, height, texelsPerUnit: rho, cells };
    }
    rho *= 0.85;
  }
  return { width: 1, height: 1, texelsPerUnit: rho, cells: [] };
}

type FontChoice = { family: string; weight: number; stroke: number };

/** The mono font stack as next/font exposes it on <html>. */
function plexFamily(): string {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue("--font-plex-mono").trim();
  } catch {
    return "";
  }
}

const SYSTEM_MONO = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace';

/** Heaviest weight a FontFace descriptor covers ("500", "100 900", "bold", "normal"). */
function faceWeight(descriptor: string): number {
  return descriptor
    .trim()
    .split(/\s+/)
    .reduce((w, part) => {
      const n = part === "bold" ? 700 : part === "normal" ? 400 : Number.parseInt(part, 10);
      return Number.isFinite(n) ? Math.max(w, n) : w;
    }, 0);
}

/** Loads Plex Mono (600 if it exists, else 500) and reports which face the canvas will use. */
async function chooseFont(timeoutMs: number): Promise<{ font: FontChoice; late: Promise<FontChoice | null> | null }> {
  const fallback: FontChoice = { family: SYSTEM_MONO, weight: 700, stroke: 0 };
  const stack = plexFamily();
  const primary = stack.split(",")[0]?.trim();
  if (!primary || !document.fonts) return { font: fallback, late: null };

  const load = (async (): Promise<FontChoice | null> => {
    const faces = await document.fonts.load(`600 100px ${primary}`, "HTML/CSS Ag");
    const weight = faces.reduce((w, f) => Math.max(w, faceWeight(f.weight)), 0);
    if (faces.length === 0 || weight === 0) return null;
    if (weight >= 600) return { family: `${primary}, ${SYSTEM_MONO}`, weight: 600, stroke: 0.012 };
    // No 600 face shipped: draw the real 500 face and thicken it slightly (no synthetic bold).
    await document.fonts.load(`${weight} 100px ${primary}`, "HTML/CSS Ag");
    return { family: `${primary}, ${SYSTEM_MONO}`, weight, stroke: weight >= 500 ? 0.03 : 0.045 };
  })().catch(() => null);

  let timer = 0;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = window.setTimeout(() => resolve("timeout"), timeoutMs);
  });
  const first = await Promise.race([load, timeout]);
  window.clearTimeout(timer);
  if (first === "timeout") return { font: fallback, late: load };
  return { font: first ?? fallback, late: null };
}

function fitLegend(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  emMax: number,
  emMaxTwo: number,
  font: FontChoice,
): { lines: string[]; size: number } {
  const widest = (lines: string[]) => {
    ctx.font = `${font.weight} 100px ${font.family}`;
    ctx.letterSpacing = `${TRACKING * 100}px`;
    return lines.reduce((w, l) => Math.max(w, ctx.measureText(l).width + font.stroke * 100), 1);
  };
  const single = Math.min(emMax, (100 * maxW) / widest([text]));
  const sep = text.search(/[/ ]/);
  if (sep > 0 && sep < text.length - 1) {
    const lines = [text.slice(0, sep).trim(), text.slice(sep + 1).trim()].filter(Boolean);
    if (lines.length === 2) {
      const two = Math.min(emMaxTwo, (100 * maxW) / widest(lines));
      if (two >= single * 1.3) return { lines, size: two };
    }
  }
  return { lines: [text], size: single };
}

function draw(canvas: HTMLCanvasElement, plan: LegendPlan, texts: readonly string[], font: FontChoice) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // White at alpha 1/255 everywhere: transparent texels keep white RGB, so mipmaps never darken the ink edges.
  ctx.fillStyle = "rgba(255, 255, 255, 0.004)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";
  ctx.lineJoin = "round";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const rho = plan.texelsPerUnit;
  plan.cells.forEach((cell, i) => {
    const text = texts[i];
    if (!text) return;
    const { lines, size } = fitLegend(ctx, text, cell.textW, EM_MAX * rho, EM_MAX_TWO * rho, font);
    ctx.font = `${font.weight} ${size}px ${font.family}`;
    const spacing = TRACKING * size;
    ctx.letterSpacing = `${spacing}px`;
    ctx.lineWidth = font.stroke * size;
    const capH = ctx.measureText("H").actualBoundingBoxAscent || size * 0.7;
    const cx = cell.x + cell.w / 2 + spacing / 2;
    const cy = cell.y + cell.h / 2;
    const pitch = size * 1.12;
    const first = cy + capH / 2 - ((lines.length - 1) * pitch) / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(cell.x, cell.y, cell.w, cell.h);
    ctx.clip();
    lines.forEach((line, li) => {
      const y = first + li * pitch;
      if (font.stroke > 0) ctx.strokeText(line, cx, y);
      ctx.fillText(line, cx, y);
    });
    ctx.restore();
  });
}

/**
 * Draws the atlas once the mono face is ready (or after a short wait, with a fallback face). If the face arrives
 * later, the same canvas is redrawn and `onRedraw` is called so the texture can be re-uploaded.
 */
export async function drawLegendAtlas(
  plan: LegendPlan,
  texts: readonly string[],
  onRedraw?: () => void,
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = plan.width;
  canvas.height = plan.height;
  const { font, late } = await chooseFont(2500);
  draw(canvas, plan, texts, font);
  late?.then((f) => {
    if (!f) return;
    draw(canvas, plan, texts, f);
    onRedraw?.();
  });
  return canvas;
}
