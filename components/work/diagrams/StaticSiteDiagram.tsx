import { Flow, type FlowSpec } from "./Flow";

const spec: FlowSpec = {
  label:
    "Build of the Latte with Lata static site: HTML, layered CSS and JavaScript modules using GSAP and Splide, published on GitHub Pages.",
  stages: [
    {
      boxes: [
        { title: "HTML" },
        { title: "CSS layers" },
        { title: "JS modules", items: ["GSAP", "Splide"], tone: "accent" },
      ],
    },
    { boxes: [{ title: "GitHub Pages", items: ["Static hosting"] }] },
  ],
  steps: [
    "HTML pages.",
    "Styles organised in CSS layers.",
    "JavaScript modules, using GSAP for motion and Splide for carousels.",
    "The static files are published on GitHub Pages.",
  ],
};

export function StaticSiteDiagram() {
  return <Flow spec={spec} />;
}
