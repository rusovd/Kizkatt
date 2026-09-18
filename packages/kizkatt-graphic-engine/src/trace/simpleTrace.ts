import type { KizkattElement } from "../model/types";
import { withUpdatedObjectBase } from "../model/element";
import { TRANSPARENT_COLOR } from "../config/constants";

const BYTE_MAX = 255;
const EMPTY_LABEL = 255;
const HISTOGRAM_CHANNEL_BITS = 5;
const HISTOGRAM_CHANNEL_SIZE = 1 << HISTOGRAM_CHANNEL_BITS;
const HISTOGRAM_CHANNEL_SHIFT = 8 - HISTOGRAM_CHANNEL_BITS;
const K_MEANS_ITERATIONS = 6;
const MIN_LOOP_POINTS = 4;

export type SimpleTraceImagePreset =
  | "lineArt"
  | "logo"
  | "detailedLogo"
  | "clipart"
  | "lowQuality"
  | "highQuality";

export type SimpleTraceBackgroundRemoval = "none" | "automatic" | "color";

export type SimpleTraceSettings = {
  backgroundColor: string;
  backgroundRemoval: SimpleTraceBackgroundRemoval;
  backgroundTolerance: number;
  colorCount: number;
  cornerSmoothing: number;
  detail: number;
  groupByColor: boolean;
  imagePreset: SimpleTraceImagePreset;
  mergeAdjacent: boolean;
  removeOverlap: boolean;
  smoothing: number;
};

export type SimpleTraceRaster = {
  data: Uint8ClampedArray;
  height: number;
  width: number;
};

export type SimpleTraceResult = {
  colorCount: number;
  height: number;
  nodeCount: number;
  pathCount: number;
  svgContent: string;
  width: number;
};

export const DEFAULT_SIMPLE_TRACE_SETTINGS: SimpleTraceSettings = {
  backgroundColor: "#ffffff",
  backgroundRemoval: "automatic",
  backgroundTolerance: 28,
  colorCount: 8,
  cornerSmoothing: 18,
  detail: 62,
  groupByColor: true,
  imagePreset: "lowQuality",
  mergeAdjacent: true,
  removeOverlap: true,
  smoothing: 22
};

export const SIMPLE_TRACE_PRESET_SETTINGS: Record<
  SimpleTraceImagePreset,
  Pick<
    SimpleTraceSettings,
    "colorCount" | "cornerSmoothing" | "detail" | "smoothing"
  >
> = {
  lineArt: { colorCount: 2, cornerSmoothing: 8, detail: 82, smoothing: 8 },
  logo: { colorCount: 5, cornerSmoothing: 14, detail: 74, smoothing: 14 },
  detailedLogo: {
    colorCount: 10,
    cornerSmoothing: 10,
    detail: 82,
    smoothing: 10
  },
  clipart: { colorCount: 8, cornerSmoothing: 20, detail: 68, smoothing: 18 },
  lowQuality: {
    colorCount: 8,
    cornerSmoothing: 18,
    detail: 62,
    smoothing: 22
  },
  highQuality: {
    colorCount: 14,
    cornerSmoothing: 12,
    detail: 88,
    smoothing: 10
  }
};

