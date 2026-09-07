import {
  CANVAS_BACKGROUND_STORAGE_KEY,
  CONTEXT_MENU_DEFAULTS_STORAGE_KEY,
  CUSTOM_CANVAS_BACKGROUND_STORAGE_KEY,
  DEFAULT_DPI,
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_CANVAS_BACKGROUND_BY_THEME,
  DEFAULT_MM_GRID_SETTINGS,
  DEFAULT_CUSTOM_CANVAS_BACKGROUND_BY_THEME,
  DEFAULT_GRID_SETTINGS,
  DEFAULT_GRID_COLOR,
  DEFAULT_GRID_COLOR_BY_THEME,
  GRID_COLOR_STORAGE_KEY,
  GRID_SETTINGS_STORAGE_KEY,
  DPI_OPTIONS,
  DPI_STORAGE_KEY,
  MAX_GRID_SIZE,
  MAX_GRID_MM_SCALE,
  MIN_GRID_SIZE,
  MIN_GRID_MM_SCALE,
  THEME_STORAGE_KEY,
  DEFAULT_UI_SCALE,
  MAX_UI_SCALE,
  MIN_UI_SCALE,
  UI_SCALE_STORAGE_KEY
} from "kizkatt-graphic-engine";
import type {
  Dpi,
  GridSettings,
  GridUnit,
  KizkattTheme,
  GradientFill
} from "kizkatt-graphic-engine";
import { normalizeGradientFill } from "kizkatt-graphic-engine";
import type { GradientPreset } from "../model/gradientPresets";

export type ContextMenuPasteDefault = "clipboard" | "svgCode";
export type ContextMenuCopyDefault = "selection" | "png" | "svg";
export type ContextMenuSelectionDefault = "intersect" | "contain";
export type ContextMenuSnappingDefault =
  | "arrowBinding"
  | "snapToGrid"
  | "snapToMidpoints"
  | "snapToObjects"
  | "toggleGrid";
export type ContextMenuDefaults = {
  copy: ContextMenuCopyDefault;
  paste: ContextMenuPasteDefault;
  selection: ContextMenuSelectionDefault;
  snapping: ContextMenuSnappingDefault;
};

const LAST_TEXTURE_BY_COLLECTION_STORAGE_KEY =
  "kizkatt:last-texture-by-collection";
const LAST_TEXTURE_CATEGORY_BY_COLLECTION_STORAGE_KEY =
  "kizkatt:last-texture-category-by-collection";
const CUSTOM_GRADIENT_PRESETS_STORAGE_KEY = "kizkatt:custom-gradient-presets";
const LAST_GRADIENT_PRESET_STORAGE_KEY = "kizkatt:last-gradient-preset";

