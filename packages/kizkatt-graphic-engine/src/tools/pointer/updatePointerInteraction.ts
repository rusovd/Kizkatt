import type { PointerEvent } from "react";

import {
  getClientPoint,
  getDistance,
  getElementIdsInSelectionArea,
  getElementLocalVector,
  resizeElementsFromSelectionHandle,
  rotateElementsAroundPoint
} from "../../geometry";
import { MIN_SELECT_DRAG_DISTANCE } from "../../config/constants";
import type { Interaction } from "../../model/types";
import type { PointerHandlerContext } from "./types";

export function updatePointerInteraction(
  event: PointerEvent<SVGSVGElement>,
  activeInteraction: Interaction,
  context: PointerHandlerContext
) {
  const {
    canvasStateRef,
    getPointerWorldPoint,
    replaceActiveState,
    setPan,
    updateInteraction
  } = context;
  const activeCanvasState = canvasStateRef.current;
  const worldPoint = getPointerWorldPoint(event);

  if (activeInteraction.type === "pan") {
    const clientPoint = getClientPoint(event);
    setPan({
      x:
        activeInteraction.originalPan.x +
        clientPoint.x -
        activeInteraction.start.x,
      y:
        activeInteraction.originalPan.y +
        clientPoint.y -
        activeInteraction.start.y
    });
    return;
  }

  if (activeInteraction.type === "selectArea") {
    const selectedIds =
      getDistance(activeInteraction.origin, worldPoint) >=
      MIN_SELECT_DRAG_DISTANCE
        ? getElementIdsInSelectionArea(
            activeCanvasState.elements,
            activeInteraction.origin,
            worldPoint
          )
        : activeCanvasState.selectedIds;

    replaceActiveState({
      ...activeCanvasState,
      selectedIds
    });
    updateInteraction({
      ...activeInteraction,
      current: worldPoint
    });
    return;
  }

  if (activeInteraction.type === "create") {
    updateInteraction({
      ...activeInteraction,
      current: worldPoint,
      hasMoved: true
    });
    replaceActiveState({
      ...activeCanvasState,
      elements: activeCanvasState.elements.map((element) => {
        if (element.id !== activeInteraction.elementId) {
          return element;
        }

        if (element.type === "draw") {
          return {
            ...element,
            width: worldPoint.x - activeInteraction.origin.x,
            height: worldPoint.y - activeInteraction.origin.y,
            points: [
              ...(element.points ?? []),
              {
                x: worldPoint.x - activeInteraction.origin.x,
                y: worldPoint.y - activeInteraction.origin.y
              }
            ]
          };
        }

        return {
          ...element,
          width: worldPoint.x - activeInteraction.origin.x,
          height: worldPoint.y - activeInteraction.origin.y
        };
      })
    });
    return;
  }

  if (activeInteraction.type === "move") {
    const dx = worldPoint.x - activeInteraction.start.x;
    const dy = worldPoint.y - activeInteraction.start.y;
    const selectedIds = new Set(activeCanvasState.selectedIds);

    replaceActiveState({
      ...activeCanvasState,
      elements: activeInteraction.originalElements.map((element) =>
        selectedIds.has(element.id)
          ? { ...element, x: element.x + dx, y: element.y + dy }
          : element
      )
    });
    return;
  }

  if (activeInteraction.type === "resize") {
    const selectedIdSet = new Set(activeInteraction.selectedIds);
    const dx = worldPoint.x - activeInteraction.start.x;
    const dy = worldPoint.y - activeInteraction.start.y;

    replaceActiveState({
      ...activeCanvasState,
      elements: activeInteraction.handle
        ? resizeElementsFromSelectionHandle(
            activeInteraction.originalElements,
            activeInteraction.selectedIds,
            activeInteraction.originalBounds,
            activeInteraction.handle,
            worldPoint
          )
        : activeInteraction.originalElements.map((element) =>
            selectedIdSet.has(element.id)
              ? {
                  ...element,
                  height: element.height + dy,
                  width: element.width + dx
                }
              : element
          )
    });
    return;
  }

  if (activeInteraction.type === "bend") {
    const localDelta = getElementLocalVector(activeInteraction.originalElement, {
      x: worldPoint.x - activeInteraction.start.x,
      y: worldPoint.y - activeInteraction.start.y
    });

    replaceActiveState({
      ...activeCanvasState,
      elements: activeCanvasState.elements.map((element) =>
        element.id === activeInteraction.elementId
          ? {
              ...element,
              bends: activeInteraction.originalBends.map((bend, index) =>
                index === activeInteraction.bendIndex
                  ? {
                      x: bend.x + localDelta.x,
                      y: bend.y + localDelta.y
                    }
                  : bend
              ),
              curve: undefined
            }
          : element
      )
    });
    return;
  }

  if (activeInteraction.type === "rotate") {
    const currentAngle = Math.atan2(
      worldPoint.y - activeInteraction.center.y,
      worldPoint.x - activeInteraction.center.x
    );
    const angleDelta = currentAngle - activeInteraction.startAngle;

    updateInteraction({
      ...activeInteraction,
      currentAngle
    });
    replaceActiveState({
      ...activeCanvasState,
      elements: rotateElementsAroundPoint(
        activeInteraction.originalElements,
        activeInteraction.selectedIds,
        activeInteraction.center,
        angleDelta
      )
    });
  }
}
