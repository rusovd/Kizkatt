import { DEFAULT_GRADIENT_FILL, PERCENT_MAX_VALUE } from "../config/constants";
import type {
  GradientFill,
  GradientSpread,
  GradientStop,
  GradientType,
  KizkattElement,
  Point
} from "../model/types";
import { getElementLocalPoint, transformElementPoint } from "./primitives";

const MIN_GRADIENT_STOP_COUNT = 2;
const MIN_GRADIENT_STEPS = 2;
const MAX_GRADIENT_STEPS = 256;
const ACCELERATION_EXPONENT_DIVISOR = 50;
const DEGREES_PER_RADIAN = 180 / Math.PI;
const RADIANS_PER_DEGREE = Math.PI / 180;
const FULL_ROTATION_RADIANS = Math.PI * 2;
const GRADIENT_TRANSFORM_ELEMENT_ID = "gradient-transform";

function createGradientStopId() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `gradient-stop-${Math.random().toString(36).slice(2)}`
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function finite(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function normalizeHexColor(value: unknown, fallback: string) {
  return typeof value === "string" && /^#[\da-f]{6}$/i.test(value)
    ? value.toLocaleLowerCase()
    : fallback;
}

function isGradientType(value: unknown): value is GradientType {
  return value === "linear" ||
    value === "radial" ||
    value === "conic" ||
    value === "diamond";
}

function isGradientSpread(value: unknown): value is GradientSpread {
  return value === "pad" || value === "repeat" || value === "reflect";
}

export function normalizeGradientStop(
  value: Partial<GradientStop> | undefined,
  fallback: GradientStop
): GradientStop {
  return {
    id:
      typeof value?.id === "string" && value.id
        ? value.id
        : createGradientStopId(),
    color: normalizeHexColor(value?.color, fallback.color),
    opacity: clamp(
      finite(value?.opacity, fallback.opacity),
      0,
      PERCENT_MAX_VALUE
    ),
    position: clamp(
      finite(value?.position, fallback.position),
      0,
      PERCENT_MAX_VALUE
    )
  };
}

export function normalizeGradientStops(value: unknown): GradientStop[] {
  const fallbackStops = DEFAULT_GRADIENT_FILL.stops;
  const rawStops = Array.isArray(value) ? value : fallbackStops;
  const stops = rawStops
    .filter((stop): stop is Partial<GradientStop> =>
      Boolean(stop) && typeof stop === "object"
    )
    .map((stop, index) =>
      normalizeGradientStop(
        stop,
        fallbackStops[Math.min(index, fallbackStops.length - 1)]
      )
    )
    .sort((left, right) => left.position - right.position);

  if (stops.length >= MIN_GRADIENT_STOP_COUNT) {
    return stops;
  }

  return fallbackStops.map((stop) => ({ ...stop }));
}

export function normalizeGradientFill(
  value?: Partial<GradientFill> | null
): GradientFill {
  return {
    acceleration: clamp(
      finite(value?.acceleration, DEFAULT_GRADIENT_FILL.acceleration),
      -100,
      100
    ),
    centerX: clamp(
      finite(value?.centerX, DEFAULT_GRADIENT_FILL.centerX),
      -200,
      300
    ),
    centerY: clamp(
      finite(value?.centerY, DEFAULT_GRADIENT_FILL.centerY),
      -200,
      300
    ),
    name: typeof value?.name === "string"
      ? value.name
      : DEFAULT_GRADIENT_FILL.name,
    ...(typeof value?.presetId === "string"
      ? { presetId: value.presetId }
      : {}),
    rotation: finite(value?.rotation, DEFAULT_GRADIENT_FILL.rotation),
    scaleLocked: typeof value?.scaleLocked === "boolean"
      ? value.scaleLocked
      : DEFAULT_GRADIENT_FILL.scaleLocked,
    scaleX: clamp(
      finite(value?.scaleX, DEFAULT_GRADIENT_FILL.scaleX),
      1,
      1000
    ),
    scaleY: clamp(
      finite(value?.scaleY, DEFAULT_GRADIENT_FILL.scaleY),
      1,
      1000
    ),
    skew: clamp(finite(value?.skew, DEFAULT_GRADIENT_FILL.skew), -85, 85),
    smooth: typeof value?.smooth === "boolean"
      ? value.smooth
      : DEFAULT_GRADIENT_FILL.smooth,
    spread: isGradientSpread(value?.spread)
      ? value.spread
      : DEFAULT_GRADIENT_FILL.spread,
    steps: Math.round(
      clamp(
        finite(value?.steps, DEFAULT_GRADIENT_FILL.steps),
        MIN_GRADIENT_STEPS,
        MAX_GRADIENT_STEPS
      )
    ),
    stepsEnabled: typeof value?.stepsEnabled === "boolean"
      ? value.stepsEnabled
      : DEFAULT_GRADIENT_FILL.stepsEnabled,
    stops: normalizeGradientStops(value?.stops),
    type: isGradientType(value?.type)
      ? value.type
      : DEFAULT_GRADIENT_FILL.type
  };
}

function hexToRgb(color: string) {
  return {
    r: Number.parseInt(color.slice(1, 3), 16),
    g: Number.parseInt(color.slice(3, 5), 16),
    b: Number.parseInt(color.slice(5, 7), 16)
  };
}

function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function getAcceleratedGradientPosition(
  position: number,
  acceleration: number
) {
  const normalized = clamp(position, 0, 1);

  if (acceleration === 0) {
    return normalized;
  }

  const exponent = 2 ** (Math.abs(acceleration) / ACCELERATION_EXPONENT_DIVISOR);

  return acceleration > 0
    ? normalized ** exponent
    : 1 - (1 - normalized) ** exponent;
}

export function getGradientColorAtPosition(
  stopsValue: readonly GradientStop[],
  position: number,
  acceleration = 0
) {
  const stops = normalizeGradientStops(stopsValue);
  const target = getAcceleratedGradientPosition(position, acceleration) * 100;
  const rightIndex = stops.findIndex((stop) => stop.position >= target);

  if (rightIndex <= 0) {
    return { color: stops[0].color, opacity: stops[0].opacity };
  }

  if (rightIndex < 0) {
    const last = stops[stops.length - 1];
    return { color: last.color, opacity: last.opacity };
  }

  const left = stops[rightIndex - 1];
  const right = stops[rightIndex];
  const span = Math.max(0.0001, right.position - left.position);
  const ratio = clamp((target - left.position) / span, 0, 1);
  const leftColor = hexToRgb(left.color);
  const rightColor = hexToRgb(right.color);

  return {
    color: rgbToHex(
      leftColor.r + (rightColor.r - leftColor.r) * ratio,
      leftColor.g + (rightColor.g - leftColor.g) * ratio,
      leftColor.b + (rightColor.b - leftColor.b) * ratio
    ),
    opacity: left.opacity + (right.opacity - left.opacity) * ratio
  };
}

export function getRenderedGradientStops(value: GradientFill): GradientStop[] {
  const gradient = normalizeGradientFill(value);
  const needsSampling =
    gradient.stepsEnabled || gradient.acceleration !== 0 || !gradient.smooth;

  if (!needsSampling) {
    return gradient.stops;
  }

  const stepCount = gradient.stepsEnabled ? gradient.steps : 32;
  const samples = Array.from({ length: stepCount + 1 }, (_, index) => {
    const position = index / stepCount;
    const color = getGradientColorAtPosition(
      gradient.stops,
      position,
      gradient.acceleration
    );

    return {
      id: `sample-${index}`,
      ...color,
      position: position * 100
    };
  });

  if (gradient.smooth && !gradient.stepsEnabled) {
    return samples;
  }

  return samples.flatMap((stop, index) => {
    if (index === 0) {
      return [stop];
    }

    const previous = samples[index - 1];

    return [
      { ...previous, id: `${stop.id}-hold`, position: stop.position },
      stop
    ];
  });
}

export function addGradientStop(
  value: GradientFill,
  position: number
): { gradient: GradientFill; stopId: string } {
  const gradient = normalizeGradientFill(value);
  const normalizedPosition = clamp(position, 0, 100);
  const sampled = getGradientColorAtPosition(
    gradient.stops,
    normalizedPosition / 100,
    gradient.acceleration
  );
  const stopId = createGradientStopId();

  return {
    gradient: {
      ...gradient,
      stops: [
        ...gradient.stops,
        { id: stopId, ...sampled, position: normalizedPosition }
      ].sort((left, right) => left.position - right.position),
      presetId: undefined
    },
    stopId
  };
}

export function addGradientStopToFirstSegment(value: GradientFill) {
  const gradient = normalizeGradientFill(value);
  const [first, second] = gradient.stops;

  return addGradientStop(
    gradient,
    first.position + (second.position - first.position) / 2
  );
}

export function updateGradientStop(
  value: GradientFill,
  stopId: string,
  patch: Partial<Omit<GradientStop, "id">>
) {
  const gradient = normalizeGradientFill(value);

  return {
    ...gradient,
    presetId: undefined,
    stops: gradient.stops
      .map((stop) =>
        stop.id === stopId
          ? normalizeGradientStop({ ...stop, ...patch }, stop)
          : stop
      )
      .sort((left, right) => left.position - right.position)
  };
}

export function removeGradientStop(value: GradientFill, stopId: string) {
  const gradient = normalizeGradientFill(value);

  if (gradient.stops.length <= MIN_GRADIENT_STOP_COUNT) {
    return gradient;
  }

  return {
    ...gradient,
    presetId: undefined,
    stops: gradient.stops.filter((stop) => stop.id !== stopId)
  };
}

export function reverseGradientStops(value: GradientFill) {
  const gradient = normalizeGradientFill(value);

  return {
    ...gradient,
    presetId: undefined,
    stops: gradient.stops
      .map((stop) => ({ ...stop, position: 100 - stop.position }))
      .sort((left, right) => left.position - right.position)
  };
}

export function getDefaultGradientFill(type: GradientType): GradientFill {
  return normalizeGradientFill({
    ...DEFAULT_GRADIENT_FILL,
    name: "Default",
    presetId: undefined,
    type
  });
}

export function getGradientTransformElement(
  value: GradientFill
): KizkattElement {
  const gradient = normalizeGradientFill(value);

  return {
    angle: gradient.rotation * RADIANS_PER_DEGREE,
    backgroundColor: "transparent",
    height: gradient.scaleY,
    id: GRADIENT_TRANSFORM_ELEMENT_ID,
    opacity: 100,
    skewX: gradient.skew * RADIANS_PER_DEGREE,
    skewY: 0,
    strokeColor: "transparent",
    strokeStyle: "solid",
    strokeWidth: 0,
    type: "rectangle",
    width: gradient.scaleX,
    x: gradient.centerX - gradient.scaleX / 2,
    y: gradient.centerY - gradient.scaleY / 2
  };
}

export function getGradientFillFromTransformElement(
  value: GradientFill,
  element: KizkattElement
): GradientFill {
  return normalizeGradientFill({
    ...value,
    centerX: element.x + element.width / 2,
    centerY: element.y + element.height / 2,
    presetId: undefined,
    rotation: element.angle * DEGREES_PER_RADIAN,
    scaleX: element.width,
    scaleY: element.height,
    skew: (element.skewX ?? 0) * DEGREES_PER_RADIAN
  });
}

export function getGradientStopPoint(
  value: GradientFill,
  position: number
): Point {
  const gradient = normalizeGradientFill(value);
  const element = getGradientTransformElement(gradient);
  const normalizedPosition = clamp(position, 0, 100) / 100;
  const centerX = gradient.centerX;
  const centerY = gradient.centerY;
  const radiusX = gradient.scaleX / 2;
  const radiusY = gradient.scaleY / 2;
  let localPoint: Point;

  if (gradient.type === "linear") {
    localPoint = {
      x: element.x + element.width * normalizedPosition,
      y: centerY
    };
  } else if (gradient.type === "conic") {
    const angle = normalizedPosition * FULL_ROTATION_RADIANS - Math.PI / 2;
    localPoint = {
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY
    };
  } else {
    localPoint = {
      x: centerX + radiusX * normalizedPosition,
      y: centerY
    };
  }

  return transformElementPoint(element, localPoint);
}

export function getGradientStopPositionAtPoint(
  value: GradientFill,
  point: Point
) {
  const gradient = normalizeGradientFill(value);
  const element = getGradientTransformElement(gradient);
  const local = getElementLocalPoint(element, point);
  const radiusX = Math.max(0.5, element.width / 2);
  const radiusY = Math.max(0.5, element.height / 2);

  if (gradient.type === "linear") {
    return clamp(((local.x - element.x) / element.width) * 100, 0, 100);
  }

  if (gradient.type === "conic") {
    const normalizedX = (local.x - gradient.centerX) / radiusX;
    const normalizedY = (local.y - gradient.centerY) / radiusY;
    const angle = Math.atan2(normalizedY, normalizedX) + Math.PI / 2;
    return (
      ((angle % FULL_ROTATION_RADIANS) + FULL_ROTATION_RADIANS) %
      FULL_ROTATION_RADIANS
    ) / FULL_ROTATION_RADIANS * 100;
  }

  return clamp(
    ((local.x - gradient.centerX) / radiusX) * 100,
    0,
    100
  );
}
