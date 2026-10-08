"use client";

/* eslint-disable react-hooks/immutability -- three.js objects (materials, textures, meshes) are mutated imperatively by design. */

import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import {
  CanvasTexture,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Path,
  PerspectiveCamera,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
  SRGBColorSpace,
  type BufferGeometry,
  type Group,
  type Mesh,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { layers } from "@/lib/site";
import { selectTech, useSelectedTech } from "@/lib/tech-store";
import {
  CAP_DEPTH,
  capWidths,
  keyboardBounds,
  keyIndexOf,
  keys,
  neighbourKey,
  type Direction,
} from "./keyboard-layout";
import { drawLegendAtlas, planLegendAtlas } from "./legend-atlas";
import {
  CAP_BODY_ROUGHNESS,
  CAP_METALNESS,
  CAP_TOP_ROUGHNESS,
  readPalette,
  type KeyboardPalette,
} from "./scene-palette";

/*
 * The interactive 3D keyboard (loaded lazily by KeyboardCanvas, browser only). Our own design: a rounded deck (case +
 * plate) centred under sculpted keycaps, one row per stack layer. Keys, plate and case share one origin (the centre
 * of the key block, plate top at y = 0); the camera is fitted to the whole board for any canvas size.
 * Renders on demand only (frameloop="demand"): a frame is drawn only while something animates or the visitor
 * interacts, and nothing renders while the keyboard is off-screen.
 */

// ── Dimensions (scene units; 1 = one key pitch) ─────────────────────────────────────────────────────
const KB = keyboardBounds;
/** Case edge beyond the outermost caps, the same on all four sides. */
const CASE_MARGIN = 0.35;
const CASE_W = KB.width + CASE_MARGIN * 2;
const CASE_D = KB.depth + CASE_MARGIN * 2;
const CASE_H = 0.42;
const CASE_TOP = -0.04;
const PLATE_INSET = 0.12;
const PLATE_H = 0.05;
/** Plate top is the reference height: y = 0. */
const PLATE_TOP = 0;
/** Visible gap between a resting cap and the plate. */
const SEAT_GAP = 0.035;
const BODY_H = 0.36;
const BODY_R = 0.07;
const DISH_INSET = 0.1;
const DISH_H = 0.06;
const DISH_R = 0.025;
const DISH_EMBED = 0.02;
const BODY_Y = PLATE_TOP + SEAT_GAP + BODY_H / 2;
const DISH_Y = PLATE_TOP + SEAT_GAP + BODY_H - DISH_EMBED + DISH_H / 2;
const CAP_TOP = DISH_Y + DISH_H / 2;
const LEGEND_Y = CAP_TOP + 0.002;
const RING_Y = CAP_TOP + 0.004;
/** Flat (unrounded) part of a cap top, where the legend lives. */
const FLAT_D = CAP_DEPTH - DISH_INSET - DISH_R * 2;
const flatWidth = (capWidth: number) => capWidth - DISH_INSET - DISH_R * 2;
const SHADOW_PAD = 0.7;

// ── Motion ────────────────────────────────────────────────────────────────────────────────────────────
const DROP = 1.2;
const INTRO_DUR = 0.55;
const PRESS_DOWN = 0.06;
const PRESS_TOTAL = 0.18;
const PRESS_DEPTH = 0.1;
const HOVER_LIFT = 0.06;
const SELECTED_SINK = -0.03;
const MAX_TILT_Y = 0.06;
const MAX_TILT_X = 0.035;

// ── Camera: calm three-quarter view from the front, fitted to the board ─────────────────────────────
/** Narrow lens from further away: less perspective shrink on the back row (the densest legends). */
const FOV = 20;
const ELEVATION = (38 * Math.PI) / 180;
const AZIMUTH = (-5 * Math.PI) / 180;
/** Share of the canvas width / height the board may fill (the rest is padding). */
const FILL_X = 0.9;
const FILL_Y = 0.78;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeOutBack = (t: number) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};
const noRaycast: Mesh["raycast"] = () => undefined;

const introDelays = keys.map(
  (k) => k.row * 0.06 + (KB.width > 0 ? ((k.x - KB.minX) / KB.width) * 0.25 : 0),
);
const INTRO_END = Math.max(0, ...introDelays) + INTRO_DUR;

