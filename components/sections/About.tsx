import Image from "next/image";
import { profile } from "@/lib/site";

const facts = [
  { term: "Based in", detail: profile.location },
  { term: "Focus", detail: "Websites · CRMs · dashboards · marketing data" },
  { term: "Languages", detail: profile.languages.join(", ") },
  { term: "Education", detail: "BSIT, La Consolacion University Philippines" },
  { term: "Open to", detail: profile.availability },
] as const;

export function About() {
  return (
    <section id="about" aria-labelledby="about-title" className="section relative">
      <div className="container-x grid items-start gap-12 md:grid-cols-[17rem_1fr] lg:grid-cols-[20rem_1fr] md:gap-16 lg:gap-24">
        <div data-reveal className="relative mx-auto w-[min(calc(100%-0.75rem),20rem)] md:mx-0 md:mt-2">
          <div aria-hidden="true" className="absolute inset-0 translate-x-3 translate-y-3 rounded-[1.75rem] border border-accent" />
          <Image
            src={profile.photo.src}
            width={profile.photo.width}
            height={profile.photo.height}
            alt={profile.photo.alt}
            quality={82}
            sizes="(min-width: 1024px) 320px, (min-width: 768px) 272px, 320px"
            loading="lazy"
            className="relative aspect-square w-full rounded-[1.75rem] border border-line-strong bg-surface object-cover"
          />
        </div>

        <div>
          <div data-reveal>
            <p className="eyebrow">About</p>
            <h2 id="about-title" className="section-title mt-4 max-w-[16ch]">
              Websites, CRMs, dashboards and the data behind them.
            </h2>
          </div>

          <div data-reveal className="mt-8 max-w-[62ch] space-y-5 text-lg leading-relaxed text-text-2">
            <p>
              I&apos;m a fullstack web developer. I build websites, CRMs and operations portals, and reporting
              dashboards. I also work on the digital marketing side: analytics, tracking and the marketing data that
              shows whether the work is paying off.
            </p>
            <p>
              From September 2025 to September 2026 I was a Fullstack Web Developer at Agora Data Driven. Since
              September 2026 I&apos;ve been freelancing, building full-stack apps with PERN, MERN and Next.js. I studied
              BS Information Technology, major in Programming, at La Consolacion University Philippines (2023–2025),
              where I was a Dean&apos;s Lister in 2024. I&apos;m based in Malolos, Bulacan.
            </p>
          </div>

          <div data-reveal className="mt-10">
            <h3 className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Quick facts</h3>
            <dl className="mt-4 border-t border-line">
              {facts.map((f) => (
                <div key={f.term} className="grid gap-1 border-b border-line py-4 sm:grid-cols-[9rem_1fr] sm:gap-6">
                  <dt className="font-mono text-xs uppercase tracking-[0.12em] text-accent sm:pt-1">{f.term}</dt>
                  <dd className="text-text">{f.detail}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
