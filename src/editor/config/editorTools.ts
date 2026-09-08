import type { ElementType, Tool } from "kizkatt-graphic-engine";
import { TOOL_REGISTRY } from "kizkatt-ui";

export const STYLING_TOOLS = new Set<Tool>(
  TOOL_REGISTRY.filter((tool) => tool.showsStylingPanel).map((tool) => tool.id)
);

export const SELECTED_ELEMENT_STYLING_TOOLS = new Set<Tool>([
  "rectangle",
  "diamond",
  "ellipse",
  "arrow",
  "line",
  "polyline",
  "draw",
  "text"
]);

export const ELEMENT_TOOL_BY_TYPE = {
  arrow: "arrow",
  diamond: "diamond",
  draw: "draw",
  ellipse: "ellipse",
  image: null,
  line: "line",
  rectangle: "rectangle",
  text: "text"
} as const satisfies Record<ElementType, Tool | null>;
