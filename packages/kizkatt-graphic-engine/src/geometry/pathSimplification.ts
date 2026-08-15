import type { Point } from "../model/types";
import { distanceSquaredToSegment } from "./primitives";

export function simplifyPolyline(points: Point[], tolerance: number) {
  if (points.length <= 2 || tolerance <= 0) {
    return points;
  }

  const toleranceSquared = tolerance * tolerance;
  const retained = new Uint8Array(points.length);
  const ranges: Array<[number, number]> = [[0, points.length - 1]];
  retained[0] = 1;
  retained[points.length - 1] = 1;

  while (ranges.length > 0) {
    const [startIndex, endIndex] = ranges.pop() as [number, number];
    const start = points[startIndex];
    const end = points[endIndex];
    let furthestIndex = -1;
    let furthestDistanceSquared = toleranceSquared;

    for (let index = startIndex + 1; index < endIndex; index += 1) {
      const distanceSquared = distanceSquaredToSegment(
        points[index],
        start,
        end
      );

      if (distanceSquared > furthestDistanceSquared) {
        furthestDistanceSquared = distanceSquared;
        furthestIndex = index;
      }
    }

    if (furthestIndex < 0) {
      continue;
    }

    retained[furthestIndex] = 1;
    ranges.push([startIndex, furthestIndex], [furthestIndex, endIndex]);
  }

  return points.filter((_, index) => retained[index] === 1);
}
