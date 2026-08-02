import {
  CANVAS_BACKGROUND_STORAGE_KEY,
  CANVAS_STATE_STORAGE_KEY,
  CUSTOM_CANVAS_BACKGROUND_STORAGE_KEY,
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_CUSTOM_CANVAS_BACKGROUND_BY_THEME,
  DEFAULT_GRID_COLOR,
  DEFAULT_GRID_COLOR_BY_THEME,
  GRID_COLOR_STORAGE_KEY,
  QUICK_SAVE_STORAGE_KEY,
  THEME_STORAGE_KEY,
  DEFAULT_UI_SCALE,
  MAX_UI_SCALE,
  MIN_UI_SCALE,
  UI_SCALE_STORAGE_KEY
} from "../config/constants";
import type { CanvasState, KizkattElement, KizkattTheme } from "../model/types";

function isTheme(value: unknown): value is KizkattTheme {
  return value === "light" || value === "dark";
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

  return (
    storedColor ||
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

  return (
    storedColor ||
    storage.getItem(CUSTOM_CANVAS_BACKGROUND_STORAGE_KEY) ||
    (theme
      ? DEFAULT_CUSTOM_CANVAS_BACKGROUND_BY_THEME[theme]
      : DEFAULT_CANVAS_BACKGROUND)
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

  return (
    storedColor ||
    storage.getItem(GRID_COLOR_STORAGE_KEY) ||
    (theme ? DEFAULT_GRID_COLOR_BY_THEME[theme] : DEFAULT_GRID_COLOR)
  );
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
  }

  storage.setItem(GRID_COLOR_STORAGE_KEY, color);
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

function isStoredElement(value: unknown): value is KizkattElement {
  if (!value || typeof value !== "object") {
    return false;
  }

  const element = value as Partial<KizkattElement>;

  return (
    typeof element.id === "string" &&
    typeof element.type === "string" &&
    typeof element.x === "number" &&
    typeof element.y === "number" &&
    typeof element.width === "number" &&
    typeof element.height === "number"
  );
}

function normalizeStoredCanvasState(value: unknown): CanvasState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const state = value as Partial<CanvasState>;

  if (!Array.isArray(state.elements) || !Array.isArray(state.selectedIds)) {
    return null;
  }

  const elements = state.elements.filter(isStoredElement);
  const elementIds = new Set(elements.map((element) => element.id));

  return {
    elements,
    selectedIds: state.selectedIds.filter(
      (id): id is string => typeof id === "string" && elementIds.has(id)
    )
  };
}

export function getStoredQuickCanvasState(
  storage = window.localStorage
): CanvasState | null {
  const rawState = storage.getItem(QUICK_SAVE_STORAGE_KEY);

  if (!rawState) {
    return null;
  }

  try {
    return normalizeStoredCanvasState(JSON.parse(rawState));
  } catch {
    return null;
  }
}

export function getStoredCanvasState(
  storage = window.localStorage
): CanvasState | null {
  const rawState = storage.getItem(CANVAS_STATE_STORAGE_KEY);

  if (!rawState) {
    return null;
  }

  try {
    return normalizeStoredCanvasState(JSON.parse(rawState));
  } catch {
    return null;
  }
}

export function storeCanvasState(
  state: CanvasState,
  storage = window.localStorage
) {
  storage.setItem(CANVAS_STATE_STORAGE_KEY, JSON.stringify(state));
}

export function storeQuickCanvasState(
  state: CanvasState,
  storage = window.localStorage
) {
  storage.setItem(QUICK_SAVE_STORAGE_KEY, JSON.stringify(state));
}
