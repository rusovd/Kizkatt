import type {
  ElementType,
  GridSettings,
  KizkattTheme,
  ResizeHandle,
  StyleState
} from "../model/types";

export const KIZKATT_STORAGE_PREFIX = "kizkatt";
export const CANVAS_BACKGROUND_STORAGE_KEY = `${KIZKATT_STORAGE_PREFIX}:graphic-engine:canvas-background`;
export const CUSTOM_CANVAS_BACKGROUND_STORAGE_KEY = `${KIZKATT_STORAGE_PREFIX}:graphic-engine:custom-canvas-background`;
export const GRID_COLOR_STORAGE_KEY = `${KIZKATT_STORAGE_PREFIX}:graphic-engine:grid-color`;
export const GRID_SETTINGS_STORAGE_KEY = `${KIZKATT_STORAGE_PREFIX}:graphic-engine:grid-settings`;
export const THEME_STORAGE_KEY = `${KIZKATT_STORAGE_PREFIX}:graphic-engine:theme`;
export const UI_SCALE_STORAGE_KEY = `${KIZKATT_STORAGE_PREFIX}:graphic-engine:ui-scale`;
export const CANVAS_STATE_STORAGE_KEY = `${KIZKATT_STORAGE_PREFIX}:graphic-engine:canvas-state`;
export const QUICK_SAVE_STORAGE_KEY = `${KIZKATT_STORAGE_PREFIX}:graphic-engine:quick-save`;
export const CONTEXT_MENU_DEFAULTS_STORAGE_KEY = `${KIZKATT_STORAGE_PREFIX}:graphic-engine:context-menu-defaults`;
export const HISTORY_LIMIT = 100;
export const MIN_ELEMENT_SIZE = 10;
export const MIN_CREATE_DRAG_DISTANCE = 6;
export const MIN_CREATE_HOLD_DURATION_MS = 150;
export const MIN_SELECT_DRAG_DISTANCE = 4;
export const FREEHAND_SIMPLIFICATION_TOLERANCE_PX = 0.75;
export const OBJECT_SNAP_DISTANCE = 12;
export const RENDER_OVERSCAN_PX = 256;
export const DEFAULT_PX_GRID_MAJOR_SIZE = 30;
export const DEFAULT_PX_GRID_MINOR_SIZE = 3;
export const DEFAULT_MM_GRID_MAJOR_SIZE = 10;
export const DEFAULT_MM_GRID_MINOR_SIZE = 5;
export const DEFAULT_GRID_MM_SCALE = 1;
export const MIN_GRID_MM_SCALE = 0.5;
export const MAX_GRID_MM_SCALE = 2;
export const GRID_MM_SCALE_STEP = 0.01;
export const GRID_CALIBRATION_REFERENCE_MM = 30;
export const DEFAULT_GRID_SETTINGS: GridSettings = {
  unit: "px",
  metricScale: DEFAULT_GRID_MM_SCALE,
  majorSize: DEFAULT_PX_GRID_MAJOR_SIZE,
  minorSize: DEFAULT_PX_GRID_MINOR_SIZE,
  showMajor: true,
  showMinor: true
};
export const DEFAULT_MM_GRID_SETTINGS: GridSettings = {
  unit: "mm",
  metricScale: DEFAULT_GRID_MM_SCALE,
  majorSize: DEFAULT_MM_GRID_MAJOR_SIZE,
  minorSize: DEFAULT_MM_GRID_MINOR_SIZE,
  showMajor: true,
  showMinor: true
};
export const GRID_CELL_SIZE = DEFAULT_PX_GRID_MINOR_SIZE;
export const MIN_GRID_SIZE = 0.1;
export const MAX_GRID_SIZE = 10000;
export const MIN_PIXEL_SIZE = 1;
export const TEXT_ELEMENT_DEFAULT_WIDTH = 128;
export const TEXT_ELEMENT_DEFAULT_HEIGHT = 36;
export const TEXT_ELEMENT_DEFAULT_CONTENT = "Text";
export const PASTED_TEXT_LINE_HEIGHT = 28;
export const PASTED_TEXT_CHARACTER_WIDTH = 12;
export const PASTED_TEXT_MAX_WIDTH = 520;
export const PATH_CLOSED_ENDPOINT_TOLERANCE = 4;
export const PERCENT_MAX_VALUE = 100;
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;
export const ZOOM_STEP = 0.1;
export const DEFAULT_ZOOM = 1;
export const INITIAL_PAN = { x: 0, y: 0 };
export const VIEWPORT_CENTER_DIVISOR = 2;
export const HALF_DIVISOR = 2;
export const DUPLICATED_ELEMENT_OFFSET = 24;
export const ROTATE_HANDLE_MIN_RADIUS = 24;
export const DEFAULT_SKEW_ANGLE = 0;
export const SKEW_TRANSFORM_MIN_DENOMINATOR = 1;
export const DEFAULT_IMAGE_SIZE = {
  height: 160,
  width: 240
};
export const MAX_PASTED_IMAGE_SIZE = {
  height: 360,
  width: 480
};
export const IMAGE_LOAD_FALLBACK_TIMEOUT_MS = 250;
export const DEFAULT_BOARD_ARIA_LABEL = "Kizkatt diagram canvas";
export const DEFAULT_CANVAS_ARIA_LABEL = "Drawing canvas";
export const DEFAULT_IMAGE_INPUT_ARIA_LABEL = "Choose image";
export const EXPORT_CANVAS_IMAGE_ERROR_MESSAGE =
  "Unable to export canvas image.";
