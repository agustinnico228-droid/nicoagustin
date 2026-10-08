import type { JSX } from "react";
import type { DiagramId } from "@/content/types";
import { DashboardsDiagram } from "./DashboardsDiagram";
import { OmdenaDiagram } from "./OmdenaDiagram";
import { SabbathDiagram } from "./SabbathDiagram";
import { SpaDiagram } from "./SpaDiagram";
import { StaticSiteDiagram } from "./StaticSiteDiagram";

const diagrams: Record<DiagramId, () => JSX.Element> = {
  dashboards: DashboardsDiagram,
  sabbath: SabbathDiagram,
  omdena: OmdenaDiagram,
  "static-site": StaticSiteDiagram,
  spa: SpaDiagram,
};

/** Draws the architecture diagram for a project. */
export function Diagram({ id }: { id: DiagramId }) {
  const Component = diagrams[id];
  return <Component />;
}
