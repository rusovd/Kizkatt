import type { PointerEvent } from "react";

import {
  constrainPointToAspectRatio,
  DEFAULT_IMAGE_SIZE,
  getClientPoint,
  getDefaultLinearSegmentControl,
  getDistance,
  getElementIdsInSelectionArea,
  getElementLocalPoint,
  getElementLocalVector,
  isElementPathClosed,
  getLinearElementPoints,
  moveLinearElementEndpoint,
  resizeElementFromHandle,
  resizeElementsFromSelectionHandle,
  rotateElementsAroundPoint,
  ROTATION_SNAP_STEP_RADIANS,
  snapAngleToIncrement,
  skewElementsFromSelectionHandle,
  transformElementPoint
} from "kizkatt-graphic-engine";
import {
  MIN_CREATE_DRAG_DISTANCE,
  MIN_SELECT_DRAG_DISTANCE,
  SINGLE_SELECTION_COUNT,
  TRANSPARENT_COLOR
} from "kizkatt-graphic-engine";
import type { ElementType, Interaction } from "kizkatt-graphic-engine";
import { getIdSet } from "kizkatt-graphic-engine";
import type { PointerHandlerContext } from "./types";
import { updatePolylineElement } from "kizkatt-graphic-engine";
import { getLinearNodeSelectionInArea } from "./nodeSelection";

const PROPORTIONAL_CREATION_TYPES: ReadonlySet<ElementType> = new Set([
  "diamond",
  "ellipse",
  "rectangle"
]);

function isSameLinearPoint(
  first: { x: number; y: number } | undefined,
  second: { x: number; y: number } | undefined
) {
  return Boolean(first && second && first.x === second.x && first.y === second.y);
}

function updateLinearElementNodes(
  element: Extract<Interaction, { type: "linearNodes" }>["originalElement"],
  bends: Extract<Interaction, { type: "linearNodes" }>["originalBends"],
  selectedNodeIndices: number[],
  localDelta: { x: number; y: number }
) {
  const originalPoints = getLinearElementPoints(element, bends);
  const endNodeIndex = originalPoints.length - 1;
  const selectedNodeSet = new Set(selectedNodeIndices);
  const hasClosedMergedEndpoint =
    element.closed &&
    isSameLinearPoint(originalPoints[0], originalPoints[endNodeIndex]);

  if (
    hasClosedMergedEndpoint &&
    (selectedNodeSet.has(0) || selectedNodeSet.has(endNodeIndex))
  ) {
    selectedNodeSet.add(0);
    selectedNodeSet.add(endNodeIndex);
  }

  let nextSelectedNodeIndices = Array.from(selectedNodeSet).sort((a, b) => a - b);
  let nextWorldPoints = originalPoints.map((point, index) => {
    const nextPoint = selectedNodeSet.has(index)
      ? {
          x: point.x + localDelta.x,
          y: point.y + localDelta.y
        }
      : point;

    return transformElementPoint(element, nextPoint);
  });

  if (
    element.closed &&
    !hasClosedMergedEndpoint &&
    selectedNodeIndices.length === SINGLE_SELECTION_COUNT &&
    selectedNodeIndices[0] === 0 &&
    nextWorldPoints.length > 1
  ) {
    nextWorldPoints = [...nextWorldPoints.slice(1), nextWorldPoints[0]];
    nextSelectedNodeIndices = [nextWorldPoints.length - 1];
  }

  const start = nextWorldPoints[0];
  const end = nextWorldPoints[nextWorldPoints.length - 1];

  if (!start || !end) {
    return {
      element,
      selectedNodeIndices: nextSelectedNodeIndices
    };
  }

  const nextCenter = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2
  };
  const nextSize = getElementLocalVector(element, {
    x: end.x - start.x,
    y: end.y - start.y
  });
  const nextElement = {
    ...element,
    height: nextSize.y,
    width: nextSize.x,
    x: nextCenter.x - nextSize.x / 2,
    y: nextCenter.y - nextSize.y / 2
  };

  return {
    element: {
      ...nextElement,
      bends: nextWorldPoints.slice(1, -1).map((point) => {
        const localPoint = getElementLocalPoint(nextElement, point);

        return {
          x: localPoint.x - nextElement.x,
          y: localPoint.y - nextElement.y
        };
      }),
      curve: undefined,
      linearSegmentControls: undefined
    },
    selectedNodeIndices: nextSelectedNodeIndices
  };
}

