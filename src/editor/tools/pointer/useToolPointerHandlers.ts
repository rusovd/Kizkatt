import { useEffect, useRef, useState } from "react";
import type { MouseEvent, PointerEvent } from "react";

import {
  findElementAtPoint,
  getWorldPoint,
  insertLinearElementBend,
  snapPointToElements,
  snapPointToGrid,
  withUpdatedObjectBase
} from "kizkatt-graphic-engine";
import type { Interaction, Point } from "kizkatt-graphic-engine";
import { finishPointerInteraction } from "./finishPointerInteraction";
import { startPointerInteraction } from "./startPointerInteraction";
import type { PointerHandlerContext, UseToolPointerHandlersArgs } from "./types";
import { updatePointerInteraction } from "./updatePointerInteraction";
import {
  appendPolylinePoint,
  updatePolylineElement
} from "kizkatt-graphic-engine";

export function useToolPointerHandlers(args: UseToolPointerHandlersArgs) {
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [imagePreviewPoint, setImagePreviewPoint] = useState<Point | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const snapElementsRef = useRef(args.canvasState.elements);
  const pointerMoveFrameRef = useRef<number | null>(null);
  const pendingPointerMoveRef = useRef<{
    event: PointerEvent<SVGSVGElement>;
    interaction: Interaction;
  } | null>(null);
  interactionRef.current = interaction;

  useEffect(() => {
    if (args.tool !== "image" || !args.pendingImageSrc) {
      setImagePreviewPoint(null);
    }
  }, [args.pendingImageSrc, args.tool]);

  useEffect(
    () => () => {
      if (pointerMoveFrameRef.current !== null) {
        window.cancelAnimationFrame(pointerMoveFrameRef.current);
      }
    },
    []
  );

  const getPointerWorldPoint = (
    event: Pick<PointerEvent<SVGSVGElement>, "clientX" | "clientY">
  ) =>
    getWorldPoint(event, args.svgRef.current, args.zoom, args.pan);
  const getSnappedPointerWorldPoint = (
    event: PointerEvent<SVGSVGElement>,
    ignoredIds: Iterable<string> = []
  ) => {
    const worldPoint = getPointerWorldPoint(event);

    if (args.snapToObjects) {
      const objectSnapPoint = snapPointToElements(
        worldPoint,
        interactionRef.current
          ? snapElementsRef.current
          : args.canvasStateRef.current.elements,
        {
          ignoredIds,
          includeMidpoints: args.snapToMidpoints
        }
      );

      if (objectSnapPoint !== worldPoint) {
        return objectSnapPoint;
      }
    }

    if (args.snapToGrid) {
      return snapPointToGrid(worldPoint, args.gridCellSize);
    }

    return worldPoint;
  };

  const updateInteraction = (nextInteraction: Interaction | null) => {
    interactionRef.current = nextInteraction;
    setInteraction(nextInteraction);
  };

  const context: PointerHandlerContext = {
    ...args,
    getPointerWorldPoint,
    getSnappedPointerWorldPoint,
    updateInteraction
  };

  useEffect(() => {
    const activeInteraction = interactionRef.current;

    if (
      args.tool === "polyline" ||
      activeInteraction?.type !== "polylineCreate"
    ) {
      return;
    }

    const activeCanvasState = args.canvasStateRef.current;
    const finalPoint = activeInteraction.fixedPoints.at(-1);

    args.replaceActiveState({
      ...activeCanvasState,
      elements:
        activeInteraction.fixedPoints.length >= 2 && finalPoint
          ? activeCanvasState.elements.map((element) =>
              element.id === activeInteraction.elementId
                ? withUpdatedObjectBase(
                    updatePolylineElement(
                      element,
                      activeInteraction.fixedPoints,
                      finalPoint
                    )
                  )
                : element
            )
          : activeCanvasState.elements.filter(
              (element) => element.id !== activeInteraction.elementId
            ),
      selectedBend: undefined,
      selectedIds:
        activeInteraction.fixedPoints.length >= 2
          ? [activeInteraction.elementId]
          : []
    });
    updateInteraction(null);
  }, [args.tool]);

  const flushPendingPointerMove = () => {
    const pendingPointerMove = pendingPointerMoveRef.current;
    pendingPointerMoveRef.current = null;
    pointerMoveFrameRef.current = null;

    if (pendingPointerMove) {
      updatePointerInteraction(
        pendingPointerMove.event,
        pendingPointerMove.interaction,
        context
      );
    }
  };

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) {
      return;
    }

    const activeInteraction = interactionRef.current;

    if (
      args.tool === "polyline" &&
      activeInteraction?.type === "polylineCreate"
    ) {
      const current = getSnappedPointerWorldPoint(event, [
        activeInteraction.elementId
      ]);

      updateInteraction({
        ...activeInteraction,
        current,
        hasMoved: false,
        pointerDownOrigin: current
      });
      return;
    }

    snapElementsRef.current = args.canvasStateRef.current.elements;
    startPointerInteraction(event, context);

    if (
      args.tool === "zoom" &&
      interactionRef.current?.type === "zoomArea"
    ) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }

    if (!interactionRef.current) {
      snapElementsRef.current = args.canvasStateRef.current.elements;
    }
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const activeInteraction = interactionRef.current;

    if (activeInteraction) {
      const nativeEvent = event.nativeEvent;
      const canCoalesceTransform =
        activeInteraction.type !== "create" &&
        activeInteraction.type !== "imageCreate" &&
        typeof window.requestAnimationFrame === "function" &&
        typeof nativeEvent.getCoalescedEvents === "function";

      if (!canCoalesceTransform) {
        updatePointerInteraction(event, activeInteraction, context);
        return;
      }

      pendingPointerMoveRef.current = { event, interaction: activeInteraction };

      if (pointerMoveFrameRef.current === null) {
        pointerMoveFrameRef.current = window.requestAnimationFrame(
          flushPendingPointerMove
        );
      }
    } else if (args.tool === "image" && args.pendingImageSrc) {
      setImagePreviewPoint(getSnappedPointerWorldPoint(event));
    }
  };

  const onPointerUp = (event: PointerEvent<SVGSVGElement>) => {
    if (pointerMoveFrameRef.current !== null) {
      window.cancelAnimationFrame(pointerMoveFrameRef.current);
      flushPendingPointerMove();
    }

    const activeInteraction = interactionRef.current;

    if (activeInteraction) {
      finishPointerInteraction(event, activeInteraction, context);
      snapElementsRef.current = args.canvasStateRef.current.elements;

      if (activeInteraction.type === "imageCreate") {
        setImagePreviewPoint(null);
      }
    }
  };

  const onPointerLeave = () => {
    if (!interactionRef.current) {
      setImagePreviewPoint(null);
    }
  };

  const onDoubleClick = (event: MouseEvent<SVGSVGElement>) => {
    const activeInteraction = interactionRef.current;

    if (
      args.tool === "polyline" &&
      activeInteraction?.type === "polylineCreate"
    ) {
      event.preventDefault();
      const activeCanvasState = args.canvasStateRef.current;
      const fixedPoints = appendPolylinePoint(
        activeInteraction.fixedPoints,
        activeInteraction.current
      );

      if (fixedPoints.length < 2) {
        args.replaceActiveState({
          ...activeCanvasState,
          elements: activeCanvasState.elements.filter(
            (element) => element.id !== activeInteraction.elementId
          ),
          selectedBend: undefined,
          selectedIds: []
        });
      } else {
        args.replaceActiveState({
          ...activeCanvasState,
          elements: activeCanvasState.elements.map((element) =>
            element.id === activeInteraction.elementId
              ? withUpdatedObjectBase(
                  updatePolylineElement(
                    element,
                    fixedPoints,
                    activeInteraction.current
                  )
                )
              : element
          ),
          selectedBend: undefined,
          selectedIds: [activeInteraction.elementId]
        });
      }

      args.setTool("select");
      updateInteraction(null);
      return;
    }

    if (args.tool !== "nodeEdit") {
      return;
    }

    const activeCanvasState = args.canvasStateRef.current;
    const worldPoint = getPointerWorldPoint(event);
    const eventTarget = event.target instanceof Element ? event.target : null;
    const segmentTarget = eventTarget?.closest(
      '[data-handle="linear-segment"]'
    );
    const otherHandleTarget = eventTarget?.closest("[data-handle]");

    if (otherHandleTarget && !segmentTarget) {
      return;
    }

    const overlayElementId = segmentTarget
      ?.closest("[data-element-overlay-id]")
      ?.getAttribute("data-element-overlay-id");
    const overlayElement = activeCanvasState.elements.find(
      (element) => element.id === overlayElementId
    );
    const hitElement =
      overlayElement ??
      findElementAtPoint(activeCanvasState.elements, worldPoint);

    if (hitElement?.type !== "line" && hitElement?.type !== "arrow") {
      return;
    }

    const segmentIndexAttribute = segmentTarget?.getAttribute(
      "data-segment-index"
    );
    const segmentIndex = Number(segmentIndexAttribute);
    const insertedBend = insertLinearElementBend(
      hitElement,
      worldPoint,
      segmentIndexAttribute !== null && segmentIndexAttribute !== undefined &&
        Number.isInteger(segmentIndex)
        ? segmentIndex
        : undefined
    );

    if (!insertedBend) {
      return;
    }

    event.preventDefault();
    args.commitState({
      ...activeCanvasState,
      elements: activeCanvasState.elements.map((element) =>
        element.id === hitElement.id ? insertedBend.element : element
      ),
      selectedBend: {
        bendIndex: insertedBend.bendIndex,
        elementId: hitElement.id
      },
      selectedIds: [hitElement.id],
      selectedNodes: {
        elementId: hitElement.id,
        nodeIndices: [insertedBend.bendIndex + 1],
        segmentIndex: insertedBend.bendIndex
      }
    });
  };

  return {
    imagePreviewPoint,
    interaction,
    onDoubleClick,
    onPointerDown,
    onPointerLeave,
    onPointerMove,
    onPointerUp
  };
}
