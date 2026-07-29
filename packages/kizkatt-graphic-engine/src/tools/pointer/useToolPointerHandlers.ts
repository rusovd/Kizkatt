import { useRef, useState } from "react";
import type { PointerEvent } from "react";

import { getWorldPoint } from "../../geometry";
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

  const updateInteraction = (nextInteraction: Interaction | null) => {
    interactionRef.current = nextInteraction;
    setInteraction(nextInteraction);
  };

  const context: PointerHandlerContext = {
    ...args,
    getPointerWorldPoint,
    updateInteraction
  };

  const onPointerDown = (event: PointerEvent<SVGSVGElement>) => {
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
