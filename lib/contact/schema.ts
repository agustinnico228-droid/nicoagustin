import { z } from "zod";
import { CONTACT_FIELDS, CONTACT_LIMITS, INQUIRY_VALUES, type ContactField } from "./fields";
import { UNTOUCHED_LETTER, isUntouchedLetter } from "./letters";

/*
 * Server-side validation for the contact form (the server action is the only gate; the browser's own
 * validation is off so errors look the same with and without JavaScript).
 */

// C0/C1 control characters and the bidi embedding/override/isolate controls (which can disguise text).
// Newlines and tabs are handled separately per field type.
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g;

/** One line: newlines and tabs become spaces, control characters go, runs of spaces collapse. */
export const cleanLine = (value: string) =>
  value
    .replace(/[\r\n\t\u2028\u2029]+/g, " ")
    .replace(CONTROL, "")
    .replace(/ {2,}/g, " ")
    .trim();

/** Multi-line text: CRLF → LF, control characters go (newlines and tabs stay), at most two blank lines in a row. */
export const cleanText = (value: string) =>
  value
    .replace(/\r\n?|[\u2028\u2029]/g, "\n")
    .replace(CONTROL, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();

const { name, email, company, messageMin, messageMax } = CONTACT_LIMITS;

export const contactSchema = z.object({
  name: z
    .string()
    .transform(cleanLine)
    .pipe(z.string().min(1, "Please enter your name.").max(name, `Please keep your name to ${name} characters or fewer.`)),
  email: z
    .string()
    .transform(cleanLine)
    .pipe(
      z
        .string()
        .min(1, "Please enter your email address.")
        .max(email, `Please use an email address of ${email} characters or fewer.`)
        .pipe(z.email("Please enter a valid email address, like name@example.com.")),
    ),
  company: z
    .string()
    .transform(cleanLine)
    .pipe(z.string().max(company, `Please keep the company name to ${company} characters or fewer.`)),
  inquiryType: z.enum(INQUIRY_VALUES, { error: "Please choose what this is about." }),
  message: z
    .string()
    .transform(cleanText)
    .pipe(
      z
        .string()
        .min(1, "Please write a message.")
        // Before the length check: the "Other" letter is shorter than the minimum, and this error says more.
        .refine((value) => !isUntouchedLetter(value), UNTOUCHED_LETTER)
        .min(messageMin, `Please write at least ${messageMin} characters.`)
        .max(messageMax, `Please keep your message to ${messageMax.toLocaleString("en-US")} characters or fewer.`),
    ),
});

export type ContactInput = z.output<typeof contactSchema>;

const text = (value: FormDataEntryValue | null) => (typeof value === "string" ? value : "");

/** The raw submitted values (capped), echoed back so the form keeps what the visitor typed. */
export function readSubmittedValues(formData: FormData): Partial<Record<ContactField, string>> {
  const values: Partial<Record<ContactField, string>> = {};
  for (const field of CONTACT_FIELDS) {
    const cap = field === "message" ? messageMax * 2 : 1000;
    const value = text(formData.get(field)).slice(0, cap);
    if (value) values[field] = value;
  }
  return values;
}

export type ParsedContact =
  | { ok: true; data: ContactInput }
  | { ok: false; errors: Partial<Record<ContactField, string>> };

/** Validates and cleans the form. On failure returns the first message for each field. */
export function parseContactForm(formData: FormData): ParsedContact {
  const result = contactSchema.safeParse(Object.fromEntries(CONTACT_FIELDS.map((f) => [f, text(formData.get(f))])));
  if (result.success) return { ok: true, data: result.data };
  const errors: Partial<Record<ContactField, string>> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as ContactField | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { ok: false, errors };
}
