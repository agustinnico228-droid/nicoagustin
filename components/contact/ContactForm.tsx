import { getContactConfig } from "@/lib/contact/config";
import { profile } from "@/lib/site";
import { ContactFormClient } from "./ContactFormClient";
import { EmailInstead } from "./EmailInstead";

/**
 * The Contact section's form (server component; no props). Without CONTACT_WEBHOOK_URL + CONTACT_SECRET it renders
 * the "Email me instead" block (shared with the "Let's talk" pop-up), so the site never breaks.
 * Setup: docs/CONTACT-SETUP.md.
 */
export function ContactForm() {
  if (!getContactConfig()) return <EmailInstead email={profile.email} />;
  return <ContactFormClient email={profile.email} />;
}
