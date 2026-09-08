import { afterEach, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor
} from "@testing-library/react";
import { TOOLBAR_SUBMENU_HOLD_MS } from "kizkatt-ui";

export { act, fireEvent, render, screen, waitFor };
export { expect, vi } from "vitest";
export {
  storeCanvasBackgroundColor,
  storeGridColor,
  storeTheme
} from "kizkatt-ui";
export {
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_CANVAS_BACKGROUND_BY_THEME,
  DEFAULT_GRID_COLOR,
  DEFAULT_GRID_COLOR_BY_THEME
} from "kizkatt-graphic-engine";
export { KizkattGraphicEditor } from "../KizkattGraphicEditor";
export {
  findElementAtPoint,
  getElementIdsInSelectionArea,
  getResizeAnchorPoint,
  getResizeCursor,
  reorderElementsByLayerAction,
  resizeElementFromHandle,
  resizeElementsFromSelectionHandle,
  rotateElementsAroundPoint,
  skewElementsFromSelectionHandle,
  type ResizeHandle
} from "kizkatt-graphic-engine";
export {
  canGroupSelection,
  canUngroupSelection,
  expandElementIdsToGroups,
  getNextSelectedIdsForHit,
  groupSelectedElements,
  revertElementToObjectBase,
  ungroupSelectedElements,
  withUpdatedObjectBase
} from "kizkatt-graphic-engine";
export { selectionBounds } from "kizkatt-graphic-engine";
export type { KizkattElement } from "kizkatt-graphic-engine";
export { renderElement } from "kizkatt-ui";
export * as Icons from "kizkatt-ui";

export function getCirclePoint(circle: Element | null) {
  return {
    x: Number(
      circle?.getAttribute("data-handle-world-x") ??
        circle?.getAttribute("cx") ??
        0
    ),
    y: Number(
      circle?.getAttribute("data-handle-world-y") ??
        circle?.getAttribute("cy") ??
        0
    )
  };
}

export function firePointerEvent(
  target: Element | Window,
  type: "pointerdown" | "pointermove" | "pointerup",
  init: MouseEventInit = {}
) {
  fireEvent(
    target,
    new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      ...init
    })
  );
}

export function chooseGroupedTool(groupLabel: string, toolLabel: string) {
  const groupButton = screen.getByRole("button", { name: groupLabel });

  vi.useFakeTimers();
  fireEvent.pointerDown(groupButton);
  act(() => {
    vi.advanceTimersByTime(TOOLBAR_SUBMENU_HOLD_MS);
  });
  fireEvent.pointerUp(groupButton);
  vi.useRealTimers();

  fireEvent.click(screen.getByRole("menuitem", { name: toolLabel }));
}

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
