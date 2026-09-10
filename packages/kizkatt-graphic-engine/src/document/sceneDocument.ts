import {
  DEFAULT_CANVAS_BACKGROUND_BY_THEME,
  DEFAULT_CUSTOM_CANVAS_BACKGROUND_BY_THEME,
  DEFAULT_DPI,
  DEFAULT_ELEMENT_STYLE_BY_THEME,
  DEFAULT_GRID_COLOR_BY_THEME,
  DEFAULT_GRID_SETTINGS,
  DEFAULT_UI_SCALE,
  DEFAULT_ZOOM,
  DPI_OPTIONS,
  INITIAL_PAN,
  MAX_UI_SCALE,
  MAX_ZOOM,
  MIN_UI_SCALE,
  MIN_ZOOM
} from "../config/constants";
import { normalizeElement } from "../model/element";
import { normalizeElementNames } from "../model/naming";
import type { ElementNamingConfig } from "../model/naming";
import type {
  CanvasState,
  Dpi,
  ElementType,
  GridSettings,
  GridUnit,
  KizkattElement,
  KizkattTheme,
  Point,
  SelectionAreaMode,
  StyleState
} from "../model/types";

export const KIZKATT_SCENE_FORMAT_VERSION = 1;
export const KIZKATT_SCENE_FILE_EXTENSION = ".kk";
export const KIZKATT_SCENE_MIME_TYPE = "application/vnd.kizkatt+json";
export const KIZKATT_SCENE_GENERATOR = "Kizkatt Graphic Editor";

const ELEMENT_TYPES = new Set<ElementType>([
  "arrow",
  "diamond",
  "draw",
  "ellipse",
  "image",
  "line",
  "rectangle",
  "text"
]);
const OBJECT_KEY_DIGITS = 6;
const PERCENT_SCALE = 100;

export type KizkattSceneSettings = {
  arrowBinding: boolean;
  canvasBackgroundColor: string;
  customCanvasBackgroundColor: string;
  defaultStyle: StyleState;
  dpi: Dpi;
  gridColor: string;
  gridSettings: GridSettings;
  infoMode: boolean;
  pan: Point;
  scale: number;
  selectionAreaMode: SelectionAreaMode;
  showGrid: boolean;
  snapToGrid: boolean;
  snapToMidpoints: boolean;
  snapToObjects: boolean;
  theme: KizkattTheme;
  uiScale: number;
  units: GridUnit;
};

export type KizkattSceneObject = KizkattElement & {
  layer: number;
};

export type KizkattSceneMetadata = {
  changed: string;
  created: string;
  formatVersion: number;
  generator: string;
  user: string | null;
};

export type KizkattSceneDocument = {
  kk: {
    meta: KizkattSceneMetadata;
    scene: {
      Objects: Record<string, KizkattSceneObject>;
      Settings: KizkattSceneSettings;
    };
  };
};

