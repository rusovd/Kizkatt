import {
  getElementBends,
  getElementCenter,
  getLinearElementPath,
  getLinearElementPoints
} from "../../geometry";
import type { KizkattElement } from "../../model/types";
import { ElementGroup } from "./ElementGroup";
import { ElementOverlay } from "./ElementOverlay";
import { getElementShapeProps, getFreehandPath } from "./elementProps";
import { LinearElementOverlay } from "./LinearElementOverlay";
import type { RenderElementOptions } from "./types";

function hashElementId(id: string) {
  return id.split("").reduce((hash, character) => {
    return (hash * 31 + character.charCodeAt(0)) % 997;
  }, 17);
}

function getSloppyFilterId(element: KizkattElement, variant = 0) {
  return `kizkatt-sloppy-${variant}-${element.id.replace(/[^A-Za-z0-9_-]/g, "")}`;
}

function getSloppiness(element: KizkattElement) {
  return element.sloppiness ?? "architect";
}

function shouldUseHandDrawnStroke(element: KizkattElement) {
  const sloppiness = getSloppiness(element);

  return sloppiness === "artist" || sloppiness === "cartoonist";
}

function getDoubleStrokeOffset(element: KizkattElement) {
  const strokeWidth = Math.max(1, element.strokeWidth);
  const gap = Math.max(0, element.sloppinessGap ?? 16);

  return Math.max(3, strokeWidth + gap);
}

function getSecondaryClosedShapeInset(element: KizkattElement) {
  const sloppiness = getSloppiness(element);
  const offset = getDoubleStrokeOffset(element);
  const rawInset = sloppiness === "double" ? offset : offset * 0.55;
  const maxInset = Math.max(1, Math.min(element.width, element.height) * 0.38);

  return Math.min(rawInset, maxInset);
}

function getPrimaryShapeProps(element: KizkattElement) {
  const filter = shouldUseHandDrawnStroke(element)
    ? `url(#${getSloppyFilterId(element)})`
    : undefined;

  return {
    filter,
    ...getElementShapeProps(element)
  };
}

function getSecondaryStrokeProps(
  element: KizkattElement,
  variant: number
) {
  const filter =
    getSloppiness(element) === "cartoonist"
      ? `url(#${getSloppyFilterId(element, variant)})`
      : undefined;

  return {
    "data-sloppiness-stroke": "secondary",
    "data-sloppiness-spacing": getDoubleStrokeOffset(element),
    ...getElementShapeProps(element),
    fill: "none",
    filter,
    opacity: (element.opacity / 100) * 0.88,
    pointerEvents: "none" as const
  };
}

function ElementSloppyFilter({
  element,
  variant = 0
}: {
  element: KizkattElement;
  variant?: number;
}) {
  if (!shouldUseHandDrawnStroke(element)) {
    return null;
  }

  const seed = hashElementId(element.id) + variant * 137;
  const strokeWidth = Math.max(1, element.strokeWidth);
  const scale =
    getSloppiness(element) === "cartoonist"
      ? Math.max(3, Math.min(14, 2.5 + Math.sqrt(strokeWidth) * 1.35))
      : Math.max(2.2, Math.min(11, 1.8 + Math.sqrt(strokeWidth) * 1.12));

  return (
    <defs>
      <filter
        id={getSloppyFilterId(element, variant)}
        x="-60%"
        y="-60%"
        width="220%"
        height="220%"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.018 0.026"
          numOctaves="2"
          seed={seed}
          result="noise"
        />
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          scale={scale}
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </defs>
  );
}

function getFillPatternId(element: KizkattElement) {
  return `kizkatt-fill-${element.id.replace(/[^A-Za-z0-9_-]/g, "")}`;
}

function getElementFill(element: KizkattElement) {
  if ((element.fillStyle ?? "solid") === "solid") {
    return element.backgroundColor;
  }

  return `url(#${getFillPatternId(element)})`;
}

function ElementFillPattern({ element }: { element: KizkattElement }) {
  const fillStyle = element.fillStyle ?? "solid";

  if (fillStyle === "solid") {
    return null;
  }

  const patternId = getFillPatternId(element);
  const patternStroke =
    element.backgroundColor === "transparent"
      ? element.strokeColor
      : element.backgroundColor;
  const fillWeight = Math.max(0.25, Math.min(6, element.fillWeight ?? 1));
  const patternSize = 8 / fillWeight;
  const patternStrokeWidth = Math.max(0.75, Math.min(3, 1.25 * Math.sqrt(fillWeight)));
  const hachurePath = `M ${-patternSize / 4} ${patternSize / 4} L ${patternSize / 4} ${-patternSize / 4} M 0 ${patternSize} L ${patternSize} 0 M ${patternSize * 0.75} ${patternSize * 1.25} L ${patternSize * 1.25} ${patternSize * 0.75}`;
  const crossHatchPath = `M 0 0 L ${patternSize} ${patternSize} M 0 ${patternSize} L ${patternSize} 0`;
  const reverseLine =
    fillStyle === "crossHatch" ? (
      <path d={crossHatchPath} />
    ) : null;

  return (
    <defs>
      <pattern
        id={patternId}
        width={patternSize}
        height={patternSize}
        patternUnits="userSpaceOnUse"
        patternTransform={`translate(${element.x} ${element.y})`}
      >
        {fillStyle === "hachure" ? <path d={hachurePath} /> : null}
        {reverseLine}
      </pattern>
      <style>{`
        #${patternId} path {
          stroke: ${patternStroke};
          stroke-width: ${patternStrokeWidth};
          stroke-linecap: round;
        }
      `}</style>
    </defs>
  );
}

