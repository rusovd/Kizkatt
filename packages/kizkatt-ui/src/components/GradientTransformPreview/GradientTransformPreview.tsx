import {
  getElementTransformedBounds,
  getElementTransformedCorners,
  getSelectionTransformHandleLayout,
  getGradientFillFromTransformElement,
  getGradientStopPoint,
  getGradientStopPositionAtPoint,
  getGradientTransformElement,
  getResizeCursor,
  resizeElementFromHandle,
  rotateElementsAroundPoint,
  skewElementsFromSelectionHandle,
  snapAngleToIncrement,
  transformElementPoint,
  updateGradientStop,
  type GradientFill,
  type KizkattElement,
  type Point,
  type ResizeHandle,
  type SelectionTransformMode,
  type SkewHandle
} from "kizkatt-graphic-engine";
import {
  useId,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent
} from "react";

import { useWindowPointerTracking } from "../../hooks/useWindowPointerTracking";
import { getGradientCssPreview } from "../../model/gradientPresets";
import { GradientFillDefinition } from "../../rendering/GradientFill";

const PREVIEW_SIZE = 100;
const MIN_DRAG_DISTANCE = 2;
const RADIANS_PER_DEGREE = Math.PI / 180;
const ROTATION_SNAP_STEP = 15 * RADIANS_PER_DEGREE;
const RESIZE_HANDLES: ResizeHandle[] = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w"
];
type CornerHandle = "nw" | "ne" | "se" | "sw";
const CORNER_HANDLES: CornerHandle[] = ["nw", "ne", "se", "sw"];
const SKEW_HANDLES: SkewHandle[] = ["top", "bottom"];

type InteractionAction = "move" | "resize" | "rotate" | "skew" | "stop";

type GradientInteraction = {
  action: InteractionAction;
  center: Point;
  handle?: ResizeHandle | SkewHandle;
  hasMoved: boolean;
  originalElement: KizkattElement;
  originalGradient: GradientFill;
  pointerId: number;
  startClient: Point;
  startPoint: Point;
  startPointerAngle: number;
  stopId?: string;
};

type PreviewPointerEvent = Pick<
  globalThis.PointerEvent,
  "altKey" | "clientX" | "clientY" | "pointerId" | "preventDefault"
>;

export type GradientTransformPreviewLabels = {
  move: string;
  resize: string;
  rotate: string;
  skew: string;
  stop: string;
};

function normalizeAngleDelta(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function pointToCss(point: Point) {
  return {
    left: `${Math.min(98, Math.max(2, point.x))}%`,
    top: `${Math.min(98, Math.max(2, point.y))}%`
  };
}

function getHandlePoints(element: KizkattElement) {
  const left = element.x;
  const top = element.y;
  const right = element.x + element.width;
  const bottom = element.y + element.height;
  const centerX = left + element.width / 2;
  const centerY = top + element.height / 2;

  return {
    e: transformElementPoint(element, { x: right, y: centerY }),
    n: transformElementPoint(element, { x: centerX, y: top }),
    ne: transformElementPoint(element, { x: right, y: top }),
    nw: transformElementPoint(element, { x: left, y: top }),
    s: transformElementPoint(element, { x: centerX, y: bottom }),
    se: transformElementPoint(element, { x: right, y: bottom }),
    sw: transformElementPoint(element, { x: left, y: bottom }),
    w: transformElementPoint(element, { x: left, y: centerY })
  } satisfies Record<ResizeHandle, Point>;
}

function getShapePoints(gradient: GradientFill, element: KizkattElement) {
  const center = { x: gradient.centerX, y: gradient.centerY };
  const radiusX = element.width / 2;
  const radiusY = element.height / 2;

  if (gradient.type === "linear") {
    return [
      transformElementPoint(element, {
        x: center.x - radiusX,
        y: center.y
      }),
      transformElementPoint(element, {
        x: center.x + radiusX,
        y: center.y
      })
    ];
  }

  if (gradient.type === "diamond") {
    return [
      { x: center.x, y: center.y - radiusY },
      { x: center.x + radiusX, y: center.y },
      { x: center.x, y: center.y + radiusY },
      { x: center.x - radiusX, y: center.y }
    ].map((point) => transformElementPoint(element, point));
  }

  return Array.from({ length: 48 }, (_, index) => {
    const angle = (index / 48) * Math.PI * 2;
    return transformElementPoint(element, {
      x: center.x + Math.cos(angle) * radiusX,
      y: center.y + Math.sin(angle) * radiusY
    });
  });
}

function pointsToPath(points: Point[], close = false) {
  if (points.length === 0) return "";
  return `${points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ")}${close ? " Z" : ""}`;
}

function CornerRotateIcon({ corner }: { corner: CornerHandle }) {
  const transformByCorner: Record<CornerHandle, string> = {
    ne: "translate(20 0) scale(-1 1)",
    nw: "translate(0 0)",
    se: "translate(20 20) scale(-1 -1)",
    sw: "translate(0 20) scale(1 -1)"
  };

  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <g transform={transformByCorner[corner]}>
        <path d="M4 14 C4.4 8.6 8.4 4.6 14 4.1 L14.2 6.4 C9.9 6.9 6.9 10.1 6.4 14.2 Z" />
        <path d="M14 1.7 L18.6 4 L14.4 7 Z" />
      </g>
    </svg>
  );
}

function SkewHandleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M2 10 L6 6 M2 10 L6 14 M2 10 H18 M18 10 L14 6 M18 10 L14 14" />
    </svg>
  );
}

export function GradientTransformPreview({
  freeDeformation = false,
  gradient,
  labels,
  onChange,
  onChangeEnd,
  onSelectedStopIdChange,
  shadeOverlay = true,
  selectedStopId
}: {
  freeDeformation?: boolean;
  gradient: GradientFill;
  labels: GradientTransformPreviewLabels;
  onChange: (gradient: GradientFill) => void;
  onChangeEnd: () => void;
  onSelectedStopIdChange: (stopId: string) => void;
  shadeOverlay?: boolean;
  selectedStopId: string;
}) {
  const gradientDefinitionId = `kizkatt-gradient-preview-${useId().replaceAll(":", "")}`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<GradientInteraction | null>(null);
  const [interactionActive, setInteractionActive] = useState(false);
  const [transformMode, setTransformMode] =
    useState<SelectionTransformMode>("resize");

  useEffect(() => {
    if (!freeDeformation) {
      setTransformMode("resize");
    }
  }, [freeDeformation]);
  const element = useMemo(() => getGradientTransformElement(gradient), [gradient]);
  const handlePoints = getHandlePoints(element);
  const corners = getElementTransformedCorners(element);
  const transformedBounds = getElementTransformedBounds(element);
  const transformHandleLayout = getSelectionTransformHandleLayout(
    transformedBounds,
    -5
  );
  const shapePoints = getShapePoints(gradient, element);
  const center = { x: gradient.centerX, y: gradient.centerY };

  const getPreviewPoint = (clientX: number, clientY: number) => {
    const bounds = rootRef.current?.getBoundingClientRect();
    return {
      x: ((clientX - (bounds?.left ?? 0)) / Math.max(1, bounds?.width ?? 1)) * PREVIEW_SIZE,
      y: ((clientY - (bounds?.top ?? 0)) / Math.max(1, bounds?.height ?? 1)) * PREVIEW_SIZE
    };
  };

  const beginInteraction = (
    event: ReactPointerEvent<HTMLElement>,
    action: InteractionAction,
    handle?: ResizeHandle | SkewHandle,
    stopId?: string
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const startPoint = getPreviewPoint(event.clientX, event.clientY);
    interactionRef.current = {
      action,
      center,
      handle,
      hasMoved: false,
      originalElement: element,
      originalGradient: gradient,
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      startPoint,
      startPointerAngle: Math.atan2(
        startPoint.y - center.y,
        startPoint.x - center.x
      ),
      stopId
    };
    setInteractionActive(true);
    if (stopId) onSelectedStopIdChange(stopId);
    rootRef.current?.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PreviewPointerEvent) => {
    const interaction = interactionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    event.preventDefault();
    const point = getPreviewPoint(event.clientX, event.clientY);
    interaction.hasMoved ||= Math.hypot(
      event.clientX - interaction.startClient.x,
      event.clientY - interaction.startClient.y
    ) >= MIN_DRAG_DISTANCE;
    if (!interaction.hasMoved) return;

    if (interaction.action === "stop" && interaction.stopId) {
      onChange(updateGradientStop(
        interaction.originalGradient,
        interaction.stopId,
        {
          position: getGradientStopPositionAtPoint(
            interaction.originalGradient,
            point
          )
        }
      ));
      return;
    }

    let nextElement: KizkattElement | undefined;
    if (interaction.action === "move") {
      nextElement = {
        ...interaction.originalElement,
        x: interaction.originalElement.x + point.x - interaction.startPoint.x,
        y: interaction.originalElement.y + point.y - interaction.startPoint.y
      };
    } else if (interaction.action === "resize" && interaction.handle) {
      nextElement = resizeElementFromHandle(
        interaction.originalElement,
        interaction.handle as ResizeHandle,
        point,
        {
          preserveAspectRatio:
            interaction.originalGradient.scaleLocked || event.altKey
        }
      );
    } else if (interaction.action === "rotate") {
      const pointerAngle = Math.atan2(
        point.y - interaction.center.y,
        point.x - interaction.center.x
      );
      const rawDelta = normalizeAngleDelta(
        pointerAngle - interaction.startPointerAngle
      );
      const angleDelta = event.altKey
        ? snapAngleToIncrement(rawDelta, ROTATION_SNAP_STEP)
        : rawDelta;
      nextElement = rotateElementsAroundPoint(
        [interaction.originalElement],
        [interaction.originalElement.id],
        interaction.center,
        angleDelta
      )[0];
    } else if (interaction.action === "skew" && interaction.handle) {
      nextElement = skewElementsFromSelectionHandle(
        [interaction.originalElement],
        [interaction.originalElement.id],
        getElementTransformedBounds(interaction.originalElement),
        interaction.center,
        interaction.handle as SkewHandle,
        interaction.startPoint,
        point
      )[0];
    }

    if (nextElement) {
      onChange(getGradientFillFromTransformElement(
        interaction.originalGradient,
        nextElement
      ));
    }
  };

  const finishInteraction = (
    event: Pick<globalThis.PointerEvent, "pointerId"> | null,
    allowModeToggle = true
  ) => {
    const interaction = interactionRef.current;
    if (
      !interaction ||
      (event && interaction.pointerId !== event.pointerId)
    ) return;
    interactionRef.current = null;
    setInteractionActive(false);
    const root = rootRef.current;
    if (root?.hasPointerCapture?.(interaction.pointerId)) {
      root.releasePointerCapture(interaction.pointerId);
    }

    if (
      freeDeformation &&
      allowModeToggle &&
      interaction.action === "move" &&
      !interaction.hasMoved
    ) {
      setTransformMode((mode) => (mode === "resize" ? "skew" : "resize"));
    }

    onChangeEnd();
  };

  useWindowPointerTracking({
    active: interactionActive,
    onPointerCancel: () => finishInteraction(null, false),
    onPointerMove,
    onPointerUp: (event) => finishInteraction(event)
  });

  const closeShape = gradient.type !== "linear";
  return (
    <div
      ref={rootRef}
      className="kizkatt-gradient-transform-preview"
      style={{ background: getGradientCssPreview(gradient) }}
    >
      <svg
        aria-hidden="true"
        className="kizkatt-gradient-transform-render"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <GradientFillDefinition
          gradient={gradient}
          id={gradientDefinitionId}
        />
        <rect width="100" height="100" fill={`url(#${gradientDefinitionId})`} />
      </svg>
      <svg
        aria-hidden="true"
        className="kizkatt-gradient-transform-overlay"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {shadeOverlay && (
          <path
            className="kizkatt-gradient-transform-shape kizkatt-gradient-transform-halo"
            d={pointsToPath(shapePoints, closeShape)}
          />
        )}
        <path
          className="kizkatt-gradient-transform-shape"
          d={pointsToPath(shapePoints, closeShape)}
        />
        {gradient.type === "conic" && (
          <>
            {shadeOverlay && (
              <path
                className="kizkatt-gradient-transform-axis kizkatt-gradient-transform-halo"
                d={`M ${center.x} ${center.y} L ${getGradientStopPoint(gradient, 0).x} ${getGradientStopPoint(gradient, 0).y}`}
              />
            )}
            <path
              className="kizkatt-gradient-transform-axis"
              d={`M ${center.x} ${center.y} L ${getGradientStopPoint(gradient, 0).x} ${getGradientStopPoint(gradient, 0).y}`}
            />
          </>
        )}
        {freeDeformation && (
          <>
            {shadeOverlay && (
              <path
                className="kizkatt-gradient-transform-frame kizkatt-gradient-transform-halo"
                d={pointsToPath(corners, true)}
              />
            )}
            <path
              className="kizkatt-gradient-transform-frame"
              d={pointsToPath(corners, true)}
            />
          </>
        )}
      </svg>

      <button
        type="button"
        className="kizkatt-gradient-transform-move-surface"
        style={{
          height: `${element.height}%`,
          left: `${center.x}%`,
          top: `${center.y}%`,
          transform: `translate(-50%, -50%) rotate(${gradient.rotation}deg) skewX(${gradient.skew}deg)`,
          width: `${element.width}%`
        }}
        aria-label={labels.move}
        title={labels.move}
        onPointerDown={(event) => beginInteraction(event, "move")}
      />

      <button
        type="button"
        className="kizkatt-gradient-transform-center"
        style={pointToCss(center)}
        aria-label={labels.move}
        title={labels.move}
        onPointerDown={(event) => beginInteraction(event, "move")}
      >{!freeDeformation || transformMode === "resize" ? "×" : "⊙"}</button>

      {freeDeformation && transformMode === "resize" && RESIZE_HANDLES.map((handle) => (
        <button
          key={handle}
          type="button"
          className={`kizkatt-gradient-transform-handle is-resize is-${handle}`}
          style={{
            ...pointToCss(handlePoints[handle]),
            cursor: getResizeCursor(element.angle, handle)
          }}
          aria-label={labels.resize}
          title={labels.resize}
          onPointerDown={(event) => beginInteraction(event, "resize", handle)}
        />
      ))}

      {freeDeformation && transformMode === "skew" && (
        <>
          {CORNER_HANDLES.map((corner) => {
            const point = transformHandleLayout.corners[corner];
            return (
              <button
                key={`rotate-${corner}`}
                type="button"
                className={`kizkatt-gradient-transform-handle is-rotate is-${corner}`}
                style={pointToCss(point)}
                aria-label={labels.rotate}
                title={labels.rotate}
                onPointerDown={(event) => beginInteraction(event, "rotate")}
              >
                <CornerRotateIcon corner={corner} />
              </button>
            );
          })}

          {SKEW_HANDLES.map((handle) => {
            const point = transformHandleLayout.edges[handle];
            return (
              <button
                key={`skew-${handle}`}
                type="button"
                className={`kizkatt-gradient-transform-handle is-skew is-${handle}`}
                style={pointToCss(point)}
                aria-label={labels.skew}
                title={labels.skew}
                onPointerDown={(event) => beginInteraction(event, "skew", handle)}
              >
                <SkewHandleIcon />
              </button>
            );
          })}
        </>
      )}

      {gradient.stops.map((stop) => {
        const point = getGradientStopPoint(gradient, stop.position);
        return (
          <button
            key={stop.id}
            type="button"
            className={`kizkatt-gradient-transform-stop${
              stop.id === selectedStopId ? " is-active" : ""
            }`}
            style={{
              ...pointToCss(point)
            }}
            aria-label={`${labels.stop} ${stop.position}`}
            title={labels.stop}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) =>
              beginInteraction(event, "stop", undefined, stop.id)
            }
          >
            <svg aria-hidden="true" viewBox="0 0 16 18">
              <line x1="8" y1="0" x2="8" y2="4" />
              <path
                d="M2 4 H14 L8 16 Z"
                fill={stop.color}
                fillOpacity={stop.opacity / 100}
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