function getStoredStringMap(key: string, storage: Storage) {
  try {
    const parsed = JSON.parse(storage.getItem(key) ?? "{}");

    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function storeStringMapValue(
  key: string,
  name: string,
  value: string,
  storage: Storage
) {
  storage.setItem(
    key,
    JSON.stringify({ ...getStoredStringMap(key, storage), [name]: value })
  );
}

export function getStoredTextureCategoryId(
  collectionId: string,
  storage = window.localStorage
) {
  const stored = getStoredStringMap(
    LAST_TEXTURE_CATEGORY_BY_COLLECTION_STORAGE_KEY,
    storage
  );

  return typeof stored[collectionId] === "string"
    ? stored[collectionId]
    : null;
}

export function storeTextureCategoryId(
  collectionId: string,
  categoryId: string,
  storage = window.localStorage
) {
  storeStringMapValue(
    LAST_TEXTURE_CATEGORY_BY_COLLECTION_STORAGE_KEY,
    collectionId,
    categoryId,
    storage
  );
}

export function getStoredTextureId(
  collectionId: string,
  storage = window.localStorage
) {
  const stored = getStoredStringMap(
    LAST_TEXTURE_BY_COLLECTION_STORAGE_KEY,
    storage
  );

  return typeof stored[collectionId] === "string"
    ? stored[collectionId]
    : null;
}

export function storeTextureId(
  collectionId: string,
  textureId: string,
  storage = window.localStorage
) {
  storeStringMapValue(
    LAST_TEXTURE_BY_COLLECTION_STORAGE_KEY,
    collectionId,
    textureId,
    storage
  );
}

export function getStoredGradientPresetId(
  storage = window.localStorage
) {
  return storage.getItem(LAST_GRADIENT_PRESET_STORAGE_KEY);
}

export function storeGradientPresetId(
  presetId: string,
  storage = window.localStorage
) {
  storage.setItem(LAST_GRADIENT_PRESET_STORAGE_KEY, presetId);
}

export function clearStoredGradientPresetId(
  storage = window.localStorage
) {
  storage.removeItem(LAST_GRADIENT_PRESET_STORAGE_KEY);
}

export function getStoredCustomGradientPresets(
  storage = window.localStorage
): GradientPreset[] {
  try {
    const value: unknown = JSON.parse(
      storage.getItem(CUSTOM_GRADIENT_PRESETS_STORAGE_KEY) ?? "[]"
    );

    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((entry) => {
      if (!isRecord(entry) || typeof entry.id !== "string") {
        return [];
      }

      const gradient = normalizeGradientFill(
        isRecord(entry.gradient)
          ? (entry.gradient as Partial<GradientFill>)
          : undefined
      );
      const name = typeof entry.name === "string" ? entry.name : gradient.name;

      return [{ custom: true, gradient, id: entry.id, name }];
    });
  } catch {
    return [];
  }
}

export function storeCustomGradientPresets(
  presets: readonly GradientPreset[],
  storage = window.localStorage
) {
  storage.setItem(
    CUSTOM_GRADIENT_PRESETS_STORAGE_KEY,
    JSON.stringify(presets.filter((preset) => preset.custom))
  );
}

const DEFAULT_CONTEXT_MENU_DEFAULTS: ContextMenuDefaults = {
  copy: "selection",
  paste: "clipboard",
  selection: "intersect",
  snapping: "toggleGrid"
};

const CONTEXT_MENU_DEFAULT_OPTIONS = {
  copy: ["selection", "png", "svg"],
  paste: ["clipboard", "svgCode"],
  selection: ["intersect", "contain"],
  snapping: [
    "arrowBinding",
    "snapToGrid",
    "snapToMidpoints",
    "snapToObjects",
    "toggleGrid"
  ]
} as const;

function isTheme(value: unknown): value is KizkattTheme {
  return value === "light" || value === "dark";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isGridUnit(value: unknown): value is GridUnit {
  return value === "px" || value === "mm";
}

function normalizeGridUnit(value: unknown): GridUnit {
  if (value === "cm") {
    return "mm";
  }

  return isGridUnit(value) ? value : "px";
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizePositiveNumber(
  value: unknown,
  fallback: number,
  min = MIN_GRID_SIZE,
  max = MAX_GRID_SIZE
) {
  const nextValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(nextValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, nextValue));
}

function isValidContextMenuDefault<Key extends keyof ContextMenuDefaults>(
  key: Key,
  value: unknown
): value is ContextMenuDefaults[Key] {
  return (CONTEXT_MENU_DEFAULT_OPTIONS[key] as readonly unknown[]).includes(
    value
  );
}

export function getStoredContextMenuDefaults(
  storage = window.localStorage
): ContextMenuDefaults {
  try {
    const parsed = JSON.parse(
      storage.getItem(CONTEXT_MENU_DEFAULTS_STORAGE_KEY) ?? "{}"
    );

    if (!isRecord(parsed)) {
      return DEFAULT_CONTEXT_MENU_DEFAULTS;
    }

    return {
      copy: isValidContextMenuDefault("copy", parsed.copy)
        ? parsed.copy
        : DEFAULT_CONTEXT_MENU_DEFAULTS.copy,
      paste: isValidContextMenuDefault("paste", parsed.paste)
        ? parsed.paste
        : DEFAULT_CONTEXT_MENU_DEFAULTS.paste,
      selection: isValidContextMenuDefault("selection", parsed.selection)
        ? parsed.selection
        : DEFAULT_CONTEXT_MENU_DEFAULTS.selection,
      snapping: isValidContextMenuDefault("snapping", parsed.snapping)
        ? parsed.snapping
        : DEFAULT_CONTEXT_MENU_DEFAULTS.snapping
    };
  } catch {
    return DEFAULT_CONTEXT_MENU_DEFAULTS;
  }
}

export function storeContextMenuDefaults(
  defaults: ContextMenuDefaults,
  storage = window.localStorage
) {
  storage.setItem(CONTEXT_MENU_DEFAULTS_STORAGE_KEY, JSON.stringify(defaults));
}

function resolveThemeStorage(
  themeOrStorage: KizkattTheme | Storage = window.localStorage,
  fallbackStorage = window.localStorage
) {
  return isTheme(themeOrStorage)
    ? { storage: fallbackStorage, theme: themeOrStorage }
    : { storage: themeOrStorage, theme: undefined };
}

function getThemedStorageKey(key: string, theme: KizkattTheme) {
  return `${key}:${theme}`;
}

export function getStoredCanvasBackgroundColor(
  themeOrStorage: KizkattTheme | Storage = window.localStorage,
  fallbackStorage = window.localStorage
) {
  const { storage, theme } = resolveThemeStorage(
    themeOrStorage,
    fallbackStorage
  );
  const storedColor = theme
    ? storage.getItem(getThemedStorageKey(CANVAS_BACKGROUND_STORAGE_KEY, theme))
    : null;

  if (theme) {
    return storedColor || DEFAULT_CANVAS_BACKGROUND_BY_THEME[theme];
  }

  return (
    storage.getItem(CANVAS_BACKGROUND_STORAGE_KEY) ||
    DEFAULT_CANVAS_BACKGROUND
  );
}

export function storeCanvasBackgroundColor(
  color: string,
  themeOrStorage: KizkattTheme | Storage = window.localStorage,
  fallbackStorage = window.localStorage
) {
  const { storage, theme } = resolveThemeStorage(
    themeOrStorage,
    fallbackStorage
  );

  if (theme) {
    storage.setItem(getThemedStorageKey(CANVAS_BACKGROUND_STORAGE_KEY, theme), color);
    return;
  }

  storage.setItem(CANVAS_BACKGROUND_STORAGE_KEY, color);
}

export function getStoredCustomCanvasBackgroundColor(
  themeOrStorage: KizkattTheme | Storage = window.localStorage,
  fallbackStorage = window.localStorage
) {
  const { storage, theme } = resolveThemeStorage(
    themeOrStorage,
    fallbackStorage
  );
  const storedColor = theme
    ? storage.getItem(
        getThemedStorageKey(CUSTOM_CANVAS_BACKGROUND_STORAGE_KEY, theme)
      )
    : null;

  if (theme) {
    return storedColor || DEFAULT_CUSTOM_CANVAS_BACKGROUND_BY_THEME[theme];
  }

  return (
    storage.getItem(CUSTOM_CANVAS_BACKGROUND_STORAGE_KEY) ||
    DEFAULT_CANVAS_BACKGROUND
  );
}

export function storeCustomCanvasBackgroundColor(
  color: string,
  themeOrStorage: KizkattTheme | Storage = window.localStorage,
  fallbackStorage = window.localStorage
) {
  const { storage, theme } = resolveThemeStorage(
    themeOrStorage,
    fallbackStorage
  );

  if (theme) {
    storage.setItem(
      getThemedStorageKey(CUSTOM_CANVAS_BACKGROUND_STORAGE_KEY, theme),
      color
    );
    return;
  }

  storage.setItem(CUSTOM_CANVAS_BACKGROUND_STORAGE_KEY, color);
}

export function getStoredGridColor(
  themeOrStorage: KizkattTheme | Storage = window.localStorage,
  fallbackStorage = window.localStorage
) {
  const { storage, theme } = resolveThemeStorage(
    themeOrStorage,
    fallbackStorage
  );
  const storedColor = theme
    ? storage.getItem(getThemedStorageKey(GRID_COLOR_STORAGE_KEY, theme))
    : null;

  if (theme) {
    return storedColor || DEFAULT_GRID_COLOR_BY_THEME[theme];
  }

  return storage.getItem(GRID_COLOR_STORAGE_KEY) || DEFAULT_GRID_COLOR;
}

export function storeGridColor(
  color: string,
  themeOrStorage: KizkattTheme | Storage = window.localStorage,
  fallbackStorage = window.localStorage
) {
  const { storage, theme } = resolveThemeStorage(
    themeOrStorage,
    fallbackStorage
  );

  if (theme) {
    storage.setItem(getThemedStorageKey(GRID_COLOR_STORAGE_KEY, theme), color);
    return;
  }

  storage.setItem(GRID_COLOR_STORAGE_KEY, color);
}

export function normalizeGridSettings(value: unknown): GridSettings {
  const record = isRecord(value) ? value : {};
  const isLegacyCentimeterUnit = record.unit === "cm";
  const unit = normalizeGridUnit(record.unit);
  const defaults =
    unit === "mm" ? DEFAULT_MM_GRID_SETTINGS : DEFAULT_GRID_SETTINGS;
  const minimumSize = unit === "mm" ? MIN_GRID_SIZE : 1;
  const maximumMajorSize = unit === "mm" ? 1000 : MAX_GRID_SIZE;
  const maximumMinorSize = unit === "mm" ? 1000 : MAX_GRID_SIZE;
  const metricScale = normalizePositiveNumber(
    record.metricScale ?? record.cmScale,
    defaults.metricScale,
    MIN_GRID_MM_SCALE,
    MAX_GRID_MM_SCALE
  );
  const majorSize = normalizePositiveNumber(
    isLegacyCentimeterUnit && record.majorSize !== undefined
      ? Number(record.majorSize) * 10
      : record.majorSize,
    defaults.majorSize,
    minimumSize,
    maximumMajorSize
  );
  const minorSize = normalizePositiveNumber(
    record.minorSize,
    defaults.minorSize,
    minimumSize,
    maximumMinorSize
  );
  const maxMinorSize = unit === "mm" ? majorSize : majorSize;

  return {
    unit,
    metricScale,
    majorSize,
    minorSize: Math.min(minorSize, maxMinorSize),
    showMajor: normalizeBoolean(record.showMajor, defaults.showMajor),
    showMinor: normalizeBoolean(record.showMinor, defaults.showMinor)
  };
}

export function getStoredGridSettings(
  storage = window.localStorage
): GridSettings {
  try {
    return normalizeGridSettings(
      JSON.parse(storage.getItem(GRID_SETTINGS_STORAGE_KEY) ?? "null")
    );
  } catch {
    return DEFAULT_GRID_SETTINGS;
  }
}

export function storeGridSettings(
  settings: GridSettings,
  storage = window.localStorage
) {
  storage.setItem(
    GRID_SETTINGS_STORAGE_KEY,
    JSON.stringify(normalizeGridSettings(settings))
  );
}

export function getStoredTheme(storage = window.localStorage): KizkattTheme {
  const storedTheme = storage.getItem(THEME_STORAGE_KEY);

  return storedTheme === "light" || storedTheme === "dark"
    ? storedTheme
    : "dark";
}

export function storeTheme(
  theme: KizkattTheme,
  storage = window.localStorage
) {
  storage.setItem(THEME_STORAGE_KEY, theme);
}

export function normalizeUiScale(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return DEFAULT_UI_SCALE;
  }

  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return DEFAULT_UI_SCALE;
  }

  return Math.min(MAX_UI_SCALE, Math.max(MIN_UI_SCALE, numericValue));
}

export function getStoredUiScale(storage = window.localStorage) {
  return normalizeUiScale(storage.getItem(UI_SCALE_STORAGE_KEY));
}

export function storeUiScale(
  scale: number,
  storage = window.localStorage
) {
  storage.setItem(UI_SCALE_STORAGE_KEY, String(normalizeUiScale(scale)));
}

export function normalizeDpi(value: unknown): Dpi {
  const numericValue = Number(value);

  return DPI_OPTIONS.includes(numericValue as Dpi)
    ? (numericValue as Dpi)
    : DEFAULT_DPI;
}

export function getStoredDpi(storage = window.localStorage) {
  return normalizeDpi(storage.getItem(DPI_STORAGE_KEY));
}

export function storeDpi(dpi: number, storage = window.localStorage) {
  storage.setItem(DPI_STORAGE_KEY, String(normalizeDpi(dpi)));
}
