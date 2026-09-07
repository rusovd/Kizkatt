import {
  getElementBounds,
  getElementDisplayName,
  getElementTransformedCorners,
  getLinearElementPoints,
  transformElementPoint
} from "kizkatt-graphic-engine";

import type {
  ElementInfoOverlayItem,
  KizkattElement,
  Point
} from "../../model/types";
import { useI18n } from "../../i18n";

const FONT_SIZE_PX = 11;
const CHARACTER_WIDTH_FACTOR = 0.58;
const HORIZONTAL_PADDING_PX = 6;
const VERTICAL_PADDING_PX = 4;
const CALLOUT_GAP_PX = 8;
const COLLISION_GAP_PX = 4;
const ANCHOR_RADIUS_PX = 1.75;
const MAX_PLACEMENT_ATTEMPTS = 100;

type InfoTarget = {
  anchor: Point;
  id: string;
  kind: "element" | "group";
  layerEnd: number;
  layerStart: number;
  name: string;
};

type LabelLayout = InfoTarget & {
  box: { height: number; width: number; x: number; y: number };
  label: string;
};

function getTopmostPoint(points: Point[]) {
  return points.reduce((topmost, point) =>
    point.y < topmost.y || (point.y === topmost.y && point.x < topmost.x)
      ? point
      : topmost
  );
}

function transformPoints(element: KizkattElement, points: Point[]) {
  return points.map((point) => transformElementPoint(element, point));
}

function getElementAnchor(element: KizkattElement): Point {
  if (element.type === "line" || element.type === "arrow") {
    return getTopmostPoint(
      transformPoints(element, getLinearElementPoints(element))
    );
  }

  const bounds = getElementBounds(element);

  if (element.type === "ellipse" || element.type === "diamond") {
    const center = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    };

    return getTopmostPoint(
      transformPoints(element, [
        { x: center.x, y: bounds.y },
        { x: bounds.x + bounds.width, y: center.y },
        { x: center.x, y: bounds.y + bounds.height },
        { x: bounds.x, y: center.y }
      ])
    );
  }

  if (element.type === "draw" && element.points?.length) {
    return getTopmostPoint(
      transformPoints(
        element,
        element.points.map((point) => ({
          x: element.x + point.x,
          y: element.y + point.y
        }))
      )
    );
  }

  const transformedCorners = getElementTransformedCorners(element);

  if (transformedCorners.length) {
    return getTopmostPoint(transformedCorners);
  }

  return transformElementPoint(element, {
    x: bounds.x + bounds.width / 2,
    y: bounds.y
  });
}

function buildInfoTargets(
  items: ElementInfoOverlayItem[],
  defaultGroupName: string
) {
  const groupedItems = new Map<string, ElementInfoOverlayItem[]>();
  const targets: InfoTarget[] = [];

  items.forEach((item) => {
    const groupId = item.element.groupId;

    if (!groupId) {
      targets.push({
        anchor: getElementAnchor(item.element),
        id: item.element.id,
        kind: "element",
        layerEnd: item.layerNumber,
        layerStart: item.layerNumber,
        name: getElementDisplayName(item.element)
      });
      return;
    }

    const group = groupedItems.get(groupId) ?? [];
    group.push(item);
    groupedItems.set(groupId, group);
  });

  groupedItems.forEach((group, groupId) => {
    const layerNumbers = group.map((item) => item.layerNumber);
    const anchors = group.map((item) => getElementAnchor(item.element));
    const firstElement = group[0]?.element;

    targets.push({
      anchor: getTopmostPoint(anchors),
      id: groupId,
      kind: "group",
      layerEnd: Math.max(...layerNumbers),
      layerStart: Math.min(...layerNumbers),
      name: firstElement?.groupName ?? defaultGroupName
    });
  });

  return targets.sort(
    (first, second) =>
      first.layerStart - second.layerStart ||
      first.anchor.y - second.anchor.y ||
      first.anchor.x - second.anchor.x
  );
}

