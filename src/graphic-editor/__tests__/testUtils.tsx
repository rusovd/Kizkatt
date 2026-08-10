import { afterEach, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor
} from "@testing-library/react";
import { TOOLBAR_SUBMENU_HOLD_MS } from "../ui/controls/toolbarConstants";

export { act, fireEvent, render, screen, waitFor };
export { expect, vi } from "vitest";
export {
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_CANVAS_BACKGROUND_BY_THEME,
  DEFAULT_GRID_COLOR,
  DEFAULT_GRID_COLOR_BY_THEME,
  KizkattGraphicEditor,
  storeCanvasBackgroundColor,
  storeGridColor,
  storeTheme
} from "..";
export {
  findElementAtPoint,
  getElementIdsInSelectionArea,
  getResizeAnchorPoint,
  getResizeCursor,
  reorderElementsByLayerAction,
  resizeElementFromHandle,
  resizeElementsFromSelectionHandle,
  rotateElementsAroundPoint,
  type ResizeHandle
} from "../KizkattGraphicEditor";
export {
  canGroupSelection,
  canUngroupSelection,
  expandElementIdsToGroups,
  getNextSelectedIdsForHit,
  groupSelectedElements,
  ungroupSelectedElements
} from "kizkatt-graphic-engine";
export { selectionBounds } from "../geometry";
export type { KizkattElement } from "../model/types";
export { renderElement } from "../ui/canvas/renderElement";
export * as Icons from "../ui/icons";

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
  target: Element,
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
