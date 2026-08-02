import type { PointerEvent } from "react";

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
    getPointerWorldPoint,
    pan,
    pendingImageSrc,
    replaceActiveState,
    selectedElements,
    setEditingTextElementId,
    setPendingImageSrc,
    setTool,
    style,
    tool,
    updateInteraction
  } = context;
  const target = getEventTargetElement(event);
  const worldPoint = getPointerWorldPoint(event);

  closeContextMenu();

  if (target && isHandleTarget(target, "resize")) {
    const bounds = selectionBounds(selectedElements, {
      includeRotation: selectedElements.length > 1
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
        linePoints[bendIndex + 1]
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
      includeRotation: selectedElements.length > 1
    });
    const handlePoint = getHandleWorldPoint(target, worldPoint);

    if (bounds) {
      const center = {
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height / 2
        };
      const startAngle = Math.atan2(
        handlePoint.y - center.y,
        handlePoint.x - center.x
      );
      const handleRadius = Math.max(
        24,
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
        replaceActiveState({ ...canvasState, selectedIds });
        return;
      }

      replaceActiveState({ ...canvasState, selectedIds });
      updateInteraction({
        type: "move",
        start: worldPoint,
        originalElements: canvasState.elements
      });
    } else {
      replaceActiveState({ ...canvasState, selectedIds: [] });
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
        selectedIds: []
      });
    }

    return;
  }

  if (tool === "image") {
    if (!pendingImageSrc) {
      return;
    }

    const nextElement: KizkattElement = {
      ...createElement("image", worldPoint, style),
      backgroundColor: "transparent",
      height: 160,
      src: pendingImageSrc,
      width: 240
    };

    commitState({
      elements: [...canvasState.elements, nextElement],
      selectedIds: [nextElement.id]
    });
    setPendingImageSrc(null);
    setTool("select");
    return;
  }

  const nextElement = createElement(
    tool === "lock" ? "rectangle" : tool,
    worldPoint,
    style
  );

  commitState({
    elements: [...canvasState.elements, nextElement],
    selectedIds: [nextElement.id]
  });
  updateInteraction({
    type: "create",
    current: worldPoint,
    hasMoved: false,
    elementId: nextElement.id,
    origin: worldPoint,
    startedAt: Date.now()
  });

  if (tool === "text") {
    setEditingTextElementId(nextElement.id);
    setTool("select");
    updateInteraction(null);
  }
}
