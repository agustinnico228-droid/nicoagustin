/** First focusable element on every page: jumps keyboard users past the header to <main id="main">. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only-focusable fixed left-4 top-3 z-[100] inline-flex min-h-11 items-center rounded-full bg-btn px-5 font-semibold text-btn-fg shadow-lg"
    >
      Skip to content
    </a>
  );
}