function SelectedElementOverlay({
  element,
  options
}: {
  element: KizkattElement;
  options: RenderElementOptions;
}) {
  return (
    <ElementOverlay
      element={element}
      showBounds={options.showSelectionBounds ?? true}
      showRotateHandle={options.showRotateHandle ?? true}
    />
  );
}

function SecondaryRectStroke({ element }: { element: KizkattElement }) {
  const sloppiness = getSloppiness(element);

  if (sloppiness !== "cartoonist" && sloppiness !== "double") {
    return null;
  }

  const inset = getSecondaryClosedShapeInset(element);
  const edgeRadius = (element.edgeStyle ?? "round") === "round" ? 12 : 0;

  return (
    <rect
      x={element.x + inset}
      y={element.y + inset}
      width={Math.max(1, element.width - inset * 2)}
      height={Math.max(1, element.height - inset * 2)}
      rx={Math.max(0, edgeRadius - inset)}
      {...getSecondaryStrokeProps(element, 1)}
    />
  );
}

function SecondaryDiamondStroke({ element }: { element: KizkattElement }) {
  const sloppiness = getSloppiness(element);

  if (sloppiness !== "cartoonist" && sloppiness !== "double") {
    return null;
  }

  const inset = getSecondaryClosedShapeInset(element);
  const center = getElementCenter(element);
  const halfWidth = Math.max(1, element.width / 2 - inset);
  const halfHeight = Math.max(1, element.height / 2 - inset);
  const points = [
    `${center.x},${center.y - halfHeight}`,
    `${center.x + halfWidth},${center.y}`,
    `${center.x},${center.y + halfHeight}`,
    `${center.x - halfWidth},${center.y}`
  ].join(" ");

  return <polygon points={points} {...getSecondaryStrokeProps(element, 1)} />;
}

function SecondaryEllipseStroke({ element }: { element: KizkattElement }) {
  const sloppiness = getSloppiness(element);

  if (sloppiness !== "cartoonist" && sloppiness !== "double") {
    return null;
  }

  const inset = getSecondaryClosedShapeInset(element);

  return (
    <ellipse
      cx={element.x + element.width / 2}
      cy={element.y + element.height / 2}
      rx={Math.max(1, Math.abs(element.width / 2) - inset)}
      ry={Math.max(1, Math.abs(element.height / 2) - inset)}
      {...getSecondaryStrokeProps(element, 1)}
    />
  );
}

function getLineOffsetPoints(element: KizkattElement) {
  const offset = getDoubleStrokeOffset(element);
  const length = Math.hypot(element.width, element.height) || 1;
  const normal = {
    x: (-element.height / length) * offset,
    y: (element.width / length) * offset
  };

  return {
    x1: element.x + normal.x,
    x2: element.x + element.width + normal.x,
    y1: element.y + normal.y,
    y2: element.y + element.height + normal.y
  };
}

function SecondaryLineStroke({
  element,
  linePoints
}: {
  element: KizkattElement;
  linePoints: Array<{ x: number; y: number }>;
}) {
  const sloppiness = getSloppiness(element);

  if (sloppiness !== "cartoonist" && sloppiness !== "double") {
    return null;
  }

  const secondaryProps = getSecondaryStrokeProps(element, 1);

  if (linePoints.length > 2) {
    const offset = getDoubleStrokeOffset(element);
    const d = getLinearElementPath(
      linePoints.map((point) => ({
        x: point.x,
        y: point.y + offset
      }))
    );

    return <path d={d} {...secondaryProps} />;
  }

  return <line {...getLineOffsetPoints(element)} {...secondaryProps} />;
}

function SecondaryFreehandStroke({ element }: { element: KizkattElement }) {
  const sloppiness = getSloppiness(element);

  if (sloppiness !== "cartoonist" && sloppiness !== "double") {
    return null;
  }

  const offset = getDoubleStrokeOffset(element);
  const d = (element.points ?? [])
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";

      return `${command} ${element.x + point.x} ${element.y + point.y + offset}`;
    })
    .join(" ");

  return <path d={d} {...getSecondaryStrokeProps(element, 1)} />;
}

