import type { KizkattTheme, ResizeHandle, StyleState } from "../model/types";

export const KIZKATT_STORAGE_PREFIX = "kizkatt";
export const CANVAS_BACKGROUND_STORAGE_KEY = `${KIZKATT_STORAGE_PREFIX}:graphic-engine:canvas-background`;
export const CUSTOM_CANVAS_BACKGROUND_STORAGE_KEY = `${KIZKATT_STORAGE_PREFIX}:graphic-engine:custom-canvas-background`;
export const GRID_COLOR_STORAGE_KEY = `${KIZKATT_STORAGE_PREFIX}:graphic-engine:grid-color`;
export const THEME_STORAGE_KEY = `${KIZKATT_STORAGE_PREFIX}:graphic-engine:theme`;
export const HISTORY_LIMIT = 100;
export const MIN_ELEMENT_SIZE = 10;
export const MIN_CREATE_DRAG_DISTANCE = 6;
export const MIN_SELECT_DRAG_DISTANCE = 4;

export const DEFAULT_CANVAS_BACKGROUND = "#fdf8f6";
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
  edgeStyle: "round",
  fillStyle: "solid",
  fillWeight: 1,
  sloppiness: "architect",
  sloppinessGap: 16,
  strokeWidth: 10,
  strokeStyle: "solid",
  opacity: 100
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
  dark: ["#121212", "#161719", "#0f1518", "#1d1b04", "#211a16"],
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
  sx: -1 | 1;
  sy: -1 | 1;
}> = [
  { id: "nw", sx: -1, sy: -1 },
  { id: "ne", sx: 1, sy: -1 },
  { id: "se", sx: 1, sy: 1 },
  { id: "sw", sx: -1, sy: 1 }
];