export const IMAGE_FILE_ACCEPT = "image/*";
export const SVG_IMAGE_MIME_TYPE = "image/svg+xml;charset=utf-8";
export const PNG_IMAGE_MIME_TYPE = "image/png";
export const PLAIN_TEXT_MIME_TYPE = "text/plain";
export const PNG_EXPORT_DPI = 300;
export const SCREEN_DPI = 96;
export const PNG_EXPORT_PADDING = 16;
export const EMPTY_INPUT_VALUE = "";
export const EDITABLE_KEYBOARD_TARGET_SELECTORS = [
  "input",
  "textarea",
  "select",
  "[contenteditable='true']",
  "[contenteditable='']",
  "[role='textbox']"
];
export const DEFAULT_ARROW_MARKER_ID = "kizkatt-arrow";
export const ARROW_MARKER_VIEW_BOX = "0 0 10 10";
export const ARROW_MARKER_REF_X = 8;
export const ARROW_MARKER_REF_Y = 5;
export const ARROW_MARKER_WIDTH = 8;
export const ARROW_MARKER_HEIGHT = 8;
export const ARROW_MARKER_ORIENT = "auto-start-reverse";
export const ARROW_MARKER_PATH = "M 0 0 L 10 5 L 0 10 z";
export const CANVAS_TAB_INDEX = 0;
export const DEFAULT_GROUP_NAME = "Group";
export const DEFAULT_ELEMENT_NAME_BY_TYPE: Record<ElementType, string> = {
  arrow: "Arrow",
  diamond: "Diamond",
  draw: "Draw",
  ellipse: "Ellipse",
  image: "Image",
  line: "Line",
  rectangle: "Rectangle",
  text: "Text"
};
export const TRANSPARENT_COLOR = "transparent";
export const DEFAULT_EDGE_STYLE = "round";
export const DEFAULT_FILL_STYLE = "solid";
export const DEFAULT_FILL_WEIGHT = 1;
export const DEFAULT_SLOPPINESS = "architect";
export const DEFAULT_SELECTED_SLOPPINESS = "artist";
export const DEFAULT_SLOPPINESS_GAP = 16;
export const DEFAULT_STROKE_STYLE = "solid";
export const DEFAULT_STROKE_WIDTH = 10;
export const DEFAULT_OPACITY = PERCENT_MAX_VALUE;
export const DEFAULT_SHOW_ROTATE_HANDLE = false;
export const IMAGE_MIME_TYPE_PREFIX = "image/";
export const SELECTION_LINK_PREFIX = "kizkatt://selection/";
export const ID_RANDOM_RADIX = 36;
export const ID_RANDOM_SLICE_START = 2;
export const EMPTY_COLLECTION_LENGTH = 0;
export const SINGLE_SELECTION_COUNT = 1;
export const FIRST_ARRAY_INDEX = 0;
export const NEXT_ARRAY_INDEX_OFFSET = 1;
export const DEFAULT_SELECT_TOOL = "select";
export const TEXT_TOOL = "text";
export const DEFAULT_IMAGE_ELEMENT_TYPE = "image";
export const CREATABLE_ELEMENT_TOOLS: readonly ElementType[] = [
  "arrow",
  "diamond",
  "draw",
  "ellipse",
  "image",
  "line",
  "rectangle",
  "text"
];
export const EMPTY_PATH_DATA = "";
export const SVG_MOVE_COMMAND = "M";
export const SVG_LINE_COMMAND = "L";
export const SVG_CUBIC_COMMAND = "C";
export const SVG_COMMAND_SEPARATOR = " ";
export const LINEAR_PATH_MIN_POINT_COUNT = 1;
export const LINEAR_PATH_STRAIGHT_POINT_COUNT = 2;
export const CUBIC_CONTROL_POINT_DIVISOR = 6;
export const CUBIC_BEZIER_WEIGHT = 3;
export const SHARP_EDGE_STYLE = "sharp";
export const NO_ROTATION_ANGLE = 0;
export const DRAW_ELEMENT_TYPE = "draw";
export const LINE_ELEMENT_TYPE = "line";
export const ARROW_ELEMENT_TYPE = "arrow";
export const DEFAULT_UI_SCALE = 1;
export const MIN_UI_SCALE = 0.7;
export const MAX_UI_SCALE = 1.2;
export const UI_SCALE_STEP = 0.05;

