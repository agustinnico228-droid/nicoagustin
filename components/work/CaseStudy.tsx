import Link from "next/link";
import type { ReactNode } from "react";
import { ContactLink } from "@/components/contact/ContactLink";
import type { Project } from "@/content/types";
import { DemoEmbed } from "./DemoEmbed";
import { Diagram } from "./diagrams/Diagram";
import { Gallery } from "./Gallery";
import { KpiBoard } from "./KpiBoard";
import { ProjectNav } from "./ProjectNav";
import { VideoPlayer } from "./VideoPlayer";

/*
 * One case study. Every block renders only when the project has content for it: no placeholders, no empty headings.
 * Order: header, facts, problem, role, stack, architecture, extra sections, media, learned, small print, nav, CTA.
 */

const has = <T,>(list: T[] | undefined): list is T[] => !!list && list.length > 0;

function Block({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      data-reveal
      className="grid gap-5 border-t border-line pt-10 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12"
    >
      <h2 id={id} className="font-display text-xl font-semibold tracking-tight text-text lg:text-2xl">
        {title}
      </h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function Paragraphs({ items }: { items: string[] }) {
  return (
    <div className="grid max-w-prose gap-4 text-base leading-relaxed text-text-2 sm:text-lg">
      {items.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="grid max-w-prose gap-2.5 text-text-2">
      {items.map((b, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden="true" className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="min-w-0 border-t border-line pt-3">
      <dt className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">{term}</dt>
      <dd className="mt-1.5 text-text">{children}</dd>
    </div>
  );
}

const externalLink =
  "inline-flex min-h-11 items-center gap-1.5 font-medium text-accent underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-accent";

export function CaseStudy({ project, prev, next }: { project: Project; prev?: Project; next?: Project }) {
  const meta = [project.kind, project.year, project.context].filter((v): v is string => !!v);
  const arch = project.architecture;
  const hasArch = !!arch && (!!arch.diagram || has(arch.body) || has(arch.bullets));
  const videos = project.videos ?? [];

  return (
    <article className="pb-24 pt-28 sm:pt-32">
      {/* ── Header ── */}
      <header className="relative overflow-hidden border-b border-line">
        <div aria-hidden="true" className="bg-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="container-x relative pb-14">
          <Link
            href="/#work"
            className="inline-flex min-h-11 items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-text-2 transition-colors hover:text-accent"
          >
            <span aria-hidden="true">←</span> Selected work
          </Link>

          <div className="mt-8 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <span className="font-mono text-sm text-accent-2">{project.index}</span>
            <p className="eyebrow">{meta.join(" · ")}</p>
          </div>
          <h1
            className="mt-4 max-w-5xl font-display text-[clamp(2.4rem,7vw,5.5rem)] font-bold leading-[0.98] tracking-[-0.035em] text-text [overflow-wrap:anywhere]"
          >
            {project.title}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-text-2 sm:text-xl">
            {project.lede}
          </p>

          {/* ── Facts: known fields only ── */}
          <dl className="mt-12 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4" data-reveal>
            {project.role && <Fact term="Role">{project.role}</Fact>}
            {project.client && (
              <Fact term="Client">
                {project.client.url ? (
                  <a href={project.client.url} target="_blank" rel="noopener" className={externalLink}>
                    {project.client.name}
                    <span aria-hidden="true">↗</span>
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                ) : (
                  project.client.name
                )}
              </Fact>
            )}
            {has(project.stack) && (
              <Fact term="Stack">
                <ul className="flex flex-wrap gap-2">
                  {project.stack.map((s) => (
                    <li key={s} className="chip" style={{ whiteSpace: "normal" }}>
                      {s}
                    </li>
                  ))}
                </ul>
              </Fact>
            )}
            {project.live && (
              <Fact term="Live">
                <a href={project.live.href} target="_blank" rel="noopener" className={externalLink}>
                  {project.live.label}
                  <span aria-hidden="true">↗</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </Fact>
            )}
            {project.verify && (
              <Fact term="Verify">
                <a href={project.verify.href} target="_blank" rel="noopener" className={externalLink}>
                  {project.verify.label}
                  <span aria-hidden="true">↗</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </Fact>
            )}
          </dl>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="container-x mt-16 grid gap-16">
        {has(project.problem) && (
          <Block id="the-problem" title="The problem">
            <Paragraphs items={project.problem} />
          </Block>
        )}

        {project.role && (
          <Block id="my-role" title="My role">
            <p className="max-w-prose text-lg text-text-2">{project.role}</p>
          </Block>
        )}

        {has(project.stack) && (
          <Block id="stack" title="Stack">
            <ul className="grid max-w-3xl gap-x-8 gap-y-2 text-text-2 sm:grid-cols-2">
              {project.stack.map((s) => (
                <li key={s} className="flex gap-3 border-b border-line py-2">
                  <span aria-hidden="true" className="font-mono text-xs leading-7 text-accent">
                    ▸
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </Block>
        )}

        {hasArch && arch && (
          <Block id="architecture" title="Architecture">
            <div className="grid gap-6">
              {arch.diagram && <Diagram id={arch.diagram} />}
              {has(arch.body) && <Paragraphs items={arch.body} />}
              {has(arch.bullets) && <Bullets items={arch.bullets} />}
            </div>
          </Block>
        )}

        {(project.sections ?? [])
          .filter((s) => has(s.body) || has(s.bullets))
          .map((s) => (
            <Block key={s.heading} id={`s-${slugify(s.heading)}`} title={s.heading}>
              <div className="grid gap-5">
                {has(s.body) && <Paragraphs items={s.body} />}
                {has(s.bullets) && <Bullets items={s.bullets} />}
              </div>
            </Block>
          ))}

        {has(project.demos) && (
          <Block id="live-demos" title="Live demos">
            <p className="mb-6 max-w-prose text-text-2">
              Every demo runs on generated sample data. On a desktop, load one here; on any device, open it full screen.
            </p>
            <DemoEmbed demos={project.demos} />
          </Block>
        )}

        {videos.length > 0 && (
          <Block id="recording" title={videos.length > 1 ? "Recordings" : "Recording"}>
            <div className="grid gap-12">
              {videos.map((v) => (
                <VideoPlayer key={v.src} video={v} />
              ))}
            </div>
          </Block>
        )}

        {has(project.gallery) && (
          <Block id="screens" title="Screens">
            <Gallery images={project.gallery} />
          </Block>
        )}

        {project.kpis && (
          <Block id="results" title="Results">
            <KpiBoard board={project.kpis} />
          </Block>
        )}

        {has(project.learned) && (
          <Block id="what-i-learned" title="What I learned">
            <Paragraphs items={project.learned} />
          </Block>
        )}

        {(has(project.disclosures) || has(project.credits)) && (
          <aside aria-label="Notes and credits" className="grid gap-3 border-t border-line pt-8 text-sm text-muted" data-reveal>
            {has(project.disclosures) && (
              <ul className="grid max-w-prose gap-2">
                {project.disclosures.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            )}
            {has(project.credits) && (
              <ul className="grid max-w-prose gap-1 font-mono text-xs">
                {project.credits.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            )}
          </aside>
        )}

        <div data-reveal>
          <ProjectNav prev={prev} next={next} />
        </div>

        <section
          aria-labelledby="case-cta"
          data-reveal
          className="relative overflow-hidden rounded-3xl border border-line bg-surface px-6 py-12 text-center sm:px-12"
        >
          <div aria-hidden="true" className="bg-grid pointer-events-none absolute inset-0 opacity-70" />
          <div className="relative">
            <h2 id="case-cta" className="section-title text-text">
              Need something like this?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-text-2">
              Websites, CRMs and reporting dashboards. Tell me what you have in mind.
            </p>
            <div className="mt-8 flex justify-center">
              <ContactLink inquiry="freelance" className="btn btn-primary">
                Let&rsquo;s talk
              </ContactLink>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}
