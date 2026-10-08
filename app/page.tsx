import { Hero } from "@/components/hero/Hero";
import { About } from "@/components/sections/About";
import { Certificates } from "@/components/sections/Certificates";
import { Contact } from "@/components/sections/Contact";
import { Experience } from "@/components/sections/Experience";
import { Work } from "@/components/sections/Work";
import { Stack } from "@/components/stack/Stack";
import { homeJsonLd } from "@/lib/jsonld";

// Static page: nothing here reads the request (the contact form reads ?from= in the browser).
export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: homeJsonLd() }} />
      <Hero />
      <About />
      <Work />
      <Stack />
      <Experience />
      <Certificates />
      <Contact />
    </>
  );
}