/** Corners of the board at rest (world space, the board is centred on the origin). */
const FRAME_POINTS: readonly (readonly [number, number, number])[] = (() => {
  const pts: [number, number, number][] = [];
  for (const x of [-CASE_W / 2, CASE_W / 2]) {
    for (const y of [CASE_TOP - CASE_H, CAP_TOP + HOVER_LIFT]) {
      for (const z of [-CASE_D / 2, CASE_D / 2]) pts.push([x, y, z]);
    }
  }
  return pts;
})();

/** Places the camera so the whole board is centred in the canvas with even padding, for any aspect ratio. */
function frameCamera(camera: PerspectiveCamera, aspect: number) {
  const ce = Math.cos(ELEVATION);
  const se = Math.sin(ELEVATION);
  const sa = Math.sin(AZIMUTH);
  const ca = Math.cos(AZIMUTH);
  // d: from the target towards the camera; r / u: the camera's right / up axes.
  const d = [sa * ce, se, ca * ce] as const;
  const r = [ca, 0, -sa] as const;
  const u = [-sa * se, ce, -ca * se] as const;
  const tanV = Math.tan((FOV * Math.PI) / 360);
  const tanH = tanV * aspect;

  const t = [0, (CASE_TOP - CASE_H + CAP_TOP) / 2, 0];
  let dist = 10;
  for (let iter = 0; iter < 8; iter++) {
    dist = 0;
    for (const p of FRAME_POINTS) {
      const qx = p[0] - t[0]!;
      const qy = p[1] - t[1]!;
      const qz = p[2] - t[2]!;
      const x = qx * r[0] + qy * r[1] + qz * r[2];
      const y = qx * u[0] + qy * u[1] + qz * u[2];
      const a = qx * d[0] + qy * d[1] + qz * d[2];
      dist = Math.max(dist, a + Math.abs(x) / (FILL_X * tanH), a + Math.abs(y) / (FILL_Y * tanV));
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of FRAME_POINTS) {
      const qx = p[0] - t[0]!;
      const qy = p[1] - t[1]!;
      const qz = p[2] - t[2]!;
      const depth = dist - (qx * d[0] + qy * d[1] + qz * d[2]);
      const nx = (qx * r[0] + qy * r[1] + qz * r[2]) / (depth * tanH);
      const ny = (qx * u[0] + qy * u[1] + qz * u[2]) / (depth * tanV);
      minX = Math.min(minX, nx);
      maxX = Math.max(maxX, nx);
      minY = Math.min(minY, ny);
      maxY = Math.max(maxY, ny);
    }
    const sx = ((minX + maxX) / 2) * dist * tanH;
    const sy = ((minY + maxY) / 2) * dist * tanV;
    for (let i = 0; i < 3; i++) t[i] = t[i]! + r[i]! * sx + u[i]! * sy;
  }

  camera.fov = FOV;
  camera.aspect = aspect;
  camera.near = Math.max(0.1, dist - 10);
  camera.far = dist + 14;
  camera.up.set(0, 1, 0);
  camera.position.set(t[0]! + d[0] * dist, t[1]! + d[1] * dist, t[2]! + d[2] * dist);
  camera.lookAt(t[0]!, t[1]!, t[2]!);
  camera.updateProjectionMatrix();
}

type Control = {
  /** Pointer position over the keyboard, -1..1 (targets for the damped tilt). */
  tiltX: number;
  tiltY: number;
  invalidate: (() => void) | null;
  press: ((index: number) => void) | null;
};

function roundedRect<T extends Path>(path: T, w: number, h: number, r: number): T {
  const x = -w / 2;
  const y = -h / 2;
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y);
  path.quadraticCurveTo(x + w, y, x + w, y + r);
  path.lineTo(x + w, y + h - r);
  path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  path.lineTo(x + r, y + h);
  path.quadraticCurveTo(x, y + h, x, y + h - r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);
  return path;
}

/** A flat rounded-rectangle frame (the keyboard focus ring). */
function frameGeometry(w: number, d: number, thickness: number): ShapeGeometry {
  const outer = roundedRect(new Shape(), w, d, 0.1);
  outer.holes.push(roundedRect(new Path(), w - thickness * 2, d - thickness * 2, 0.07));
  return new ShapeGeometry(outer, 6);
}

