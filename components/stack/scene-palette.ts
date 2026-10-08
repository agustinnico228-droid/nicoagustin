import { Color, SRGBColorSpace } from "three";
import type { Layer } from "@/lib/site";

/*
 * Scene colours derived from the CSS design tokens on <html> (so the 3D keyboard follows the light/dark theme and
 * never hard-codes its own palette). Any CSS colour string is resolved through a 1×1 canvas. Browser only.
 *
 * Legibility: each cap top is judged by the colour it will actually render with under the scene lights (albedo ×
 * light gain + a specular allowance). It gets whichever ink contrasts more: the theme's navy or its near-white.
 * A top that falls in the mid-tone band where neither ink reaches TARGET_RATIO is nudged lighter or darker until one
 * does, and hover/selected glows are capped so they never pull a legend below it. Every legend therefore keeps at
 * least 4.5:1 (5:1 by design, for headroom) in both themes and every state.
 */

export type Ink = "dark" | "light";

export type CapLook = {
  /** Albedo of the cap top and body (linear working colour space). */
  top: Color;
  body: Color;
  /** Emissive colour used when the cap is lit up. */
  glow: Color;
  /** Legend ink for this look. */
  ink: Ink;
  /** emissiveIntensity of top / body when lit up (hover or focus for caps; always for the selected look). */
  topGlow: number;
  bodyGlow: number;
};

export type SceneLight = { color: Color; intensity: number; position: [number, number, number] };

export type KeyboardPalette = {
  light: boolean;
  deck: Color;
  plate: Color;
  caps: Record<Layer, CapLook>;
  selected: CapLook;
  inkDark: Color;
  inkLight: Color;
  focus: Color;
  shadow: Color;
  shadowOpacity: number;
  ambient: { color: Color; intensity: number };
  keyLight: SceneLight;
  rimLight: SceneLight;
};

/** Cap material constants (the scene uses them too, so the rendered-colour estimate matches). */
export const CAP_METALNESS = 0.04;
export const CAP_TOP_ROUGHNESS = 0.6;
export const CAP_BODY_ROUGHNESS = 0.66;

/** Design target for legend contrast (WCAG asks 4.5:1; the extra margin absorbs lighting/specular variation). */
const TARGET_RATIO = 5;

const KEY_POS: [number, number, number] = [-3.5, 9, 6];
const RIM_POS: [number, number, number] = [4, 1.6, -8];

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

// ── Colour maths (linear working space = linearised sRGB, so WCAG luminance is a weighted sum) ─────────────

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function luminance(c: Color): number {
  return 0.2126 * clamp01(c.r) + 0.7152 * clamp01(c.g) + 0.0722 * clamp01(c.b);
}

export function contrast(a: number, b: number): number {
  const hi = Math.max(a, b);
  const lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

/** Same hue at a given luminance: scaled down when darker, mixed with white when lighter. */
function atLuminance(c: Color, target: number): Color {
  const l = luminance(c);
  if (l <= 1e-4) return new Color(target, target, target);
  if (l >= target) return c.clone().multiplyScalar(target / l);
  const t = (target - l) / (1 - l);
  return c.clone().lerp(new Color(1, 1, 1), t);
}

type Rig = { gain: Color; spec: Color };

/** Light reaching an up-facing cap top, as a per-channel multiplier on albedo, plus a specular allowance. */
function topRig(ambient: Color, ambientI: number, key: SceneLight, rim: SceneLight): Rig {
  const ny = (p: [number, number, number]) => Math.max(0, p[1] / Math.hypot(p[0], p[1], p[2]));
  const k = ((1 - CAP_METALNESS) * 0.96) / Math.PI;
  const gain = ambient
    .clone()
    .multiplyScalar(ambientI)
    .add(key.color.clone().multiplyScalar(key.intensity * ny(key.position)))
    .add(rim.color.clone().multiplyScalar(rim.intensity * ny(rim.position)))
    .multiplyScalar(k);
  // GGX highlight estimate for this rig and camera (rough tops, lights placed so their mirror direction misses the lens).
  const spec = key.color
    .clone()
    .multiplyScalar(key.intensity * 0.003)
    .add(rim.color.clone().multiplyScalar(rim.intensity * 0.02));
  return { gain, spec };
}

const rendered = (albedo: Color, rig: Rig, glow?: Color, glowI = 0) => {
  const c = albedo.clone().multiply(rig.gain).add(rig.spec);
  if (glow && glowI > 0) c.add(glow.clone().multiplyScalar(glowI));
  return c;
};

type InkPair = { dark: number; light: number };

/** Picks the ink for a top and, if neither ink reaches the target, moves the top out of the mid-tone band. */
function legible(albedo: Color, rig: Rig, inks: InkPair): { top: Color; ink: Ink } {
  const ratios = (c: Color) => {
    const l = luminance(rendered(c, rig));
    return { dark: contrast(l, inks.dark), light: contrast(l, inks.light) };
  };
  const r = ratios(albedo);
  if (Math.max(r.dark, r.light) >= TARGET_RATIO) return { top: albedo.clone(), ink: r.dark >= r.light ? "dark" : "light" };

  const lighten = r.dark >= r.light;
  const white = new Color(1, 1, 1);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const c = lighten ? albedo.clone().lerp(white, mid) : albedo.clone().multiplyScalar(1 - mid);
    const m = ratios(c);
    if ((lighten ? m.dark : m.light) >= TARGET_RATIO) hi = mid;
    else lo = mid;
  }
  const top = lighten ? albedo.clone().lerp(white, hi) : albedo.clone().multiplyScalar(1 - hi);
  return { top, ink: lighten ? "dark" : "light" };
}

