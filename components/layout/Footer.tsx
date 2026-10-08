import { ContactLink } from "@/components/contact/ContactLink";
import { credits, profile } from "@/lib/site";

const external = [
  { href: profile.links.github, label: "GitHub" },
  { href: profile.links.linkedin, label: "LinkedIn" },
];

const linkClass =
  "inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[0.95rem] text-text-2 no-underline transition-colors hover:text-accent";

export function Footer() {
  return (
    <footer className="relative border-t border-line bg-bg-2">
      <div className="container-x pb-10 pt-[clamp(4rem,10vw,7rem)]">
        <p className="eyebrow">{profile.availability}</p>
        <h2 className="mt-5 max-w-[16ch] font-display text-[clamp(2.2rem,7vw,5.5rem)] font-bold leading-[0.98] tracking-[-0.04em] text-text">
          Have a project or a role in mind?
        </h2>
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
          <ContactLink className="btn btn-primary">Let&apos;s talk</ContactLink>
          <a
            href={`mailto:${profile.email}`}
            className="inline-flex min-h-11 items-center break-all font-mono text-[0.9rem] text-text-2 underline decoration-line-strong underline-offset-4 transition-colors hover:text-accent-2 hover:decoration-accent-2"
          >
            {profile.email}
          </a>
        </div>

        <div className="mt-16 grid gap-6 border-t border-line pt-8 sm:grid-cols-[1fr_auto] sm:items-center">
          <ul className="-mx-3 flex flex-wrap gap-x-2 gap-y-1" aria-label="Elsewhere">
            {external.map((l) => (
              <li key={l.label}>
                <a href={l.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  {l.label}
                  <svg aria-hidden="true" width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3.5 2.5h6v6M9.5 2.5 2.5 9.5" />
                  </svg>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
            <li>
              <a href={profile.links.resume} download aria-label="Download résumé (PDF)" className={linkClass}>
                Résumé
              </a>
            </li>
          </ul>
          <p className="font-mono text-[0.75rem] uppercase tracking-[0.12em] text-muted sm:text-right">{profile.location}</p>
        </div>

        <div className="mt-6 flex flex-col gap-2 text-[0.8rem] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 {profile.name}</p>
          <p>{credits}</p>
        </div>
      </div>
    </footer>
  );
}
