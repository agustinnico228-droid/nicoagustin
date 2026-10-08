import { stack, type Layer, type TechId } from "@/lib/site";

/*
 * The keyboard's layout, computed once at module load and shared by the 3D scene and the static poster.
 * Rows follow the stack layers like a real keyboard: frontend on top, then backend + database (split by a gap),
 * data & integrations, and tools nearest the viewer. Units: 1 = one key pitch. x grows right, z grows towards the viewer.
 */

export const KEY_PITCH = 1;
/** Space between two neighbouring caps. */
export const CAP_GAP = 0.14;
/** Cap depth (front to back), the same on every row. */
export const CAP_DEPTH = KEY_PITCH - CAP_GAP;

/** Width of one key on each layer, in key units. */
const LAYER_UNITS: Record<Layer, number> = {
  frontend: 1,
  backend: 1,
  database: 1,
  data: 1.25,
  tools: 2,
};

/** Which layers sit on which row (row 0 is the back row). */
const ROWS: Layer[][] = [["frontend"], ["backend", "database"], ["data"], ["tools"]];
/** Extra space between two layers sharing a row. */
const LAYER_GAP = 0.5;
/** Small horizontal stagger per row, like a real keyboard. */
const ROW_STAGGER = [-0.2, 0, 0.2, 0];

export type KeyCap = {
  /** Position in `keys` (also the legend atlas cell). */
  index: number;
  id: TechId;
  label: string;
  legend: string;
  layer: Layer;
  row: number;
  /** Centre of the cap. */
  x: number;
  z: number;
  /** Width in key units (1, 1.25 or 2). */
  units: number;
  /** Cap width in scene units. */
  width: number;
};

function build() {
  const keys: KeyCap[] = [];
  const rows: number[][] = [];

  ROWS.forEach((rowLayers, row) => {
    const techs = rowLayers.map((layer) => stack.filter((t) => t.layer === layer));
    let rowWidth = 0;
    techs.forEach((group, gi) => {
      const units = LAYER_UNITS[rowLayers[gi] ?? "frontend"];
      rowWidth += group.length * units * KEY_PITCH;
      if (gi > 0) rowWidth += LAYER_GAP;
    });

    let cursor = -rowWidth / 2 + (ROW_STAGGER[row] ?? 0);
    const z = (row - (ROWS.length - 1) / 2) * KEY_PITCH;
    const rowIndexes: number[] = [];

    techs.forEach((group, gi) => {
      if (gi > 0) cursor += LAYER_GAP;
      const units = LAYER_UNITS[rowLayers[gi] ?? "frontend"];
      for (const tech of group) {
        const span = units * KEY_PITCH;
        const index = keys.length;
        keys.push({
          index,
          id: tech.id,
          label: tech.label,
          legend: tech.key,
          layer: tech.layer,
          row,
          x: cursor + span / 2,
          z,
          units,
          width: span - CAP_GAP,
        });
        rowIndexes.push(index);
        cursor += span;
      }
    });
    rows.push(rowIndexes);
  });

  let minX = Infinity;
  let maxX = -Infinity;
  for (const k of keys) {
    minX = Math.min(minX, k.x - k.width / 2);
    maxX = Math.max(maxX, k.x + k.width / 2);
  }
  const minZ = -((ROWS.length - 1) / 2) * KEY_PITCH - CAP_DEPTH / 2;
  const maxZ = ((ROWS.length - 1) / 2) * KEY_PITCH + CAP_DEPTH / 2;

  return {
    keys,
    rows,
    bounds: { minX, maxX, minZ, maxZ, width: maxX - minX, depth: maxZ - minZ, centerX: (minX + maxX) / 2 },
  };
}

const layout = build();

export const keys: readonly KeyCap[] = layout.keys;
/** Key indexes per row, left to right. */
export const keyRows: readonly number[][] = layout.rows;
export const keyboardBounds = layout.bounds;
/** Distinct cap widths, for sharing geometries. */
export const capWidths: readonly number[] = Array.from(new Set(layout.keys.map((k) => k.width)));

export function keyIndexOf(id: TechId | null): number {
  if (!id) return -1;
  return layout.keys.findIndex((k) => k.id === id);
}

export type Direction = "left" | "right" | "up" | "down" | "home" | "end";

/** The key reached from `index` by an arrow key: left/right within the row, up/down to the nearest key in the next row. */
export function neighbourKey(index: number, dir: Direction): number {
  const key = layout.keys[index];
  if (!key) return 0;
  const row = layout.rows[key.row] ?? [];
  const pos = row.indexOf(index);

  if (dir === "left") return row[Math.max(0, pos - 1)] ?? index;
  if (dir === "right") return row[Math.min(row.length - 1, pos + 1)] ?? index;
  if (dir === "home") return row[0] ?? index;
  if (dir === "end") return row[row.length - 1] ?? index;

  const target = layout.rows[key.row + (dir === "up" ? -1 : 1)];
  if (!target || target.length === 0) return index;
  let best = index;
  let bestDist = Infinity;
  for (const i of target) {
    const k = layout.keys[i];
    if (!k) continue;
    const d = Math.abs(k.x - key.x);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}
