import type { Video } from "@/content/types";

function duration(sec: number): string {
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** A silent screen recording: native controls, nothing loads until play, no autoplay. */
export function VideoPlayer({ video }: { video: Video }) {
  return (
    <figure>
      <div
        className="overflow-hidden rounded-2xl border border-line bg-surface"
        style={{ aspectRatio: `${video.width} / ${video.height}` }}
      >
        <video
          controls
          muted
          playsInline
          preload="none"
          poster={video.poster}
          width={video.width}
          height={video.height}
          className="block h-full w-full object-cover"
        >
          <source src={video.src} type="video/mp4" />
        </video>
      </div>
      <figcaption className="mt-4 grid gap-1">
        <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-display font-semibold text-text">{video.title}</span>
          {video.durationSec ? (
            <span className="font-mono text-xs text-muted">
              Silent recording · {duration(video.durationSec)}
            </span>
          ) : (
            <span className="font-mono text-xs text-muted">Silent recording</span>
          )}
        </span>
        <span className="max-w-prose text-sm text-text-2">{video.description}</span>
      </figcaption>
    </figure>
  );
}
