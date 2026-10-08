"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/*
 * Smooth scrolling (Lenis driven by the GSAP ticker, synced with ScrollTrigger), accessible in-page hash links,
 * and the [data-reveal] reveal-on-scroll system. Renders nothing.
 * Under prefers-reduced-motion Lenis is not started: native scrolling, instant jumps, everything visible.
 */

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);

let lenisInstance: Lenis | null = null;

/** The running Lenis instance, or null (reduced motion, or not mounted yet). */
export function getLenis(): Lenis | null {
  return lenisInstance;
}

function setLenis(l: Lenis | null) {
  lenisInstance = l;
}

function focusTarget(el: HTMLElement) {
  if (!el.hasAttribute("tabindex") && !el.matches("a[href], button, input, select, textarea, summary, [tabindex]")) {
    el.setAttribute("tabindex", "-1");
  }
  el.focus({ preventScroll: true });
}

export function SmoothScroll() {
  const pathname = usePathname();

  // Lenis + hash links (mounted once).
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | null = null;
    let tick: ((time: number) => void) | null = null;

    const start = () => {
      if (lenis || reduce.matches) return;
      lenis = new Lenis({ lerp: 0.1, autoRaf: false });
      setLenis(lenis);
      lenis.on("scroll", ScrollTrigger.update);
      const l = lenis;
      tick = (time: number) => l.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    };

    const stop = () => {
      if (tick) gsap.ticker.remove(tick);
      tick = null;
      lenis?.destroy();
      lenis = null;
      setLenis(null);
    };

    const onMotionChange = () => (reduce.matches ? stop() : start());

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href^='#'], a[href^='/#']");
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href") ?? "";
      if (href.startsWith("/#") && window.location.pathname !== "/") return; // cross-page: normal navigation
      const id = decodeURIComponent(href.slice(href.indexOf("#") + 1));
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();

      if (window.location.hash !== `#${id}`) {
        window.history.pushState(window.history.state, "", `#${id}`);
      }
      // Lenis honours the html scroll-padding-top (5.5rem) for element targets.
      if (lenis) {
        lenis.scrollTo(target, { onComplete: () => focusTarget(target) });
        // Move focus right away too so keyboard users continue from the target even if the scroll is interrupted.
        focusTarget(target);
      } else {
        target.scrollIntoView({ block: "start" });
        focusTarget(target);
      }
    };

    start();
    reduce.addEventListener("change", onMotionChange);
    // window (bubble) runs after React's own handlers, so components that preventDefault (e.g. ContactLink) win.
    window.addEventListener("click", onClick);

    return () => {
      reduce.removeEventListener("change", onMotionChange);
      window.removeEventListener("click", onClick);
      stop();
    };
  }, []);

  // Reveal-on-scroll: rescan on every route change.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-revealed)"));
    if (els.length === 0) return;

    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-revealed"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );

    const vh = window.innerHeight;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      // Already in view (or above the fold after a hash jump): reveal immediately.
      if (r.top < vh * 0.9 && r.bottom > 0) el.classList.add("is-revealed");
      else if (r.bottom <= 0) el.classList.add("is-revealed");
      else io.observe(el);
    }

    // Lenis/ScrollTrigger need fresh measurements after a route change.
    getLenis()?.resize();
    ScrollTrigger.refresh();

    return () => io.disconnect();
  }, [pathname]);

  return null;
}
