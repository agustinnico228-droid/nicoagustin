"use client";

/* eslint-disable react-hooks/immutability -- three.js objects (materials, textures, meshes) are mutated imperatively by design. */

import { ContactShadows, RoundedBox } from "@react-three/drei";
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
import { cellUv, createLegendAtlas } from "./legend-atlas";
import { readPalette, type KeyboardPalette } from "./scene-palette";

/*
 * The interactive 3D keyboard (loaded lazily by KeyboardCanvas, browser only). Our own design: a dark rounded deck
 * with sculpted keycaps, one row per stack layer. Renders on demand only (frameloop="demand"): a frame is drawn only
 * while something animates or the visitor interacts, and nothing renders while the keyboard is off-screen.
 */

// ── Dimensions (scene units; 1 = one key pitch) ─────────────────────────────────────────────────────
const CAP_H = 0.42;
const CAP_BASE = 0.02;
const TOP_H = 0.07;
const TOP_INSET = 0.16;
const BODY_Y = CAP_BASE + CAP_H / 2;
const TOP_Y = CAP_BASE + CAP_H + TOP_H / 2 - 0.02;
const LEGEND_Y = TOP_Y + TOP_H / 2 + 0.004;
const RING_Y = LEGEND_Y + 0.003;
const LEGEND_W = 0.62;
const LEGEND_H = 0.31;
const DECK_PAD = 0.45;
const DECK_H = 0.5;

// ── Motion ────────────────────────────────────────────────────────────────────────────────────────────
const DROP = 1.8;
const INTRO_DUR = 0.6;
const PRESS_DOWN = 0.06;
const PRESS_TOTAL = 0.18;
const PRESS_DEPTH = 0.14;
const HOVER_LIFT = 0.07;
const SELECTED_SINK = -0.035;
const MAX_TILT_Y = 0.12;
const MAX_TILT_X = 0.07;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeOutBack = (t: number) => {
  const c1 = 1.4;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};
const noRaycast: Mesh["raycast"] = () => undefined;

const introDelays = keys.map(
  (k) => k.row * 0.07 + ((k.x - keyboardBounds.minX) / keyboardBounds.width) * 0.28,
);
const INTRO_END = Math.max(...introDelays) + INTRO_DUR;

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
  const outer = roundedRect(new Shape(), w, d, 0.09);
  outer.holes.push(roundedRect(new Path(), w - thickness * 2, d - thickness * 2, 0.06));
  return new ShapeGeometry(outer, 6);
}

type Resources = {
  body: Map<number, BufferGeometry>;
  top: Map<number, BufferGeometry>;
  ring: Map<number, BufferGeometry>;
  legend: BufferGeometry[];
  bodyMats: MeshStandardMaterial[];
  topMats: MeshStandardMaterial[];
  legendMat: MeshBasicMaterial;
  legendSelMat: MeshBasicMaterial;
  deckMat: MeshStandardMaterial;
  plateMat: MeshStandardMaterial;
  ringMat: MeshBasicMaterial;
};

function createResources(): Resources {
  const body = new Map<number, BufferGeometry>();
  const top = new Map<number, BufferGeometry>();
  const ring = new Map<number, BufferGeometry>();
  for (const w of capWidths) {
    body.set(w, new RoundedBoxGeometry(w, CAP_H, CAP_DEPTH, 3, 0.08));
    top.set(w, new RoundedBoxGeometry(w - TOP_INSET, TOP_H, CAP_DEPTH - TOP_INSET, 3, 0.03));
    ring.set(w, frameGeometry(w - TOP_INSET + 0.12, CAP_DEPTH - TOP_INSET + 0.12, 0.045));
  }
  const legend = keys.map((k) => {
    const g = new PlaneGeometry(LEGEND_W, LEGEND_H);
    const uv = g.getAttribute("uv");
    const { u0, u1, v0, v1 } = cellUv(k.index, keys.length);
    for (let j = 0; j < uv.count; j++) {
      uv.setXY(j, u0 + uv.getX(j) * (u1 - u0), v0 + uv.getY(j) * (v1 - v0));
    }
    uv.needsUpdate = true;
    return g;
  });
  const cap = () => new MeshStandardMaterial({ roughness: 0.55, metalness: 0.08 });
  const legendMaterial = () => new MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false });
  return {
    body,
    top,
    ring,
    legend,
    bodyMats: keys.map(cap),
    topMats: keys.map(() => new MeshStandardMaterial({ roughness: 0.42, metalness: 0.05 })),
    legendMat: legendMaterial(),
    legendSelMat: legendMaterial(),
    deckMat: new MeshStandardMaterial({ roughness: 0.62, metalness: 0.25 }),
    plateMat: new MeshStandardMaterial({ roughness: 0.8, metalness: 0.1 }),
    ringMat: new MeshBasicMaterial({ toneMapped: false }),
  };
}

