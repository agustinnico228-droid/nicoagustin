import * as THREE from "three";

/*
 * "Data you can build on": an instanced skyline of thin bars whose heights move like live chart data,
 * coloured by height (navy → electric blue → cyan), with drifting particles and a few floating data lines.
 * Built imperatively (plain three.js objects owned by this module) so React never has to track mutable state.
 * Colours come from the page's CSS variables, so the scene matches both site themes.
 * Per frame: one matrix + one colour per bar and a few hundred floats; no allocations.
 */

export type SkylineTheme = "dark" | "light";

export type Skyline = {
  update: (t: number, delta: number, pointer: { x: number; y: number } | null) => void;
  setTheme: (theme: SkylineTheme) => void;
  dispose: () => void;
};

const COLS = 26;
const ROWS = 14;
const COUNT = COLS * ROWS;
const GAP = 0.56;
const BAR = 0.3;
const PARTICLES = 140;
const LINE_POINTS = 64;
const LINES = 3;
const MIN_H = 0.12;
const MAX_H = 3.4;

function cssColor(target: THREE.Color, name: string, fallback: string) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  target.setStyle(raw || fallback);
}

function waveHeight(x: number, z: number, t: number, phase: number): number {
  const ridge = 1.1 * Math.exp(-((x - 1.5) * (x - 1.5)) / 30);
  const h =
    0.55 +
    ridge +
    0.85 * (0.5 + 0.5 * Math.sin(x * 0.42 + t * 0.8)) * (0.65 + 0.35 * Math.sin(z * 0.55 - t * 0.55)) +
    0.38 * Math.sin((x + z) * 0.31 + t * 1.15 + phase) +
    0.2 * Math.sin(x * 1.3 - z * 0.7 + t * 0.45);
  return h < MIN_H ? MIN_H : h > MAX_H ? MAX_H : h;
}

/** Deterministic pseudo-random in [0, 1). */
function hash(n: number): number {
  const s = Math.sin(n) * 43758.5453;
  return s - Math.floor(s);
}