/** Soft baked shadow under the case: a blurred rounded rectangle (white + alpha; the material sets the colour). */
function shadowTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  const planeW = CASE_W + SHADOW_PAD * 2;
  const planeD = CASE_D + SHADOW_PAD * 2;
  canvas.width = 512;
  canvas.height = Math.max(64, Math.round((512 * planeD) / planeW));
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const s = canvas.width / planeW;
    const w = (CASE_W + 0.1) * s;
    const h = (CASE_D + 0.1) * s;
    const x = (canvas.width - w) / 2 - canvas.width;
    const y = (canvas.height - h) / 2;
    const r = 0.25 * s;
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = SHADOW_PAD * s * 0.55;
    ctx.shadowOffsetX = canvas.width;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

type Resources = {
  body: Map<number, BufferGeometry>;
  top: Map<number, BufferGeometry>;
  ring: Map<number, BufferGeometry>;
  legend: BufferGeometry[];
  caseGeo: BufferGeometry;
  plateGeo: BufferGeometry;
  shadowGeo: BufferGeometry;
  bodyMats: MeshStandardMaterial[];
  topMats: MeshStandardMaterial[];
  inkDarkMat: MeshBasicMaterial;
  inkLightMat: MeshBasicMaterial;
  deckMat: MeshStandardMaterial;
  plateMat: MeshStandardMaterial;
  ringMat: MeshBasicMaterial;
  shadowMat: MeshBasicMaterial;
  shadowTex: CanvasTexture;
  legendPlan: ReturnType<typeof planLegendAtlas>;
};

function createResources(pixelRatio: number, maxTextureSize: number): Resources {
  const body = new Map<number, BufferGeometry>();
  const top = new Map<number, BufferGeometry>();
  const ring = new Map<number, BufferGeometry>();
  for (const w of capWidths) {
    body.set(w, new RoundedBoxGeometry(w, BODY_H, CAP_DEPTH, 3, BODY_R));
    top.set(w, new RoundedBoxGeometry(w - DISH_INSET, DISH_H, CAP_DEPTH - DISH_INSET, 3, DISH_R));
    ring.set(w, frameGeometry(w + 0.08, CAP_DEPTH + 0.08, 0.05));
  }

  const legendPlan = planLegendAtlas(
    keys.map((k) => ({ text: k.legend, width: flatWidth(k.width), depth: FLAT_D })),
    { pixelRatio, maxTextureSize },
  );
  const legend = keys.map((_, i) => {
    const cell = legendPlan.cells[i];
    const g = new PlaneGeometry(cell?.width ?? 0.5, cell?.height ?? 0.5);
    if (cell) {
      const uv = g.getAttribute("uv");
      for (let j = 0; j < uv.count; j++) {
        uv.setXY(j, cell.u0 + uv.getX(j) * (cell.u1 - cell.u0), cell.v0 + uv.getY(j) * (cell.v1 - cell.v0));
      }
      uv.needsUpdate = true;
    }
    // Lie flat on the cap top, text reading left to right with its top towards the back of the board.
    g.rotateX(-Math.PI / 2);
    return g;
  });

  const shadowGeo = new PlaneGeometry(CASE_W + SHADOW_PAD * 2, CASE_D + SHADOW_PAD * 2).rotateX(-Math.PI / 2);
  const shadowTex = shadowTexture();
  const ink = () =>
    new MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      alphaTest: 0.01,
      toneMapped: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

  return {
    body,
    top,
    ring,
    legend,
    caseGeo: new RoundedBoxGeometry(CASE_W, CASE_H, CASE_D, 4, 0.16),
    plateGeo: new RoundedBoxGeometry(CASE_W - PLATE_INSET * 2, PLATE_H, CASE_D - PLATE_INSET * 2, 2, 0.03),
    shadowGeo,
    bodyMats: keys.map(
      () => new MeshStandardMaterial({ roughness: CAP_BODY_ROUGHNESS, metalness: CAP_METALNESS }),
    ),
    topMats: keys.map(() => new MeshStandardMaterial({ roughness: CAP_TOP_ROUGHNESS, metalness: CAP_METALNESS })),
    inkDarkMat: ink(),
    inkLightMat: ink(),
    deckMat: new MeshStandardMaterial({ roughness: 0.62, metalness: 0.2 }),
    plateMat: new MeshStandardMaterial({ roughness: 0.85, metalness: 0.08 }),
    ringMat: new MeshBasicMaterial({ toneMapped: false }),
    shadowMat: new MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false }),
    shadowTex,
    legendPlan,
  };
}