export const DEFAULT_CANVAS_BACKGROUND = "#fdf8f6";
export const DARK_DEFAULT_CANVAS_BACKGROUND = "#121212";
export const DEFAULT_CANVAS_BACKGROUND_BY_THEME: Record<KizkattTheme, string> =
  {
    dark: DARK_DEFAULT_CANVAS_BACKGROUND,
    light: DEFAULT_CANVAS_BACKGROUND
  };
export const DEFAULT_GRID_COLOR = "rgba(255, 255, 255, 0.1)";

export const DEFAULT_CUSTOM_CANVAS_BACKGROUND_BY_THEME: Record<
  KizkattTheme,
  string
> = {
  dark: "#121212",
  light: "#ffffff"
};

export const DEFAULT_GRID_COLOR_BY_THEME: Record<KizkattTheme, string> = {
  dark: DEFAULT_GRID_COLOR,
  light: "rgba(42, 50, 64, 0.38)"
};

export const COLOR_PALETTES = [
  {
    id: "transparent",
    color: "transparent",
    shades: []
  },
  {
    id: "black",
    color: "#000000",
    shades: ["#343a40", "#212529", "#161718", "#0c0d0e", "#000000"]
  },
  {
    id: "gray",
    color: "#adb5bd",
    shades: ["#f1f3f5", "#e9ecef", "#d6d6d6", "#ced4da", "#adb5bd"]
  },
  {
    id: "white",
    color: "#ffffff",
    shades: ["#f8f9fa", "#f1f3f5", "#e9ecef", "#dee2e6", "#ffffff"]
  },
  {
    id: "brown",
    color: "#846358",
    shades: ["#f3e9e5", "#d0b8ae", "#b18b7d", "#9b7667", "#846358"]
  },
  {
    id: "cyan",
    color: "#0c8599",
    shades: ["#e3fafc", "#99e9f2", "#3bc9db", "#22b8cf", "#0c8599"]
  },
  {
    id: "blue",
    color: "#1971c2",
    shades: ["#e7f5ff", "#a5d8ff", "#4dabf7", "#1c7ed6", "#1971c2"]
  },
  {
    id: "violet",
    color: "#6741d9",
    shades: ["#e5dbff", "#d0bfff", "#b197fc", "#845ef7", "#6741d9"]
  },
  {
    id: "grape",
    color: "#9c36b5",
    shades: ["#f3d9fa", "#e599f7", "#da77f2", "#cc5de8", "#9c36b5"]
  },
  {
    id: "pink",
    color: "#c2255c",
    shades: ["#ffdeeb", "#faa2c1", "#f783ac", "#f06595", "#c2255c"]
  },
  {
    id: "green",
    color: "#2f9e44",
    shades: ["#d3f9d8", "#b2f2bb", "#69db7c", "#37b24d", "#2f9e44"]
  },
  {
    id: "teal",
    color: "#099268",
    shades: ["#c3fae8", "#96f2d7", "#38d9a9", "#12b886", "#099268"]
  },
  {
    id: "yellow",
    color: "#f08c00",
    shades: ["#fff3bf", "#ffe066", "#fcc419", "#fab005", "#f08c00"]
  },
  {
    id: "orange",
    color: "#e8590c",
    shades: ["#ffe8cc", "#ffc078", "#ffa94d", "#fd7e14", "#e8590c"]
  },
  {
    id: "red",
    color: "#e03131",
    shades: ["#ffe3e3", "#ffa8a8", "#ff8787", "#fa5252", "#e03131"]
  }
] as const;