function getSegmentBendControl(
  element: Extract<Interaction, { type: "linearSegmentBend" }>["originalElement"],
  segmentIndex: number,
  localPoint: { x: number; y: number }
) {
  const linePoints = getLinearElementPoints(element);
  const start = linePoints[segmentIndex];
  const end =
    element.closed && segmentIndex === linePoints.length - 1
      ? linePoints[0]
      : linePoints[segmentIndex + 1];

  if (!start || !end) {
    return null;
  }

  const midpoint = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2
  };
  const offset = {
    x: (localPoint.x - midpoint.x) * (4 / 3),
    y: (localPoint.y - midpoint.y) * (4 / 3)
  };
  const cp1 = {
    x: start.x + (end.x - start.x) / 3 + offset.x,
    y: start.y + (end.y - start.y) / 3 + offset.y
  };
  const cp2 = {
    x: end.x - (end.x - start.x) / 3 + offset.x,
    y: end.y - (end.y - start.y) / 3 + offset.y
  };

  return {
    cp1: {
      x: cp1.x - element.x,
      y: cp1.y - element.y
    },
    cp2: {
      x: cp2.x - element.x,
      y: cp2.y - element.y
    },
    mode: "curve" as const
  };
}

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
    const hasMoved =
      getDistance(activeInteraction.origin, worldPoint) >=
      MIN_SELECT_DRAG_DISTANCE;
    const nodeSelection =
      context.tool === "nodeEdit" && hasMoved
        ? getLinearNodeSelectionInArea(
            activeCanvasState.elements,
            activeInteraction.selectedIds,
            activeInteraction.origin,
            worldPoint,
            context.zoom
          )
        : null;
    const selectedIds = hasMoved
      ? getElementIdsInSelectionArea(
          activeCanvasState.elements,
          activeInteraction.origin,
          worldPoint,
          selectionAreaMode
        )
      : activeCanvasState.selectedIds;

    replaceActiveState({
      ...activeCanvasState,
      selectedIds: nodeSelection?.selectedIds ?? selectedIds,
      selectedNodes: nodeSelection?.selectedNodes
    });
    updateInteraction({
      ...activeInteraction,
      current: worldPoint
    });
    return;
  }

  if (activeInteraction.type === "zoomArea") {
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
          ? {
              ...moveLinearElementEndpoint(
                activeInteraction.originalElement,
                activeInteraction.endpoint,
                worldPoint,
                activeInteraction.mode
              ),
              backgroundColor:
                activeInteraction.mode === "node" && isElementPathClosed(element)
                  ? TRANSPARENT_COLOR
                  : element.backgroundColor,
              closed:
                activeInteraction.mode === "node" && isElementPathClosed(element)
                  ? false
                  : element.closed,
              linearSegmentControls: undefined
            }
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
              curve: undefined,
              linearSegmentControls: undefined
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

  if (activeInteraction.type === "linearNodes") {
    const localDelta = getElementLocalVector(activeInteraction.originalElement, {
      x: worldPoint.x - activeInteraction.start.x,
      y: worldPoint.y - activeInteraction.start.y
    });
    const nodeUpdate = updateLinearElementNodes(
      activeInteraction.originalElement,
      activeInteraction.originalBends,
      activeInteraction.selectedNodeIndices,
      localDelta
    );
    const nextSelectedNodeIndices = nodeUpdate.selectedNodeIndices;
    const nextSegmentIndex =
      nextSelectedNodeIndices.length === SINGLE_SELECTION_COUNT
        ? Math.max(
            0,
            Math.min(
              nextSelectedNodeIndices[0] - 1,
              nodeUpdate.element.bends?.length ?? 0
            )
          )
        : activeInteraction.segmentIndex;
    const selectedBendIndices = nextSelectedNodeIndices
      .map((nodeIndex) => nodeIndex - 1)
      .filter(
        (bendIndex) =>
          bendIndex >= 0 && bendIndex < activeInteraction.originalBends.length
      );
    const selectedBendIndex =
      selectedBendIndices.length === 1 ? selectedBendIndices[0] : undefined;

    replaceActiveState({
      ...activeCanvasState,
      elements: activeCanvasState.elements.map((element) =>
        element.id === activeInteraction.elementId
          ? nodeUpdate.element
          : element
      ),
      selectedBend:
        selectedBendIndex === undefined
          ? undefined
          : {
              bendIndex: selectedBendIndex,
              elementId: activeInteraction.elementId
            },
      selectedNodes: {
        elementId: activeInteraction.elementId,
        nodeIndices: nextSelectedNodeIndices,
        segmentIndex: nextSegmentIndex
      }
    });
    return;
  }

  if (activeInteraction.type === "linearSegmentBend") {
    const hasMoved =
      activeInteraction.hasMoved ||
      getDistance(activeInteraction.start, worldPoint) >=
        MIN_SELECT_DRAG_DISTANCE;

    if (!hasMoved) {
      return;
    }

    const localPoint = getElementLocalPoint(
      activeInteraction.originalElement,
      worldPoint
    );
    const nextControl = getSegmentBendControl(
      activeInteraction.originalElement,
      activeInteraction.segmentIndex,
      localPoint
    );

    if (!nextControl) {
      return;
    }

    const originalControls =
      activeInteraction.originalElement.linearSegmentControls ?? [];
    const nextControls = [...originalControls];

    nextControls[activeInteraction.segmentIndex] = nextControl;
    replaceActiveState({
      ...activeCanvasState,
      elements: activeCanvasState.elements.map((element) =>
        element.id === activeInteraction.elementId
          ? {
              ...element,
              edgeStyle: element.edgeStyle ?? "round",
              linearSegmentControls: nextControls
            }
          : element
      ),
      selectedBend: undefined,
      selectedIds: activeInteraction.selectedIds,
      selectedNodes: {
        elementId: activeInteraction.elementId,
        nodeIndices: [],
        segmentIndex: activeInteraction.segmentIndex
      }
    });
    updateInteraction({
      ...activeInteraction,
      handlePoint: worldPoint,
      hasMoved
    });
    return;
  }

  if (activeInteraction.type === "bezierControl") {
    const localPoint = getElementLocalPoint(
      activeInteraction.originalElement,
      worldPoint
    );
    const originalControls =
      activeInteraction.originalElement.linearSegmentControls ?? [];
    const fallbackControl = getDefaultLinearSegmentControl(
      activeInteraction.originalElement,
      activeInteraction.segmentIndex
    );
    const currentControl =
      originalControls[activeInteraction.segmentIndex] ?? fallbackControl;
    const nextControl = {
      ...fallbackControl,
      ...currentControl,
      [activeInteraction.control]: {
        x: localPoint.x - activeInteraction.originalElement.x,
        y: localPoint.y - activeInteraction.originalElement.y
      },
      mode: "curve" as const
    };
    const nextControls = [...originalControls];

    nextControls[activeInteraction.segmentIndex] = nextControl;
    replaceActiveState({
      ...activeCanvasState,
      elements: activeCanvasState.elements.map((element) =>
        element.id === activeInteraction.elementId
          ? {
              ...element,
              edgeStyle: element.edgeStyle ?? "round",
              linearSegmentControls: nextControls
            }
          : element
      ),
      selectedIds: activeInteraction.selectedIds,
      selectedNodes: {
        elementId: activeInteraction.elementId,
        nodeIndices:
          activeCanvasState.selectedNodes?.elementId ===
          activeInteraction.elementId
            ? activeCanvasState.selectedNodes.nodeIndices
            : [],
        segmentIndex: activeInteraction.segmentIndex
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
