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
  getNearestLinearElementSegmentIndex,
  selectionBounds
} from "kizkatt-graphic-engine";
import { createElement, withUpdatedObjectBase } from "kizkatt-graphic-engine";
import { getIdSet } from "kizkatt-graphic-engine";
import type {
  CanvasState,
  ElementType,
  KizkattElement,
  LinearEndpoint,
  LinearNodeSelection,
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

function getNextNodeSelection(
  currentIndices: number[],
  nextIndex: number,
  mode: "add" | "remove" | "replace"
) {
  if (mode === "replace") {
    return currentIndices.includes(nextIndex) ? currentIndices : [nextIndex];
  }

  if (mode === "remove") {
    return currentIndices.filter((index) => index !== nextIndex);
  }

  return currentIndices.includes(nextIndex)
    ? currentIndices
    : [...currentIndices, nextIndex];
}

function getSelectedLinearNodeSelections(
  selectedNodes: CanvasState["selectedNodes"]
): LinearNodeSelection[] {
  if (!selectedNodes) {
    return [];
  }

  return selectedNodes.lineSelections?.length
    ? selectedNodes.lineSelections
    : [
        {
          elementId: selectedNodes.elementId,
          nodeIndices: selectedNodes.nodeIndices,
          segmentIndex: selectedNodes.segmentIndex
        }
      ];
}

function getElementFromOverlayTarget(
  target: Element | null,
  elements: KizkattElement[],
  fallback?: KizkattElement
) {
  const elementId = target
    ?.closest("[data-element-overlay-id]")
    ?.getAttribute("data-element-overlay-id");

  return elements.find((element) => element.id === elementId) ?? fallback;
}

function getLineCombinationSelectionIds(
  elements: KizkattElement[],
  element: KizkattElement
) {
  return element.lineCombinationId
    ? elements
        .filter((item) => item.lineCombinationId === element.lineCombinationId)
        .map((item) => item.id)
    : [element.id];
}

function getNextLineNodeSelections(
  currentSelections: LinearNodeSelection[],
  elementId: string,
  nodeIndex: number,
  segmentIndex: number,
  mode: "add" | "remove" | "replace"
) {
  if (mode === "replace") {
    const existingSelection = currentSelections.find(
      (selection) => selection.elementId === elementId
    );

    return existingSelection?.nodeIndices.includes(nodeIndex)
      ? currentSelections
      : [{ elementId, nodeIndices: [nodeIndex], segmentIndex }];
  }

  const existingSelection = currentSelections.find(
    (selection) => selection.elementId === elementId
  );
  const nextNodeIndices = getNextNodeSelection(
    existingSelection?.nodeIndices ?? [],
    nodeIndex,
    mode
  );
  const otherSelections = currentSelections.filter(
    (selection) => selection.elementId !== elementId
  );

  return nextNodeIndices.length === 0
    ? otherSelections
    : [
        ...otherSelections,
        {
          elementId,
          nodeIndices: nextNodeIndices,
          segmentIndex
        }
      ];
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
    selectionTransformMode,
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

  if (tool === "zoom") {
    updateInteraction({
      type: "zoomArea",
      current: worldPoint,
      origin: worldPoint
    });
    return;
  }

  const linearEndpointTarget = getHandleTarget(target, "linear-endpoint");
  if (linearEndpointTarget) {
    const activeCanvasState = context.canvasStateRef.current;
    const element = getElementFromOverlayTarget(
      linearEndpointTarget,
      activeCanvasState.elements,
      selectedElements[0]
    );
    const endpoint = linearEndpointTarget.getAttribute("data-line-endpoint");

    if (
      element &&
      (element.type === "line" || element.type === "arrow") &&
      isLinearEndpoint(endpoint)
    ) {
      const existingBends = getElementBends(element);
      const nodeIndex =
        endpoint === "start" ? 0 : existingBends.length + 1;
      const currentLineSelections = getSelectedLinearNodeSelections(
        activeCanvasState.selectedNodes
      );
      const selectionMode = event.shiftKey
        ? "add"
        : event.ctrlKey
        ? "remove"
        : "replace";
      const nextLineSelections =
        tool === "nodeEdit"
          ? getNextLineNodeSelections(
              currentLineSelections,
              element.id,
              nodeIndex,
              endpoint === "start" ? 0 : existingBends.length,
              selectionMode
            )
          : [];
      const primarySelection = nextLineSelections[0];
      const selectedIds =
        tool === "nodeEdit"
          ? getLineCombinationSelectionIds(activeCanvasState.elements, element)
          : [element.id];

      replaceActiveState({
        ...activeCanvasState,
        selectedBend: undefined,
        selectedNodes:
          tool === "nodeEdit" && primarySelection
            ? {
                elementId: primarySelection.elementId,
                lineSelections: nextLineSelections,
                nodeIndices: primarySelection.nodeIndices,
                segmentIndex: primarySelection.segmentIndex
              }
            : undefined,
        selectedIds
      });

      if (event.shiftKey || event.ctrlKey) {
        return;
      }

      if (tool === "nodeEdit" && element.closed) {
        updateInteraction({
          type: "linearNodes",
          elementId: element.id,
          originalBends: existingBends,
          originalElement: element,
          originalElements: activeCanvasState.elements,
          selectedIds,
          selectedNodeIndices: [nodeIndex],
          segmentIndex: endpoint === "start" ? 0 : existingBends.length,
          start: worldPoint
        });
        return;
      }

      updateInteraction({
        type: "linearEndpoint",
        elementId: element.id,
        endpoint,
        mode: tool === "nodeEdit" ? "node" : "resize",
        originalElement: element,
        originalElements: activeCanvasState.elements,
        selectedIds
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
    if (selectionTransformMode !== "skew") {
      return;
    }

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

  const bezierControlTarget = getHandleTarget(target, "bezier-control");
  if (bezierControlTarget) {
    const element = selectedElements[0];
    const control = bezierControlTarget.getAttribute("data-control-point");
    const segmentIndex = Number(
      bezierControlTarget.getAttribute("data-segment-index")
    );

    if (
      element &&
      (element.type === "line" || element.type === "arrow") &&
      (control === "cp1" || control === "cp2") &&
      Number.isInteger(segmentIndex)
    ) {
      replaceActiveState({
        ...canvasState,
        selectedBend: undefined,
        selectedIds: [element.id],
        selectedNodes: {
          elementId: element.id,
          nodeIndices:
            canvasState.selectedNodes?.elementId === element.id
              ? canvasState.selectedNodes.nodeIndices
              : [],
          segmentIndex
        }
      });
      updateInteraction({
        type: "bezierControl",
        control,
        elementId: element.id,
        originalElement: element,
        originalElements: context.canvasStateRef.current.elements,
        selectedIds: [element.id],
        segmentIndex
      });
    }

    return;
  }

  const linearSegmentTarget = getHandleTarget(target, "linear-segment");
  if (linearSegmentTarget) {
    const activeCanvasState = context.canvasStateRef.current;
    const element = getElementFromOverlayTarget(
      linearSegmentTarget,
      activeCanvasState.elements,
      selectedElements[0]
    );
    const segmentIndex = Number(
      linearSegmentTarget.getAttribute("data-segment-index")
    );

    if (
      tool === "nodeEdit" &&
      element &&
      (element.type === "line" || element.type === "arrow") &&
      Number.isInteger(segmentIndex)
    ) {
      const selectedIds = getLineCombinationSelectionIds(
        activeCanvasState.elements,
        element
      );

      replaceActiveState({
        ...activeCanvasState,
        selectedBend: undefined,
        selectedIds,
        selectedNodes: {
          elementId: element.id,
          nodeIndices: [],
          segmentIndex
        }
      });
      updateInteraction({
        type: "linearSegmentBend",
        elementId: element.id,
        hasMoved: false,
        handlePoint: worldPoint,
        originalElement: element,
        originalElements: activeCanvasState.elements,
        selectedIds,
        segmentIndex,
        start: worldPoint
      });
    }

    return;
  }

  const linearSegmentBendTarget = getHandleTarget(
    target,
    "linear-segment-bend"
  );
  if (linearSegmentBendTarget) {
    const activeCanvasState = context.canvasStateRef.current;
    const element = getElementFromOverlayTarget(
      linearSegmentBendTarget,
      activeCanvasState.elements,
      selectedElements[0]
    );
    const segmentIndex = Number(
      linearSegmentBendTarget.getAttribute("data-segment-index")
    );

    if (
      tool === "nodeEdit" &&
      element &&
      (element.type === "line" || element.type === "arrow") &&
      Number.isInteger(segmentIndex)
    ) {
      const selectedIds = getLineCombinationSelectionIds(
        activeCanvasState.elements,
        element
      );

      replaceActiveState({
        ...activeCanvasState,
        selectedBend: undefined,
        selectedIds,
        selectedNodes: {
          elementId: element.id,
          nodeIndices: [],
          segmentIndex
        }
      });
      updateInteraction({
        type: "linearSegmentBend",
        elementId: element.id,
        hasMoved: false,
        handlePoint: worldPoint,
        originalElement: element,
        originalElements: activeCanvasState.elements,
        selectedIds,
        segmentIndex,
        start: worldPoint
      });
    }

    return;
  }

  const bendTarget = getHandleTarget(target, "bend");
  if (bendTarget) {
    const activeCanvasState = context.canvasStateRef.current;
    const element = getElementFromOverlayTarget(
      bendTarget,
      activeCanvasState.elements,
      selectedElements[0]
    );

    if (element) {
      const bendIndexAttribute = bendTarget.getAttribute("data-bend-index");
      const existingBends = getElementBends(element);
      const bendIndex = Number(bendIndexAttribute);

      if (bendIndexAttribute === null || !Number.isInteger(bendIndex)) {
        return;
      }

      const originalBends = existingBends;
      const nodeIndex = bendIndex + 1;
      const currentLineSelections = getSelectedLinearNodeSelections(
        activeCanvasState.selectedNodes
      );
      const selectionMode = event.shiftKey
        ? "add"
        : event.ctrlKey
        ? "remove"
        : "replace";
      const nextLineSelections = getNextLineNodeSelections(
        currentLineSelections,
        element.id,
        nodeIndex,
        Math.max(0, nodeIndex - 1),
        selectionMode
      );
      const primarySelection = nextLineSelections[0];
      const selectedNodeIndices =
        nextLineSelections.find((selection) => selection.elementId === element.id)
          ?.nodeIndices ?? [];
      const selectedBendIndex =
        selectedNodeIndices.length === 1 &&
        selectedNodeIndices[0] > 0 &&
        selectedNodeIndices[0] < originalBends.length + 1
          ? selectedNodeIndices[0] - 1
          : bendIndex;

      replaceActiveState({
        ...activeCanvasState,
        selectedBend: {
          bendIndex: selectedBendIndex,
          elementId: element.id
        },
        selectedNodes: primarySelection
          ? {
              elementId: primarySelection.elementId,
              lineSelections: nextLineSelections,
              nodeIndices: primarySelection.nodeIndices,
              segmentIndex: primarySelection.segmentIndex
            }
          : undefined,
        selectedIds: getLineCombinationSelectionIds(
          activeCanvasState.elements,
          element
        )
      });

      if (event.shiftKey || event.ctrlKey) {
        return;
      }

      updateInteraction({
        type: "linearNodes",
        elementId: element.id,
        originalBends,
        originalElement: element,
        originalElements: activeCanvasState.elements,
        selectedIds: [element.id],
        selectedNodeIndices,
        segmentIndex: Math.max(0, nodeIndex - 1),
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
      if (
        tool === "nodeEdit" &&
        !event.shiftKey &&
        !event.ctrlKey &&
        (hitElement.type === "line" || hitElement.type === "arrow")
      ) {
        const activeCanvasState = context.canvasStateRef.current;
        const segmentIndex = getNearestLinearElementSegmentIndex(
          hitElement,
          worldPoint
        );
        const selectedIds = getLineCombinationSelectionIds(
          activeCanvasState.elements,
          hitElement
        );

        replaceActiveState({
          ...activeCanvasState,
          selectedBend: undefined,
          selectedIds,
          selectedNodes: {
            elementId: hitElement.id,
            nodeIndices: [],
            segmentIndex
          }
        });
        updateInteraction({
          type: "linearSegmentBend",
          elementId: hitElement.id,
          hasMoved: false,
          handlePoint: worldPoint,
          originalElement: hitElement,
          originalElements: activeCanvasState.elements,
          selectedIds,
          segmentIndex,
          start: worldPoint
        });
        return;
      }

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
      const activeCanvasState = context.canvasStateRef.current;

      replaceActiveState({
        ...activeCanvasState,
        selectedBend: undefined,
        selectedIds: []
      });
      setSelectionTransformMode("resize");
      updateInteraction({
        type: "selectArea",
        current: worldPoint,
        origin: worldPoint,
        selectedIds: activeCanvasState.selectedIds
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