function disposeResources(res: Resources) {
  [
    ...res.body.values(),
    ...res.top.values(),
    ...res.ring.values(),
    ...res.legend,
    res.caseGeo,
    res.plateGeo,
    res.shadowGeo,
  ].forEach((g) => g.dispose());
  [
    ...res.bodyMats,
    ...res.topMats,
    res.inkDarkMat,
    res.inkLightMat,
    res.deckMat,
    res.plateMat,
    res.ringMat,
    res.shadowMat,
  ].forEach((m) => m.dispose());
  res.shadowTex.dispose();
}

type SceneProps = {
  control: RefObject<Control>;
  focusIndex: number;
  ringVisible: boolean;
  active: boolean;
  onKeyClick: (index: number) => void;
};

function Scene({ control, focusIndex, ringVisible, active, onKeyClick }: SceneProps) {
  const invalidate = useThree((s) => s.invalidate);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const selectedIndex = keyIndexOf(useSelectedTech());

  const [palette, setPalette] = useState<KeyboardPalette>(() => readPalette());
  const [atlasReady, setAtlasReady] = useState(false);
  const res = useMemo(() => createResources(gl.getPixelRatio(), gl.capabilities.maxTextureSize), [gl]);

  const tiltRef = useRef<Group>(null);
  const ringRef = useRef<Mesh>(null);
  const groups = useRef<(Group | null)[]>([]);
  const legends = useRef<(Mesh | null)[]>([]);
  const lift = useRef(new Float32Array(keys.length));
  const pressAt = useRef(new Float64Array(keys.length).fill(-1));
  /** -1: not started (caps held up), -2: done, otherwise the start time in seconds. */
  const introAt = useRef(-1);
  const last = useRef(0);
  const hover = useRef(-1);
  const state = useRef({ selected: -1, focus: 0, ring: false, active: false, palette });

  useEffect(() => () => disposeResources(res), [res]);

  // Fit the camera to the board whenever the canvas is resized.
  useLayoutEffect(() => {
    if (width <= 0 || height <= 0 || !(camera instanceof PerspectiveCamera)) return;
    frameCamera(camera, width / height);
    invalidate();
  }, [camera, width, height, invalidate]);

  // Follow the site theme (data-theme on <html>).
  useEffect(() => {
    const observer = new MutationObserver(() => setPalette(readPalette()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  // Legends: one high-resolution atlas texture, drawn once the mono font is ready.
  useEffect(() => {
    let cancelled = false;
    let texture: CanvasTexture | null = null;
    drawLegendAtlas(
      res.legendPlan,
      keys.map((k) => k.legend),
      () => {
        if (cancelled || !texture) return;
        texture.needsUpdate = true;
        invalidate();
      },
    ).then((canvas) => {
      if (cancelled) return;
      texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = gl.capabilities.getMaxAnisotropy();
      res.inkDarkMat.map = texture;
      res.inkLightMat.map = texture;
      res.inkDarkMat.needsUpdate = true;
      res.inkLightMat.needsUpdate = true;
      setAtlasReady(true);
      invalidate();
    });
    return () => {
      cancelled = true;
      res.inkDarkMat.map = null;
      res.inkLightMat.map = null;
      texture?.dispose();
    };
  }, [gl, res, invalidate]);

  /** Applies colours, legend inks and lit/hover/selected states to every material (on change only, never per frame). */
  const paint = useCallback(() => {
    const s = state.current;
    const pal = s.palette;
    keys.forEach((k, i) => {
      const body = res.bodyMats[i];
      const top = res.topMats[i];
      if (!body || !top) return;
      const selected = i === s.selected;
      const look = selected ? pal.selected : pal.caps[k.layer];
      const lit = selected || i === hover.current || (s.ring && i === s.focus);
      body.color.copy(look.body);
      top.color.copy(look.top);
      body.emissive.copy(look.glow);
      top.emissive.copy(look.glow);
      body.emissiveIntensity = lit ? look.bodyGlow : 0;
      top.emissiveIntensity = lit ? look.topGlow : 0;
      const legend = legends.current[i];
      if (legend) legend.material = look.ink === "dark" ? res.inkDarkMat : res.inkLightMat;
    });
    res.inkDarkMat.color.copy(pal.inkDark);
    res.inkLightMat.color.copy(pal.inkLight);
    res.deckMat.color.copy(pal.deck);
    res.plateMat.color.copy(pal.plate);
    res.ringMat.color.copy(pal.focus);
    res.shadowMat.color.copy(pal.shadow);
    res.shadowMat.opacity = pal.shadowOpacity;
    invalidate();
  }, [res, invalidate]);

  useEffect(() => {
    const s = state.current;
    s.selected = selectedIndex;
    s.focus = focusIndex;
    s.ring = ringVisible;
    s.palette = palette;
    if (ringRef.current) {
      const k = keys[focusIndex];
      const geometry = k ? res.ring.get(k.width) : undefined;
      if (geometry) ringRef.current.geometry = geometry;
      ringRef.current.visible = ringVisible && !!k;
    }
    paint();
  }, [selectedIndex, focusIndex, ringVisible, palette, paint, res, atlasReady]);

  // Start the drop-in the first time the keyboard is on screen; pause rendering while it is off-screen.
  useEffect(() => {
    state.current.active = active;
    if (!active) return;
    if (introAt.current === -1) {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      introAt.current = reduced ? -2 : performance.now() / 1000 + 0.05;
    }
    invalidate();
  }, [active, invalidate]);

  const press = useCallback(
    (index: number) => {
      const k = keys[index];
      if (!k) return;
      pressAt.current[index] = performance.now() / 1000;
      selectTech(k.id);
      invalidate();
    },
    [invalidate],
  );

  useEffect(() => {
    const c = control.current;
    c.invalidate = invalidate;
    c.press = press;
    return () => {
      c.invalidate = null;
      c.press = null;
    };
  }, [control, invalidate, press]);

  useFrame(() => {
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, Math.max(0, now - last.current));
    last.current = now;
    const s = state.current;
    let moving = false;

    const tilt = tiltRef.current;
    if (tilt) {
      const c = control.current;
      const k = 1 - Math.exp(-dt * 6);
      const tx = c.tiltY * MAX_TILT_X;
      const ty = c.tiltX * MAX_TILT_Y;
      tilt.rotation.x += (tx - tilt.rotation.x) * k;
      tilt.rotation.y += (ty - tilt.rotation.y) * k;
      if (Math.abs(tx - tilt.rotation.x) > 1e-4 || Math.abs(ty - tilt.rotation.y) > 1e-4) moving = true;
    }

    const intro = introAt.current;
    if (intro >= 0 && now - intro > INTRO_END) introAt.current = -2;
    const liftK = 1 - Math.exp(-dt * 14);

    for (let i = 0; i < keys.length; i++) {
      const g = groups.current[i];
      if (!g) continue;

      // Drop-in: from DROP above the rest height down to exactly 0 (caps resting on the plate).
      let introY = 0;
      if (intro === -1) introY = DROP;
      else if (intro >= 0) {
        const t = (now - intro - (introDelays[i] ?? 0)) / INTRO_DUR;
        if (t < 1) {
          moving = true;
          introY = t <= 0 ? DROP : DROP * (1 - easeOutCubic(t));
        }
      }

      // Hover lift / selected sink, relative to the rest height.
      const hot = i === hover.current || (s.ring && i === s.focus);
      const target = i === s.selected ? SELECTED_SINK : hot ? HOVER_LIFT : 0;
      const current = lift.current[i] ?? 0;
      let next = current + (target - current) * liftK;
      if (Math.abs(target - next) < 5e-4) next = target;
      else moving = true;
      lift.current[i] = next;

      let pressY = 0;
      const pressedAt = pressAt.current[i] ?? -1;
      if (pressedAt >= 0) {
        const t = now - pressedAt;
        if (t < PRESS_DOWN) pressY = -PRESS_DEPTH * (t / PRESS_DOWN);
        else if (t < PRESS_TOTAL) pressY = -PRESS_DEPTH * (1 - easeOutBack((t - PRESS_DOWN) / (PRESS_TOTAL - PRESS_DOWN)));
        else pressAt.current[i] = -1;
        moving = true;
      }

      g.position.y = introY + next + pressY;
    }

    const ring = ringRef.current;
    if (ring && ring.visible) {
      const k = keys[s.focus];
      const g = groups.current[s.focus];
      if (k) ring.position.set(k.x, (g?.position.y ?? 0) + RING_Y, k.z);
    }

    if (moving && s.active) invalidate();
  });

  const onOver = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    hover.current = i;
    gl.domElement.style.cursor = "pointer";
    paint();
  };
  const onOut = (i: number) => () => {
    if (hover.current !== i) return;
    hover.current = -1;
    gl.domElement.style.cursor = "";
    paint();
  };
  const onClick = (i: number) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    press(i);
    onKeyClick(i);
  };

  return (
    <>
      <ambientLight color={palette.ambient.color} intensity={palette.ambient.intensity} />
      <directionalLight
        color={palette.keyLight.color}
        position={palette.keyLight.position}
        intensity={palette.keyLight.intensity}
      />
      <directionalLight
        color={palette.rimLight.color}
        position={palette.rimLight.position}
        intensity={palette.rimLight.intensity}
      />

      {/* Tilt pivots on the board centre; everything below shares the key block's origin. */}
      <group ref={tiltRef}>
        <group position={[-KB.centerX, 0, -KB.centerZ]}>
          <mesh
            geometry={res.caseGeo}
            material={res.deckMat}
            position={[KB.centerX, CASE_TOP - CASE_H / 2, KB.centerZ]}
            raycast={noRaycast}
          />
          <mesh
            geometry={res.plateGeo}
            material={res.plateMat}
            position={[KB.centerX, PLATE_TOP - PLATE_H / 2, KB.centerZ]}
            raycast={noRaycast}
          />
          <mesh
            geometry={res.shadowGeo}
            material={res.shadowMat}
            position={[KB.centerX, CASE_TOP - CASE_H - 0.004, KB.centerZ]}
            renderOrder={-1}
            raycast={noRaycast}
          />

          {keys.map((k, i) => (
            <group
              key={k.id}
              position={[k.x, DROP, k.z]}
              ref={(el) => {
                groups.current[i] = el;
              }}
            >
              <mesh
                geometry={res.body.get(k.width)}
                material={res.bodyMats[i]}
                position={[0, BODY_Y, 0]}
                onPointerOver={onOver(i)}
                onPointerOut={onOut(i)}
                onClick={onClick(i)}
              />
              <mesh
                geometry={res.top.get(k.width)}
                material={res.topMats[i]}
                position={[0, DISH_Y, 0]}
                raycast={noRaycast}
              />
              <mesh
                ref={(el) => {
                  legends.current[i] = el;
                }}
                geometry={res.legend[i]}
                material={res.inkDarkMat}
                position={[0, LEGEND_Y, 0]}
                visible={atlasReady}
                raycast={noRaycast}
              />
            </group>
          ))}

          <mesh ref={ringRef} material={res.ringMat} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast} />
        </group>
      </group>
    </>
  );
}

