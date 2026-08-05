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
import { normalizeElement } from "../../model/element";
import type { Interaction } from "../../model/types";
import type { PointerHandlerContext } from "./types";

export function finishPointerInteraction(
  _event: PointerEvent<SVGSVGElement>,
  activeInteraction: Interaction,
  context: PointerHandlerContext
) {
  const {
    canvasStateRef,
    replaceActiveState,
    selectionAreaMode,
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
          ? normalizeElement(element)
          : element
      )
    });
    setTool("select");
    updateInteraction(null);
    return;
  }

  if (activeInteraction.type === "resize") {
    const selectedIdSet = new Set(activeInteraction.selectedIds);

    replaceActiveState({
      ...activeCanvasState,
      elements: activeCanvasState.elements.map((element) =>
        selectedIdSet.has(element.id)
          ? normalizeElement(element)
          : element
      )
    });
  }

  updateInteraction(null);
}
