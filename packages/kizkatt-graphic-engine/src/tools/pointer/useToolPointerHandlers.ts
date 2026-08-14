import { useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";

import {
  getWorldPoint,
  snapPointToElements,
  snapPointToGrid
} from "../../geometry";
import type { Interaction, Point } from "../../model/types";
import { finishPointerInteraction } from "./finishPointerInteraction";
import { startPointerInteraction } from "./startPointerInteraction";
import type { PointerHandlerContext, UseToolPointerHandlersArgs } from "./types";
import { updatePointerInteraction } from "./updatePointerInteraction";

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

  const getPointerWorldPoint = (event: PointerEvent<SVGSVGElement>) =>
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

    snapElementsRef.current = args.canvasStateRef.current.elements;
    startPointerInteraction(event, context);

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

  return {
    imagePreviewPoint,
    interaction,
    onPointerDown,
    onPointerLeave,
    onPointerMove,
    onPointerUp
  };
}
