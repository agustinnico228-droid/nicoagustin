import { Flow, type FlowSpec } from "./Flow";

const spec: FlowSpec = {
  label:
    "Concept of the voice-first public-service assistant, an exploratory prototype: a citizen speaks in Dzongkha or English; a speech and language layer handles speech recognition and Dzongkha–English language processing; cooperating AI agents automate the workflow; the result is a public-service action.",
  stages: [
    { boxes: [{ title: "Voice", items: ["A citizen speaks", "Dzongkha or English"] }] },
    {
      boxes: [
        {
          title: "Speech & language layer",
          items: ["Speech recognition", "Dzongkha–English NLP"],
          tone: "accent",
        },
      ],
    },
    { boxes: [{ title: "Agents", items: ["Multi-agent workflow automation"], tone: "accent" }] },
    { boxes: [{ title: "Public-service actions" }] },
  ],
  steps: [
    "A citizen speaks, in Dzongkha or English.",
    "A speech and language layer handles speech recognition and Dzongkha–English language processing.",
    "Cooperating AI agents automate the workflow.",
    "The result is a public-service action.",
  ],
  note: "Exploratory prototype",
};

export function OmdenaDiagram() {
  return <Flow spec={spec} />;
}
