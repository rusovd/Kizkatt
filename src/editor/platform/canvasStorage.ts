import {
  CANVAS_STATE_STORAGE_KEY,
  QUICK_SAVE_STORAGE_KEY,
  getElementBends,
  normalizeElementNames,
  normalizeFillStyle
} from "kizkatt-graphic-engine";
import type { CanvasState, KizkattElement } from "kizkatt-graphic-engine";

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

  const elements = normalizeElementNames(
    state.elements.filter(isStoredElement).map((element) => {
      const fillStyle = normalizeFillStyle(
        (element as KizkattElement & { fillStyle?: unknown }).fillStyle
      );

      return fillStyle ? { ...element, fillStyle } : element;
    })
  );
  const elementIds = new Set(elements.map((element) => element.id));
  const selectedBendElement =
    state.selectedBend &&
    typeof state.selectedBend === "object" &&
    typeof state.selectedBend.elementId === "string" &&
    typeof state.selectedBend.bendIndex === "number" &&
    elementIds.has(state.selectedBend.elementId)
      ? elements.find((element) => element.id === state.selectedBend?.elementId)
      : undefined;
  const selectedBend =
    selectedBendElement &&
    getElementBends(selectedBendElement)[state.selectedBend?.bendIndex ?? -1]
      ? state.selectedBend
      : undefined;

  return {
    elements,
    selectedBend,
    selectedIds: state.selectedIds.filter(
      (id): id is string => typeof id === "string" && elementIds.has(id)
    )
  };
}

function readCanvasState(key: string, storage: Storage) {
  const rawState = storage.getItem(key);

  if (!rawState) {
    return null;
  }

  try {
    return normalizeStoredCanvasState(JSON.parse(rawState));
  } catch {
    return null;
  }
}

function writeCanvasState(key: string, state: CanvasState, storage: Storage) {
  try {
    storage.setItem(key, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function getStoredQuickCanvasState(storage = window.localStorage) {
  return readCanvasState(QUICK_SAVE_STORAGE_KEY, storage);
}

export function getStoredCanvasState(storage = window.localStorage) {
  return readCanvasState(CANVAS_STATE_STORAGE_KEY, storage);
}

export function storeCanvasState(
  state: CanvasState,
  storage = window.localStorage
) {
  return writeCanvasState(CANVAS_STATE_STORAGE_KEY, state, storage);
}

export function storeQuickCanvasState(
  state: CanvasState,
  storage = window.localStorage
) {
  return writeCanvasState(QUICK_SAVE_STORAGE_KEY, state, storage);
}
