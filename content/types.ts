import type { TechId } from "@/lib/site";

export type Img = { src: string; width: number; height: number; alt: string; caption?: string };

export type Video = {
  src: string;
  poster: string;
  width: number;
  height: number;
  title: string;
  /** Plain-language description of what the recording shows (also used as the accessible description). */
  description: string;
  durationSec?: number;
};

/** A live, read-only dashboard demo served from /public/demos/<slug>/ (always sample data). */
export type Demo = {
  slug: string;
  client: string;
  title: string;
  src: string;
  preview: Img;
};

export type Kpi = { label: string; value: string; note?: string; emphasis?: boolean };

export type KpiBoard = {
  title: string;
  period: string;
  currency?: string;
  attribution?: string;
  kpis: Kpi[];
  /** The report's own reading, in plain words. */
  reading?: string[];
};

/** Which original architecture diagram to draw (components/work/diagrams). */
export type DiagramId = "dashboards" | "sabbath" | "omdena" | "static-site" | "spa";

/**
 * A case-study section. Unknown sections are simply omitted: nothing unknown is ever rendered,
 * and every gap is listed in docs/INTAKE.md.
 */
export type Section = { heading: string; body?: string[]; bullets?: string[] };

export type Project = {
  slug: string;
  /** Two-digit number shown in Selected work, "01".."07". */
  index: string;
  title: string;
  /** Short type line, e.g. "Reporting system · 5 live demos". */
  kind: string;
  /** Year or range, only when known. */
  year?: string;
  /** Where it was built, only when known: "Agora Data Driven", "Freelance", "Omdena"... */
  context?: string;
  /** One-line summary for the row and meta description (≤ 160 chars). */
  summary: string;
  /** Opening paragraph of the case-study page. */
  lede: string;
  /** Keys pressed on the 3D keyboard highlight the projects whose techs include them. */
  techs: TechId[];
  /** Display stack (may include items that aren't keycaps, e.g. "React Hook Form"). */
  stack: string[];
  /** Hidden when unknown. */
  role?: string;
  client?: { name: string; url?: string };
  live?: { href: string; label: string };
  /** Hover preview + Open Graph background. Omdena has none (diagram instead). */
  cover?: Img;
  /** Case-study body: Problem, My role, Stack, Architecture, What I learned, ... (only known ones). */
  problem?: string[];
  architecture?: { body?: string[]; bullets?: string[]; diagram?: DiagramId };
  sections?: Section[];
  learned?: string[];
  demos?: Demo[];
  videos?: Video[];
  gallery?: Img[];
  kpis?: KpiBoard;
  /** Honest notes about what was removed or what the media is (e.g. sample data). */
  disclosures?: string[];
  /** Credit lines (e.g. "Ad creative by Ehjay Lorenzo"). */
  credits?: string[];
  /** Verification link for projects backed by a certificate. */
  verify?: { href: string; label: string };
};
