import type { PointerEvent } from "react";

import {
  getDistance,
  getBoundsFromPoints,
  getElementIdsInSelectionArea,
  simplifyPolyline
} from "kizkatt-graphic-engine";
import {
  DEFAULT_IMAGE_ELEMENT_TYPE,
  DEFAULT_IMAGE_SIZE,
  DEFAULT_SELECT_TOOL,
  FREEHAND_SIMPLIFICATION_TOLERANCE_PX,
  MIN_CREATE_DRAG_DISTANCE,
  MIN_CREATE_HOLD_DURATION_MS,
  MIN_SELECT_DRAG_DISTANCE,
  TRANSPARENT_COLOR
} from "kizkatt-graphic-engine";
import {
  createElement,
  normalizeElement,
  withUpdatedObjectBase
} from "kizkatt-graphic-engine";
import { getIdSet } from "kizkatt-graphic-engine";
import type { CanvasState, Interaction, KizkattElement } from "kizkatt-graphic-engine";
import type { PointerHandlerContext } from "./types";
import {
  appendPolylinePoint,
  updatePolylineElement
} from "kizkatt-graphic-engine";

function hasElementPreviewChanged(
  currentElements: KizkattElement[],
  originalElements: KizkattElement[]
) {
  return currentElements !== originalElements;
}

export function finishPointerInteraction(
  event: PointerEvent<SVGSVGElement>,
  activeInteraction: Interaction,
  context: PointerHandlerContext
) {
  const {
    canvasStateRef,
    commitState,
    createElementName,
    pendingImageSize,
    pendingImageSrc,
    onZoomAtClientPoint,
    onZoomToBounds,
    replaceActiveState,
    selectionAreaMode,
    setPendingImageSize,
    setPendingImageSrc,
    setSelectionTransformCenter,
    setSelectionTransformMode,
    setTool,
    style,
    updateInteraction,
    zoom
  } = context;
  const activeCanvasState = canvasStateRef.current;

  if (activeInteraction.type === "zoomArea") {
    if (
      getDistance(activeInteraction.origin, activeInteraction.current) >=
      MIN_SELECT_DRAG_DISTANCE
    ) {
      onZoomToBounds(
        getBoundsFromPoints(activeInteraction.origin, activeInteraction.current)
      );
    } else {
      onZoomAtClientPoint(
        { x: event.clientX, y: event.clientY },
        event.altKey
      );
    }

    updateInteraction(null);
    return;
  }

  if (activeInteraction.type === "pan") {
    if (
      activeInteraction.startedOnEmptyCanvas &&
      !activeInteraction.hasMoved
    ) {
      setTool(DEFAULT_SELECT_TOOL);
    }

    updateInteraction(null);
    return;
  }

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

  if (activeInteraction.type === "imageCreate") {
    if (!pendingImageSrc) {
      updateInteraction(null);
      return;
    }

    const intrinsicSize = pendingImageSize ?? DEFAULT_IMAGE_SIZE;
    const draftElement = {
      ...createElement(
        DEFAULT_IMAGE_ELEMENT_TYPE,
        activeInteraction.origin,
        style
      ),
      backgroundColor: TRANSPARENT_COLOR,
      height: activeInteraction.hasMoved
        ? activeInteraction.current.y - activeInteraction.origin.y
        : intrinsicSize.height,
      name: createElementName(
        DEFAULT_IMAGE_ELEMENT_TYPE,
        activeCanvasState.elements
      ),
      src: pendingImageSrc,
      width: activeInteraction.hasMoved
        ? activeInteraction.current.x - activeInteraction.origin.x
        : intrinsicSize.width
    };
    const nextElement = withUpdatedObjectBase(
      activeInteraction.hasMoved
        ? normalizeElement(draftElement)
        : draftElement
    );

    commitState({
      elements: [...activeCanvasState.elements, nextElement],
      selectedBend: undefined,
      selectedIds: [nextElement.id]
    });
    setPendingImageSize(null);
    setPendingImageSrc(null);
    setTool(DEFAULT_SELECT_TOOL);
    updateInteraction(null);
    return;
  }

  if (activeInteraction.type === "polylineCreate") {
    const fixedPoints = appendPolylinePoint(
      activeInteraction.fixedPoints,
      activeInteraction.current
    );

    replaceActiveState({
      ...activeCanvasState,
      elements: activeCanvasState.elements.map((element) =>
        element.id === activeInteraction.elementId
          ? updatePolylineElement(element, fixedPoints, activeInteraction.current)
          : element
      ),
      selectedBend: undefined,
      selectedIds: [activeInteraction.elementId]
    });
    updateInteraction({
      ...activeInteraction,
      fixedPoints,
      hasMoved: false,
      pointerDownOrigin: null
    });
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
          ? withUpdatedObjectBase(
              normalizeElement(
                element.type === "draw" && element.points
                  ? {
                      ...element,
                      points: simplifyPolyline(
                        element.points,
                        FREEHAND_SIMPLIFICATION_TOLERANCE_PX / zoom
                      )
                    }
                  : element
              )
            )
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

  if (activeInteraction.type === "linearEndpoint") {
    commitState(activeCanvasState, {
      baseState: {
        ...activeCanvasState,
        elements: activeInteraction.originalElements
      }
    });

    if (activeInteraction.mode === "resize") {
      setSelectionTransformCenter(null);
    }
  }

  if (activeInteraction.type === "resize" || activeInteraction.type === "skew") {
    const selectedIdSet = getIdSet(activeInteraction.selectedIds);
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