type Rgb = { b: number; g: number; r: number };
type WeightedColor = Rgb & { count: number };
type TracePoint = { x: number; y: number };
type DirectedEdge = {
  direction: number;
  end: number;
  start: number;
  used: boolean;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeSettings(
  settings: Partial<SimpleTraceSettings>
): SimpleTraceSettings {
  return {
    ...DEFAULT_SIMPLE_TRACE_SETTINGS,
    ...settings,
    backgroundTolerance: clamp(
      Math.round(
        settings.backgroundTolerance ??
          DEFAULT_SIMPLE_TRACE_SETTINGS.backgroundTolerance
      ),
      0,
      BYTE_MAX
    ),
    colorCount: clamp(
      Math.round(settings.colorCount ?? DEFAULT_SIMPLE_TRACE_SETTINGS.colorCount),
      2,
      24
    ),
    cornerSmoothing: clamp(
      settings.cornerSmoothing ??
        DEFAULT_SIMPLE_TRACE_SETTINGS.cornerSmoothing,
      0,
      100
    ),
    detail: clamp(settings.detail ?? DEFAULT_SIMPLE_TRACE_SETTINGS.detail, 0, 100),
    smoothing: clamp(
      settings.smoothing ?? DEFAULT_SIMPLE_TRACE_SETTINGS.smoothing,
      0,
      100
    )
  };
}

function parseHexColor(value: string): Rgb {
  const normalized = value.trim().replace(/^#/, "");
  const expanded = normalized.length === 3
    ? normalized.split("").map((part) => `${part}${part}`).join("")
    : normalized;
  const parsed = Number.parseInt(expanded, 16);

  if (!Number.isFinite(parsed) || expanded.length !== 6) {
    return { b: BYTE_MAX, g: BYTE_MAX, r: BYTE_MAX };
  }

  return {
    b: parsed & BYTE_MAX,
    g: (parsed >> 8) & BYTE_MAX,
    r: (parsed >> 16) & BYTE_MAX
  };
}

function toHexColor(color: Rgb) {
  return `#${[color.r, color.g, color.b]
    .map((channel) => clamp(Math.round(channel), 0, BYTE_MAX).toString(16).padStart(2, "0"))
    .join("")}`;
}

function colorDistanceSquared(first: Rgb, second: Rgb) {
  const red = first.r - second.r;
  const green = first.g - second.g;
  const blue = first.b - second.b;

  return red * red + green * green + blue * blue;
}

function histogramKey(red: number, green: number, blue: number) {
  return (
    (red >> HISTOGRAM_CHANNEL_SHIFT) *
      HISTOGRAM_CHANNEL_SIZE *
      HISTOGRAM_CHANNEL_SIZE +
    (green >> HISTOGRAM_CHANNEL_SHIFT) * HISTOGRAM_CHANNEL_SIZE +
    (blue >> HISTOGRAM_CHANNEL_SHIFT)
  );
}

function buildHistogram(raster: SimpleTraceRaster) {
  const counts = new Uint32Array(
    HISTOGRAM_CHANNEL_SIZE *
      HISTOGRAM_CHANNEL_SIZE *
      HISTOGRAM_CHANNEL_SIZE
  );
  const { data } = raster;

  for (let offset = 0; offset < data.length; offset += 4) {
    if (data[offset + 3] === 0) {
      continue;
    }

    counts[histogramKey(data[offset], data[offset + 1], data[offset + 2])] += 1;
  }

  const colors: WeightedColor[] = [];
  const channelScale = BYTE_MAX / (HISTOGRAM_CHANNEL_SIZE - 1);

  for (let key = 0; key < counts.length; key += 1) {
    const count = counts[key];

    if (count === 0) {
      continue;
    }

    const red = Math.floor(
      key / (HISTOGRAM_CHANNEL_SIZE * HISTOGRAM_CHANNEL_SIZE)
    );
    const remainder = key %
      (HISTOGRAM_CHANNEL_SIZE * HISTOGRAM_CHANNEL_SIZE);
    const green = Math.floor(remainder / HISTOGRAM_CHANNEL_SIZE);
    const blue = remainder % HISTOGRAM_CHANNEL_SIZE;
    colors.push({
      b: blue * channelScale,
      count,
      g: green * channelScale,
      r: red * channelScale
    });
  }

  return colors;
}

function createPalette(histogram: WeightedColor[], requestedCount: number) {
  if (histogram.length === 0) {
    return [{ b: 0, g: 0, r: 0 }];
  }

  const palette: Rgb[] = [];
  const mostFrequent = histogram.reduce((best, color) =>
    color.count > best.count ? color : best
  );
  palette.push({ b: mostFrequent.b, g: mostFrequent.g, r: mostFrequent.r });

  while (palette.length < Math.min(requestedCount, histogram.length)) {
    let bestScore = -1;
    let bestColor = histogram[0];

    for (const color of histogram) {
      const nearestDistance = palette.reduce(
        (distance, center) =>
          Math.min(distance, colorDistanceSquared(color, center)),
        Number.POSITIVE_INFINITY
      );
      const score = nearestDistance * Math.sqrt(color.count);

      if (score > bestScore) {
        bestScore = score;
        bestColor = color;
      }
    }

    palette.push({ b: bestColor.b, g: bestColor.g, r: bestColor.r });
  }

  for (let iteration = 0; iteration < K_MEANS_ITERATIONS; iteration += 1) {
    const sums = palette.map(() => ({ b: 0, count: 0, g: 0, r: 0 }));

    for (const color of histogram) {
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (let index = 0; index < palette.length; index += 1) {
        const distance = colorDistanceSquared(color, palette[index]);

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      }

      const sum = sums[nearestIndex];
      sum.r += color.r * color.count;
      sum.g += color.g * color.count;
      sum.b += color.b * color.count;
      sum.count += color.count;
    }

    for (let index = 0; index < palette.length; index += 1) {
      const sum = sums[index];

      if (sum.count > 0) {
        palette[index] = {
          b: sum.b / sum.count,
          g: sum.g / sum.count,
          r: sum.r / sum.count
        };
      }
    }
  }

  return palette;
}

function chooseNearestColor(color: Rgb, palette: Rgb[]) {
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (let index = 0; index < palette.length; index += 1) {
    const distance = colorDistanceSquared(color, palette[index]);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }

  return nearestIndex;
}

function labelRaster(
  raster: SimpleTraceRaster,
  palette: Rgb[],
  settings: SimpleTraceSettings
) {
  const labels = new Uint8Array(raster.width * raster.height);
  const counts = new Uint32Array(palette.length);
  const borderCounts = new Uint32Array(palette.length);
  const backgroundColor = parseHexColor(settings.backgroundColor);
  const toleranceSquared = settings.backgroundTolerance ** 2 * 3;

  for (let pixelIndex = 0; pixelIndex < labels.length; pixelIndex += 1) {
    const offset = pixelIndex * 4;
    const alpha = raster.data[offset + 3];

    if (alpha === 0) {
      labels[pixelIndex] = EMPTY_LABEL;
      continue;
    }

    const color = {
      b: raster.data[offset + 2],
      g: raster.data[offset + 1],
      r: raster.data[offset]
    };

    if (
      settings.backgroundRemoval === "color" &&
      colorDistanceSquared(color, backgroundColor) <= toleranceSquared
    ) {
      labels[pixelIndex] = EMPTY_LABEL;
      continue;
    }

    const label = chooseNearestColor(color, palette);
    labels[pixelIndex] = label;
    counts[label] += 1;
    const x = pixelIndex % raster.width;
    const y = Math.floor(pixelIndex / raster.width);

    if (x === 0 || y === 0 || x === raster.width - 1 || y === raster.height - 1) {
      borderCounts[label] += 1;
    }
  }

  if (settings.backgroundRemoval === "automatic") {
    let backgroundLabel = 0;

    for (let index = 1; index < counts.length; index += 1) {
      if (
        borderCounts[index] > borderCounts[backgroundLabel] ||
        (borderCounts[index] === borderCounts[backgroundLabel] &&
          counts[index] > counts[backgroundLabel])
      ) {
        backgroundLabel = index;
      }
    }

    for (let index = 0; index < labels.length; index += 1) {
      if (labels[index] === backgroundLabel) {
        labels[index] = EMPTY_LABEL;
      }
    }
  }

  return labels;
}

function vertexKey(x: number, y: number, stride: number) {
  return y * stride + x;
}

function createBoundaryEdges(
  labels: Uint8Array,
  width: number,
  height: number,
  label: number
) {
  const edges: DirectedEdge[] = [];
  const outgoing = new Map<number, number[]>();
  const stride = width + 1;
  const addEdge = (start: number, end: number, direction: number) => {
    const edgeIndex = edges.length;
    edges.push({ direction, end, start, used: false });
    const entries = outgoing.get(start);

    if (entries) {
      entries.push(edgeIndex);
    } else {
      outgoing.set(start, [edgeIndex]);
    }
  };
  const hasLabel = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && labels[y * width + x] === label;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!hasLabel(x, y)) {
        continue;
      }

      if (!hasLabel(x, y - 1)) {
        addEdge(vertexKey(x, y, stride), vertexKey(x + 1, y, stride), 0);
      }
      if (!hasLabel(x + 1, y)) {
        addEdge(
          vertexKey(x + 1, y, stride),
          vertexKey(x + 1, y + 1, stride),
          1
        );
      }
      if (!hasLabel(x, y + 1)) {
        addEdge(
          vertexKey(x + 1, y + 1, stride),
          vertexKey(x, y + 1, stride),
          2
        );
      }
      if (!hasLabel(x - 1, y)) {
        addEdge(vertexKey(x, y + 1, stride), vertexKey(x, y, stride), 3);
      }
    }
  }

  return { edges, outgoing, stride };
}

