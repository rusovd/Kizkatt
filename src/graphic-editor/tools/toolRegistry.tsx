import type { ReactNode } from "react";

import type { ElementType, Tool } from "../model/types";
import { ENGLISH_TRANSLATIONS } from "../i18n/en";
import {
  ArrowIcon,
  DiamondIcon,
  EllipseIcon,
  EraserIcon,
  FreedrawIcon,
  ImageIcon,
  LineIcon,
  NodeEditIcon,
  RectangleIcon,
  SelectionIcon,
  TextIcon,
  handIcon
} from "../ui/icons";

export type ToolLabelKey =
  | "arrow"
  | "diamond"
  | "draw"
  | "ellipse"
  | "eraser"
  | "hand"
  | "image"
  | "line"
  | "nodeEdit"
  | "rectangle"
  | "select"
  | "text";

export type ToolDefinition = {
  icon: ReactNode;
  id: Tool;
  labelKey: ToolLabelKey;
  submenu?: "line" | "shape";
  shortcut?: string;
  showsStylePanel?: boolean;
};

export const TOOL_REGISTRY_BY_ID: Record<Tool, ToolDefinition> = {
  arrow: {
    id: "arrow",
    labelKey: "arrow",
    icon: ArrowIcon,
    shortcut: "5",
    showsStylePanel: true,
    submenu: "line"
  },
  diamond: {
    id: "diamond",
    labelKey: "diamond",
    icon: DiamondIcon,
    shortcut: "3",
    showsStylePanel: true,
    submenu: "shape"
  },
  draw: {
    id: "draw",
    labelKey: "draw",
    icon: FreedrawIcon,
    shortcut: "7",
    showsStylePanel: true,
    submenu: "line"
  },
  ellipse: {
    id: "ellipse",
    labelKey: "ellipse",
    icon: EllipseIcon,
    shortcut: "4",
    showsStylePanel: true,
    submenu: "shape"
  },
  eraser: { id: "eraser", labelKey: "eraser", icon: EraserIcon, shortcut: "0" },
  hand: { id: "hand", labelKey: "hand", icon: handIcon },
  image: { id: "image", labelKey: "image", icon: ImageIcon, shortcut: "9" },
  line: {
    id: "line",
    labelKey: "line",
    icon: LineIcon,
    shortcut: "6",
    showsStylePanel: true,
    submenu: "line"
  },
  nodeEdit: {
    id: "nodeEdit",
    labelKey: "nodeEdit",
    icon: NodeEditIcon
  },
  rectangle: {
    id: "rectangle",
    labelKey: "rectangle",
    icon: RectangleIcon,
    shortcut: "2",
    showsStylePanel: true,
    submenu: "shape"
  },
  select: {
    id: "select",
    labelKey: "select",
    icon: SelectionIcon,
    shortcut: "1"
  },
  text: {
    id: "text",
    labelKey: "text",
    icon: TextIcon,
    shortcut: "8"
  }
};

export const TOOL_REGISTRY: ToolDefinition[] =
  Object.values(TOOL_REGISTRY_BY_ID);

export const STYLE_TOOLS = new Set<Tool>(
  TOOL_REGISTRY.filter((tool) => tool.showsStylePanel).map((tool) => tool.id)
);

export const SELECTED_ELEMENT_STYLE_TOOLS = new Set<Tool>([
  "rectangle",
  "diamond",
  "ellipse",
  "arrow",
  "line",
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

export const ELEMENT_NAMING = {
  elementNameByType: ENGLISH_TRANSLATIONS.elementNames,
  groupName: ENGLISH_TRANSLATIONS.groupNames.default
};