function disposeResources(res: Resources) {
  [...res.body.values(), ...res.top.values(), ...res.ring.values(), ...res.legend].forEach((g) => g.dispose());
  [...res.bodyMats, ...res.topMats, res.legendMat, res.legendSelMat, res.deckMat, res.plateMat, res.ringMat].forEach(
    (m) => m.dispose(),
  );
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
  const selectedIndex = keyIndexOf(useSelectedTech());

  const [palette, setPalette] = useState<KeyboardPalette>(() => readPalette());
  const [atlasReady, setAtlasReady] = useState(false);
  const res = useMemo(createResources, []);

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

  // Fixed three-quarter camera.
  useLayoutEffect(() => {
    camera.position.set(-2.4, 8, 10);
    camera.lookAt(0, -0.3, 0.3);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate]);

  // Follow the site theme (data-theme on <html>).
  useEffect(() => {
    const observer = new MutationObserver(() => setPalette(readPalette()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  // Legends: one atlas texture, drawn once the mono font is ready.
  useEffect(() => {
    let cancelled = false;
    let texture: CanvasTexture | null = null;
    createLegendAtlas(keys.map((k) => k.legend)).then((canvas) => {
      if (cancelled) return;
      texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
      res.legendMat.map = texture;
      res.legendSelMat.map = texture;
      res.legendMat.needsUpdate = true;
      res.legendSelMat.needsUpdate = true;
      setAtlasReady(true);
      invalidate();
    });
    return () => {
      cancelled = true;
      res.legendMat.map = null;
      res.legendSelMat.map = null;
      texture?.dispose();
    };
  }, [gl, res, invalidate]);

  /** Applies colours and lit/hover/selected states to every material (on change only, never per frame). */
  const paint = useCallback(() => {
    const s = state.current;
    const pal = s.palette;
    keys.forEach((k, i) => {
      const body = res.bodyMats[i];
      const top = res.topMats[i];
      if (!body || !top) return;
      const selected = i === s.selected;
      const hot = i === hover.current || (s.ring && i === s.focus);
      const caps = pal.caps[k.layer];
      body.color.copy(selected ? pal.selected : caps.body);
      top.color.copy(selected ? pal.selectedTop : caps.top);
      body.emissive.copy(selected ? pal.selected : caps.glow);
      top.emissive.copy(selected ? pal.selected : caps.glow);
      body.emissiveIntensity = selected ? 0.45 : hot ? 0.2 : 0;
      top.emissiveIntensity = selected ? 0.55 : hot ? 0.26 : 0;
      const legend = legends.current[i];
      if (legend) legend.material = selected ? res.legendSelMat : res.legendMat;
    });
    res.legendMat.color.copy(pal.legend);
    res.legendSelMat.color.copy(pal.legendOnSelected);
    res.deckMat.color.copy(pal.deck);
    res.plateMat.color.copy(pal.plate);
    res.ringMat.color.copy(pal.focus);
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
  }, [selectedIndex, focusIndex, ringVisible, palette, paint, res]);

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

      let introY = 0;
      if (intro === -1) introY = DROP;
      else if (intro >= 0) {
        const t = (now - intro - (introDelays[i] ?? 0)) / INTRO_DUR;
        if (t < 1) {
          moving = true;
          introY = t <= 0 ? DROP : DROP * (1 - easeOutCubic(t));
        }
      }

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

  const deckW = keyboardBounds.width + DECK_PAD * 2;
  const deckD = keyboardBounds.depth + DECK_PAD * 2;

  return (
    <>
      <ambientLight color={palette.ambient} intensity={palette.light ? 1.5 : 0.95} />
      <directionalLight color={palette.keyLight} position={[-4, 9, 6]} intensity={palette.light ? 2.2 : 2.6} />
      <directionalLight color={palette.rim} position={[3, 3, -7]} intensity={palette.light ? 0.7 : 2.2} />

      <group ref={tiltRef}>
        <group position={[-keyboardBounds.centerX, 0, 0]}>
          <RoundedBox
            args={[deckW, DECK_H, deckD]}
            radius={0.2}
            smoothness={4}
            position={[keyboardBounds.centerX, -DECK_H / 2, 0]}
            material={res.deckMat}
            raycast={noRaycast}
          />
          <RoundedBox
            args={[deckW - DECK_PAD, 0.04, deckD - DECK_PAD]}
            radius={0.02}
            smoothness={2}
            position={[keyboardBounds.centerX, 0, 0]}
            material={res.plateMat}
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
                position={[0, TOP_Y, 0]}
                raycast={noRaycast}
              />
              <mesh
                ref={(el) => {
                  legends.current[i] = el;
                }}
                geometry={res.legend[i]}
                material={res.legendMat}
                position={[0, LEGEND_Y, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                visible={atlasReady}
                raycast={noRaycast}
              />
            </group>
          ))}

          <mesh ref={ringRef} material={res.ringMat} rotation={[-Math.PI / 2, 0, 0]} raycast={noRaycast} />

          <ContactShadows
            key={palette.light ? "light" : "dark"}
            position={[keyboardBounds.centerX, -DECK_H - 0.02, 0]}
            scale={[deckW + 3, deckD + 3]}
            far={1.6}
            blur={2.4}
            opacity={palette.light ? 0.35 : 0.6}
            resolution={512}
            frames={1}
            color={palette.shadow}
          />
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
        camera={{ position: [-2.4, 8, 10], fov: 32, near: 0.1, far: 60 }}
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