type CreateKizkattSceneDocumentOptions = {
  canvasState: CanvasState;
  meta?: Partial<KizkattSceneMetadata>;
  now?: Date | string;
  settings: KizkattSceneSettings;
  user?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeNumber(
  value: unknown,
  fallback: number,
  minimum = Number.NEGATIVE_INFINITY,
  maximum = Number.POSITIVE_INFINITY
) {
  return isFiniteNumber(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback;
}

function isElementType(value: unknown): value is ElementType {
  return typeof value === "string" && ELEMENT_TYPES.has(value as ElementType);
}

function normalizeDpi(value: unknown, fallback: Dpi): Dpi {
  return DPI_OPTIONS.includes(value as Dpi) ? (value as Dpi) : fallback;
}

function normalizeGridSettings(
  value: unknown,
  fallback: GridSettings
): GridSettings {
  const record = isRecord(value) ? value : {};
  const unit: GridUnit = record.unit === "mm" || record.unit === "px"
    ? record.unit
    : fallback.unit;
  const majorSize = normalizeNumber(record.majorSize, fallback.majorSize, 0.1);

  return {
    majorSize,
    metricScale: normalizeNumber(record.metricScale, fallback.metricScale, 0.01),
    minorSize: Math.min(
      majorSize,
      normalizeNumber(record.minorSize, fallback.minorSize, 0.1)
    ),
    showMajor: normalizeBoolean(record.showMajor, fallback.showMajor),
    showMinor: normalizeBoolean(record.showMinor, fallback.showMinor),
    unit
  };
}

function normalizeStyleState(value: unknown, fallback: StyleState): StyleState {
  if (!isRecord(value)) {
    return fallback;
  }

  const candidate = { ...fallback, ...value } as StyleState;

  return {
    ...candidate,
    backgroundColor: normalizeString(
      candidate.backgroundColor,
      fallback.backgroundColor
    ),
    opacity: normalizeNumber(candidate.opacity, fallback.opacity, 0, 100),
    strokeColor: normalizeString(candidate.strokeColor, fallback.strokeColor),
    strokeWidth: normalizeNumber(candidate.strokeWidth, fallback.strokeWidth, 0)
  };
}

export function createDefaultKizkattSceneSettings(
  overrides: Partial<KizkattSceneSettings> = {}
): KizkattSceneSettings {
  const theme = overrides.theme === "light" ? "light" : "dark";
  const gridSettings = normalizeGridSettings(
    overrides.gridSettings,
    DEFAULT_GRID_SETTINGS
  );

  const defaults: KizkattSceneSettings = {
    arrowBinding: true,
    canvasBackgroundColor: DEFAULT_CANVAS_BACKGROUND_BY_THEME[theme],
    customCanvasBackgroundColor:
      DEFAULT_CUSTOM_CANVAS_BACKGROUND_BY_THEME[theme],
    defaultStyle: DEFAULT_ELEMENT_STYLE_BY_THEME[theme],
    dpi: DEFAULT_DPI,
    gridColor: DEFAULT_GRID_COLOR_BY_THEME[theme],
    gridSettings,
    infoMode: false,
    pan: { ...INITIAL_PAN },
    scale: DEFAULT_ZOOM * PERCENT_SCALE,
    selectionAreaMode: "intersect",
    showGrid: true,
    snapToGrid: false,
    snapToMidpoints: true,
    snapToObjects: false,
    theme,
    uiScale: DEFAULT_UI_SCALE,
    units: gridSettings.unit
  };

  return {
    ...defaults,
    ...overrides,
    gridSettings,
    theme,
    units: overrides.units ?? gridSettings.unit
  };
}

export function normalizeKizkattSceneSettings(
  value: unknown,
  fallback = createDefaultKizkattSceneSettings()
): KizkattSceneSettings {
  const record = isRecord(value) ? value : {};
  const theme: KizkattTheme = record.theme === "light" || record.theme === "dark"
    ? record.theme
    : fallback.theme;
  const units: GridUnit = record.units === "mm" || record.units === "px"
    ? record.units
    : fallback.units;
  const fallbackGridSettings = {
    ...fallback.gridSettings,
    unit: units
  };
  const gridSettings = normalizeGridSettings(
    isRecord(record.gridSettings)
      ? { ...record.gridSettings, unit: units }
      : fallbackGridSettings,
    fallbackGridSettings
  );

  return {
    arrowBinding: normalizeBoolean(record.arrowBinding, fallback.arrowBinding),
    canvasBackgroundColor: normalizeString(
      record.canvasBackgroundColor,
      fallback.canvasBackgroundColor
    ),
    customCanvasBackgroundColor: normalizeString(
      record.customCanvasBackgroundColor,
      fallback.customCanvasBackgroundColor
    ),
    defaultStyle: normalizeStyleState(
      record.defaultStyle,
      fallback.defaultStyle ?? DEFAULT_ELEMENT_STYLE_BY_THEME[theme]
    ),
    dpi: normalizeDpi(record.dpi, fallback.dpi),
    gridColor: normalizeString(record.gridColor, fallback.gridColor),
    gridSettings,
    infoMode: normalizeBoolean(record.infoMode, fallback.infoMode),
    pan: {
      x: normalizeNumber(
        isRecord(record.pan) ? record.pan.x : undefined,
        fallback.pan.x
      ),
      y: normalizeNumber(
        isRecord(record.pan) ? record.pan.y : undefined,
        fallback.pan.y
      )
    },
    scale: normalizeNumber(
      record.scale,
      fallback.scale,
      MIN_ZOOM * PERCENT_SCALE,
      MAX_ZOOM * PERCENT_SCALE
    ),
    selectionAreaMode:
      record.selectionAreaMode === "contain" || record.selectionAreaMode === "intersect"
        ? record.selectionAreaMode
        : fallback.selectionAreaMode,
    showGrid: normalizeBoolean(record.showGrid, fallback.showGrid),
    snapToGrid: normalizeBoolean(record.snapToGrid, fallback.snapToGrid),
    snapToMidpoints: normalizeBoolean(
      record.snapToMidpoints,
      fallback.snapToMidpoints
    ),
    snapToObjects: normalizeBoolean(record.snapToObjects, fallback.snapToObjects),
    theme,
    uiScale: normalizeNumber(
      record.uiScale,
      fallback.uiScale,
      MIN_UI_SCALE,
      MAX_UI_SCALE
    ),
    units
  };
}

function normalizeSceneElement(value: unknown): KizkattElement | null {
  if (!isRecord(value) || !isElementType(value.type)) {
    return null;
  }

  if (
    typeof value.id !== "string" ||
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    !isFiniteNumber(value.width) ||
    !isFiniteNumber(value.height)
  ) {
    return null;
  }

  const fallbackStyle = DEFAULT_ELEMENT_STYLE_BY_THEME.dark;
  const element = {
    ...fallbackStyle,
    ...value,
    angle: normalizeNumber(value.angle, 0),
    height: value.height,
    id: value.id,
    type: value.type,
    width: value.width,
    x: value.x,
    y: value.y
  } as KizkattElement;

  return normalizeElement(element);
}

function getObjectKey(index: number) {
  return `Object_${String(index + 1).padStart(OBJECT_KEY_DIGITS, "0")}`;
}

function getIsoDate(value: Date | string | undefined) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }

  return new Date().toISOString();
}