/** Largest glow (up to `wanted`) that keeps the legend at the target ratio. Brighter is always fine for dark ink. */
function safeGlow(top: Color, ink: Ink, glow: Color, wanted: number, rig: Rig, inks: InkPair): number {
  if (ink === "dark") return wanted;
  let lo = 0;
  let hi = wanted;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const l = luminance(rendered(top, rig, glow, mid));
    if (contrast(l, inks.light) >= TARGET_RATIO) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Albedo that renders as `desired` under this rig (clamped to a valid albedo). */
function albedoFor(desired: Color, rig: Rig): Color {
  return new Color(
    clamp01(desired.r / Math.max(1e-3, rig.gain.r)),
    clamp01(desired.g / Math.max(1e-3, rig.gain.g)),
    clamp01(desired.b / Math.max(1e-3, rig.gain.b)),
  );
}

export function readPalette(): KeyboardPalette {
  const root = document.documentElement;
  const styles = getComputedStyle(root);
  const grey = new Color(0.5, 0.5, 0.5);
  const token = (name: string, fallback = grey) => cssColor(styles.getPropertyValue(name).trim(), fallback);
  const light = root.getAttribute("data-theme") === "light";

  const bg = token("--bg");
  const surface = token("--surface");
  const surface2 = token("--surface-2");
  const text = token("--text");
  const muted = token("--muted");
  const accent = token("--accent");
  const accent2 = token("--accent-2");
  const accent3 = token("--accent-3");
  const btnFg = token("--btn-fg");
  const focus = token("--focus");
  const white = new Color(1, 1, 1);

  // Inks: the theme's navy and near-white (text / button-text tokens), whichever is which.
  const navyFallback = new Color().setRGB(6 / 255, 18 / 255, 42 / 255, SRGBColorSpace);
  const textIsDark = luminance(text) < luminance(btnFg);
  const inkDark = textIsDark ? text : btnFg;
  const inkLight = textIsDark ? btnFg : text;
  const inkDarkC = luminance(inkDark) < 0.05 ? inkDark : navyFallback;
  const inkLightC = luminance(inkLight) > 0.8 ? inkLight : white.clone();
  const inks: InkPair = { dark: luminance(inkDarkC), light: luminance(inkLightC) };

  // Calm, predictable light rig: cap tops render close to their albedo.
  const ambient = { color: light ? white.clone() : white.clone().lerp(accent, 0.12), intensity: light ? 1.55 : 1.3 };
  const keyLight: SceneLight = {
    color: light ? white.clone() : white.clone().lerp(surface, 0.06),
    intensity: light ? 2.0 : 2.2,
    position: KEY_POS,
  };
  const rimLight: SceneLight = {
    color: light ? white.clone().lerp(accent, 0.3) : accent2.clone(),
    intensity: light ? 0.35 : 0.9,
    position: RIM_POS,
  };
  const rig = topRig(ambient.color, ambient.intensity, keyLight, rimLight);

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
  // Rendered luminance of each top: vivid caps with navy legends, tools as dark "modifier" caps with light legends.
  const colouredL = light ? 0.5 : 0.3;
  const toolsL = light ? 0.085 : 0.075;

  const look = (hue: Color, targetL: number, bodyShade: number, topGlowWanted: number, bodyGlow: number): CapLook => {
    const desired = atLuminance(hue, targetL);
    const { top, ink } = legible(albedoFor(desired, rig), rig, inks);
    const glow = hue.clone();
    return {
      top,
      body: top.clone().multiplyScalar(bodyShade),
      glow,
      ink,
      topGlow: safeGlow(top, ink, glow, topGlowWanted, rig, inks),
      bodyGlow,
    };
  };

  const caps = {} as Record<Layer, CapLook>;
  (Object.keys(hues) as Layer[]).forEach((layer) => {
    const tools = layer === "tools";
    caps[layer] = look(hues[layer], tools ? toolsL : colouredL, tools ? 0.95 : 0.78, 0.14, light ? 0.18 : 0.24);
  });

  // Selected: bright cyan with navy legend (dark theme), deep teal with white legend (light theme).
  const selected = look(accent2, light ? 0.1 : 0.62, 0.85, light ? 0.06 : 0.3, light ? 0.3 : 0.5);

  return {
    light,
    deck: light ? surface2.clone().lerp(muted, 0.28) : surface.clone().lerp(surface2, 0.75),
    plate: light ? surface2.clone().lerp(text, 0.7) : bg.clone().lerp(surface, 0.25),
    caps,
    selected,
    inkDark: inkDarkC,
    inkLight: inkLightC,
    focus,
    shadow: light ? text.clone() : bg.clone().multiplyScalar(0.5),
    shadowOpacity: light ? 0.24 : 0.8,
    ambient,
    keyLight,
    rimLight,
  };
}
