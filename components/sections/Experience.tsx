import { education, experience, seminars, volunteering } from "@/lib/site";

export function Experience() {
  const dev = experience.filter((e) => e.kind === "dev");
  const earlier = experience.filter((e) => e.kind === "earlier");

  return (
    <section id="experience" aria-labelledby="experience-title" className="section cv-auto [contain-intrinsic-size:auto_1200px]">
      <div className="container-x">
        <header data-reveal className="mb-12 sm:mb-16">
          <p className="eyebrow">Experience</p>
          <h2 id="experience-title" className="section-title mt-4">
            Where I&apos;ve worked
          </h2>
        </header>

        <div className="grid gap-16 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-20">
          {/* Timeline */}
          <div>
            <ol className="relative ml-1.5 border-l border-line-strong">
              {dev.map((e) => (
                <li key={`${e.org}-${e.start}`} data-reveal className="relative pb-12 pl-8 sm:pl-10">
                  <span
                    aria-hidden="true"
                    className="absolute -left-[7px] top-2 size-[13px] rounded-full border-2 border-accent-2 bg-bg shadow-[0_0_0_4px_var(--glow)]"
                  />
                  <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">{e.dates}</p>
                  <h3 className="mt-2 font-display text-2xl font-bold leading-tight tracking-[-0.02em] text-text sm:text-3xl">
                    {e.role}
                  </h3>
                  <p className="mt-1 text-lg text-accent">{e.org}</p>
                  {e.summary ? <p className="mt-4 max-w-[60ch] text-text-2">{e.summary}</p> : null}
                  {e.points && e.points.length > 0 ? (
                    <ul className="mt-4 max-w-[60ch] space-y-2 text-text-2">
                      {e.points.map((pt) => (
                        <li key={pt} className="relative pl-5">
                          <span aria-hidden="true" className="absolute left-0 top-[0.7em] h-px w-2.5 bg-accent" />
                          {pt}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}

              {earlier.length > 0 ? (
                <li data-reveal className="relative pl-8 sm:pl-10">
                  <span aria-hidden="true" className="absolute -left-[5px] top-2 size-[9px] rounded-full bg-line-strong" />
                  <h3 className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Earlier</h3>
                  <ul className="mt-4 divide-y divide-line border-y border-line">
                    {earlier.map((e) => (
                      <li key={`${e.org}-${e.start}`} className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
                        <p className="text-text">
                          {e.role} <span className="text-muted">· {e.org}</span>
                        </p>
                        <p className="font-mono text-xs text-muted">{e.dates}</p>
                      </li>
                    ))}
                  </ul>
                </li>
              ) : null}
            </ol>
          </div>

          {/* Education + also */}
          <div className="space-y-12">
            <div data-reveal>
              <h3 className="font-display text-xl font-bold tracking-[-0.01em] text-text">Education</h3>
              <ul className="mt-5 space-y-4">
                {education.map((ed) => (
                  <li key={ed.school} className="rounded-2xl border border-line bg-surface p-5">
                    <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">{ed.dates}</p>
                    <p className="mt-2 font-display text-lg font-semibold leading-snug text-text">{ed.school}</p>
                    <p className="mt-1 text-text-2">{ed.degree}</p>
                    {ed.note ? <p className="chip mt-3 border-accent text-accent">{ed.note}</p> : null}
                  </li>
                ))}
              </ul>
            </div>

            <div data-reveal>
              <h3 className="font-display text-xl font-bold tracking-[-0.01em] text-text">Also</h3>
              <h4 className="mt-5 font-mono text-xs uppercase tracking-[0.14em] text-muted">Seminars</h4>
              <ul className="mt-3 space-y-2 text-sm text-text-2">
                {seminars.map((s) => (
                  <li key={s} className="border-l border-line-strong pl-3">
                    {s}
                  </li>
                ))}
              </ul>
              <h4 className="mt-6 font-mono text-xs uppercase tracking-[0.14em] text-muted">Volunteering</h4>
              <ul className="mt-3 space-y-2 text-sm text-text-2">
                {volunteering.map((v) => (
                  <li key={v} className="border-l border-line-strong pl-3">
                    {v}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
