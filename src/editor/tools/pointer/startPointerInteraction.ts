import type { PointerEvent } from "react";

import {
  CREATABLE_ELEMENT_TOOLS,
  DEFAULT_SELECT_TOOL,
  HALF_DIVISOR,
  ROTATE_HANDLE_MIN_RADIUS,
  SINGLE_SELECTION_COUNT,
  TEXT_TOOL
} from "kizkatt-graphic-engine";
import {
  findElementAtPoint,
  getClientPoint,
  getElementBends,
  getLinearElementPoints,
  getLinearElementSegmentMidpoint,
  selectionBounds
} from "kizkatt-graphic-engine";
import { createElement, withUpdatedObjectBase } from "kizkatt-graphic-engine";
import { getIdSet } from "kizkatt-graphic-engine";
import type {
  ElementType,
  LinearEndpoint,
  Tool
} from "kizkatt-graphic-engine";
import {
  getEventTargetElement,
  getHandleTarget,
  isResizeHandle,
  isSkewHandle
} from "./pointerTargets";
import {
  expandElementIdsToGroups,
  getNextSelectedIdsForHit
} from "kizkatt-graphic-engine";
import type { PointerHandlerContext } from "./types";

function isCreatableElementTool(tool: Tool): tool is ElementType {
  return CREATABLE_ELEMENT_TOOLS.includes(tool as ElementType);
}

function isSelectionTool(tool: Tool) {
  return tool === "select" || tool === "nodeEdit";
}

function isLinearEndpoint(value: string | null): value is LinearEndpoint {
  return value === "start" || value === "end";
}

function haveSameSelection(first: string[], second: string[]) {
  if (first.length !== second.length) {
    return false;
  }

  const secondIds = new Set(second);

  return first.every((id) => secondIds.has(id));
}

function getHandleWorldPoint(target: Element | null, fallback: { x: number; y: number }) {
  const x = Number(target?.getAttribute("data-handle-world-x"));
  const y = Number(target?.getAttribute("data-handle-world-y"));

  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : fallback;
}

