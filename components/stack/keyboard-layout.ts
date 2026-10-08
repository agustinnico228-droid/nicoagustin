import { stack, type Layer, type TechId } from "@/lib/site";

/*
 * The keyboard's layout, computed once at module load and shared by the 3D scene and the static poster.
 * Rows follow the stack layers like a real keyboard: frontend on top, then backend + database (split by a gap),
 * data & integrations, and tools nearest the viewer. Every row is justified to the width of the widest row (keys on
 * shorter rows grow, like a real board's wider keys), so the key block is a clean rectangle centred on the origin:
 * the deck can sit under it with the same margin on every side.
 * Units: 1 = one key pitch. x grows right, z grows towards the viewer.
 */

export const KEY_PITCH = 1;
/** Space between two neighbouring caps. */
export const CAP_GAP = 0.12;
/** Cap depth (front to back), the same on every row. */
export const CAP_DEPTH = KEY_PITCH - CAP_GAP;

/** Nominal width of one key on each layer, in key units (short rows are stretched to the widest row). */
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
  /** Key span in key units (after the row is justified). */
  units: number;
  /** Cap width in scene units. */
  width: number;
};

const round = (n: number) => Math.round(n * 1e6) / 1e6;

function build() {
  const keys: KeyCap[] = [];
  const rows: number[][] = [];

  const rowGroups = ROWS.map((rowLayers) =>
    rowLayers
      .map((layer) => ({ layer, techs: stack.filter((t) => t.layer === layer) }))
      .filter((g) => g.techs.length > 0),
  ).filter((groups) => groups.length > 0);

  const units = (groups: (typeof rowGroups)[number]) =>
    groups.reduce((sum, g) => sum + g.techs.length * LAYER_UNITS[g.layer], 0);
  const gaps = (groups: (typeof rowGroups)[number]) => Math.max(0, groups.length - 1) * LAYER_GAP;
  const rowWidth = rowGroups.reduce((w, groups) => Math.max(w, units(groups) + gaps(groups)), 0);

  rowGroups.forEach((groups, row) => {
    const u = units(groups);
    const stretch = u > 0 ? (rowWidth - gaps(groups)) / u : 1;
    const z = (row - (rowGroups.length - 1) / 2) * KEY_PITCH;
    let cursor = -rowWidth / 2;
    const rowIndexes: number[] = [];

    groups.forEach((group, gi) => {
      if (gi > 0) cursor += LAYER_GAP;
      const span = LAYER_UNITS[group.layer] * stretch * KEY_PITCH;
      for (const tech of group.techs) {
        const index = keys.length;
        keys.push({
          index,
          id: tech.id,
          label: tech.label,
          legend: tech.key,
          layer: tech.layer,
          row,
          x: round(cursor + span / 2),
          z: round(z),
          units: round(span / KEY_PITCH),
          width: round(span - CAP_GAP),
        });
        rowIndexes.push(index);
        cursor += span;
      }
    });
    rows.push(rowIndexes);
  });

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const k of keys) {
    minX = Math.min(minX, k.x - k.width / 2);
    maxX = Math.max(maxX, k.x + k.width / 2);
    minZ = Math.min(minZ, k.z - CAP_DEPTH / 2);
    maxZ = Math.max(maxZ, k.z + CAP_DEPTH / 2);
  }
  if (keys.length === 0) {
    minX = maxX = minZ = maxZ = 0;
  }

  return {
    keys,
    rows,
    bounds: {
      minX,
      maxX,
      minZ,
      maxZ,
      width: maxX - minX,
      depth: maxZ - minZ,
      centerX: (minX + maxX) / 2,
      centerZ: (minZ + maxZ) / 2,
    },
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
