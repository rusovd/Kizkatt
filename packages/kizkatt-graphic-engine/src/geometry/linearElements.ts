import type { KizkattElement, Point } from "../model/types";
import { getElementEnd } from "./primitives";

export function getElementBends(element: KizkattElement) {
  return element.bends ?? (element.curve ? [element.curve] : []);
}

export function getLinearElementPoints(
  element: KizkattElement,
  bends = getElementBends(element)
) {
  return [
    { x: element.x, y: element.y },
    ...bends.map((point) => ({
      x: element.x + point.x,
      y: element.y + point.y
    })),
    getElementEnd(element)
  ];
}

export function getLinearElementPath(points: Point[]) {
  if (points.length === 0) {
    return "";
  }

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  const commands = [`M ${points[0].x} ${points[0].y}`];

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)];
    const current = points[index];
    const next = points[index + 1];
    const nextNext = points[Math.min(points.length - 1, index + 2)];
    const cp1 = {
      x: current.x + (next.x - previous.x) / 6,
      y: current.y + (next.y - previous.y) / 6
    };
    const cp2 = {
      x: next.x - (nextNext.x - current.x) / 6,
      y: next.y - (nextNext.y - current.y) / 6
    };

    commands.push(`C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${next.x} ${next.y}`);
  }

  return commands.join(" ");
}
