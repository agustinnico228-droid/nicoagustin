import { projects } from "@/content/projects";
import { techById } from "@/lib/site";
import { WorkList, type WorkItem } from "./WorkList";

/* Only what the rows need crosses to the client (no case-study bodies). */
const items: WorkItem[] = projects.map((p) => {
  const chips = (p.techs.length > 0 ? p.techs.map((t) => techById[t].label) : p.stack).slice(0, 4);
  const emphasised = p.kpis?.kpis.filter((k) => k.emphasis).map((k) => ({ label: k.label, value: k.value }));
  return {
    slug: p.slug,
    index: p.index,
    title: p.title,
    kind: p.kind,
    year: p.year,
    summary: p.summary,
    chips,
    techs: p.techs,
    cover: p.cover ? { src: p.cover.src, width: p.cover.width, height: p.cover.height, alt: p.cover.alt } : undefined,
    kpis: !p.cover && emphasised && emphasised.length > 0 ? emphasised : undefined,
    kpiPeriod: !p.cover ? p.kpis?.period : undefined,
  };
});

export function Work() {
  return (
    <section id="work" aria-labelledby="work-title" className="section">
      <div className="container-x">
        <header data-reveal className="mb-10 grid gap-6 sm:mb-14 lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-end">
          <div>
            <p className="eyebrow">Case studies · 01–{String(projects.length).padStart(2, "0")}</p>
            <h2 id="work-title" className="section-title mt-4">
              Selected work
            </h2>
          </div>
          <p className="text-text-2">
            Dashboards, a lead campaign, websites, an operations portal and an AI prototype. Press a key on the
            keyboard in the stack section to highlight the projects that use it.
          </p>
        </header>
        <WorkList items={items} />
      </div>
    </section>
  );
}