const ARROWS: Record<string, Direction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  Home: "home",
  End: "end",
};

const layerLabel = (id: string) => layers.find((l) => l.id === id)?.label ?? "";

/** The focusable wrapper + canvas. Default export so KeyboardCanvas can load it with next/dynamic. */
export default function KeyboardStage({ onReady }: { onReady?: () => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const control = useRef<Control>({ tiltX: 0, tiltY: 0, invalidate: null, press: null });
  const selected = useSelectedTech();
  const [focusIndex, setFocusIndex] = useState(0);
  const [ringVisible, setRingVisible] = useState(false);
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);

  // Only render while the keyboard is on screen.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setActive(!!entry?.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const dir = ARROWS[e.key];
    if (dir) {
      e.preventDefault();
      setRingVisible(true);
      setFocusIndex((i) => neighbourKey(i, dir));
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setRingVisible(true);
      control.current.press?.(focusIndex);
    }
  };

  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const idx = keyIndexOf(selected);
    if (idx >= 0) setFocusIndex(idx);
    setRingVisible(e.currentTarget.matches(":focus-visible"));
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const c = control.current;
    c.tiltX = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
    c.tiltY = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height) * 2 - 1));
    c.invalidate?.();
  };

  const onPointerLeave = () => {
    const c = control.current;
    c.tiltX = 0;
    c.tiltY = 0;
    c.invalidate?.();
  };

  const focused = keys[focusIndex];
  const announce =
    ringVisible && focused
      ? `${focused.label}, ${layerLabel(focused.layer)}${selected === focused.id ? ", selected" : ""}`
      : "";

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      role="group"
      aria-label="3D keyboard of Nico's stack. Use the list below for full keyboard access"
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={() => setRingVisible(false)}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className="absolute inset-0 rounded-[inherit] transition-opacity duration-500"
      style={{ opacity: ready ? 1 : 0 }}
    >
      <Canvas
        frameloop="demand"
        dpr={[1, 1.75]}
        flat
        camera={{ position: [0, 8, 12], fov: FOV, near: 0.1, far: 60 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={() => {
          setReady(true);
          onReady?.();
        }}
      >
        <Scene
          control={control}
          focusIndex={focusIndex}
          ringVisible={ringVisible}
          active={active}
          onKeyClick={setFocusIndex}
        />
      </Canvas>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
