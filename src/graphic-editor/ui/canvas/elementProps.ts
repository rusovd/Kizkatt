import { getElementCenter } from "../../geometry";
import type { KizkattElement } from "../../model/types";

function formatDashValue(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}

function getStrokeDasharray(element: KizkattElement) {
  if (element.strokeStyle === "solid") {
    return undefined;
  }

  const strokeWidth = Math.max(1, element.strokeWidth);

  if (element.strokeStyle === "dashed") {
    const dash = Math.max(10, strokeWidth * 1.45);
    const gap = Math.max(8, strokeWidth * 1.6);

    return `${formatDashValue(dash)} ${formatDashValue(gap)}`;
  }

  const dot = Math.max(2, strokeWidth * 0.12);
  const gap = Math.max(8, strokeWidth * 1.8);

  return `${formatDashValue(dot)} ${formatDashValue(gap)}`;
}

export function getElementTransform(element: KizkattElement) {
  const center = getElementCenter(element);

  return `rotate(${(element.angle * 180) / Math.PI} ${center.x} ${center.y})`;
}

export function getElementShapeProps(element: KizkattElement) {
  const strokeLinecap: "butt" | "round" =
    (element.sloppiness ?? "artist") === "architect" ? "butt" : "round";

  return {
    stroke: element.strokeColor,
    strokeWidth: element.strokeWidth,
    strokeDasharray: getStrokeDasharray(element),
    opacity: element.opacity / 100,
    strokeLinecap,
    strokeLinejoin: "round" as const,
    vectorEffect: "non-scaling-stroke" as const
  };
}

export function getFreehandPath(element: KizkattElement) {
  return (element.points ?? [])
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";

      return `${command} ${element.x + point.x} ${element.y + point.y}`;
    })
    .join(" ");
}
