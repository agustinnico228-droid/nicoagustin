import Link from "next/link";
import type { Project } from "@/content/types";

/** Previous / next case study, by index. Only the ones that exist are shown. */
export function ProjectNav({ prev, next }: { prev?: Project; next?: Project }) {
  if (!prev && !next) return null;
  return (
    <nav aria-label="More case studies" className="grid gap-4 sm:grid-cols-2">
      {prev ? (
        <Link
          href={`/work/${prev.slug}`}
          className="group flex min-h-11 flex-col gap-2 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-accent"
        >
          <span className="eyebrow">
            <span aria-hidden="true">← </span>Previous · {prev.index}
          </span>
          <span className="font-display text-lg font-semibold text-text group-hover:text-accent">{prev.title}</span>
        </Link>
      ) : (
        <span aria-hidden="true" className="hidden sm:block" />
      )}
      {next && (
        <Link
          href={`/work/${next.slug}`}
          className="group flex min-h-11 flex-col gap-2 rounded-2xl border border-line bg-surface p-5 text-left transition-colors hover:border-accent sm:items-end sm:text-right"
        >
          <span className="eyebrow">
            Next · {next.index}
            <span aria-hidden="true"> →</span>
          </span>
          <span className="font-display text-lg font-semibold text-text group-hover:text-accent">{next.title}</span>
        </Link>
      )}
    </nav>
  );
}
