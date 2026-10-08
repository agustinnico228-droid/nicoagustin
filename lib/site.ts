/*
 * Nico Agustin: every fact on the site comes from this file or content/projects.ts.
 * Sources: Nico's brief (2026-10-09), his CVs and LinkedIn export (C:\Users\Client\LPT\nicofiles, outside the repo)
 * and his certificate images. Never add his phone number or street address: city only.
 * Unknown facts are left out (undefined) and listed in docs/INTAKE.md, never shown as placeholders.
 */

export const SITE_URL = (
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3002")
).replace(/\/$/, "");

export const profile = {
  name: "Nico Agustin",
  title: "Fullstack Web Developer",
  /** Rotating hero roles, in order. */
  roles: ["Fullstack Developer", "CRM & Dashboard Builder", "Digital Marketing"],
  positioning:
    "I build websites, CRMs and reporting dashboards, and the tracking that shows whether they work.",
  location: "Malolos, Bulacan, Philippines",
  email: "agustinnico228@gmail.com",
  languages: ["English", "Filipino"],
  links: {
    // LinkedIn's own PDF export (Profile.pdf) prints the profile URL as /in/nico-agustin-02a64b2b1.
    // The brief wrote it without the first hyphen; see docs/INTAKE.md.
    linkedin: "https://www.linkedin.com/in/nico-agustin-02a64b2b1",
    github: "https://github.com/agustinnico228-droid",
    resume: "/resume.pdf",
  },
  photo: {
    src: "/media/img/nico-agustin.jpg",
    width: 640,
    height: 640,
    alt: "Portrait of Nico Agustin",
  },
  availability: "Open to full-time roles and freelance projects",
} as const;

/** Hero stat strip: real numbers only. */
export const stats = [
  { value: "5", label: "live dashboard demos, one reporting system" },
  { value: "4", label: "websites and portals built, incl. a spa CRM" },
  { value: "7", label: "certificates, incl. an Omdena AI challenge" },
  { value: "1 yr", label: "as a fullstack developer at Agora Data Driven" },
] as const;

export type ExperienceItem = {
  role: string;
  org: string;
  dates: string;
  /** ISO-ish start for sorting and JSON-LD. */
  start: string;
  end?: string;
  summary?: string;
  points?: string[];
  kind: "dev" | "earlier";
};

export const experience: ExperienceItem[] = [
  {
    role: "Freelance Web Developer",
    org: "Self-employed",
    dates: "Sept 2026 – present",
    start: "2026-09",
    summary: "Full-stack web applications with PERN, MERN and Next.js.",
    kind: "dev",
  },
  {
    role: "Fullstack Web Developer",
    org: "Agora Data Driven",
    dates: "Sept 2025 – Sept 2026",
    start: "2025-09",
    end: "2026-09",
    points: ["Built the client reporting dashboards: one reporting system for five client businesses."],
    kind: "dev",
  },
  {
    role: "Service Crew",
    org: "Jollibee",
    dates: "Jan – May 2025",
    start: "2025-01",
    end: "2025-05",
    kind: "earlier",
  },
  {
    role: "Barista & Kitchen Assistant",
    org: "Kape ni Kaka",
    dates: "Nov 2021 – Mar 2023 · Oct 2023 – Jan 2024",
    start: "2021-11",
    end: "2024-01",
    kind: "earlier",
  },
];

export const education = [
  {
    school: "La Consolacion University Philippines",
    degree: "BS Information Technology, major in Programming",
    dates: "2023 – 2025",
    note: "Dean's Lister, 2024",
  },
  {
    school: "Marcelo H. Del Pilar National High School",
    degree: "Science, Technology, Engineering and Mathematics (STEM)",
    dates: "2016 – 2023",
    note: "Graduated with honors",
  },
] as const;

export const seminars = [
  "JPSSITE Pace Level Up v4.0: IT Trends: Navigating the Ever-Changing Digital Landscape",
  "JPSSITE Pace Level Up v4.1: From Pixels to Perfection: Unleashing Creativity in Game Development and Graphic Designing",
  "JPSSITE Pace Level Up v4.2: Juggling Technology and Morality",
  "JPSSITE Pace Level Up v4.3: Coding for Impact: Leveraging Technology to Solve Real-World Challenges",
] as const;

