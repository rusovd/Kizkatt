import {
  CANVAS_BACKGROUND_STORAGE_KEY,
  CUSTOM_CANVAS_BACKGROUND_STORAGE_KEY,
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_CUSTOM_CANVAS_BACKGROUND_BY_THEME,
  DEFAULT_GRID_COLOR,
  DEFAULT_GRID_COLOR_BY_THEME,
  GRID_COLOR_STORAGE_KEY,
  THEME_STORAGE_KEY
} from "../config/constants";
import type { KizkattTheme } from "../model/types";

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
