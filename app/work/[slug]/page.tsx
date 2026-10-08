import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaseStudy } from "@/components/work/CaseStudy";
import { projectBySlug, projects } from "@/content/projects";
import { projectJsonLd } from "@/lib/jsonld";
import { profile } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

/** Every case study is generated at build time; any other slug is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = projectBySlug(slug);
  if (!project) notFound();
  const path = `/work/${project.slug}`;
  return {
    title: project.title,
    description: project.summary,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      url: path,
      siteName: profile.name,
      locale: "en_PH",
      title: `${project.title} · ${profile.name}`,
      description: project.summary,
    },
    twitter: {
      card: "summary_large_image",
      title: `${project.title} · ${profile.name}`,
      description: project.summary,
    },
  };
}

export default async function WorkPage({ params }: Props) {
  const { slug } = await params;
  const i = projects.findIndex((p) => p.slug === slug);
  const project = projects[i];
  if (i < 0 || !project) notFound();
  const prev = i > 0 ? projects[i - 1] : undefined;
  const next = projects[i + 1];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: projectJsonLd(project) }} />
      <CaseStudy project={project} prev={prev} next={next} />
    </>
  );
}
