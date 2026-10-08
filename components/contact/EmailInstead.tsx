import { PRIVACY_NOTE } from "@/lib/contact/fields";

/**
 * "Email me instead": shown in place of the form while the contact env vars aren't set (the Contact section
 * and the "Let's talk" pop-up). No hooks and no server code, so server and client components can both render it.
 */
export function EmailInstead({ email }: { email: string }) {
  // Prefer a line break right after the @ on narrow screens; overflow-wrap:anywhere stays as the last resort.
  const at = email.indexOf("@");
  return (
    <div data-contact-fallback="" className="space-y-4">
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">Email me instead</p>
      <a
        href={`mailto:${email}`}
        className="inline-flex min-h-11 items-center font-display text-[clamp(1.15rem,5.6vw,1.5rem)] leading-tight font-semibold tracking-[-0.02em] [overflow-wrap:anywhere] text-text underline decoration-line-strong decoration-1 underline-offset-[0.25em] transition-colors duration-200 hover:text-accent hover:decoration-accent sm:text-3xl"
      >
        {at > 0 ? (
          <>
            {email.slice(0, at + 1)}
            <wbr />
            {email.slice(at + 1)}
          </>
        ) : (
          email
        )}
      </a>
      <p className="text-sm text-text-2">{PRIVACY_NOTE}</p>
    </div>
  );
}
