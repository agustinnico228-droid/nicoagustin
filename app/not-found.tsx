import Link from "next/link";

// Next.js adds <meta name="robots" content="noindex"> to 404 responses by itself.

export default function NotFound() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
      />
      <div className="container-x relative flex min-h-[80svh] flex-col justify-center pb-20 pt-32">
        <p className="eyebrow">Error 404</p>
        <h1 className="mt-4 font-display text-[clamp(2.75rem,9vw,6.5rem)] font-bold leading-[0.95] tracking-[-0.04em] text-text">
          This page isn&rsquo;t here.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-text-2">
          The link may be old or mistyped. The work is still where it was.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/" className="btn btn-primary">
            Back to the home page
          </Link>
          <Link href="/#work" className="btn btn-ghost">
            See selected work
          </Link>
        </div>
      </div>
    </section>
  );
}
