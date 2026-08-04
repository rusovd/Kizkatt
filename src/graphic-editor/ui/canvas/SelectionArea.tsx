import { MIN_SELECT_DRAG_DISTANCE } from "../../config/constants";
import { getBoundsFromPoints, getDistance } from "../../geometry";
import type { Interaction } from "../../model/types";
import { SVG_FILL_NONE } from "./renderingConstants";

export function SelectionArea({ interaction }: { interaction: Interaction | null }) {
  if (
    interaction?.type !== "selectArea" ||
    getDistance(interaction.origin, interaction.current) < MIN_SELECT_DRAG_DISTANCE
  ) {
    return null;
  }

  const bounds = getBoundsFromPoints(interaction.origin, interaction.current);

  return (
    <rect
      className="kizkatt-area-selection"
      x={bounds.x}
      y={bounds.y}
      width={bounds.width}
      height={bounds.height}
      fill={SVG_FILL_NONE}
    />
  );
}
