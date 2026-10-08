import { projects } from "@/content/projects";
import { layers, stack, type TechId } from "@/lib/site";
import { KeyboardCanvas } from "./KeyboardCanvas";
import { KeyboardPoster } from "./KeyboardPoster";
import { layerStyles } from "./layer-styles";
import { StackList, type StackGroup } from "./StackList";
import { UsedIn, type UsedInEntry } from "./UsedIn";

/*
 * The Stack section: an interactive 3D keyboard (one row per layer) with a "Used in" panel, then the plain list.
 * Only slim, serialisable data crosses to the client components (no project prose in the client bundle).
 */

const layerLabelOf = (id: string) => layers.find((l) => l.id === id)?.label ?? "";

function usedInData(): Record<TechId, UsedInEntry> {
  return Object.fromEntries(
    stack.map((tech) => [
      tech.id,
      {
        label: tech.label,
        layerLabel: layerLabelOf(tech.layer),
        ...(tech.alsoIn ? { alsoIn: tech.alsoIn } : {}),
        projects: projects
          .filter((p) => p.techs.includes(tech.id))
          .map((p) => ({ index: p.index, title: p.title, slug: p.slug })),
      } satisfies UsedInEntry,
    ]),
  ) as Record<TechId, UsedInEntry>;
}

function groupsData(): StackGroup[] {
  return layers.map((layer) => ({
    id: layer.id,
    label: layer.label,
    techs: stack.filter((t) => t.layer === layer.id).map((t) => ({ id: t.id, label: t.label })),
  }));
}

export function Stack() {
  return (
    <section id="stack" aria-labelledby="stack-title" className="section cv-auto relative [contain-intrinsic-size:auto_1500px]">
      <style>{layerStyles}</style>
      <div className="container-x">
        <div data-reveal>
          <p className="eyebrow">What I build with</p>
          <h2 id="stack-title" className="section-title mt-4 font-display text-text">
            The stack
          </h2>
          <p className="mt-5 max-w-xl text-lg text-text-2">Press a key to see where I&apos;ve used it.</p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:items-stretch">
          <KeyboardCanvas poster={<KeyboardPoster />} />
          <UsedIn techs={usedInData()} />
        </div>

        <div className="mt-16 border-t border-line pt-10">
          <p className="mb-8 max-w-xl text-sm text-text-2">
            The same keys as a list. Pick one to light it up and see where it&apos;s used.
          </p>
          <StackList groups={groupsData()} />
        </div>
      </div>
    </section>
  );
}
