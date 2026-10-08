import { projects } from "@/content/projects";
import type { Project } from "@/content/types";
import { certificates, profile, SITE_URL, stack } from "@/lib/site";

/*
 * Structured data (schema.org JSON-LD). Each helper returns a JSON string that is safe to drop into
 * <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ... }} />: "<" is escaped as <.
 * Facts only, from lib/site.ts and content/projects.ts. Never a phone number or street address (city only).
 */

const abs = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

const PERSON_ID = abs("/#person");
const WEBSITE_ID = abs("/#website");
const projectUrl = (slug: string) => abs(`/work/${slug}`);

/** Line/paragraph separators are valid JSON but break inline scripts in old engines; escape them. */
const BACKSLASH = String.fromCharCode(92);

function serialize(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .split(String.fromCharCode(0x2028)).join(BACKSLASH + "u2028")
    .split(String.fromCharCode(0x2029)).join(BACKSLASH + "u2029");
}

function person(): Record<string, unknown> {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: profile.name,
    jobTitle: profile.title,
    description: profile.positioning,
    url: abs("/"),
    image: abs(profile.photo.src),
    email: `mailto:${profile.email}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Malolos",
      addressRegion: "Bulacan",
      addressCountry: "PH",
    },
    sameAs: [profile.links.linkedin, profile.links.github],
    alumniOf: { "@type": "CollegeOrUniversity", name: "La Consolacion University Philippines" },
    knowsLanguage: ["en", "fil"],
    knowsAbout: stack.map((t) => t.label),
    hasCredential: certificates.map((c) => ({
      "@type": "EducationalOccupationalCredential",
      name: c.title,
      credentialCategory: c.kind,
      recognizedBy: { "@type": "Organization", name: c.issuer },
      ...(c.verify ? { url: c.verify } : {}),
      ...(c.isoDate ? { dateCreated: c.isoDate } : {}),
    })),
  };
}

function website(): Record<string, unknown> {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: profile.name,
    url: abs("/"),
    inLanguage: "en",
    author: { "@id": PERSON_ID },
  };
}

/** Home page: the Person, the WebSite and the list of selected work. */
export function homeJsonLd(): string {
  return serialize({
    "@context": "https://schema.org",
    "@graph": [
      person(),
      website(),
      {
        "@type": "ItemList",
        "@id": abs("/#work"),
        name: "Selected work",
        itemListElement: projects.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "CreativeWork",
            "@id": `${projectUrl(p.slug)}#work`,
            name: p.title,
            url: projectUrl(p.slug),
            description: p.summary,
            ...(p.role ? { creator: { "@id": PERSON_ID } } : {}),
          },
        })),
      },
    ],
  });
}

/** One case study, for its /work/<slug> page. */
export function projectJsonLd(project: Project): string {
  const url = projectUrl(project.slug);
  return serialize({
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `${url}#work`,
    name: project.title,
    description: project.summary,
    url,
    ...(project.role ? { creator: { "@type": "Person", "@id": PERSON_ID, name: profile.name, url: abs("/") } } : {}),
    ...(project.stack.length ? { keywords: project.stack.join(", ") } : {}),
    ...(project.cover ? { image: abs(project.cover.src) } : {}),
    isPartOf: { "@type": "WebSite", "@id": WEBSITE_ID, name: profile.name, url: abs("/") },
  });
}
