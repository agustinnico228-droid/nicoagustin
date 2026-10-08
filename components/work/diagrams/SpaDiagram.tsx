import { Flow, type FlowSpec } from "./Flow";

const spec: FlowSpec = {
  label:
    "Build of the single-page React site: React components with React Router for the pages, bundled by Vite into static files served from static hosting.",
  stages: [
    { boxes: [{ title: "React", items: ["Components", "React Router pages"], tone: "accent" }] },
    { boxes: [{ title: "Vite build", items: ["Bundled static files"] }] },
    { boxes: [{ title: "Static hosting" }] },
  ],
  steps: [
    "The site is written as React components, with React Router for the pages.",
    "Vite bundles it into static files.",
    "The files are served from static hosting.",
  ],
};

export function SpaDiagram() {
  return <Flow spec={spec} />;
}
