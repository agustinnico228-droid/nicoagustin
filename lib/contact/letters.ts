import type { InquiryType } from "./fields";

/*
 * Starter letters for the contact form's message box, one per inquiry type. Client-safe: no zod, no node modules.
 * The form offers the letter for the chosen type; a message that is still an untouched letter is refused, in the
 * browser and on the server (./schema.ts), with UNTOUCHED_LETTER.
 */

export const LETTERS: Record<InquiryType, string> = {
  hire: [
    "Hi Nico,",
    "",
    "I saw your portfolio and I'd like to talk to you about a full-time role.",
    "",
    "Role:",
    "Remote, hybrid or on-site:",
    "Start date:",
    "",
    "Are you free for a short call this week?",
  ].join("\n"),
  freelance: [
    "Hi Nico,",
    "",
    "I have a project I'd like your help with.",
    "",
    "What I need (a website, a CRM, a dashboard, tracking…):",
    "Timeline:",
    "Budget:",
    "",
    "Could you take this on?",
  ].join("\n"),
  other: "Hi Nico,",
};

/** The field error for a message that is still one of the letters, exactly as offered. */
export const UNTOUCHED_LETTER = "Add a few details about the role or project.";

/** CRLF → LF, no trailing whitespace on any line, no outer whitespace. */
const normalize = (text: string) =>
  text
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+$/gm, "")
    .trim();

const untouched = new Set(Object.values(LETTERS).map(normalize));

/** True when the message is one of the letters with nothing added (any letter, not only the chosen type's). */
export const isUntouchedLetter = (message: string): boolean => untouched.has(normalize(message));