function boxesOverlap(
  first: LabelLayout["box"],
  second: LabelLayout["box"],
  gap: number
) {
  return !(
    first.x + first.width + gap <= second.x ||
    second.x + second.width + gap <= first.x ||
    first.y + first.height + gap <= second.y ||
    second.y + second.height + gap <= first.y
  );
}

function layoutInfoLabels({
  defaultGroupName,
  items,
  layerLabel,
  layersLabel,
  zoom
}: {
  defaultGroupName: string;
  items: ElementInfoOverlayItem[];
  layerLabel: string;
  layersLabel: string;
  zoom: number;
}) {
  const safeZoom = Math.max(zoom, Number.EPSILON);
  const fontSize = FONT_SIZE_PX / safeZoom;
  const horizontalPadding = HORIZONTAL_PADDING_PX / safeZoom;
  const verticalPadding = VERTICAL_PADDING_PX / safeZoom;
  const calloutGap = CALLOUT_GAP_PX / safeZoom;
  const collisionGap = COLLISION_GAP_PX / safeZoom;
  const layouts: LabelLayout[] = [];

  buildInfoTargets(items, defaultGroupName).forEach((target) => {
    const layerText =
      target.layerStart === target.layerEnd
        ? `${layerLabel} ${target.layerStart}`
        : `${layersLabel} ${target.layerStart}–${target.layerEnd}`;
    const label = `${target.name} · ${layerText}`;
    const width =
      label.length * fontSize * CHARACTER_WIDTH_FACTOR + horizontalPadding * 2;
    const height = fontSize + verticalPadding * 2;
    const box = {
      height,
      width,
      x: target.anchor.x - width / 2,
      y: target.anchor.y - calloutGap - height
    };
    let attempt = 0;

    while (
      layouts.some((layout) => boxesOverlap(box, layout.box, collisionGap)) &&
      attempt < MAX_PLACEMENT_ATTEMPTS
    ) {
      box.y -= height + collisionGap;
      attempt += 1;
    }

    layouts.push({ ...target, box, label });
  });

  return { fontSize, layouts, safeZoom };
}

export function InfoOverlay({
  items,
  zoom
}: {
  items: ElementInfoOverlayItem[];
  zoom: number;
}) {
  const { strings } = useI18n();
  const { fontSize, layouts, safeZoom } = layoutInfoLabels({
    defaultGroupName: strings.groupNames.default,
    items,
    layerLabel: strings.canvas.layer,
    layersLabel: strings.canvas.layers,
    zoom
  });
  const horizontalPadding = HORIZONTAL_PADDING_PX / safeZoom;
  const verticalPadding = VERTICAL_PADDING_PX / safeZoom;

  return (
    <g
      className="kizkatt-info-overlay"
      data-export-ignore="true"
      pointerEvents="none"
    >
      {layouts.map((layout) => {
        const labelConnection = {
          x: layout.box.x + layout.box.width / 2,
          y: layout.box.y + layout.box.height
        };
        const targetAttributes =
          layout.kind === "group"
            ? { "data-info-group-id": layout.id }
            : { "data-info-element-id": layout.id };

        return (
          <g
            key={`${layout.kind}-${layout.id}`}
            className="kizkatt-info-label"
            data-info-kind={layout.kind}
            data-layer-end={layout.layerEnd}
            data-layer-start={layout.layerStart}
            {...targetAttributes}
          >
            <line
              className="kizkatt-info-leader"
              x1={layout.anchor.x}
              y1={layout.anchor.y}
              x2={labelConnection.x}
              y2={labelConnection.y}
            />
            <circle
              className="kizkatt-info-anchor"
              cx={layout.anchor.x}
              cy={layout.anchor.y}
              r={ANCHOR_RADIUS_PX / safeZoom}
            />
            <rect
              x={layout.box.x}
              y={layout.box.y}
              width={layout.box.width}
              height={layout.box.height}
              rx={Math.min(4 / safeZoom, layout.box.height / 3)}
            />
            <text
              x={layout.box.x + horizontalPadding}
              y={layout.box.y + verticalPadding + fontSize * 0.82}
              fontSize={fontSize}
            >
              {layout.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}
