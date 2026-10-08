import { ContactLink } from "@/components/contact/ContactLink";
import { profile } from "@/lib/site";
import { HeroPoster } from "./HeroPoster";
import { HeroStats } from "./HeroStats";
import { HeroVisual } from "./HeroVisual";
import { RotatingRole } from "./RotatingRole";

/*
 * The hero. The <h1> (the name) is the LCP element: plain server HTML, visible at first paint.
 * The data-skyline visual sits in a reserved absolutely positioned box behind/right of the text:
 * a static SVG poster, replaced by the WebGL scene on capable desktops after idle.
 */
export function Hero() {
  return (
    <section id="top" aria-labelledby="hero-title" className="relative isolate overflow-hidden">
      {/* Blueprint grid + soft glow */}
      <div
        aria-hidden="true"
        className="bg-grid pointer-events-none absolute inset-0 -z-20 [mask-image:radial-gradient(ellipse_80%_70%_at_60%_40%,black,transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-[20%] -top-[10%] -z-20 aspect-square w-[min(70rem,120vw)] rounded-full bg-[radial-gradient(circle,var(--glow),transparent_62%)]"
      />

      {/* Visual box: top-right band on phones (faint), right 62% from 768px. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-0 top-0 -z-10 h-[46%] w-full opacity-35 [mask-image:linear-gradient(to_bottom,black_40%,transparent)] md:inset-y-0 md:h-full md:w-[64%] md:opacity-100 md:[mask-image:linear-gradient(to_right,transparent,black_30%,black_85%,transparent)]"
      >
        <HeroVisual>
          <div className="absolute inset-0 flex items-center justify-center p-[6%] md:pb-[14%]">
            <HeroPoster />
          </div>
        </HeroVisual>
      </div>

      <div className="container-x flex min-h-[calc(100svh-4.5rem)] flex-col justify-center pb-10 pt-[clamp(3rem,9vh,6rem)]">
        <p className="eyebrow">Malolos, Bulacan · Philippines</p>

        <h1
          id="hero-title"
          className="mt-5 font-display text-[clamp(3.2rem,15vw,10.5rem)] font-extrabold leading-[0.88] tracking-[-0.04em] text-text"
        >
          <span className="block">Nico</span>{" "}
          <span className="block">
            Agustin<span aria-hidden="true" className="text-accent-2">.</span>
          </span>
        </h1>

        <div className="mt-6 md:mt-8">
          <RotatingRole roles={profile.roles} />
        </div>

        <p className="mt-4 max-w-[40rem] text-[clamp(1.02rem,1.6vw,1.2rem)] leading-relaxed text-text-2">{profile.positioning}</p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <ContactLink inquiry="freelance" className="btn btn-primary">
            Let&apos;s talk
          </ContactLink>
          <a href={profile.links.resume} download className="btn btn-ghost text-center">
            Open to full-time roles · Download CV
          </a>
        </div>

        <div className="mt-[clamp(3rem,8vh,5rem)]">
          <HeroStats />
        </div>
      </div>
    </section>
  );
}
