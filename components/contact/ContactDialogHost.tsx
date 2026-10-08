"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { loadContactDialog, onOpenContactDialog } from "@/lib/contact/dialog";
import { DEFAULT_INQUIRY, type InquiryType } from "@/lib/contact/fields";
import type { ContactDialogProps } from "./ContactDialog";
import { contactHref } from "./ContactLink";

type Dialog = ComponentType<ContactDialogProps>;

/**
 * Mounted once in the root layout. Renders nothing until a contact control asks for the pop-up
 * (lib/contact/dialog.ts); then it loads the dialog and the form on demand, opens it, and returns focus
 * to the opener when it closes. `configured` (the contact env vars are set) picks the form or "Email me instead".
 */
export function ContactDialogHost({ email, configured }: { email: string; configured: boolean }) {
  const pathname = usePathname();
  const [path, setPath] = useState(pathname);
  /** Where focus goes back to, and the page it was opened on. */
  const openerRef = useRef<{ element: HTMLElement | null; path: string } | null>(null);
  const [open, setOpen] = useState(false);
  // Bumped on every open, so reopening right after Esc (before the dialog's close event lands) still opens.
  const [session, setSession] = useState(0);
  const [inquiry, setInquiry] = useState<InquiryType>(DEFAULT_INQUIRY);
  const [Dialog, setDialog] = useState<Dialog | null>(null);

  // Close on navigation (Back while it's open; state adjusted during render, not in an effect).
  if (pathname !== path) {
    setPath(pathname);
    setOpen(false);
  }

  useEffect(
    () =>
      onOpenContactDialog((opener, type) => {
        openerRef.current = { element: opener, path: window.location.pathname };
        setInquiry(type);
        setOpen(true);
        setSession((n) => n + 1);
        loadContactDialog().then(
          (m) => setDialog(() => m.ContactDialog),
          // The chunk didn't load (offline, a new deploy): fall back to the Contact section.
          () => window.location.assign(contactHref(window.location.pathname)),
        );
      }),
    [],
  );

  const close = useCallback(() => {
    setOpen(false);
    const opened = openerRef.current;
    openerRef.current = null;
    // After a navigation, focus stays where the new page put it.
    if (opened?.path === window.location.pathname) opened.element?.focus({ preventScroll: true });
  }, []);

  return Dialog ? (
    <Dialog open={open} session={session} inquiry={inquiry} email={email} configured={configured} onClose={close} />
  ) : null;
}
