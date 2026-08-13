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
  interactionRef.current = interaction;

  useEffect(() => {
    if (args.tool !== "image" || !args.pendingImageSrc) {
      setImagePreviewPoint(null);
    }
  }, [args.pendingImageSrc, args.tool]);

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
        args.canvasStateRef.current.elements,
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

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) {
      return;
    }

    startPointerInteraction(event, context);
  };

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const activeInteraction = interactionRef.current;

    if (activeInteraction) {
      updatePointerInteraction(event, activeInteraction, context);
    } else if (args.tool === "image" && args.pendingImageSrc) {
      setImagePreviewPoint(getSnappedPointerWorldPoint(event));
    }
  };

  const onPointerUp = (event: PointerEvent<SVGSVGElement>) => {
    const activeInteraction = interactionRef.current;

    if (activeInteraction) {
      finishPointerInteraction(event, activeInteraction, context);

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
