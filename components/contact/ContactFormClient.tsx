"use client";

import { usePathname } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { getContactToken, submitContact } from "@/lib/contact/actions";
import {
  CONTACT_DIALOG_FORM_ID,
  CONTACT_FIELDS,
  CONTACT_FORM_ID,
  CONTACT_LIMITS,
  DEFAULT_INQUIRY,
  HONEYPOT_FIELD,
  INQUIRY_TYPES,
  INVALID_MESSAGE,
  PAGE_FIELD,
  PRIVACY_NOTE,
  TOKEN_FIELD,
  initialContactState,
  pageFromLocation,
  type ContactField,
  type ContactState,
  type InquiryType,
} from "@/lib/contact/fields";
import { LETTERS, UNTOUCHED_LETTER, isUntouchedLetter } from "@/lib/contact/letters";

/*
 * The contact form. Progressive enhancement: without JavaScript it is a plain POST to the server action and the
 * page comes back with the same state (errors, values, messages); with JavaScript, useActionState updates it in place,
 * and choosing an inquiry type puts its starter letter in the message box (lib/contact/letters.ts).
 */

/** Each form's ids get their own prefix, since the home page can have both the Contact section's form and the pop-up's. */
const PREFIX = { section: "cf", dialog: "cd" } as const;
export type ContactFormVariant = keyof typeof PREFIX;

const HINT = {
  plain: `At least ${CONTACT_LIMITS.messageMin} characters.`,
  letter: "Edit the letter, or write your own.",
};

const id = (prefix: string, field: string) => `${prefix}-${field}`;
const errorId = (prefix: string, field: string) => `${prefix}-${field}-error`;

const noSubscribe = () => () => {};

const label = "mb-2.5 block font-mono text-xs uppercase tracking-[0.12em] text-text-2";

const control =
  "block w-full min-h-12 rounded-xl border border-muted bg-bg-2 px-4 py-3 text-base text-text placeholder:text-muted " +
  "transition-[border-color,box-shadow] duration-200 hover:border-text-2 focus-visible:border-accent-2 " +
  "aria-invalid:border-text aria-invalid:shadow-[inset_0_0_0_1px_var(--text)]";

export type ContactFormClientProps = {
  email: string;
  /**
   * "section": the home page Contact section (ids cf-*, form id "contact-form").
   * "dialog": the "Let's talk" pop-up (ids cd-*, form id "contact-dialog-form").
   */
  variant?: ContactFormVariant;
  /** Dialog only: the inquiry type to preselect (with its letter) while the visitor hasn't written anything. */
  inquiry?: InquiryType;
  /** Dialog only: changes on every open request, so a new opener's inquiry type is applied. */
  session?: number;
  /** Dialog only: closes the pop-up (the Close button shown after a successful send). */
  onClose?: () => void;
};

