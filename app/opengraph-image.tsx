import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/components/work/og-card";
import { profile } from "@/lib/site";

// Static share image for the home page, generated at build time.
export const alt = `${profile.name}, ${profile.title}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOgCard({
    eyebrow: "Portfolio",
    title: profile.name,
    lines: [profile.title, "Websites · CRMs · Dashboards · Marketing data"],
    footer: "nicoagustin",
  });
}
