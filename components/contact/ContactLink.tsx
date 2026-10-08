"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type MouseEvent, type ReactNode } from "react";
import { openContactDialog, prefetchContactDialog } from "@/lib/contact/dialog";
import { DEFAULT_INQUIRY, type InquiryType } from "@/lib/contact/fields";

/** "/#contact" on the home page; elsewhere "/?from=<path>#contact", so the contact form records where the visitor came from. */
export const contactHref = (pathname: string) => (pathname === "/" ? "/#contact" : `/?from=${encodeURIComponent(pathname)}#contact`);

const noSubscribe = () => () => {};

export type ContactLinkProps = {
  className?: string;
  children: ReactNode;
  /** The inquiry type the pop-up preselects, with its starter letter. Default "freelance". */
  inquiry?: InquiryType;
  /** Where focus goes when the pop-up closes (default: this link). */
  returnFocus?: () => HTMLElement | null;
};

/**
 * A link to the Contact section. Without JavaScript it simply goes there; with it, a plain click opens the
 * "Let's talk" pop-up on the current page with `inquiry` preselected (ctrl/cmd/shift/alt-clicks keep the link's
 * own behaviour). Hover and focus prefetch the pop-up's chunk.
 */
export function ContactLink({ className, children, inquiry = DEFAULT_INQUIRY, returnFocus }: ContactLinkProps) {
  // Only announced as opening a dialog once the script that opens it is running.
  const enhanced = useSyncExternalStore(noSubscribe, () => true, () => false);

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (openContactDialog(returnFocus?.() ?? e.currentTarget, inquiry)) e.preventDefault();
  };

  return (
    <Link
      href={contactHref(usePathname())}
      // The click opens the pop-up (or jumps to a hash), so prefetching the home page's RSC payload is wasted work.
      prefetch={false}
      className={className}
      aria-haspopup={enhanced ? "dialog" : undefined}
      data-contact-link=""
      data-inquiry={inquiry}
      onClick={onClick}
      onPointerEnter={prefetchContactDialog}
      onFocus={prefetchContactDialog}
    >
      {children}
    </Link>
  );
}
