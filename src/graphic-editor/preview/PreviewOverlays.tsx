import { EMPTY_COLLECTION_LENGTH, MIN_ELEMENT_SIZE } from "kizkatt-graphic-engine";
import {
  getElementCenter,
  getLinearElementPath,
  getLinearElementPoints,
  isElementPathClosed,
  transformElementPoint
} from "kizkatt-graphic-engine";
import type {
  Bounds,
  Interaction,
  KizkattElement,
  Point
} from "kizkatt-graphic-engine";
import type { Size } from "kizkatt-graphic-engine";
import {
  ARROW_MARKER_PATH,
  ARROW_MARKER_REF_Y,
  getIdSet
} from "kizkatt-graphic-engine";
import {
  getArrowheadGeometry,
  shortenLinePoints
} from "../ui/canvas/arrowheadGeometry";
import { getElementTransform, getFreehandPath } from "../ui/canvas/elementProps";

const PREVIEW_CORNER_RADIUS = 12;
const PREVIEW_TEXT_BASELINE_OFFSET = 26;
const SVG_CLOSE_PATH_COMMAND = " Z";

function TransformPreviewContour({
  element,
  wireframe
}: {
  element: KizkattElement;
  wireframe: boolean;
}) {
  const className = [
    "kizkatt-transform-preview-contour",
    element.type === "line" || element.type === "arrow"
      ? "kizkatt-transform-preview-line"
      : ""
  ]
    .filter(Boolean)
    .join(" ");

  if (element.type === "line" || element.type === "arrow") {
    const linePoints = getLinearElementPoints(element).map((point) =>
      transformElementPoint(element, point)
    );
    const arrowheadGeometry = getArrowheadGeometry(element, linePoints);
    const renderedLinePoints = arrowheadGeometry
      ? shortenLinePoints(linePoints, arrowheadGeometry.length)
      : linePoints;
    const pathData = getLinearElementPath(
      renderedLinePoints,
      element.edgeStyle
    );

    return (
      <>
        <path className={className} d={pathData} />
        {arrowheadGeometry && (
          <path
            className="kizkatt-transform-preview-contour kizkatt-transform-preview-arrowhead"
            d={ARROW_MARKER_PATH}
            transform={`translate(${arrowheadGeometry.end.x} ${arrowheadGeometry.end.y}) rotate(${arrowheadGeometry.angle}) scale(${arrowheadGeometry.scaleX} ${arrowheadGeometry.scaleY}) translate(${-ARROW_MARKER_REF_Y * 2} ${-ARROW_MARKER_REF_Y})`}
          />
        )}
      </>
    );
  }

  const transform = getElementTransform(element);

  if (element.type === "draw") {
    const pathData = getFreehandPath(element);

    return (
      <path
        className={className}
        d={`${pathData}${
          isElementPathClosed(element) && !pathData.trimEnd().endsWith("Z")
            ? SVG_CLOSE_PATH_COMMAND
            : ""
        }`}
        transform={transform}
      />
    );
  }

  if (element.type === "diamond") {
    const center = getElementCenter(element);
    const points = [
      `${center.x},${element.y}`,
      `${element.x + element.width},${center.y}`,
      `${center.x},${element.y + element.height}`,
      `${element.x},${center.y}`
    ].join(" ");

    return (
      <polygon
        className={className}
        points={points}
        transform={transform}
      />
    );
  }

  if (element.type === "ellipse") {
    return (
      <ellipse
        className={className}
        cx={element.x + element.width / 2}
        cy={element.y + element.height / 2}
        rx={Math.abs(element.width / 2)}
        ry={Math.abs(element.height / 2)}
        transform={transform}
      />
    );
  }

  if (element.type === "text") {
    return (
      <text
        className={`kizkatt-text ${className}`}
        x={element.x}
        y={element.y + PREVIEW_TEXT_BASELINE_OFFSET}
        transform={transform}
      >
        {element.text}
      </text>
    );
  }

  if (element.type === "image" && wireframe) {
    return (
      <>
        <rect
          className={className}
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          transform={transform}
        />
        <path
          className={className}
          d={`M ${element.x} ${element.y} L ${element.x + element.width} ${element.y + element.height} M ${element.x + element.width} ${element.y} L ${element.x} ${element.y + element.height}`}
          transform={transform}
        />
      </>
    );
  }

  return (
    <rect
      className={className}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      rx={element.edgeStyle === "sharp" ? 0 : PREVIEW_CORNER_RADIUS}
      transform={transform}
    />
  );
}

export function TransformPreview({
  elements,
  selectedIds,
  wireframe = false
}: {
  elements: KizkattElement[];
  selectedIds: string[];
  wireframe?: boolean;
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
      {selectedElements.map((element) => (
        <TransformPreviewContour
          key={element.id}
          element={element}
          wireframe={wireframe}
        />
      ))}
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
