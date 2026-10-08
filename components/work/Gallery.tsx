import Image from "next/image";
import type { Img } from "@/content/types";

/** Screenshots with captions; each one opens full size in a new tab. */
export function Gallery({ images }: { images: Img[] }) {
  return (
    <ul className="grid gap-10">
      {images.map((img) => (
        <li key={img.src}>
          <figure>
            <a
              href={img.src}
              target="_blank"
              rel="noopener"
              className="group block overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-accent"
            >
              <Image
                src={img.src}
                width={img.width}
                height={img.height}
                alt={img.alt}
                sizes="(min-width: 1216px) 56rem, (min-width: 1024px) 70vw, 100vw"
                className="block h-auto w-full transition-transform duration-500 group-hover:scale-[1.01] motion-reduce:transition-none"
              />
              <span className="sr-only">(opens full size in a new tab)</span>
            </a>
            {img.caption && <figcaption className="mt-3 max-w-prose text-sm text-text-2">{img.caption}</figcaption>}
          </figure>
        </li>
      ))}
    </ul>
  );
}