function selectContinuation(
  candidates: number[],
  edges: DirectedEdge[],
  previousDirection: number
) {
  const turnPriority = [1, 0, 3, 2];

  for (const turn of turnPriority) {
    const direction = (previousDirection + turn) % 4;
    const candidate = candidates.find(
      (edgeIndex) => !edges[edgeIndex].used && edges[edgeIndex].direction === direction
    );

    if (candidate !== undefined) {
      return candidate;
    }
  }

  return candidates.find((edgeIndex) => !edges[edgeIndex].used);
}

function traceBoundaryLoops(
  labels: Uint8Array,
  width: number,
  height: number,
  label: number
) {
  const { edges, outgoing, stride } = createBoundaryEdges(
    labels,
    width,
    height,
    label
  );
  const loops: TracePoint[][] = [];

  for (let startEdgeIndex = 0; startEdgeIndex < edges.length; startEdgeIndex += 1) {
    if (edges[startEdgeIndex].used) {
      continue;
    }

    const startKey = edges[startEdgeIndex].start;
    const points: TracePoint[] = [];
    let edgeIndex: number | undefined = startEdgeIndex;
    let guard = 0;

    while (edgeIndex !== undefined && guard <= edges.length) {
      const edge = edges[edgeIndex];

      if (edge.used) {
        break;
      }

      edge.used = true;
      points.push({ x: edge.start % stride, y: Math.floor(edge.start / stride) });

      if (edge.end === startKey) {
        break;
      }

      edgeIndex = selectContinuation(
        outgoing.get(edge.end) ?? [],
        edges,
        edge.direction
      );
      guard += 1;
    }

    if (points.length >= MIN_LOOP_POINTS) {
      loops.push(points);
    }
  }

  return loops;
}

