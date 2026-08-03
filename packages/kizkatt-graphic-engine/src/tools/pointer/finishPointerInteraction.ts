import type { PointerEvent } from "react";

import {
  getDistance,
  getElementIdsInSelectionArea
} from "../../geometry";
import {
  MIN_CREATE_DRAG_DISTANCE,
  MIN_SELECT_DRAG_DISTANCE
} from "../../config/constants";
import { normalizeElement } from "../../model/element";
import type { Interaction } from "../../model/types";
import type { PointerHandlerContext } from "./types";

export function finishPointerInteraction(
  event: PointerEvent<SVGSVGElement>,
  activeInteraction: Interaction,
  context: PointerHandlerContext
) {
  const {
    canvasStateRef,
    getPointerWorldPoint,
    replaceActiveState,
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
            activeInteraction.current
          )
        : []
    });
    updateInteraction(null);
    return;
  }

  if (activeInteraction.type === "create") {
    const dragDistance = getDistance(
      activeInteraction.origin,
      getPointerWorldPoint(event)
    );
    const isTinyCreate =
      !activeInteraction.hasMoved && dragDistance < MIN_CREATE_DRAG_DISTANCE;

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
