"use client";

import Image from "next/image";
import { useState } from "react";
import type { Demo } from "@/content/types";

/*
 * Live dashboard demos (always sample data). Each card shows a still preview; on desktop a button swaps it for the
 * live demo in a sandboxed iframe. Nothing loads automatically, so the page stays fast. Phones get the preview and
 * the full-screen link only (the "Load" button is hidden below 1024px by CSS, so server and client render the same).
 */

function DemoCard({ demo }: { demo: Demo }) {
  const [live, setLive] = useState(false);
  const label = `${demo.client} dashboard demo (sample data)`;
  return (
    <li className="rounded-2xl border border-line bg-surface p-3 sm:p-4">
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-line bg-bg-2">
        {live ? (
          <iframe
            src={demo.src}
            title={label}
            sandbox="allow-scripts"
            loading="lazy"
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full border-0 bg-surface"
          />
        ) : (
          <Image
            src={demo.preview.src}
            width={demo.preview.width}
            height={demo.preview.height}
            alt={demo.preview.alt}
            sizes="(min-width: 1216px) 56rem, (min-width: 1024px) 70vw, 100vw"
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        )}
        {!live && (
          <span aria-hidden="true" className="absolute left-3 top-3 rounded-full border border-line-strong bg-bg/90 px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-text">
            Demo — sample data
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 px-1 pb-1 pt-4">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold text-text">{demo.client}</h3>
          <p className="text-sm text-text-2">{demo.title}</p>
          <p className="mt-1 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-accent-2">Demo — sample data</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn btn-primary hidden lg:inline-flex"
            onClick={() => setLive((v) => !v)}
          >
            {live ? "Show the preview" : "Load the live demo"}
          </button>
          <a href={demo.src} target="_blank" rel="noopener" className="btn btn-ghost">
            Open full screen
            <span className="sr-only">: {label}, opens in a new tab</span>
          </a>
        </div>
      </div>
    </li>
  );
}

export function DemoEmbed({ demos }: { demos: Demo[] }) {
  return (
    <ul className="grid gap-8">
      {demos.map((d) => (
        <DemoCard key={d.slug} demo={d} />
      ))}
    </ul>
  );
}
