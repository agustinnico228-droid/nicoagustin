import { profile } from "@/lib/site";

/** A fixed vertical email link on the right edge, only on wide screens (≥ 1280px) where it clears the content. */
export function EmailRail() {
  return (
    <aside aria-label="Email" className="pointer-events-none fixed bottom-0 right-5 z-40 hidden flex-col items-center gap-5 xl:flex">
      <a
        href={`mailto:${profile.email}`}
        className="pointer-events-auto py-2 font-mono text-[0.72rem] tracking-[0.18em] text-muted no-underline transition-colors [writing-mode:vertical-rl] hover:text-accent-2"
      >
        <span className="sr-only">Email </span>
        {profile.email}
      </a>
      <span aria-hidden="true" className="block h-24 w-px bg-line-strong" />
    </aside>
  );
}
