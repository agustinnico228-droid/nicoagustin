import { Color, SRGBColorSpace } from "three";
import type { Layer } from "@/lib/site";

/*
 * Scene colours derived from the CSS design tokens on <html> (so the 3D keyboard follows the light/dark theme and
 * never hard-codes its own palette). Any CSS colour string is resolved through a 1×1 canvas. Browser only.
 */

export type CapColors = { body: Color; top: Color; glow: Color };

export type KeyboardPalette = {
  light: boolean;
  deck: Color;
  plate: Color;
  caps: Record<Layer, CapColors>;
  legend: Color;
  legendOnSelected: Color;
  selected: Color;
  selectedTop: Color;
  focus: Color;
  shadow: Color;
  keyLight: Color;
  rim: Color;
  ambient: Color;
};

let probe: CanvasRenderingContext2D | null = null;

function cssColor(value: string, fallback: Color): Color {
  const out = fallback.clone();
  if (!value) return out;
  try {
    if (!probe) {
      const c = document.createElement("canvas");
      c.width = 1;
      c.height = 1;
      probe = c.getContext("2d", { willReadFrequently: true });
    }
    if (!probe) return out;
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = "rgb(128, 128, 128)";
    probe.fillStyle = value;
    probe.fillRect(0, 0, 1, 1);
    const d = probe.getImageData(0, 0, 1, 1).data;
    out.setRGB((d[0] ?? 128) / 255, (d[1] ?? 128) / 255, (d[2] ?? 128) / 255, SRGBColorSpace);
  } catch {
    /* keep fallback */
  }
  return out;
}

export function readPalette(): KeyboardPalette {
  const root = document.documentElement;
  const styles = getComputedStyle(root);
  const grey = new Color(0.5, 0.5, 0.5);
  const token = (name: string) => cssColor(styles.getPropertyValue(name).trim(), grey);
  const light = root.getAttribute("data-theme") === "light";

  const bg = token("--bg");
  const bg2 = token("--bg-2");
  const surface = token("--surface");
  const surface2 = token("--surface-2");
  const text = token("--text");
  const muted = token("--muted");
  const accent = token("--accent");
  const accent2 = token("--accent-2");
  const accent3 = token("--accent-3");
  const btnFg = token("--btn-fg");
  const focus = token("--focus");

  // Layer hues: frontend electric blue, backend violet, database cyan, data teal-cyan, tools slate.
  const teal = accent2.clone().offsetHSL(-0.06, -0.08, light ? -0.02 : -0.08);
  const slate = muted.clone().lerp(surface2, light ? 0.1 : 0.35);
  const hues: Record<Layer, Color> = {
    frontend: accent,
    backend: accent3,
    database: accent2,
    data: teal,
    tools: slate,
  };

  const bodyMix = light ? 0.22 : 0.42;
  const topMix = light ? 0.12 : 0.5;
  const caps = {} as Record<Layer, CapColors>;
  (Object.keys(hues) as Layer[]).forEach((layer) => {
    const hue = hues[layer];
    caps[layer] = {
      body: surface.clone().lerp(hue, bodyMix),
      top: (light ? surface.clone() : surface2.clone()).lerp(hue, topMix),
      glow: hue.clone(),
    };
  });

  return {
    light,
    deck: light ? surface2.clone().lerp(text, 0.08) : bg2.clone().lerp(surface, 0.4),
    plate: light ? surface2.clone().lerp(text, 0.16) : bg.clone(),
    caps,
    legend: text.clone(),
    legendOnSelected: btnFg.clone(),
    selected: accent2.clone(),
    selectedTop: accent2.clone().lerp(light ? text : surface, 0.08),
    focus,
    shadow: light ? text.clone() : bg.clone(),
    keyLight: light ? new Color(1, 1, 1) : surface.clone().lerp(new Color(1, 1, 1), 0.92),
    rim: accent2.clone(),
    ambient: light ? new Color(1, 1, 1) : accent.clone().lerp(new Color(1, 1, 1), 0.6),
  };
}
