"use client";

import { useEffect, useRef, useState } from "react";
import type { InquiryType } from "@/lib/contact/fields";
import s from "./ContactDialog.module.css";
import { ContactFormClient } from "./ContactFormClient";
import { EmailInstead } from "./EmailInstead";

export type ContactDialogProps = {
  open: boolean;
  /** Changes on every open request. */
  session: number;
  /** The inquiry type the opener asked for (preselected, with its letter, while the form is untouched). */
  inquiry: InquiryType;
  email: string;
  /** The contact env vars are set: show the form (otherwise "Email me instead"). */
  configured: boolean;
  /** Called once the dialog has closed (Esc, Close, the backdrop, or the form's own Close after a send). */
  onClose: () => void;
};

const TITLE_ID = "contact-dialog-title";
/** Where the Name field takes focus on open; elsewhere the title does (see below). */
const TYPE_RIGHT_AWAY = "(pointer: fine) and (min-width: 768px)";

/**
 * The "Let's talk" pop-up (loaded on demand by ContactDialogHost). A native modal <dialog>: the page behind
 * is inert, Esc closes it, and the host returns focus to whatever opened it. The form stays mounted while
 * closed, so what was typed survives; after a successful send ([data-contact-sent]) it is replaced by a fresh one.
 */
export function ContactDialog({ open, session, inquiry, email, configured, onClose }: ContactDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedBackdrop = useRef(false);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Desktop: straight into the Name field, ready to type. Phones (and "Email me instead"): the title, so the
      // on-screen keyboard doesn't cover the form before it has been seen; Tab or a tap goes on from there.
      const name = configured && matchMedia(TYPE_RIGHT_AWAY).matches ? dialog.querySelector<HTMLElement>("input[name='name']") : null;
      (name ?? dialog.querySelector<HTMLElement>(`#${TITLE_ID}`))?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, session, configured]);

  const close = () => dialogRef.current?.close();

  return (
    <dialog
      ref={dialogRef}
      className={s.dialog}
      aria-labelledby={TITLE_ID}
      data-lenis-prevent=""
      onClose={() => {
        const dialog = dialogRef.current;
        // The close event arrives a task later: if the dialog was reopened meanwhile, it is stale.
        if (!dialog || dialog.open) return;
        if (dialog.querySelector("[data-contact-sent]")) setFormKey((k) => k + 1);
        onClose();
      }}
      // A click on the backdrop lands on the <dialog> itself; it closes only if it also started there
      // (not a text selection dragged out of a field).
      onPointerDown={(e) => {
        pressedBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && pressedBackdrop.current) close();
      }}
    >
      <div className={s.bar}>
        <div className={s.heading}>
          <p className={s.eyebrow} aria-hidden="true">
            Contact
          </p>
          <h2 id={TITLE_ID} tabIndex={-1} className={s.title}>
            Let&apos;s talk
          </h2>
        </div>
        <button type="button" className={s.close} onClick={close}>
          Close
          <span aria-hidden="true" className={s.cross} />
        </button>
      </div>
      <div className={s.body}>
        {configured ? (
          <ContactFormClient key={formKey} email={email} variant="dialog" inquiry={inquiry} session={session} onClose={close} />
        ) : (
          <EmailInstead email={email} />
        )}
      </div>
    </dialog>
  );
}
