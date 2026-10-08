/*
 * Static stand-in for the WebGL skyline: an isometric field of bars with a soft glow. Shown on phones and tablets,
 * under reduced motion, without JS, and until the canvas is ready.
 * Pre-rendered to two static files (one per theme, colours resolved from the --surface-2 / --accent / --accent-2
 * tokens) instead of ~250 inline SVG nodes that were serialised twice (HTML + RSC payload). The theme switch is
 * pure CSS on [data-theme] (see .hero-poster-* in app/globals.css), so there is no flash and no hydration work.
 * Regenerate both files if the poster geometry or those tokens change.
 */

const W = 473;
const H = 368;

export function HeroPoster({ className = "" }: { className?: string }) {
  const img = `h-full w-full object-contain ${className}`;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- a static decorative SVG: nothing to optimise */}
      <img
        src="/media/hero-poster-dark.svg"
        alt=""
        aria-hidden="true"
        width={W}
        height={H}
        decoding="async"
        fetchPriority="low"
        className={`hero-poster-dark ${img}`}
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- a static decorative SVG: nothing to optimise */}
      <img
        src="/media/hero-poster-light.svg"
        alt=""
        aria-hidden="true"
        width={W}
        height={H}
        decoding="async"
        fetchPriority="low"
        className={`hero-poster-light ${img}`}
      />
    </>
  );
}
