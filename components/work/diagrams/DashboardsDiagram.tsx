import { Flow, type FlowSpec } from "./Flow";

const spec: FlowSpec = {
  label:
    "Data flow of the client reporting dashboards: data sources feed a Python export job, which writes one data.json file per client; the dashboard page draws KPI cards, SVG charts, tables and insights in the browser, and its Sync button asks the server to refresh the data.",
  stages: [
    {
      boxes: [
        {
          title: "Data sources",
          items: [
            "Meta & Shopify via Windsor.ai",
            "ActiveCampaign",
            "Campaign Monitor",
            "Klaviyo",
            "Sales & stock records",
            "Quiz feed",
          ],
        },
      ],
    },
    { boxes: [{ title: "Python export job", tone: "accent" }] },
    { boxes: [{ title: "data.json", items: ["One file per client"], tone: "accent" }] },
    {
      boxes: [
        {
          title: "Dashboard page, drawn in the browser",
          items: ["KPI cards", "SVG charts", "Tables", "Insights"],
          tone: "accent",
        },
      ],
    },
  ],
  feedback: { from: 3, to: 1, label: "Sync: asks the server to refresh" },
  steps: [
    "Data sources: Meta and Shopify through Windsor.ai, ActiveCampaign, Campaign Monitor, Klaviyo, sales and stock records, and a quiz feed.",
    "A Python export job collects the data.",
    "It writes one data.json file per client.",
    "The dashboard page draws KPI cards, SVG charts, tables and insights in the browser.",
    "The Sync button asks the server to refresh the data.",
  ],
};

export function DashboardsDiagram() {
  return <Flow spec={spec} />;
}