function pointToSegmentDistance(
  point: TracePoint,
  start: TracePoint,
  end: TracePoint
) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;

  if (deltaX === 0 && deltaY === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const position = clamp(
    ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) /
      (deltaX * deltaX + deltaY * deltaY),
    0,
    1
  );

  return Math.hypot(
    point.x - (start.x + deltaX * position),
    point.y - (start.y + deltaY * position)
  );
}

function simplifyOpenPoints(points: TracePoint[], tolerance: number) {
  if (points.length <= 2) {
    return points;
  }

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, points.length - 1]];

  while (stack.length > 0) {
    const [startIndex, endIndex] = stack.pop()!;
    let farthestIndex = -1;
    let farthestDistance = tolerance;

    for (let index = startIndex + 1; index < endIndex; index += 1) {
      const distance = pointToSegmentDistance(
        points[index],
        points[startIndex],
        points[endIndex]
      );

      if (distance > farthestDistance) {
        farthestDistance = distance;
        farthestIndex = index;
      }
    }

    if (farthestIndex >= 0) {
      keep[farthestIndex] = 1;
      stack.push([startIndex, farthestIndex], [farthestIndex, endIndex]);
    }
  }

  return points.filter((_, index) => keep[index] === 1);
}

function simplifyClosedLoop(points: TracePoint[], tolerance: number) {
  if (points.length <= MIN_LOOP_POINTS) {
    return points;
  }

  let oppositeIndex = 1;
  let oppositeDistance = -1;

  for (let index = 1; index < points.length; index += 1) {
    const distance =
      (points[index].x - points[0].x) ** 2 +
      (points[index].y - points[0].y) ** 2;

    if (distance > oppositeDistance) {
      oppositeDistance = distance;
      oppositeIndex = index;
    }
  }

  const firstHalf = simplifyOpenPoints(
    points.slice(0, oppositeIndex + 1),
    tolerance
  );
  const secondHalf = simplifyOpenPoints(
    [...points.slice(oppositeIndex), points[0]],
    tolerance
  );

  return [...firstHalf.slice(0, -1), ...secondHalf.slice(0, -1)];
}

function polygonArea(points: TracePoint[]) {
  let area = 0;

  for (let index = 0; index < points.length; index += 1) {
    const next = points[(index + 1) % points.length];
    area += points[index].x * next.y - next.x * points[index].y;
  }

  return Math.abs(area / 2);
}

function formatNumber(value: number) {
  return Number(value.toFixed(2)).toString();
}

