import type { PointerEvent } from "react";

import {
  DEFAULT_IMAGE_ELEMENT_TYPE,
  DEFAULT_IMAGE_SIZE,
  DEFAULT_LOCK_TOOL_ELEMENT_TYPE,
  DEFAULT_SELECT_TOOL,
  HALF_DIVISOR,
  LOCK_TOOL,
  NEXT_ARRAY_INDEX_OFFSET,
  ROTATE_HANDLE_MIN_RADIUS,
  SINGLE_SELECTION_COUNT,
  TEXT_TOOL,
  TRANSPARENT_COLOR
} from "../../config/constants";
import {
  findElementAtPoint,
  getClientPoint,
  getElementBends,
  getLinearElementPoints,
  getSegmentMidpoint,
  selectionBounds
} from "../../geometry";
import { createElement } from "../../model/element";
import type { KizkattElement } from "../../model/types";
import {
  getEventTargetElement,
  isHandleTarget,
  isResizeHandle
} from "./pointerTargets";
import {
  expandElementIdsToGroups,
  getNextSelectedIdsForHit
} from "../../model/groups";
import type { PointerHandlerContext } from "./types";

function getHandleWorldPoint(target: Element | null, fallback: { x: number; y: number }) {
  const x = Number(target?.getAttribute("data-handle-world-x"));
  const y = Number(target?.getAttribute("data-handle-world-y"));

  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : fallback;
}