export const volunteering = ["FORGE Campus Ministry volunteer"] as const;

export type Certificate = {
  id: string;
  title: string;
  issuer: string;
  /** Shown as written on the certificate. */
  date?: string;
  /** ISO date for sorting/JSON-LD. */
  isoDate?: string;
  kind: string;
  skills: string[];
  verify?: string;
  note?: string;
  featured?: boolean;
};

/** Omdena pinned first, then Google AI Essentials, then newest first. Checked against each certificate image. */
export const certificates: Certificate[] = [
  {
    id: "omdena-voice-ai",
    title: "AI Innovation Challenge: Building Voice-First AI Solutions for Public Services",
    issuer: "Omdena",
    date: "Jul 27, 2026",
    isoDate: "2026-07-27",
    kind: "Certificate of Achievement · Fullstack Engineer",
    skills: ["Conversational AI", "Dzongkha–English NLP", "Multi-agent workflow automation", "Voice interfaces"],
    verify: "https://confirm.omdena.com/INxnf_n",
    note: "A voice-enabled, multilingual, agent-based public-service assistant prototype for Bhutan.",
    featured: true,
  },
  {
    id: "google-ai-essentials",
    title: "Google AI Essentials",
    issuer: "Google · Coursera",
    date: "Oct 12, 2025",
    isoDate: "2025-10-12",
    kind: "Specialization · 5 courses",
    skills: ["Introduction to AI", "AI productivity tools", "Prompting", "Responsible AI", "Staying ahead of the AI curve"],
    verify: "https://coursera.org/verify/specialization/67TTY7HV1I9D",
    featured: true,
  },
  {
    id: "meta-html-css",
    title: "HTML and CSS in depth",
    issuer: "Meta · Coursera",
    date: "Apr 24, 2026",
    isoDate: "2026-04-24",
    kind: "Course certificate",
    skills: ["HTML", "CSS"],
    verify: "https://coursera.org/verify/019SPIXWLY81",
  },
  {
    id: "meta-version-control",
    title: "Version Control",
    issuer: "Meta · Coursera",
    date: "Apr 8, 2026",
    isoDate: "2026-04-08",
    kind: "Course certificate",
    skills: ["Git", "Version control"],
    verify: "https://coursera.org/verify/5WFFMS1JP8H1",
  },
  {
    id: "meta-javascript",
    title: "Programming with JavaScript",
    issuer: "Meta · Coursera",
    date: "Apr 6, 2026",
    isoDate: "2026-04-06",
    kind: "Course certificate",
    skills: ["JavaScript"],
    verify: "https://coursera.org/verify/PMXNZBN1QJ82",
  },
  {
    id: "google-python-ds",
    title: "Data Structures in Python",
    issuer: "Google · Coursera",
    date: "Mar 25, 2026",
    isoDate: "2026-03-25",
    kind: "Course certificate",
    skills: ["Python", "Data structures"],
    verify: "https://coursera.org/verify/V4SIBSLKG2PX",
  },
  {
    id: "mos-excel",
    title: "Microsoft Office Specialist: Excel Associate (Office 2019)",
    issuer: "Microsoft",
    kind: "Certification",
    skills: ["Excel"],
  },
];

// ── Stack (keycaps + plain list) ────────────────────────────────────────────────────────────────

export type Layer = "frontend" | "backend" | "database" | "data" | "tools";

export const layers: { id: Layer; label: string }[] = [
  { id: "frontend", label: "Frontend" },
  { id: "backend", label: "Backend" },
  { id: "database", label: "Database" },
  { id: "data", label: "Data & integrations" },
  { id: "tools", label: "Tools" },
];

export type TechId =
  | "html-css" | "javascript" | "typescript" | "react" | "nextjs" | "tailwind" | "react-router" | "vite" | "gsap"
  | "nodejs" | "express" | "python" | "zod" | "resend"
  | "postgresql" | "mongodb" | "supabase"
  | "windsor" | "meta-ads" | "shopify" | "activecampaign" | "klaviyo" | "campaign-monitor" | "svg-charts"
  | "git" | "vercel" | "github-pages" | "excel";