function createLoopPath(points: TracePoint[], cornerSmoothing: number) {
  if (points.length < 3) {
    return "";
  }

  if (cornerSmoothing <= 0) {
    return `M ${points.map((point) => `${formatNumber(point.x)} ${formatNumber(point.y)}`).join(" L ")} Z`;
  }

  const ratio = clamp(cornerSmoothing / 500, 0, 0.2);
  const entryPoints = points.map((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    return {
      x: point.x + (previous.x - point.x) * ratio,
      y: point.y + (previous.y - point.y) * ratio
    };
  });
  const commands = [`M ${formatNumber(entryPoints[0].x)} ${formatNumber(entryPoints[0].y)}`];

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const next = points[(index + 1) % points.length];
    const exit = {
      x: point.x + (next.x - point.x) * ratio,
      y: point.y + (next.y - point.y) * ratio
    };
    const nextEntry = entryPoints[(index + 1) % points.length];
    commands.push(
      `Q ${formatNumber(point.x)} ${formatNumber(point.y)} ${formatNumber(exit.x)} ${formatNumber(exit.y)}`,
      `L ${formatNumber(nextEntry.x)} ${formatNumber(nextEntry.y)}`
    );
  }

  commands.push("Z");
  return commands.join(" ");
}

export function traceSimpleBitmap(
  raster: SimpleTraceRaster,
  partialSettings: Partial<SimpleTraceSettings> = {}
): SimpleTraceResult {
  if (
    raster.width <= 0 ||
    raster.height <= 0 ||
    raster.data.length < raster.width * raster.height * 4
  ) {
    throw new Error("Simple trace requires valid RGBA raster data.");
  }

  const settings = normalizeSettings(partialSettings);
  const histogram = buildHistogram(raster);
  const palette = createPalette(histogram, settings.colorCount);
  const labels = labelRaster(raster, palette, settings);
  const simplificationTolerance =
    0.25 + ((100 - settings.detail) / 100) * 2.75 + (settings.smoothing / 100) * 1.5;
  const minimumArea = 1 + ((100 - settings.detail) / 100) * 10;
  const paths: Array<{ color: string; data: string; nodes: number; loops: number }> = [];

  for (let label = 0; label < palette.length; label += 1) {
    const loops = traceBoundaryLoops(labels, raster.width, raster.height, label)
      .filter((loop) => polygonArea(loop) >= minimumArea)
      .map((loop) => simplifyClosedLoop(loop, simplificationTolerance))
      .filter((loop) => loop.length >= 3);

    if (loops.length === 0) {
      continue;
    }

    if (settings.groupByColor) {
      paths.push({
        color: toHexColor(palette[label]),
        data: loops.map((loop) => createLoopPath(loop, settings.cornerSmoothing)).join(" "),
        loops: loops.length,
        nodes: loops.reduce((count, loop) => count + loop.length, 0)
      });
    } else {
      for (const loop of loops) {
        paths.push({
          color: toHexColor(palette[label]),
          data: createLoopPath(loop, settings.cornerSmoothing),
          loops: 1,
          nodes: loop.length
        });
      }
    }
  }

  return {
    colorCount: new Set(paths.map((path) => path.color)).size,
    height: raster.height,
    nodeCount: paths.reduce((count, path) => count + path.nodes, 0),
    pathCount: paths.reduce((count, path) => count + path.loops, 0),
    svgContent: paths
      .map(
        (path) =>
          `<path d="${path.data}" fill="${path.color}" fill-rule="evenodd" stroke="none"/>`
      )
      .join(""),
    width: raster.width
  };
}

export function createSimpleTraceElement({
  id,
  name,
  result,
  source
}: {
  id: string;
  name: string;
  result: SimpleTraceResult;
  source: KizkattElement;
}) {
  return withUpdatedObjectBase({
    ...source,
    base: undefined,
    backgroundColor: TRANSPARENT_COLOR,
    bitmapTexture: undefined,
    fillStyle: "solid",
    gradientFill: undefined,
    groupId: undefined,
    groupName: undefined,
    id,
    imageBorderEnabled: false,
    name,
    src: undefined,
    strokeWidth: 0,
    svgContent: result.svgContent,
    svgUseElementStyle: false,
    svgViewBox: `0 0 ${result.width} ${result.height}`,
    type: "image"
  });
}
