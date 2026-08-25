import type { PointerEvent } from "react";

import {
  constrainPointToAspectRatio,
  DEFAULT_IMAGE_SIZE,
  getClientPoint,
  getDistance,
  getElementIdsInSelectionArea,
  getElementLocalVector,
  moveLinearElementEndpoint,
  resizeElementFromHandle,
  resizeElementsFromSelectionHandle,
  rotateElementsAroundPoint,
  ROTATION_SNAP_STEP_RADIANS,
  snapAngleToIncrement,
  skewElementsFromSelectionHandle
} from "kizkatt-graphic-engine";
import {
  MIN_CREATE_DRAG_DISTANCE,
  MIN_SELECT_DRAG_DISTANCE,
  SINGLE_SELECTION_COUNT
} from "kizkatt-graphic-engine";
import type { ElementType, Interaction } from "kizkatt-graphic-engine";
import { getIdSet } from "kizkatt-graphic-engine";
import type { PointerHandlerContext } from "./types";
import { updatePolylineElement } from "./polylineCreate";

const PROPORTIONAL_CREATION_TYPES: ReadonlySet<ElementType> = new Set([
  "diamond",
  "ellipse",
  "rectangle"
]);

export function updatePointerInteraction(
  event: PointerEvent<SVGSVGElement>,
  activeInteraction: Interaction,
  context: PointerHandlerContext
) {
  const {
    canvasStateRef,
    getPointerWorldPoint,
    getSnappedPointerWorldPoint,
    replaceActiveState,
    selectionAreaMode,
    setSelectionTransformCenter,
    setPan,
    updateInteraction
  } = context;
  const activeCanvasState = canvasStateRef.current;
  const rawWorldPoint = getPointerWorldPoint(event);
  const worldPoint =
    activeInteraction.type === "create"
      ? getSnappedPointerWorldPoint(event, [activeInteraction.elementId])
      : activeInteraction.type === "imageCreate"
      ? getSnappedPointerWorldPoint(event)
      : activeInteraction.type === "resize"
      ? getSnappedPointerWorldPoint(event, activeInteraction.selectedIds)
      : activeInteraction.type === "linearEndpoint"
      ? getSnappedPointerWorldPoint(event, [activeInteraction.elementId])
      : activeInteraction.type === "bend"
      ? getSnappedPointerWorldPoint(event, [activeInteraction.elementId])
      : rawWorldPoint;

  if (activeInteraction.type === "pan") {
    const clientPoint = getClientPoint(event);
    const hasMoved =
      activeInteraction.hasMoved ||
      getDistance(activeInteraction.start, clientPoint) >=
        MIN_SELECT_DRAG_DISTANCE;

    if (!hasMoved) {
      return;
    }

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
    if (!activeInteraction.hasMoved) {
      updateInteraction({ ...activeInteraction, hasMoved: true });
    }
    return;
  }

  if (activeInteraction.type === "selectArea") {
    const selectedIds =
      getDistance(activeInteraction.origin, worldPoint) >=
      MIN_SELECT_DRAG_DISTANCE
        ? getElementIdsInSelectionArea(
            activeCanvasState.elements,
            activeInteraction.origin,
            worldPoint,
            selectionAreaMode
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
    const activeElement = activeCanvasState.elements.find(
      (element) => element.id === activeInteraction.elementId
    );
    const currentPoint =
      event.altKey &&
      activeElement &&
      PROPORTIONAL_CREATION_TYPES.has(activeElement.type)
        ? constrainPointToAspectRatio(activeInteraction.origin, worldPoint)
        : worldPoint;

    updateInteraction({
      ...activeInteraction,
      current: currentPoint,
      hasMoved: true
    });
    replaceActiveState({
      ...activeCanvasState,
      elements: activeCanvasState.elements.map((element) => {
        if (element.id !== activeInteraction.elementId) {
          return element;
        }

        if (element.type === "draw") {
          const points = activeInteraction.freehandPoints ?? [{ x: 0, y: 0 }];
          const nextPoint = {
            x: currentPoint.x - activeInteraction.origin.x,
            y: currentPoint.y - activeInteraction.origin.y
          };
          const previousPoint = points.at(-1);

          if (
            !previousPoint ||
            previousPoint.x !== nextPoint.x ||
            previousPoint.y !== nextPoint.y
          ) {
            points.push(nextPoint);
          }

          return {
            ...element,
            width: currentPoint.x - activeInteraction.origin.x,
            height: currentPoint.y - activeInteraction.origin.y,
            points
          };
        }

        return {
          ...element,
          width: currentPoint.x - activeInteraction.origin.x,
          height: currentPoint.y - activeInteraction.origin.y
        };
      })
    });
    return;
  }

  if (activeInteraction.type === "polylineCreate") {
    const currentPoint = getSnappedPointerWorldPoint(event, [
      activeInteraction.elementId
    ]);
    const hasMoved = activeInteraction.pointerDownOrigin
      ? activeInteraction.hasMoved ||
        getDistance(activeInteraction.pointerDownOrigin, currentPoint) >=
          MIN_CREATE_DRAG_DISTANCE
      : activeInteraction.hasMoved;

    replaceActiveState({
      ...activeCanvasState,
      elements: activeCanvasState.elements.map((element) =>
        element.id === activeInteraction.elementId
          ? updatePolylineElement(
              element,
              activeInteraction.fixedPoints,
              currentPoint
            )
          : element
      )
    });
    updateInteraction({
      ...activeInteraction,
      current: currentPoint,
      hasMoved
    });
    return;
  }

  if (activeInteraction.type === "imageCreate") {
    const intrinsicSize = context.pendingImageSize ?? DEFAULT_IMAGE_SIZE;
    const currentPoint = event.altKey
      ? constrainPointToAspectRatio(
          activeInteraction.origin,
          worldPoint,
          intrinsicSize.width / intrinsicSize.height
        )
      : worldPoint;
    const hasMoved =
      activeInteraction.hasMoved ||
      getDistance(activeInteraction.origin, currentPoint) >=
        MIN_CREATE_DRAG_DISTANCE;

    updateInteraction({
      ...activeInteraction,
      current: hasMoved ? currentPoint : activeInteraction.origin,
      hasMoved
    });
    return;
  }

  if (activeInteraction.type === "move") {
    const dx = worldPoint.x - activeInteraction.start.x;
    const dy = worldPoint.y - activeInteraction.start.y;
    const selectedIds = getIdSet(activeInteraction.selectedIds);

    if (activeInteraction.originalTransformCenter) {
      setSelectionTransformCenter({
        x: activeInteraction.originalTransformCenter.x + dx,
        y: activeInteraction.originalTransformCenter.y + dy
      });
    }

    replaceActiveState({
      ...activeCanvasState,
      elements: activeInteraction.originalElements.map((element) =>
        selectedIds.has(element.id)
          ? { ...element, x: element.x + dx, y: element.y + dy }
          : element
      )
    });
    updateInteraction({
      ...activeInteraction,
      current: worldPoint
    });
    return;
  }

  if (activeInteraction.type === "moveTransformCenter") {
    const dx = rawWorldPoint.x - activeInteraction.start.x;
    const dy = rawWorldPoint.y - activeInteraction.start.y;
    const nextCenter = {
      x: activeInteraction.originalCenter.x + dx,
      y: activeInteraction.originalCenter.y + dy
    };

    setSelectionTransformCenter(nextCenter);
    updateInteraction({
      ...activeInteraction,
      current: rawWorldPoint
    });
    return;
  }

  if (activeInteraction.type === "linearEndpoint") {
    replaceActiveState({
      ...activeCanvasState,
      elements: activeInteraction.originalElements.map((element) =>
        element.id === activeInteraction.elementId
          ? moveLinearElementEndpoint(
              activeInteraction.originalElement,
              activeInteraction.endpoint,
              worldPoint,
              activeInteraction.mode
            )
          : element
      ),
      selectedBend: undefined,
      selectedIds: activeInteraction.selectedIds
    });
    return;
  }

  if (activeInteraction.type === "resize") {
    const selectedIdSet = getIdSet(activeInteraction.selectedIds);
    const dx = worldPoint.x - activeInteraction.start.x;
    const dy = worldPoint.y - activeInteraction.start.y;
    let nextElements;

    if (
      activeInteraction.handle &&
      activeInteraction.selectedIds.length === SINGLE_SELECTION_COUNT
    ) {
      const handle = activeInteraction.handle;

      nextElements = activeInteraction.originalElements.map((element) =>
        selectedIdSet.has(element.id)
          ? resizeElementFromHandle(element, handle, worldPoint, {
              preserveAspectRatio: event.altKey
            })
          : element
      );
    } else if (activeInteraction.handle) {
      nextElements = resizeElementsFromSelectionHandle(
        activeInteraction.originalElements,
        activeInteraction.selectedIds,
        activeInteraction.originalBounds,
        activeInteraction.handle,
        worldPoint,
        { preserveAspectRatio: event.altKey }
      );
    } else {
      nextElements = activeInteraction.originalElements.map((element) =>
        selectedIdSet.has(element.id)
          ? {
              ...element,
              height: element.height + dy,
              width: element.width + dx
            }
          : element
      );
    }

    replaceActiveState({
      ...activeCanvasState,
      elements: nextElements
    });
    return;
  }

  if (activeInteraction.type === "skew") {
    replaceActiveState({
      ...activeCanvasState,
      elements: skewElementsFromSelectionHandle(
        activeInteraction.originalElements,
        activeInteraction.selectedIds,
        activeInteraction.originalBounds,
        activeInteraction.center,
        activeInteraction.handle,
        activeInteraction.start,
        worldPoint
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
      ),
      selectedBend: {
        bendIndex: activeInteraction.bendIndex,
        elementId: activeInteraction.elementId
      }
    });
    return;
  }

  if (activeInteraction.type === "rotate") {
    const currentAngle = Math.atan2(
      worldPoint.y - activeInteraction.center.y,
      worldPoint.x - activeInteraction.center.x
    );
    const angleDifference = currentAngle - activeInteraction.startAngle;
    const rawAngleDelta = Math.atan2(
      Math.sin(angleDifference),
      Math.cos(angleDifference)
    );
    const angleDelta = event.altKey
      ? snapAngleToIncrement(rawAngleDelta, ROTATION_SNAP_STEP_RADIANS)
      : rawAngleDelta;
    const nextCurrentAngle = activeInteraction.startAngle + angleDelta;

    updateInteraction({
      ...activeInteraction,
      currentAngle: nextCurrentAngle
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