export type Tech = {
  id: TechId;
  label: string;
  /** Short keycap legend (≤ 8 chars where possible). */
  key: string;
  layer: Layer;
  /** Where else it's used when no project on the site shows it. */
  alsoIn?: string;
};

export const stack: Tech[] = [
  { id: "html-css", label: "HTML & CSS", key: "HTML/CSS", layer: "frontend", alsoIn: "This portfolio" },
  { id: "javascript", label: "JavaScript", key: "JS", layer: "frontend" },
  { id: "typescript", label: "TypeScript", key: "TS", layer: "frontend", alsoIn: "This portfolio" },
  { id: "react", label: "React", key: "React", layer: "frontend", alsoIn: "Freelance builds (PERN, MERN)" },
  { id: "nextjs", label: "Next.js", key: "Next.js", layer: "frontend", alsoIn: "This portfolio · freelance builds" },
  { id: "tailwind", label: "Tailwind CSS", key: "Tailwind", layer: "frontend", alsoIn: "This portfolio" },
  { id: "react-router", label: "React Router", key: "Router", layer: "frontend" },
  { id: "vite", label: "Vite", key: "Vite", layer: "frontend" },
  { id: "gsap", label: "GSAP", key: "GSAP", layer: "frontend", alsoIn: "This portfolio" },
  { id: "nodejs", label: "Node.js", key: "Node", layer: "backend", alsoIn: "Freelance builds (PERN, MERN)" },
  { id: "express", label: "Express", key: "Express", layer: "backend", alsoIn: "Freelance builds (PERN, MERN)" },
  { id: "python", label: "Python", key: "Python", layer: "backend" },
  { id: "zod", label: "Zod", key: "Zod", layer: "backend", alsoIn: "This portfolio (contact form)" },
  { id: "resend", label: "Resend", key: "Resend", layer: "backend" },
  { id: "postgresql", label: "PostgreSQL", key: "Postgres", layer: "database", alsoIn: "Freelance builds (PERN)" },
  { id: "mongodb", label: "MongoDB", key: "Mongo", layer: "database", alsoIn: "Freelance builds (MERN)" },
  { id: "supabase", label: "Supabase", key: "Supabase", layer: "database" },
  { id: "windsor", label: "Windsor.ai", key: "Windsor", layer: "data" },
  { id: "meta-ads", label: "Meta Ads", key: "Meta Ads", layer: "data" },
  { id: "shopify", label: "Shopify", key: "Shopify", layer: "data" },
  { id: "activecampaign", label: "ActiveCampaign", key: "ActiveC.", layer: "data" },
  { id: "klaviyo", label: "Klaviyo", key: "Klaviyo", layer: "data" },
  { id: "campaign-monitor", label: "Campaign Monitor", key: "CampMon", layer: "data" },
  { id: "svg-charts", label: "SVG charts", key: "SVG", layer: "data" },
  { id: "git", label: "Git & GitHub", key: "Git", layer: "tools", alsoIn: "This portfolio · every project" },
  { id: "vercel", label: "Vercel", key: "Vercel", layer: "tools", alsoIn: "This portfolio" },
  { id: "github-pages", label: "GitHub Pages", key: "Pages", layer: "tools" },
  { id: "excel", label: "Excel", key: "Excel", layer: "tools", alsoIn: "Microsoft Office Specialist: Excel Associate certification" },
];

export const techById = Object.fromEntries(stack.map((t) => [t.id, t])) as Record<TechId, Tech>;

export const nav = [
  { href: "/#work", label: "Work" },
  { href: "/#stack", label: "Stack" },
  { href: "/#experience", label: "Experience" },
  { href: "/#certificates", label: "Certificates" },
  { href: "/#contact", label: "Contact" },
] as const;

export const credits =
  "Inspired by the work of Tajmirul Islam, Hamish Williams and Naresh Khatri";
