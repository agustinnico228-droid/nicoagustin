import Link from "next/link";
import { ContactLink } from "@/components/contact/ContactLink";
import { nav, profile } from "@/lib/site";
import { HeaderFrame } from "./HeaderFrame";
import { MobileMenu } from "./MobileMenu";
import { ThemeToggle } from "./ThemeToggle";

function Monogram({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-[0.6rem] border border-line-strong bg-surface font-display text-[0.8rem] font-bold tracking-[-0.02em] text-accent-2 ${className}`}
    >
      NA
    </span>
  );
}

export function Header() {
  const links = nav.map((n) => ({ href: n.href, label: n.label }));

  return (
    <HeaderFrame>
      <div className="container-x flex h-[4.5rem] items-center justify-between gap-3">
        <Link
          href="/"
          className="group inline-flex min-h-11 items-center gap-3 rounded-md font-display text-[1.05rem] font-semibold tracking-[-0.02em] text-text no-underline"
        >
          <Monogram className="transition-colors group-hover:border-accent" />
          <span className="whitespace-nowrap">{profile.name}</span>
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="inline-flex min-h-11 items-center rounded-full px-3.5 text-[0.92rem] text-text-2 no-underline transition-colors hover:text-text"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={profile.links.resume}
            download
            aria-label="Download résumé (PDF)"
            className="hidden min-h-11 items-center rounded-full px-3 font-mono text-[0.78rem] uppercase tracking-[0.12em] text-text-2 no-underline transition-colors hover:text-accent md:inline-flex"
          >
            Résumé
          </a>
          {/* Below 640px the toggle lives in the menu, so the bar fits at 320px. */}
          <span className="hidden sm:inline-flex">
            <ThemeToggle />
          </span>
          {/* .btn is unlayered CSS (it beats utilities), so the responsive visibility lives on a wrapper. */}
          <span className="hidden sm:inline-flex">
            <ContactLink inquiry="freelance" className="btn btn-primary">
              Let&apos;s talk
            </ContactLink>
          </span>
          <MobileMenu links={links} resume={profile.links.resume} name={profile.name} />
        </div>
      </div>
    </HeaderFrame>
  );
}
