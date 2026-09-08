import type { ReactNode } from "react";
import type {
  ElementNamingConfig,
  KizkattElement,
  KizkattTheme,
  StyleState,
  SvgSerializeOptions,
  Tool
} from "kizkatt-graphic-engine";
import type { KizkattGraphicEditorCanvasViewModel } from "kizkatt-ui";
import type { KizkattGraphicEditorViewModel } from "./viewModel";

export type KizkattGraphicEditorControllerProps = {
  arrowMarkerId?: string;
  canvasAriaLabel?: string;
  canvasClassName?: string;
  children: (viewModel: KizkattGraphicEditorViewModel) => ReactNode;
  defaultElementStyleByTheme?: Record<KizkattTheme, StyleState>;
  getCanvasCursor: (state: { isPanning: boolean; tool: Tool }) => string;
  renderCanvas: (viewModel: KizkattGraphicEditorCanvasViewModel) => ReactNode;
  serializeSvg: (svg: SVGSVGElement, options?: SvgSerializeOptions) => string;
  naming?: ElementNamingConfig;
  getToolForSelectedElement?: (element: KizkattElement) => Tool | null;
};
