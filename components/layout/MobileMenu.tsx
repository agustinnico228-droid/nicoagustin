"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ContactLink } from "@/components/contact/ContactLink";
import { ThemeToggle } from "./ThemeToggle";

type Props = {
  links: { href: string; label: string }[];
  resume: string;
  name: string;
};

/**
 * Below 1024px: a Menu button that opens a full-screen native <dialog>. showModal() makes the page behind inert
 * (focus stays inside), Esc closes it, and focus returns to the Menu button.
 * Without JavaScript the button is hidden by CSS (html:not(.js)) and a <noscript> <details> menu with the same
 * links takes its place, so the control is never dead.
 */
export function MobileMenu({ links, resume, name }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const close = useCallback(() => {
    const d = dialogRef.current;
    if (d?.open) d.close();
  }, []);

  function show() {
    const d = dialogRef.current;
    if (!d || d.open) return;
    d.showModal();
    setOpen(true);
  }

  // Lock page scroll while open; close if the viewport grows past the desktop breakpoint.
  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    const mq = window.matchMedia("(min-width: 1024px)");
    const onMq = () => {
      if (mq.matches) close();
    };
    mq.addEventListener("change", onMq);
    return () => {
      html.style.overflow = prev;
      mq.removeEventListener("change", onMq);
    };
  }, [open, close]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 font-mono text-[0.78rem] uppercase tracking-[0.12em] text-text transition-colors hover:border-accent hover:text-accent lg:hidden"
      >
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M2 5h12M2 11h12" />
        </svg>
        Menu
      </button>

      <noscript>
        <details className="relative lg:hidden">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-line-strong px-4 font-mono text-[0.78rem] uppercase tracking-[0.12em] text-text transition-colors hover:border-accent hover:text-accent [&::-webkit-details-marker]:hidden">
            Menu
          </summary>
          <nav
            aria-label="Mobile"
            className="absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-line-strong bg-bg p-2 shadow-[var(--shadow)]"
          >
            <ul>
              {links.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="flex min-h-11 items-center rounded-xl px-3 text-text no-underline hover:text-accent">
                    {l.label}
                  </a>
                </li>
              ))}
              <li>
                <a href={resume} download className="flex min-h-11 items-center rounded-xl px-3 text-text no-underline hover:text-accent">
                  Résumé (PDF)
                </a>
              </li>
            </ul>
          </nav>
        </details>
      </noscript>

      <dialog
        ref={dialogRef}
        id="mobile-menu"
        aria-label="Site menu"
        data-lenis-prevent=""
        onClose={() => {
          setOpen(false);
          // Return focus to the Menu button unless something else (e.g. the contact pop-up) already took it.
          if (!document.activeElement || document.activeElement === document.body) buttonRef.current?.focus();
        }}
        // Close before a link's own handler runs, so in-page scrolling and the contact pop-up start from a closed menu.
        onClickCapture={(e) => {
          const target = e.target as HTMLElement;
          if (target.closest("a")) close();
        }}
        className="m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto bg-bg p-0 text-text backdrop:bg-bg/80 lg:hidden"
      >
        <div className="bg-grid flex min-h-full flex-col">
          <div className="container-x flex h-[4.5rem] items-center justify-between gap-3 border-b border-line">
            <span className="font-display text-[1.05rem] font-semibold tracking-[-0.02em]">{name}</span>
            <button
              type="button"
              onClick={close}
              autoFocus
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong px-4 font-mono text-[0.78rem] uppercase tracking-[0.12em] text-text transition-colors hover:border-accent hover:text-accent"
            >
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M2 2l10 10M12 2 2 12" />
              </svg>
              Close
            </button>
          </div>

          <nav aria-label="Mobile" className="container-x flex-1 py-8">
            <ol className="flex flex-col">
              {links.map((l, i) => (
                <li key={l.href} className="border-b border-line">
                  <a
                    href={l.href}
                    className="flex min-h-16 items-baseline gap-4 py-3 font-display text-[clamp(1.9rem,8vw,3rem)] font-semibold leading-tight tracking-[-0.03em] text-text no-underline transition-colors hover:text-accent"
                  >
                    <span aria-hidden="true" className="font-mono text-[0.75rem] font-normal tracking-[0.1em] text-muted">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {l.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="container-x flex flex-wrap items-center gap-3 pb-10">
            <ContactLink inquiry="freelance" className="btn btn-primary" returnFocus={() => buttonRef.current}>
              Let&apos;s talk
            </ContactLink>
            <a href={resume} download aria-label="Download résumé (PDF)" className="btn btn-ghost">
              Résumé
            </a>
            <ThemeToggle />
          </div>
        </div>
      </dialog>
    </>
  );
}