export function createKizkattSceneDocument({
  canvasState,
  meta,
  now,
  settings,
  user
}: CreateKizkattSceneDocumentOptions): KizkattSceneDocument {
  const changed = getIsoDate(now);
  const created = meta?.created && !Number.isNaN(Date.parse(meta.created))
    ? new Date(meta.created).toISOString()
    : changed;
  const Objects = Object.fromEntries(
    canvasState.elements.map((element, index) => [
      getObjectKey(index),
      { ...element, layer: index + 1 }
    ])
  );

  return {
    kk: {
      meta: {
        changed,
        created,
        formatVersion: KIZKATT_SCENE_FORMAT_VERSION,
        generator: KIZKATT_SCENE_GENERATOR,
        user: user ?? meta?.user ?? null
      },
      scene: {
        Objects,
        Settings: normalizeKizkattSceneSettings(settings)
      }
    }
  };
}

export function getKizkattDocumentCanvasState(
  document: KizkattSceneDocument,
  naming?: ElementNamingConfig
): CanvasState {
  const elements = Object.values(document.kk.scene.Objects)
    .sort((left, right) => left.layer - right.layer)
    .map(({ layer: _layer, ...element }) => element);

  return {
    elements: normalizeElementNames(elements, naming),
    selectedBend: undefined,
    selectedIds: []
  };
}

export function serializeKizkattSceneDocument(
  document: KizkattSceneDocument
) {
  return JSON.stringify(document, null, 2);
}

export function parseKizkattSceneDocument(
  source: string,
  {
    fallbackSettings = createDefaultKizkattSceneSettings(),
    naming
  }: {
    fallbackSettings?: KizkattSceneSettings;
    naming?: ElementNamingConfig;
  } = {}
): KizkattSceneDocument | null {
  let parsed: unknown;

  try {
    parsed = JSON.parse(source);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || !isRecord(parsed.kk)) {
    return null;
  }

  const kk = parsed.kk;
  if (!isRecord(kk.scene)) {
    return null;
  }

  const rawObjects = isRecord(kk.scene.Objects) ? kk.scene.Objects : null;
  if (!rawObjects) {
    return null;
  }

  const elements = Object.entries(rawObjects)
    .map(([key, value], index) => {
      const element = normalizeSceneElement(value);
      const layer = isRecord(value) && isFiniteNumber(value.layer)
        ? value.layer
        : index + 1;

      return element ? { element, key, layer } : null;
    })
    .filter(
      (entry): entry is { element: KizkattElement; key: string; layer: number } =>
        Boolean(entry)
    )
    .sort((left, right) => left.layer - right.layer);
  const normalizedElements = normalizeElementNames(
    elements.map((entry) => entry.element),
    naming
  );
  const Objects = Object.fromEntries(
    normalizedElements.map((element, index) => [
      elements[index]?.key || getObjectKey(index),
      { ...element, layer: index + 1 }
    ])
  );
  const meta = isRecord(kk.meta) ? kk.meta : {};
  const created = getIsoDate(
    typeof meta.created === "string" ? meta.created : undefined
  );
  const changed = getIsoDate(
    typeof meta.changed === "string" ? meta.changed : created
  );

  return {
    kk: {
      meta: {
        changed,
        created,
        formatVersion: KIZKATT_SCENE_FORMAT_VERSION,
        generator: normalizeString(meta.generator, KIZKATT_SCENE_GENERATOR),
        user: typeof meta.user === "string" ? meta.user : null
      },
      scene: {
        Objects,
        Settings: normalizeKizkattSceneSettings(
          kk.scene.Settings,
          fallbackSettings
        )
      }
    }
  };
}
