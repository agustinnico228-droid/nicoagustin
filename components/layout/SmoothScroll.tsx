"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import type Lenis from "lenis";

/*
 * Smooth scrolling (Lenis, its own rAF loop), accessible in-page hash links, and the [data-reveal] reveal-on-scroll
 * system. Renders nothing. Lenis is downloaded only after the page has loaded and the browser is idle, so it never
 * competes with first paint. Under prefers-reduced-motion it is not started: native scrolling, instant jumps,
 * everything visible. On touch-only devices it is not started either: Lenis does not smooth touch scrolling, so it
 * would only cost a download and a per-frame loop.
 */

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
    const touchOnly = window.matchMedia("(hover: none) and (pointer: coarse)");
    let lenis: Lenis | null = null;
    let loading = false;
    let disposed = false;

    const start = () => {
      if (lenis || loading || disposed || reduce.matches || touchOnly.matches) return;
      loading = true;
      import("lenis")
        .then(({ default: LenisCtor }) => {
          loading = false;
          if (lenis || disposed || reduce.matches || touchOnly.matches) return;
          lenis = new LenisCtor({ lerp: 0.1, autoRaf: true });
          setLenis(lenis);
        })
        .catch(() => {
          loading = false; // offline or a new deploy: native scrolling is fine
        });
    };

    const stop = () => {
      lenis?.destroy();
      lenis = null;
      setLenis(null);
    };

    // Start after load + idle (never during first paint).
    let idleId = 0;
    const schedule = () => {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      idleId = ric ? ric(start, { timeout: 2000 }) : window.setTimeout(start, 1200);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });

    const onMotionChange = () => (reduce.matches || touchOnly.matches ? stop() : start());

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
        const l = lenis;
        l.scrollTo(target, {
          onComplete: () => {
            // Sections below the fold use content-visibility: their real height is known only once rendered, so
            // re-aim if the first scroll landed off target.
            const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
            if (Math.abs(target.getBoundingClientRect().top - offset) > 6) l.scrollTo(target, { immediate: true });
            focusTarget(target);
          },
        });
        // Move focus right away too so keyboard users continue from the target even if the scroll is interrupted.
        focusTarget(target);
      } else {
        target.scrollIntoView({ block: "start" });
        focusTarget(target);
      }
    };

    reduce.addEventListener("change", onMotionChange);
    touchOnly.addEventListener("change", onMotionChange);
    // window (bubble) runs after React's own handlers, so components that preventDefault (e.g. ContactLink) win.
    window.addEventListener("click", onClick);

    return () => {
      disposed = true;
      window.removeEventListener("load", schedule);
      const cic = (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback;
      if (cic) cic(idleId);
      else window.clearTimeout(idleId);
      reduce.removeEventListener("change", onMotionChange);
      touchOnly.removeEventListener("change", onMotionChange);
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

    // No layout reads here: the observer's first callback reports what is already in view, so revealing never
    // forces a synchronous layout per element (that cost ~1 s of main thread on a throttled phone).
    for (const el of els) io.observe(el);

    // Lenis needs fresh measurements after a route change.
    getLenis()?.resize();

    return () => io.disconnect();
  }, [pathname]);

  return null;
}