function getPaletteShadeFromRight(paletteId: string, indexFromRight: number) {
  const palette = COLOR_PALETTES.find(({ id }) => id === paletteId);

  if (!palette || palette.shades.length === 0) {
    return palette?.color ?? "#000000";
  }

  return (
    palette.shades[Math.max(0, palette.shades.length - indexFromRight)] ??
    palette.color
  );
}

function hexToRgb(color: string) {
  const hex = color.slice(1);

  return {
    b: Number.parseInt(hex.slice(4, 6), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    r: Number.parseInt(hex.slice(0, 2), 16)
  };
}

function rgbToHex({ b, g, r }: { b: number; g: number; r: number }) {
  return `#${[r, g, b]
    .map((value) => Math.round(value).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixHexColor(color: string, target: string, amount: number) {
  const sourceRgb = hexToRgb(color);
  const targetRgb = hexToRgb(target);

  return rgbToHex({
    b: sourceRgb.b + (targetRgb.b - sourceRgb.b) * amount,
    g: sourceRgb.g + (targetRgb.g - sourceRgb.g) * amount,
    r: sourceRgb.r + (targetRgb.r - sourceRgb.r) * amount
  });
}

function getFirstRowMiddleShade(color: string) {
  return mixHexColor(color, "#000000", 0.58);
}

export const STROKE_COLORS = [
  "#d6d6d6",
  "#ff8787",
  "#37b24d",
  "#4dabf7",
  "#f08c00",
  "#b197fc"
];

export const BACKGROUND_COLORS = [
  "transparent",
  "#ffc9c9",
  "#b2f2bb",
  "#a5d8ff",
  "#ffec99",
  "transparent"
];

function getFourteenthShade(color: string) {
  return mixHexColor(color, "#ffffff", 0.72);
}

export const DARK_THEME_STROKE_COLORS = [
  "#d6d6d6",
  getPaletteShadeFromRight("red", 1),
  getPaletteShadeFromRight("green", 1),
  getPaletteShadeFromRight("blue", 1),
  getPaletteShadeFromRight("yellow", 1),
  "#b197fc"
];

export const DARK_THEME_BACKGROUND_COLOR_SOURCES = [
  {
    color: getFirstRowMiddleShade(DARK_THEME_STROKE_COLORS[0]),
    paletteId: "gray",
    shadeBaseColor: DARK_THEME_STROKE_COLORS[0]
  },
  {
    color: getFirstRowMiddleShade(DARK_THEME_STROKE_COLORS[1]),
    paletteId: "red",
    shadeBaseColor: DARK_THEME_STROKE_COLORS[1]
  },
  {
    color: getFirstRowMiddleShade(DARK_THEME_STROKE_COLORS[2]),
    paletteId: "green",
    shadeBaseColor: DARK_THEME_STROKE_COLORS[2]
  },
  {
    color: getFirstRowMiddleShade(DARK_THEME_STROKE_COLORS[3]),
    paletteId: "blue",
    shadeBaseColor: DARK_THEME_STROKE_COLORS[3]
  },
  {
    color: getFirstRowMiddleShade(DARK_THEME_STROKE_COLORS[4]),
    paletteId: "yellow",
    shadeBaseColor: DARK_THEME_STROKE_COLORS[4]
  }
] as const;

export const DARK_THEME_BACKGROUND_COLORS = [
  ...DARK_THEME_BACKGROUND_COLOR_SOURCES.map(({ color }) => color),
  "transparent"
];

export const LIGHT_THEME_STROKE_COLORS = DARK_THEME_STROKE_COLORS;

export const LIGHT_THEME_BACKGROUND_COLORS = [
  ...DARK_THEME_STROKE_COLORS.slice(0, 5).map(getFourteenthShade),
  "transparent"
];

const DEFAULT_STYLE_BASE = {
  edgeStyle: DEFAULT_EDGE_STYLE,
  fillStyle: DEFAULT_FILL_STYLE,
  fillWeight: DEFAULT_FILL_WEIGHT,
  sloppiness: DEFAULT_SLOPPINESS,
  sloppinessGap: DEFAULT_SLOPPINESS_GAP,
  strokeWidth: DEFAULT_STROKE_WIDTH,
  strokeStyle: DEFAULT_STROKE_STYLE,
  opacity: DEFAULT_OPACITY
} as const;

export const DEFAULT_ELEMENT_STYLE_BY_THEME: Record<KizkattTheme, StyleState> = {
  dark: {
    ...DEFAULT_STYLE_BASE,
    strokeColor: DARK_THEME_STROKE_COLORS[4],
    backgroundColor: DARK_THEME_BACKGROUND_COLORS[4]
  },
  light: {
    ...DEFAULT_STYLE_BASE,
    strokeColor: LIGHT_THEME_STROKE_COLORS[4],
    backgroundColor: LIGHT_THEME_BACKGROUND_COLORS[4]
  }
};

export const DEFAULT_ELEMENT_STYLE = DEFAULT_ELEMENT_STYLE_BY_THEME.dark;

export const CANVAS_BACKGROUNDS_BY_THEME: Record<KizkattTheme, string[]> = {
  dark: [
    DARK_DEFAULT_CANVAS_BACKGROUND,
    "#161719",
    "#0f1518",
    "#1d1b04",
    "#211a16"
  ],
  light: ["#ffffff", "#f8f9fa", "#f5faff", "#fffce8", "#fdf8f6"]
};

export const GRID_COLORS_BY_THEME: Record<KizkattTheme, string[]> = {
  dark: [
    DEFAULT_GRID_COLOR_BY_THEME.dark,
    "rgba(244, 164, 190, 0.18)",
    "rgba(132, 190, 255, 0.18)"
  ],
  light: [
    DEFAULT_GRID_COLOR_BY_THEME.light,
    "rgba(210, 72, 115, 0.34)",
    "rgba(37, 126, 220, 0.34)"
  ]
};

export const RESIZE_HANDLES: Array<{
  id: ResizeHandle;
  sx: -1 | 0 | 1;
  sy: -1 | 0 | 1;
}> = [
  { id: "nw", sx: -1, sy: -1 },
  { id: "n", sx: 0, sy: -1 },
  { id: "ne", sx: 1, sy: -1 },
  { id: "e", sx: 1, sy: 0 },
  { id: "se", sx: 1, sy: 1 },
  { id: "s", sx: 0, sy: 1 },
  { id: "sw", sx: -1, sy: 1 },
  { id: "w", sx: -1, sy: 0 }
];
