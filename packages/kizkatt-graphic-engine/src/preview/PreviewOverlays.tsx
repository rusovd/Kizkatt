import { EMPTY_COLLECTION_LENGTH, MIN_ELEMENT_SIZE } from "../config/constants";
import {
  getElementTransformedCorners,
  getLinearElementPath,
  getLinearElementPoints,
  transformElementPoint
} from "../geometry";
import type {
  Bounds,
  Interaction,
  KizkattElement,
  Point
} from "../model/types";
import type { Size } from "../import/imageSizing";
import { getIdSet } from "../model/collections";

export function TransformPreview({
  elements,
  selectedIds
}: {
  elements: KizkattElement[];
  selectedIds: string[];
}) {
  const selectedIdSet = getIdSet(selectedIds);
  const selectedElements = elements.filter((element) =>
    selectedIdSet.has(element.id)
  );

  if (selectedElements.length === EMPTY_COLLECTION_LENGTH) {
    return null;
  }

  return (
    <g className="kizkatt-transform-preview">
      {selectedElements.map((element) => {
        const points = getElementTransformedCorners(element);
        const [firstPoint, ...remainingPoints] = points;

        if (!firstPoint) {
          return null;
        }

        const boundsPathData = [
          `M ${firstPoint.x} ${firstPoint.y}`,
          ...remainingPoints.map((point) => `L ${point.x} ${point.y}`),
          "Z"
        ].join(" ");

        if (element.type === "line" || element.type === "arrow") {
          const linePathData = getLinearElementPath(
            getLinearElementPoints(element).map((point) =>
              transformElementPoint(element, point)
            ),
            element.edgeStyle
          );

          return (
            <g key={element.id}>
              <path
                className="kizkatt-transform-preview-line"
                d={linePathData}
              />
              <path
                className="kizkatt-transform-preview-bounds"
                d={boundsPathData}
              />
            </g>
          );
        }

        return <path key={element.id} d={boundsPathData} />;
      })}
    </g>
  );
}

export function getImagePlacementBounds(
  interaction: Interaction | null,
  previewPoint: Point | null,
  intrinsicSize: Size
): Bounds | null {
  if (interaction?.type === "imageCreate") {
    if (!interaction.hasMoved) {
      return {
        ...interaction.origin,
        ...intrinsicSize
      };
    }

    return {
      height: Math.max(
        MIN_ELEMENT_SIZE,
        Math.abs(interaction.current.y - interaction.origin.y)
      ),
      width: Math.max(
        MIN_ELEMENT_SIZE,
        Math.abs(interaction.current.x - interaction.origin.x)
      ),
      x: Math.min(interaction.origin.x, interaction.current.x),
      y: Math.min(interaction.origin.y, interaction.current.y)
    };
  }

  return previewPoint
    ? {
        ...previewPoint,
        ...intrinsicSize
      }
    : null;
}

export function ImagePlacementPreview({ bounds }: { bounds: Bounds }) {
  return (
    <g
      className="kizkatt-selection-overlay kizkatt-image-placement-preview"
      data-image-placement-preview="true"
      pointerEvents="none"
    >
      <rect
        x={bounds.x}
        y={bounds.y}
        width={bounds.width}
        height={bounds.height}
        fill="none"
      />
    </g>
  );
}