function getBoundsCenter(bounds: NonNullable<ReturnType<typeof selectionBounds>>) {
  return {
    x: bounds.x + bounds.width / HALF_DIVISOR,
    y: bounds.y + bounds.height / HALF_DIVISOR
  };
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
    selectionTransformCenter,
    selectedElements,
    setEditingTextElementId,
    setSelectionTransformCenter,
    setSelectionTransformMode,
    setTool,
    style,
    tool,
    updateInteraction
  } = context;
  const target = getEventTargetElement(event);
  const worldPoint = getPointerWorldPoint(event);

  closeContextMenu();

  const linearEndpointTarget = getHandleTarget(target, "linear-endpoint");
  if (linearEndpointTarget) {
    const element = selectedElements[0];
    const endpoint = linearEndpointTarget.getAttribute("data-line-endpoint");

    if (
      element &&
      (element.type === "line" || element.type === "arrow") &&
      isLinearEndpoint(endpoint)
    ) {
      replaceActiveState({
        ...canvasState,
        selectedBend: undefined,
        selectedIds: [element.id]
      });
      updateInteraction({
        type: "linearEndpoint",
        elementId: element.id,
        endpoint,
        mode: tool === "nodeEdit" ? "node" : "resize",
        originalElement: element,
        originalElements: canvasState.elements,
        selectedIds: [element.id]
      });
    }

    return;
  }

  const resizeTarget = getHandleTarget(target, "resize");
  if (resizeTarget) {
    const bounds = selectionBounds(selectedElements, {
      includeRotation: selectedElements.length > SINGLE_SELECTION_COUNT
    });
    const resizeHandle = resizeTarget.getAttribute("data-resize-handle");
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

  const transformCenterTarget = getHandleTarget(target, "transform-center");
  if (transformCenterTarget) {
    const bounds = selectionBounds(selectedElements, {
      includeRotation: true
    });

    if (bounds) {
      const fallbackCenter = getBoundsCenter(bounds);
      const originalCenter = selectionTransformCenter ?? fallbackCenter;

      setSelectionTransformCenter(originalCenter);
      updateInteraction({
        type: "moveTransformCenter",
        current: worldPoint,
        originalCenter,
        start: worldPoint
      });
    }

    return;
  }

  const skewTarget = getHandleTarget(target, "skew");
  if (skewTarget) {
    const bounds = selectionBounds(selectedElements, {
      includeRotation: true
    });
    const skewHandle = skewTarget.getAttribute("data-skew-handle");
    const handle = isSkewHandle(skewHandle) ? skewHandle : undefined;

    if (bounds && handle) {
      const center = selectionTransformCenter ?? getBoundsCenter(bounds);

      setSelectionTransformCenter(center);
      updateInteraction({
        type: "skew",
        center,
        handle,
        originalBounds: bounds,
        originalElements: canvasState.elements,
        selectedIds: canvasState.selectedIds,
        start: worldPoint
      });
    }

    return;
  }

  const bendTarget = getHandleTarget(target, "bend");
  if (bendTarget) {
    const element = selectedElements[0];

    if (element) {
      const bendIndexAttribute = bendTarget.getAttribute("data-bend-index");
      const segmentIndexAttribute = bendTarget.getAttribute("data-segment-index");
      const existingBends = getElementBends(element);
      const linePoints = getLinearElementPoints(element);
      const bendIndex =
        bendIndexAttribute === null
          ? Number(segmentIndexAttribute ?? existingBends.length)
          : Number(bendIndexAttribute);
      const bendMidpoint = getLinearElementSegmentMidpoint(
        linePoints,
        bendIndex,
        element.edgeStyle
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
        originalElements: canvasState.elements,
        selectedIds: [element.id],
        start: worldPoint
      });
    }

    return;
  }

  const rotateTarget = getHandleTarget(target, "rotate");
  if (rotateTarget) {
    const bounds = selectionBounds(selectedElements, {
      includeRotation: selectedElements.length > SINGLE_SELECTION_COUNT
    });
    const handlePoint = getHandleWorldPoint(rotateTarget, worldPoint);

    if (bounds) {
      const center = selectionTransformCenter ?? getBoundsCenter(bounds);
      const startAngle = Math.atan2(
        handlePoint.y - center.y,
        handlePoint.x - center.x
      );
      const handleRadius = Math.max(
        ROTATE_HANDLE_MIN_RADIUS,
        Math.hypot(handlePoint.x - center.x, handlePoint.y - center.y)
      );

      setSelectionTransformCenter(center);
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
      hasMoved: false,
      startedOnEmptyCanvas: !findElementAtPoint(
        canvasState.elements,
        worldPoint
      ),
      start: getClientPoint(event),
      originalPan: pan
    });
    return;
  }

  if (isSelectionTool(tool)) {
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
        setSelectionTransformMode("resize");
        return;
      }

      const canToggleTransformMode =
        tool !== "nodeEdit" &&
        haveSameSelection(selectedIds, canvasState.selectedIds);
      const selectedIdSet = getIdSet(selectedIds);
      const bounds = selectionBounds(
        canvasState.elements.filter((element) => selectedIdSet.has(element.id)),
        { includeRotation: true }
      );
      const transformCenter =
        selectionTransformCenter ?? (bounds ? getBoundsCenter(bounds) : null);

      if (transformCenter) {
        setSelectionTransformCenter(transformCenter);
      }

      replaceActiveState({
        ...canvasState,
        selectedBend: undefined,
        selectedIds
      });
      if (!canToggleTransformMode) {
        setSelectionTransformMode("resize");
      }
      updateInteraction({
        type: "move",
        canToggleTransformMode,
        current: worldPoint,
        originalTransformCenter: transformCenter,
        selectedIds,
        start: worldPoint,
        originalElements: canvasState.elements
      });
    } else {
      replaceActiveState({
        ...canvasState,
        selectedBend: undefined,
        selectedIds: []
      });
      setSelectionTransformMode("resize");
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
    updateInteraction({
      type: "imageCreate",
      current: snappedWorldPoint,
      hasMoved: false,
      origin: snappedWorldPoint
    });
    return;
  }

  const creationPoint = getSnappedPointerWorldPoint(event);
  if (tool === "polyline") {
    const nextElement = createElement("line", creationPoint, style);
    nextElement.name = createElementName(nextElement.type, canvasState.elements);

    commitState({
      elements: [...canvasState.elements, nextElement],
      selectedBend: undefined,
      selectedIds: [nextElement.id]
    });
    updateInteraction({
      type: "polylineCreate",
      current: creationPoint,
      elementId: nextElement.id,
      fixedPoints: [creationPoint],
      hasMoved: false,
      pointerDownOrigin: creationPoint
    });
    return;
  }

  if (!isCreatableElementTool(tool)) {
    return;
  }

  const nextElement = createElement(tool, creationPoint, style);
  nextElement.name = createElementName(nextElement.type, canvasState.elements);
  const committedElement =
    tool === TEXT_TOOL ? withUpdatedObjectBase(nextElement) : nextElement;

  commitState({
    elements: [...canvasState.elements, committedElement],
    selectedBend: undefined,
    selectedIds: [committedElement.id]
  });
  updateInteraction({
    type: "create",
    current: creationPoint,
    freehandPoints: tool === "draw" ? [{ x: 0, y: 0 }] : undefined,
    hasMoved: false,
    elementId: committedElement.id,
    origin: creationPoint,
    startedAt: Date.now()
  });

  if (tool === TEXT_TOOL) {
    setEditingTextElementId(committedElement.id);
    setTool(DEFAULT_SELECT_TOOL);
    updateInteraction(null);
  }
}