export function ContactFormClient({ email, variant = "section", inquiry = DEFAULT_INQUIRY, session = 0, onClose }: ContactFormClientProps) {
  const pathname = usePathname();
  const prefix = PREFIX[variant];
  const isDialog = variant === "dialog";
  const formId = isDialog ? CONTACT_DIALOG_FORM_ID : CONTACT_FORM_ID;
  // The permalink is where the browser posts without JavaScript; the fragment brings the visitor back to the form.
  const [state, formAction, pending] = useActionState(submitContact, initialContactState, `${pathname}#${CONTACT_FORM_ID}`);
  const formRef = useRef<HTMLFormElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const sentRef = useRef<HTMLParagraphElement>(null);
  const tokenRequested = useRef(false);
  const [token, setToken] = useState("");
  // Where the visitor came from: "" on the server (no-JS falls back to the Referer), the real path in the browser.
  const clientPage = useSyncExternalStore(noSubscribe, pageFromLocation, () => "");
  // The browser's untouched-letter check: a new object per refused attempt, shown until the server answers again.
  const [untouched, setUntouched] = useState<{ on: ContactState } | null>(null);
  // Whether the message box holds a starter letter we offered (the hint follows). Back to the start after a send.
  const [lettered, setLettered] = useState(isDialog);
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    if (state.status === "success") setLettered(isDialog);
  }

  // A fresh form: the pop-up opens on the opener's type with its letter; the section starts with nothing chosen.
  const start: Partial<Record<ContactField, string>> = isDialog ? { inquiryType: inquiry, message: LETTERS[inquiry] } : {};

  const view: ContactState =
    untouched?.on === state
      ? { ...state, status: "invalid", message: INVALID_MESSAGE, offerEmail: false, errors: { ...state.errors, message: UNTOUCHED_LETTER } }
      : state;
  const errors = view.errors ?? {};
  // The submitted values after an error (React resets the form to them after each action), otherwise a fresh form.
  const values = state.values ?? start;
  const firstError = CONTACT_FIELDS.find((f) => errors[f]);
  // After a send the pop-up swaps its fields for a thank-you panel; the section shows the thanks below a fresh form.
  const sent = isDialog && state.status === "success";

  // Pop-up reopened by another opener: switch to its type and letter, unless the visitor has written something.
  // (The pop-up's hint always reads "Edit the letter…": `lettered` is never false for the dialog.)
  useEffect(() => {
    if (!isDialog) return;
    const form = formRef.current;
    const box = messageRef.current;
    if (!form || !box || (box.value.trim() && !isUntouchedLetter(box.value))) return;
    const radio = form.querySelector<HTMLInputElement>(`input[name='inquiryType'][value='${inquiry}']`);
    if (radio) radio.checked = true;
    box.value = LETTERS[inquiry];
  }, [isDialog, inquiry, session]);

  // After a send from the pop-up, focus the thanks; after a submit with errors, the first invalid field (without JS,
  // autoFocus does it on load).
  useEffect(() => {
    if (sent) {
      sentRef.current?.focus();
      return;
    }
    if (state.status !== "invalid") return;
    const invalid = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']");
    const target = invalid instanceof HTMLFieldSetElement ? invalid.querySelector<HTMLElement>("input") : invalid;
    target?.focus();
  }, [state, sent]);

  useEffect(() => {
    if (untouched) messageRef.current?.focus();
  }, [untouched]);

  /** Starts the minimum-fill-time clock: the server signs the moment the visitor first focuses the form. */
  function startClock() {
    if (tokenRequested.current) return;
    tokenRequested.current = true;
    getContactToken()
      .then((t) => {
        if (t) setToken(t);
        else tokenRequested.current = false;
      })
      .catch(() => {
        tokenRequested.current = false; // try again on the next focus
      });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    if (pending) {
      event.preventDefault(); // one submission at a time
      return;
    }
    // A letter with nothing added isn't sent (the server refuses it too, for posts without JavaScript).
    if (isUntouchedLetter(messageRef.current?.value ?? "")) {
      event.preventDefault();
      setUntouched({ on: state });
    } else {
      setUntouched(null);
    }
  }

  /**
   * Choosing a type puts its letter in the message box, unless the visitor has written something of their own.
   * Wired to onClick (fired for mouse, Space and arrow keys alike), not onChange: React's form reset after a send
   * leaves its record of the checked radio stale, so picking the same type again would fire no onChange.
   */
  function offerLetter(type: InquiryType) {
    const box = messageRef.current;
    if (!box || (box.value.trim() && !isUntouchedLetter(box.value))) return;
    box.value = LETTERS[type];
    setLettered(true);
  }

  const describedBy = (field: ContactField, hint?: string) =>
    [hint, errors[field] ? errorId(prefix, field) : undefined].filter(Boolean).join(" ") || undefined;

  return (
    <form
      id={formId}
      ref={formRef}
      action={formAction}
      onSubmit={onSubmit}
      onFocus={startClock}
      noValidate
      aria-describedby={sent ? undefined : `${prefix}-required-note`}
      className="@container space-y-7"
    >
      {sent ? null : (
        <>
          <p id={`${prefix}-required-note`} className="text-sm text-text-2">
            Fields marked <span aria-hidden="true">*</span>
            <span className="sr-only">with an asterisk</span> are required.
          </p>

          <div className="grid gap-7 @xl:grid-cols-2 @xl:gap-x-5">
            <Field prefix={prefix} label="Name" field="name" required error={errors.name}>
              <input
                id={id(prefix, "name")}
                name="name"
                type="text"
                autoComplete="name"
                required
                maxLength={CONTACT_LIMITS.name}
                defaultValue={values.name ?? ""}
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={describedBy("name")}
                autoFocus={firstError === "name"}
                className={control}
              />
            </Field>

            <Field prefix={prefix} label="Email" field="email" required error={errors.email}>
              <input
                id={id(prefix, "email")}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                maxLength={CONTACT_LIMITS.email}
                defaultValue={values.email ?? ""}
                aria-invalid={errors.email ? true : undefined}
                aria-describedby={describedBy("email")}
                autoFocus={firstError === "email"}
                className={control}
              />
            </Field>
          </div>

          <Field prefix={prefix} label="Company" field="company" optional error={errors.company}>
            <input
              id={id(prefix, "company")}
              name="company"
              type="text"
              autoComplete="organization"
              maxLength={CONTACT_LIMITS.company}
              defaultValue={values.company ?? ""}
              aria-invalid={errors.company ? true : undefined}
              aria-describedby={describedBy("company")}
              autoFocus={firstError === "company"}
              className={control}
            />
          </Field>

          <fieldset
            role="radiogroup"
            aria-labelledby={`${prefix}-inquiryType-legend`}
            aria-required="true"
            aria-invalid={errors.inquiryType ? true : undefined}
            aria-describedby={describedBy("inquiryType")}
            className="min-w-0"
          >
            <legend id={`${prefix}-inquiryType-legend`} className={label}>
              What&apos;s this about? <Required />
            </legend>
            <div className="grid gap-3 @md:flex @md:flex-wrap">
              {INQUIRY_TYPES.map((option, i) => (
                <label
                  key={option.value}
                  className="flex min-h-12 cursor-pointer items-center gap-3 rounded-full border border-muted px-5 py-2 text-text transition-colors duration-200 hover:border-text-2 has-checked:border-accent-2 has-checked:bg-surface-2 [[aria-invalid=true]_&]:border-text"
                >
                  <input
                    type="radio"
                    name="inquiryType"
                    value={option.value}
                    required
                    defaultChecked={values.inquiryType === option.value}
                    onClick={() => offerLetter(option.value)}
                    autoFocus={firstError === "inquiryType" && i === 0}
                    className="size-4 shrink-0 cursor-pointer appearance-none rounded-full border border-text-2 bg-bg checked:border-accent-2 checked:bg-accent-2 checked:shadow-[inset_0_0_0_3px_var(--bg)]"
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <FieldError prefix={prefix} field="inquiryType" error={errors.inquiryType} />
          </fieldset>

          <Field prefix={prefix} label="Message" field="message" required error={errors.message} hint={lettered ? HINT.letter : HINT.plain}>
            {/* 12 rows: the whole "Hire full-time" letter shows without scrolling. */}
            <textarea
              ref={messageRef}
              id={id(prefix, "message")}
              name="message"
              required
              rows={12}
              maxLength={CONTACT_LIMITS.messageMax}
              defaultValue={values.message ?? ""}
              aria-invalid={errors.message ? true : undefined}
              aria-describedby={describedBy("message", `${prefix}-message-hint`)}
              autoFocus={firstError === "message"}
              className={`${control} min-h-40 resize-y leading-relaxed`}
            />
          </Field>

          {/* Spam trap: invisible and unreachable for people; bots that fill every field get rejected. */}
          <div aria-hidden="true" className="sr-only">
            <label htmlFor={id(prefix, HONEYPOT_FIELD)}>Leave this field empty</label>
            <input id={id(prefix, HONEYPOT_FIELD)} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>
          <input type="hidden" name={TOKEN_FIELD} value={state.token || token} />
          <input type="hidden" name={PAGE_FIELD} value={clientPage || state.page || ""} />

          <div className="flex flex-col gap-5 @lg:flex-row @lg:items-center @lg:gap-7">
            <button type="submit" aria-disabled={pending || undefined} className="btn btn-primary group shrink-0 cursor-pointer aria-disabled:cursor-progress">
              {pending ? "Sending…" : "Send message"}
              <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1 group-aria-disabled:translate-x-0">
                →
              </span>
            </button>
            <p className="text-sm text-text-2">{PRIVACY_NOTE}</p>
          </div>
        </>
      )}

      {/* The pop-up's thank-you panel after a send (data-contact-sent tells the pop-up to start fresh next time).
          The live region inside stays in the DOM in both states (never display:none) so screen readers announce it. */}
      <div data-contact-sent={sent ? "" : undefined} className="space-y-7">
        <div role="status" aria-live="polite" aria-atomic="true">
          {sent ? (
            <div className="space-y-3">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">Sent</p>
              <p
                ref={sentRef}
                tabIndex={-1}
                className="font-display text-[clamp(1.25rem,1.05rem+0.6vw,1.5rem)] leading-snug font-semibold tracking-[-0.02em] [overflow-wrap:anywhere] text-text focus:outline-none"
              >
                {state.message}
              </p>
            </div>
          ) : view.message ? (
            <StatusMessage tone={view.status === "success" ? "success" : "problem"}>
              {view.message}
              {view.offerEmail ? (
                <>
                  {" "}
                  <a href={`mailto:${email}`} className="text-accent underline [overflow-wrap:anywhere] hover:text-accent-2">
                    {email}
                  </a>
                </>
              ) : null}
            </StatusMessage>
          ) : null}
        </div>
        {sent ? (
          <button type="button" onClick={() => onClose?.()} className="btn btn-ghost cursor-pointer">
            Close
          </button>
        ) : null}
      </div>
    </form>
  );
}

function Required() {
  return (
    <span aria-hidden="true" className="text-accent">
      *
    </span>
  );
}

function Field({
  prefix,
  label: text,
  field,
  required,
  optional,
  hint,
  error,
  children,
}: {
  prefix: string;
  label: string;
  field: ContactField;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id(prefix, field)} className={label}>
        {text} {required ? <Required /> : null}
        {optional ? <span className="normal-case tracking-normal text-muted">(optional)</span> : null}
      </label>
      {hint ? (
        <p id={`${prefix}-${field}-hint`} className="-mt-1 mb-2.5 text-sm text-text-2">
          {hint}
        </p>
      ) : null}
      {children}
      <FieldError prefix={prefix} field={field} error={error} />
    </div>
  );
}

function FieldError({ prefix, field, error }: { prefix: string; field: ContactField; error?: string }) {
  if (!error) return null;
  return (
    <p id={errorId(prefix, field)} className="mt-2.5 flex items-start gap-2 text-sm font-medium text-text">
      <svg aria-hidden="true" viewBox="0 0 16 16" className="mt-[0.2em] size-[1em] shrink-0 text-accent-2" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 4.25v4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="11.25" r="0.9" fill="currentColor" />
      </svg>
      <span>
        <span className="sr-only">Error: </span>
        {error}
      </span>
    </p>
  );
}

function StatusMessage({ tone, children }: { tone: "success" | "problem"; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-r-lg border-l-2 border-accent-2 bg-surface/60 py-2 pr-3 pl-4 @md:flex-row @md:gap-4">
      <span className="shrink-0 pt-[0.15em] font-mono text-xs uppercase tracking-[0.14em] text-text-2">{tone === "success" ? "Sent" : "Not sent"}</span>
      <p className="text-text">{children}</p>
    </div>
  );
}
