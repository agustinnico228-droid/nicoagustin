import Link from "next/link";
import { projects } from "@/content/projects";
import { certificates } from "@/lib/site";

export function Certificates() {
  return (
    <section id="certificates" aria-labelledby="certificates-title" className="section">
      <div className="container-x">
        <header data-reveal className="mb-12 sm:mb-16">
          <p className="eyebrow">Certificates</p>
          <h2 id="certificates-title" className="section-title mt-4">
            Certificates
          </h2>
        </header>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {certificates.map((c, i) => {
            const pinned = i === 0;
            const caseStudy = c.verify ? projects.find((p) => p.verify?.href === c.verify) : undefined;
            return (
              <li
                key={c.id}
                data-reveal
                className={[
                  "relative flex flex-col overflow-hidden rounded-3xl border p-6 sm:p-7",
                  c.featured
                    ? "border-line-strong bg-surface shadow-[0_0_60px_-24px_var(--glow)]"
                    : "border-line bg-bg-2",
                  pinned ? "sm:col-span-2" : "",
                ].join(" ")}
              >
                {c.featured ? (
                  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-accent via-accent-2 to-transparent" />
                ) : null}
                <p className="eyebrow">{c.issuer}</p>
                <h3
                  className={[
                    "mt-3 font-display font-bold leading-snug tracking-[-0.01em] text-text",
                    pinned ? "text-2xl sm:text-3xl" : "text-xl",
                  ].join(" ")}
                >
                  {c.title}
                </h3>
                <p className="mt-3 font-mono text-xs text-muted">
                  {c.date && c.isoDate ? (
                    <>
                      <time dateTime={c.isoDate}>{c.date}</time>
                      <span aria-hidden="true"> · </span>
                    </>
                  ) : null}
                  {c.kind}
                </p>
                {c.note ? <p className="mt-4 max-w-[56ch] text-text-2">{c.note}</p> : null}
                {c.skills.length > 0 ? (
                  <ul className="mt-5 flex flex-wrap gap-2" aria-label="Skills">
                    {c.skills.map((s) => (
                      <li key={s} className="chip">
                        {s}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {c.verify || caseStudy ? (
                  <div className="mt-auto flex flex-wrap gap-x-5 pt-5">
                    {c.verify ? (
                      <a
                        href={c.verify}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Verify ${c.title} (opens in a new tab)`}
                        className="inline-flex min-h-11 items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-accent no-underline hover:underline"
                      >
                        Verify
                        <svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M7 17 17 7M9 7h8v8" />
                        </svg>
                      </a>
                    ) : null}
                    {caseStudy ? (
                      <Link
                        href={`/work/${caseStudy.slug}`}
                        className="inline-flex min-h-11 items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-text-2 no-underline hover:text-accent hover:underline"
                      >
                        Read the case study<span className="sr-only">: {caseStudy.title}</span>
                      </Link>
                    ) : null}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
