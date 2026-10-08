import { DEFAULT_INQUIRY, type InquiryType } from "./fields";

/*
 * The "Let's talk" pop-up: open requests and its on-demand chunk. Client-safe and tiny, so any contact control
 * (header, hero, project pages) can use it without pulling in the form.
 * components/contact/ContactDialogHost (mounted once in the root layout) listens and renders the dialog.
 */

type Listener = (opener: HTMLElement | null, inquiry: InquiryType) => void;
const listeners = new Set<Listener>();

/** The dialog and the form load on demand: the first open, or a hover/focus on a contact link. */
let chunk: Promise<typeof import("@/components/contact/ContactDialog")> | null = null;
export const loadContactDialog = () =>
  (chunk ??= import("@/components/contact/ContactDialog").catch((error: unknown) => {
    chunk = null; // a failed load (offline, a new deploy) is retried next time
    throw error;
  }));
export const prefetchContactDialog = () => void loadContactDialog().catch(() => {});

/**
 * Asks the host to open the pop-up with `inquiry` preselected (default "freelance"); on close, focus goes back to
 * `opener`. Returns false when no host is listening (not hydrated yet), so a link can fall back to its href.
 */
export function openContactDialog(opener: Element | null, inquiry: InquiryType = DEFAULT_INQUIRY): boolean {
  const target = opener instanceof HTMLElement && opener !== document.body ? opener : null;
  listeners.forEach((listener) => listener(target, inquiry));
  return listeners.size > 0;
}

/** The host subscribes here; returns an unsubscribe function. */
export function onOpenContactDialog(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
