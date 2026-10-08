"use client";

import type { Layer, TechId } from "@/lib/site";
import { selectTech, useSelectedTech } from "@/lib/tech-store";
import { layerClass } from "./layer-styles";

export type StackGroup = { id: Layer; label: string; techs: { id: TechId; label: string }[] };

/**
 * The plain stack list, grouped by layer: the accessible and mobile path to the same selection as the 3D keyboard.
 * Each tech is a toggle button styled as a small keycap.
 */
export function StackList({ groups }: { groups: StackGroup[] }) {
  const selected = useSelectedTech();

  return (
    <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => (
        <div key={group.id} className={layerClass(group.id)}>
          <h3 className="flex items-center gap-2 font-mono text-xs tracking-[0.14em] text-muted uppercase">
            <span aria-hidden="true" className="size-2 rounded-full" style={{ background: "var(--layer)" }} />
            {group.label}
          </h3>
          <ul className="mt-4 flex flex-wrap gap-2" role="list">
            {group.techs.map((tech) => {
              const pressed = selected === tech.id;
              return (
                <li key={tech.id}>
                  <button
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => selectTech(tech.id)}
                    className="inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-line-strong bg-surface px-3.5 font-mono text-[0.8rem] text-text-2 shadow-[inset_0_-3px_0_var(--line-strong)] transition-[transform,background-color,color,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-accent hover:text-text active:translate-y-px active:shadow-none aria-pressed:border-accent-2 aria-pressed:bg-accent-2 aria-pressed:text-btn-fg aria-pressed:shadow-[0_0_0_4px_var(--glow)]"
                  >
                    {tech.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
