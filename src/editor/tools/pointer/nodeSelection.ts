import {
  getBoundsFromPoints,
  getLinearElementPoints,
  transformElementPoint
} from "kizkatt-graphic-engine";
import type {
  CanvasState,
  KizkattElement,
  Point
} from "kizkatt-graphic-engine";

const NODE_SELECTION_PADDING_PX = 10;

function isLinearElement(
  element: KizkattElement
): element is KizkattElement & { type: "line" | "arrow" } {
  return element.type === "line" || element.type === "arrow";
}

function expandBounds(
  bounds: ReturnType<typeof getBoundsFromPoints>,
  padding: number
) {
  return {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2
  };
}

function isPointInsideBounds(
  point: Point,
  bounds: ReturnType<typeof getBoundsFromPoints>
) {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

export function getLinearNodeSelectionInArea(
  elements: KizkattElement[],
  selectedIds: string[],
  origin: Point,
  current: Point,
  zoom: number
): Pick<CanvasState, "selectedIds" | "selectedNodes"> | null {
  const selectedIdSet = new Set(selectedIds);
  const selectedLinearElements = elements.filter(
    (element) => selectedIdSet.has(element.id) && isLinearElement(element)
  );
  const selectedCombinationIds = new Set(
    selectedLinearElements.flatMap((element) =>
      element.lineCombinationId ? [element.lineCombinationId] : []
    )
  );
  const linearElements =
    selectedCombinationIds.size === 1
      ? elements.filter(
          (element) =>
            isLinearElement(element) &&
            element.lineCombinationId &&
            selectedCombinationIds.has(element.lineCombinationId)
        )
      : selectedLinearElements;

  if (
    linearElements.length === 0 ||
    (linearElements.length > 1 && selectedCombinationIds.size !== 1)
  ) {
    return null;
  }

  const selectionBounds = expandBounds(
    getBoundsFromPoints(origin, current),
    NODE_SELECTION_PADDING_PX / Math.max(zoom, Number.EPSILON)
  );
  const lineSelections = linearElements.flatMap((element) => {
    const linePoints = getLinearElementPoints(element);
    const nodeIndices = linePoints
      .map((point) => transformElementPoint(element, point))
      .reduce<number[]>((indices, point, index) => {
        if (isPointInsideBounds(point, selectionBounds)) {
          indices.push(index);
        }

        return indices;
      }, []);
    const lastSegmentIndex = Math.max(0, linePoints.length - 2);

    return nodeIndices.length > 0
      ? [
          {
            elementId: element.id,
            nodeIndices,
            segmentIndex: Math.max(
              0,
              Math.min(nodeIndices[0] - 1, lastSegmentIndex)
            )
          }
        ]
      : [];
  });
  const primarySelection = lineSelections[0];

  if (!primarySelection) {
    return null;
  }

  return {
    selectedIds: linearElements.map((element) => element.id),
    selectedNodes: {
      elementId: primarySelection.elementId,
      lineSelections,
      nodeIndices: primarySelection.nodeIndices,
      segmentIndex: primarySelection.segmentIndex
    }
  };
}
