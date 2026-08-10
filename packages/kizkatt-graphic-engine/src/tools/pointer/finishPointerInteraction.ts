import type { PointerEvent } from "react";

import {
  getDistance,
  getElementIdsInSelectionArea
} from "../../geometry";
import {
  MIN_CREATE_DRAG_DISTANCE,
  MIN_CREATE_HOLD_DURATION_MS,
  MIN_SELECT_DRAG_DISTANCE
} from "../../config/constants";
import { normalizeElement, withUpdatedObjectBase } from "../../model/element";
import type { CanvasState, Interaction, KizkattElement } from "../../model/types";
import type { PointerHandlerContext } from "./types";

function hasElementPreviewChanged(
  currentElements: KizkattElement[],
  originalElements: KizkattElement[]
) {
  return currentElements !== originalElements;
}

export function finishPointerInteraction(
  _event: PointerEvent<SVGSVGElement>,
  activeInteraction: Interaction,
  context: PointerHandlerContext
) {
  const {
    canvasStateRef,
    commitState,
    replaceActiveState,
    selectionAreaMode,
    setSelectionTransformCenter,
    setSelectionTransformMode,
    setTool,
    updateInteraction
  } = context;
  const activeCanvasState = canvasStateRef.current;

  if (activeInteraction.type === "selectArea") {
    const shouldSelect =
      getDistance(activeInteraction.origin, activeInteraction.current) >=
      MIN_SELECT_DRAG_DISTANCE;

    replaceActiveState({
      ...activeCanvasState,
      selectedBend: undefined,
      selectedIds: shouldSelect
        ? getElementIdsInSelectionArea(
            activeCanvasState.elements,
            activeInteraction.origin,
            activeInteraction.current,
            selectionAreaMode
          )
        : []
    });
    updateInteraction(null);
    return;
  }

  if (activeInteraction.type === "create") {
    const dragDistance = getDistance(
      activeInteraction.origin,
      activeInteraction.current
    );
    const holdDuration = Date.now() - activeInteraction.startedAt;
    const isTinyCreate =
      dragDistance < MIN_CREATE_DRAG_DISTANCE &&
      holdDuration < MIN_CREATE_HOLD_DURATION_MS;

    if (isTinyCreate) {
      replaceActiveState({
        ...activeCanvasState,
        elements: activeCanvasState.elements.filter(
          (item) => item.id !== activeInteraction.elementId
        ),
        selectedBend: undefined,
        selectedIds: []
      });
      updateInteraction(null);
      setTool("select");
      return;
    }

    replaceActiveState({
      ...activeCanvasState,
      elements: activeCanvasState.elements.map((element) =>
        element.id === activeInteraction.elementId
          ? withUpdatedObjectBase(normalizeElement(element))
          : element
      )
    });
    setTool("select");
    updateInteraction(null);
    return;
  }

  if (activeInteraction.type === "move") {
    const isClick =
      getDistance(activeInteraction.start, activeInteraction.current) <
      MIN_SELECT_DRAG_DISTANCE;

    if (isClick && activeInteraction.canToggleTransformMode) {
      setSelectionTransformMode((mode) =>
        mode === "resize" ? "skew" : "resize"
      );
    }

    if (!isClick) {
      commitState(activeCanvasState, {
        baseState: {
          ...activeCanvasState,
          elements: activeInteraction.originalElements
        }
      });
    }
  }

  if (activeInteraction.type === "resize" || activeInteraction.type === "skew") {
    const selectedIdSet = new Set(activeInteraction.selectedIds);
    const finalState: CanvasState = {
      ...activeCanvasState,
      elements: activeCanvasState.elements.map((element) =>
        selectedIdSet.has(element.id)
          ? normalizeElement(element)
          : element
      )
    };

    commitState(finalState, {
      baseState: {
        ...activeCanvasState,
        elements: activeInteraction.originalElements
      }
    });

    if (activeInteraction.type === "resize") {
      setSelectionTransformCenter(null);
    }
  }

  if (
    activeInteraction.type === "rotate" &&
    hasElementPreviewChanged(
      activeCanvasState.elements,
      activeInteraction.originalElements
    )
  ) {
    commitState(activeCanvasState, {
      baseState: {
        ...activeCanvasState,
        elements: activeInteraction.originalElements
      }
    });
  }

  if (activeInteraction.type === "bend") {
    const baseState: CanvasState = {
      ...activeCanvasState,
      elements: activeCanvasState.elements.map((element) =>
        element.id === activeInteraction.elementId
          ? activeInteraction.originalElement
          : element
      ),
      selectedBend: undefined
    };

    commitState(activeCanvasState, { baseState });
  }

  updateInteraction(null);
}