export function createSkyline(scene: THREE.Scene, camera: THREE.Camera): Skyline {
  // Palette, refreshed from CSS on theme change.
  const bg = new THREE.Color();
  const low = new THREE.Color();
  const mid = new THREE.Color();
  const high = new THREE.Color();

  const root = new THREE.Group();
  root.rotation.y = -0.55;
  scene.add(root);

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.55);
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(6, 10, 4);
  const rim = new THREE.DirectionalLight(0xffffff, 0.35);
  rim.position.set(-8, 4, -6);
  scene.add(ambient, key, rim);

  // Fog fades the far rows into the page background.
  const fog = new THREE.Fog(0x000000, 12, 30);
  scene.fog = fog;

  // Bars
  const xs = new Float32Array(COUNT);
  const zs = new Float32Array(COUNT);
  const phases = new Float32Array(COUNT);
  let k = 0;
  for (let i = 0; i < COLS; i++) {
    for (let j = 0; j < ROWS; j++) {
      xs[k] = (i - (COLS - 1) / 2) * GAP;
      zs[k] = (j - (ROWS - 1) / 2) * GAP;
      phases[k] = (hash(i * 12.9898 + j * 78.233) - 0.5) * 1.2;
      k++;
    }
  }
  const barGeometry = new THREE.BoxGeometry(BAR, 1, BAR);
  barGeometry.translate(0, 0.5, 0); // grow from the floor
  const barMaterial = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.15 });
  const bars = new THREE.InstancedMesh(barGeometry, barMaterial, COUNT);
  bars.frustumCulled = false;
  const white = new THREE.Color(1, 1, 1);
  for (let n = 0; n < COUNT; n++) bars.setColorAt(n, white); // allocates instanceColor
  root.add(bars);

  // Particles
  const positions = new Float32Array(PARTICLES * 3);
  for (let p = 0; p < PARTICLES; p++) {
    positions[p * 3] = (hash(p * 91.7) - 0.5) * COLS * GAP * 1.1;
    positions[p * 3 + 1] = 0.6 + hash(p * 47.3 + 1.3) * 4.4;
    positions[p * 3 + 2] = (hash(p * 13.1 + 2.7) - 0.5) * ROWS * GAP * 1.6;
  }
  const particleGeometry = new THREE.BufferGeometry();
  const particleAttr = new THREE.BufferAttribute(positions, 3);
  particleAttr.setUsage(THREE.DynamicDrawUsage);
  particleGeometry.setAttribute("position", particleAttr);
  const particleMaterial = new THREE.PointsMaterial({
    size: 0.045,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.frustumCulled = false;
  root.add(particles);

  // Floating "data lines": thin polylines shaped like small line charts.
  const lineMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.55 });
  const lineGroup = new THREE.Group();
  const lineGeometries: THREE.BufferGeometry[] = [];
  const width = COLS * GAP * 0.8;
  for (let l = 0; l < LINES; l++) {
    const pts = new Float32Array(LINE_POINTS * 3);
    for (let p = 0; p < LINE_POINTS; p++) {
      const u = p / (LINE_POINTS - 1);
      pts[p * 3] = (u - 0.5) * width;
      pts[p * 3 + 1] = 0.35 * Math.sin(u * 9 + l * 2.1) + 0.18 * Math.sin(u * 23 + l);
      pts[p * 3 + 2] = 0;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    lineGeometries.push(g);
    const line = new THREE.Line(g, lineMaterial);
    line.position.set(0, 3.6 + l * 0.75, -1.6 - l * 1.4);
    lineGroup.add(line);
  }
  root.add(lineGroup);

  // Scratch
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  let rotX = 0;
  let rotY = 0;
  const range = MAX_H - MIN_H;

  function setTheme(theme: SkylineTheme) {
    const light = theme === "light";
    cssColor(bg, "--bg", light ? "rgb(243, 246, 253)" : "rgb(5, 9, 20)");
    cssColor(low, "--surface-2", light ? "rgb(227, 234, 251)" : "rgb(17, 32, 74)");
    cssColor(mid, "--accent", light ? "rgb(29, 78, 216)" : "rgb(77, 141, 255)");
    cssColor(high, "--accent-2", light ? "rgb(14, 116, 144)" : "rgb(46, 230, 255)");
    fog.color.copy(bg);
    ambient.intensity = light ? 1.1 : 0.55;
    key.intensity = light ? 1.4 : 1.8;
    barMaterial.emissive.copy(low);
    barMaterial.emissiveIntensity = light ? 0.05 : 0.25;
    particleMaterial.color.copy(high);
    particleMaterial.opacity = light ? 0.55 : 0.7;
    lineMaterial.color.copy(mid);
    lineMaterial.opacity = light ? 0.45 : 0.55;
  }

  function update(t: number, delta: number, pointer: { x: number; y: number } | null) {
    const dt = Math.min(delta, 0.1);

    for (let n = 0; n < COUNT; n++) {
      const x = xs[n] ?? 0;
      const z = zs[n] ?? 0;
      const h = waveHeight(x, z, t, phases[n] ?? 0);
      m.makeScale(1, h, 1);
      m.setPosition(x, 0, z);
      bars.setMatrixAt(n, m);
      const v = (h - MIN_H) / range;
      if (v < 0.5) c.copy(low).lerp(mid, v * 2);
      else c.copy(mid).lerp(high, (v - 0.5) * 2);
      bars.setColorAt(n, c);
    }
    bars.instanceMatrix.needsUpdate = true;
    if (bars.instanceColor) bars.instanceColor.needsUpdate = true;

    // Damped pointer parallax (tilt ≤ 0.25 rad) and a slow camera drift.
    const damp = 1 - Math.exp(-dt * 2.5);
    rotY += ((pointer?.x ?? 0) * 0.25 - rotY) * damp;
    rotX += ((pointer?.y ?? 0) * 0.08 - rotX) * damp;
    root.rotation.y = -0.55 + rotY;
    root.rotation.x = rotX;
    camera.position.x = Math.sin(t * 0.07) * 0.8;
    camera.position.y = 5.6 + Math.sin(t * 0.11) * 0.25;
    camera.lookAt(0, -1.6, 0); // aimed below the floor so the skyline sits high in the frame, clear of the stat strip

    // Particles rise slowly and wrap.
    const rise = dt * 0.12;
    for (let q = 1; q < positions.length; q += 3) {
      const y = (positions[q] ?? 0) + rise;
      positions[q] = y > 5 ? 0.6 : y;
    }
    particleAttr.needsUpdate = true;

    lineGroup.position.y = Math.sin(t * 0.4) * 0.12;
  }

  function dispose() {
    scene.remove(root, ambient, key, rim);
    if (scene.fog === fog) scene.fog = null;
    barGeometry.dispose();
    barMaterial.dispose();
    bars.dispose();
    particleGeometry.dispose();
    particleMaterial.dispose();
    for (const g of lineGeometries) g.dispose();
    lineMaterial.dispose();
  }

  setTheme("dark");
  update(0, 0, null);
  return { update, setTheme, dispose };
}
