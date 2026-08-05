import { useRef, useState } from "react";
import type { PointerEvent } from "react";

import {
  getWorldPoint,
  snapPointToElements,
  snapPointToGrid
} from "../../geometry";
import type { Interaction } from "../../model/types";
import { finishPointerInteraction } from "./finishPointerInteraction";
import { startPointerInteraction } from "./startPointerInteraction";
import type { PointerHandlerContext, UseToolPointerHandlersArgs } from "./types";
import { updatePointerInteraction } from "./updatePointerInteraction";

export function useToolPointerHandlers(args: UseToolPointerHandlersArgs) {
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  interactionRef.current = interaction;

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
      return snapPointToGrid(worldPoint);
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
    }
  };

  const onPointerUp = (event: PointerEvent<SVGSVGElement>) => {
    const activeInteraction = interactionRef.current;

    if (activeInteraction) {
      finishPointerInteraction(event, activeInteraction, context);
    }
  };

  return {
    interaction,
    onPointerDown,
    onPointerMove,
    onPointerUp
  };
}