export function renderElement(
  element: KizkattElement,
  selected: boolean,
  options: RenderElementOptions = {}
) {
  const commonProps = getPrimaryShapeProps(element);
  const edgeRadius = (element.edgeStyle ?? "round") === "round" ? 12 : 0;

  if (element.type === "rectangle") {
    return (
      <ElementGroup key={element.id} element={element}>
        <ElementFillPattern element={element} />
        <ElementSloppyFilter element={element} />
        <ElementSloppyFilter element={element} variant={1} />
        <rect
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          rx={edgeRadius}
          fill={getElementFill(element)}
          {...commonProps}
        />
        <SecondaryRectStroke element={element} />
        {selected && <SelectedElementOverlay element={element} options={options} />}
      </ElementGroup>
    );
  }

  if (element.type === "image") {
    return (
      <ElementGroup key={element.id} element={element}>
        <ElementFillPattern element={element} />
        <ElementSloppyFilter element={element} />
        <ElementSloppyFilter element={element} variant={1} />
        {element.src ? (
          <image
            href={element.src}
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            preserveAspectRatio="xMidYMid meet"
            opacity={element.opacity / 100}
          />
        ) : (
          <rect
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            rx={edgeRadius}
            fill={getElementFill(element)}
            {...commonProps}
          />
        )}
        {!element.src && <SecondaryRectStroke element={element} />}
        {selected && <SelectedElementOverlay element={element} options={options} />}
      </ElementGroup>
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
      <ElementGroup key={element.id} element={element}>
        <ElementFillPattern element={element} />
        <ElementSloppyFilter element={element} />
        <ElementSloppyFilter element={element} variant={1} />
        <polygon points={points} fill={getElementFill(element)} {...commonProps} />
        <SecondaryDiamondStroke element={element} />
        {selected && <SelectedElementOverlay element={element} options={options} />}
      </ElementGroup>
    );
  }

  if (element.type === "ellipse") {
    return (
      <ElementGroup key={element.id} element={element}>
        <ElementFillPattern element={element} />
        <ElementSloppyFilter element={element} />
        <ElementSloppyFilter element={element} variant={1} />
        <ellipse
          cx={element.x + element.width / 2}
          cy={element.y + element.height / 2}
          rx={Math.abs(element.width / 2)}
          ry={Math.abs(element.height / 2)}
          fill={getElementFill(element)}
          {...commonProps}
        />
        <SecondaryEllipseStroke element={element} />
        {selected && <SelectedElementOverlay element={element} options={options} />}
      </ElementGroup>
    );
  }

  if (element.type === "line" || element.type === "arrow") {
    const bends = getElementBends(element);
    const linePoints = getLinearElementPoints(element, bends);
    const hasBends = bends.length > 0;
    const markerEnd =
      element.type === "arrow" ? "url(#kizkatt-arrow)" : undefined;

    return (
      <ElementGroup key={element.id} element={element}>
        <ElementSloppyFilter element={element} />
        <ElementSloppyFilter element={element} variant={1} />
        {hasBends ? (
          <path
            d={getLinearElementPath(linePoints)}
            fill="none"
            markerEnd={markerEnd}
            {...commonProps}
          />
        ) : (
          <line
            x1={element.x}
            y1={element.y}
            x2={element.x + element.width}
            y2={element.y + element.height}
            fill="none"
            markerEnd={markerEnd}
            {...commonProps}
          />
        )}
        <SecondaryLineStroke element={element} linePoints={linePoints} />
        {selected && (
          <>
            {hasBends ? (
              <ElementOverlay
                element={element}
                showBounds={options.showSelectionBounds ?? true}
                showRotateHandle={options.showRotateHandle ?? true}
              />
            ) : null}
            <LinearElementOverlay
              element={element}
              bends={bends}
              linePoints={linePoints}
              showBounds={options.showSelectionBounds ?? true}
              showBendHandles={options.showLinearBendHandles ?? true}
              showRotateHandle={!hasBends && (options.showRotateHandle ?? true)}
            />
          </>
        )}
      </ElementGroup>
    );
  }

  if (element.type === "draw") {
    return (
      <ElementGroup key={element.id} element={element}>
        <ElementSloppyFilter element={element} />
        <ElementSloppyFilter element={element} variant={1} />
        <path d={getFreehandPath(element)} fill="none" {...commonProps} />
        <SecondaryFreehandStroke element={element} />
        {selected && <SelectedElementOverlay element={element} options={options} />}
      </ElementGroup>
    );
  }

  return (
    <ElementGroup key={element.id} element={element}>
      <text
        x={element.x}
        y={element.y + 26}
        className="kizkatt-text"
        fill={element.strokeColor}
        opacity={element.opacity / 100}
      >
        {element.text}
      </text>
      {selected && <SelectedElementOverlay element={element} options={options} />}
    </ElementGroup>
  );
}
