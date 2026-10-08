import { notFound } from "next/navigation";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/components/work/og-card";
import { projectBySlug, projects } from "@/content/projects";
import { profile } from "@/lib/site";

// One share image per case study, all generated at build time; unknown slugs 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export const alt = `Case study by ${profile.name}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projectBySlug(slug);
  if (!project) notFound();
  return renderOgCard({
    eyebrow: `${project.index} / Selected work`,
    title: project.title,
    lines: [project.kind],
    footer: "nicoagustin",
  });
}