export function startPointerInteraction(
  event: PointerEvent<SVGSVGElement>,
  context: PointerHandlerContext
) {
  const {
    canvasState,
    closeContextMenu,
    commitState,
    createElementName,
    getPointerWorldPoint,
    getSnappedPointerWorldPoint,
    pan,
    pendingImageSrc,
    replaceActiveState,
    selectedElements,
    setEditingTextElementId,
    setPendingImageSrc,
    setTool,
    style,
    tool,
    updateInteraction,
    viewMode
  } = context;
  const target = getEventTargetElement(event);
  const worldPoint = getPointerWorldPoint(event);

  closeContextMenu();

  if (viewMode) {
    if (tool === "hand") {
      updateInteraction({
        type: "pan",
        start: getClientPoint(event),
        originalPan: pan
      });
      return;
    }

    if (tool === "select") {
      const hitElement = findElementAtPoint(canvasState.elements, worldPoint);

      if (hitElement) {
        const selectionMode = event.shiftKey
          ? "add"
          : event.ctrlKey
          ? "remove"
          : "replace";
        const selectedIds = getNextSelectedIdsForHit(
          canvasState.elements,
          canvasState.selectedIds,
          hitElement.id,
          selectionMode
        );

        replaceActiveState({
          ...canvasState,
          selectedBend: undefined,
          selectedIds
        });
        return;
      }

      replaceActiveState({
        ...canvasState,
        selectedBend: undefined,
        selectedIds: []
      });
      updateInteraction({
        type: "selectArea",
        current: worldPoint,
        origin: worldPoint
      });
    }

    return;
  }

  if (target && isHandleTarget(target, "resize")) {
    const bounds = selectionBounds(selectedElements, {
      includeRotation: selectedElements.length > SINGLE_SELECTION_COUNT
    });
    const resizeHandle = target.getAttribute("data-resize-handle");
    const handle = isResizeHandle(resizeHandle) ? resizeHandle : undefined;

    if (bounds) {
      updateInteraction({
        type: "resize",
        originalBounds: bounds,
        originalElements: canvasState.elements,
        selectedIds: canvasState.selectedIds,
        start: worldPoint,
        handle
      });
    }

    return;
  }

  if (target && isHandleTarget(target, "bend")) {
    const element = selectedElements[0];

    if (element) {
      const bendIndexAttribute = target.getAttribute("data-bend-index");
      const segmentIndexAttribute = target.getAttribute("data-segment-index");
      const existingBends = getElementBends(element);
      const linePoints = getLinearElementPoints(element);
      const bendIndex =
        bendIndexAttribute === null
          ? Number(segmentIndexAttribute ?? existingBends.length)
          : Number(bendIndexAttribute);
      const bendMidpoint = getSegmentMidpoint(
        linePoints[bendIndex],
        linePoints[bendIndex + NEXT_ARRAY_INDEX_OFFSET]
      );
      const originalBends =
        bendIndexAttribute === null
          ? [
              ...existingBends.slice(0, bendIndex),
              {
                x: bendMidpoint.x - element.x,
                y: bendMidpoint.y - element.y
              },
              ...existingBends.slice(bendIndex)
            ]
          : existingBends;

      replaceActiveState({
        ...canvasState,
        selectedBend: {
          bendIndex,
          elementId: element.id
        },
        selectedIds: [element.id]
      });

      updateInteraction({
        type: "bend",
        bendIndex,
        elementId: element.id,
        originalBends,
        originalElement: element,
        start: worldPoint
      });
    }

    return;
  }

  if (isHandleTarget(target, "rotate")) {
    const bounds = selectionBounds(selectedElements, {
      includeRotation: selectedElements.length > SINGLE_SELECTION_COUNT
    });
    const handlePoint = getHandleWorldPoint(target, worldPoint);

    if (bounds) {
      const center = {
          x: bounds.x + bounds.width / HALF_DIVISOR,
          y: bounds.y + bounds.height / HALF_DIVISOR
        };
      const startAngle = Math.atan2(
        handlePoint.y - center.y,
        handlePoint.x - center.x
      );
      const handleRadius = Math.max(
        ROTATE_HANDLE_MIN_RADIUS,
        Math.hypot(handlePoint.x - center.x, handlePoint.y - center.y)
      );

      updateInteraction({
        type: "rotate",
        center,
        currentAngle: startAngle,
        handleRadius,
        originalElements: canvasState.elements,
        selectedIds: canvasState.selectedIds,
        startAngle
      });
    }

    return;
  }

  if (tool === "hand") {
    updateInteraction({
      type: "pan",
      start: getClientPoint(event),
      originalPan: pan
    });
    return;
  }

  if (tool === "select") {
    const hitElement = findElementAtPoint(canvasState.elements, worldPoint);

    if (hitElement) {
      const selectionMode = event.shiftKey
        ? "add"
        : event.ctrlKey
        ? "remove"
        : "replace";
      const selectedIds = getNextSelectedIdsForHit(
        canvasState.elements,
        canvasState.selectedIds,
        hitElement.id,
        selectionMode
      );

      if (event.shiftKey || event.ctrlKey) {
        replaceActiveState({
          ...canvasState,
          selectedBend: undefined,
          selectedIds
        });
        return;
      }

      replaceActiveState({
        ...canvasState,
        selectedBend: undefined,
        selectedIds
      });
      updateInteraction({
        type: "move",
        start: worldPoint,
        originalElements: canvasState.elements
      });
    } else {
      replaceActiveState({
        ...canvasState,
        selectedBend: undefined,
        selectedIds: []
      });
      updateInteraction({
        type: "selectArea",
        current: worldPoint,
        origin: worldPoint
      });
    }

    return;
  }

  if (tool === "eraser") {
    const hitElement = findElementAtPoint(canvasState.elements, worldPoint);

    if (hitElement) {
      const erasedIds = new Set(
        expandElementIdsToGroups(canvasState.elements, [hitElement.id])
      );

      commitState({
        elements: canvasState.elements.filter(
          (element) => !erasedIds.has(element.id)
        ),
        selectedBend: undefined,
        selectedIds: []
      });
    }

    return;
  }

  if (tool === "image") {
    if (!pendingImageSrc) {
      return;
    }

    const snappedWorldPoint = getSnappedPointerWorldPoint(event);
    const nextElement: KizkattElement = {
      ...createElement(DEFAULT_IMAGE_ELEMENT_TYPE, snappedWorldPoint, style),
      backgroundColor: TRANSPARENT_COLOR,
      height: DEFAULT_IMAGE_SIZE.height,
      name: createElementName(DEFAULT_IMAGE_ELEMENT_TYPE, canvasState.elements),
      src: pendingImageSrc,
      width: DEFAULT_IMAGE_SIZE.width
    };

    commitState({
      elements: [...canvasState.elements, nextElement],
      selectedBend: undefined,
      selectedIds: [nextElement.id]
    });
    setPendingImageSrc(null);
    setTool(DEFAULT_SELECT_TOOL);
    return;
  }

  const creationPoint = getSnappedPointerWorldPoint(event);
  const nextElement = createElement(
    tool === LOCK_TOOL ? DEFAULT_LOCK_TOOL_ELEMENT_TYPE : tool,
    creationPoint,
    style
  );
  nextElement.name = createElementName(nextElement.type, canvasState.elements);

  commitState({
    elements: [...canvasState.elements, nextElement],
    selectedBend: undefined,
    selectedIds: [nextElement.id]
  });
  updateInteraction({
    type: "create",
    current: creationPoint,
    hasMoved: false,
    elementId: nextElement.id,
    origin: creationPoint,
    startedAt: Date.now()
  });

  if (tool === TEXT_TOOL) {
    setEditingTextElementId(nextElement.id);
    setTool(DEFAULT_SELECT_TOOL);
    updateInteraction(null);
  }
}
