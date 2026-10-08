import { ContactForm } from "@/components/contact/ContactForm";
import { profile } from "@/lib/site";

type Direct = { label: string; value: string; href: string; external?: boolean; note?: string };

const direct: Direct[] = [
  { label: "Email", value: profile.email, href: `mailto:${profile.email}` },
  { label: "LinkedIn", value: "Nico Agustin", href: profile.links.linkedin, external: true },
  { label: "GitHub", value: "agustinnico228-droid", href: profile.links.github, external: true },
  { label: "Résumé", value: "Download", href: profile.links.resume, note: "PDF" },
];

export function Contact() {
  return (
    <section id="contact" aria-labelledby="contact-title" className="section relative">
      <div aria-hidden="true" className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="container-x relative grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20">
        <div>
          <div data-reveal>
            <p className="eyebrow">Contact</p>
            <h2 id="contact-title" className="section-title mt-4">
              Let&apos;s talk
            </h2>
            <p className="mt-6 max-w-[42ch] text-lg text-text-2">
              A freelance project or a full-time role: tell me what you&apos;re building.
            </p>
          </div>

          <ul data-reveal className="mt-10 border-t border-line">
            {direct.map((d) => (
              <li key={d.label} className="border-b border-line">
                <a
                  href={d.href}
                  {...(d.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="group flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 no-underline"
                >
                  <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{d.label}</span>
                  <span className="flex min-w-0 items-center gap-2 text-text transition-colors group-hover:text-accent">
                    <span className="break-all">{d.value}</span>
                    {d.note ? <span className="font-mono text-xs text-muted">({d.note})</span> : null}
                    {d.external ? <span className="sr-only"> (opens in a new tab)</span> : null}
                    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                      <path d="M7 17 17 7M9 7h8v8" />
                    </svg>
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <p data-reveal className="mt-6 font-mono text-xs text-muted">
            {profile.location}
          </p>
        </div>

        <div data-reveal className="self-start rounded-3xl border border-line-strong bg-surface p-5 shadow-[var(--shadow)] sm:p-8">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}
