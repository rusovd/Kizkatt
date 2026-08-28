import type { ReactNode } from "react";

import { getElementDisplayName } from "kizkatt-graphic-engine";
import type { KizkattElement } from "../../model/types";
import { getElementTransform } from "./elementProps";

export function ElementGroup({
  children,
  element
}: {
  children: ReactNode;
  element: KizkattElement;
}) {
  const name = getElementDisplayName(element);
  const metadata = JSON.stringify({
    groupId: element.groupId,
    groupName: element.groupName,
    id: element.id,
    imageBorderEnabled: element.imageBorderEnabled,
    arrowheadScale: element.arrowheadScale,
    backgroundColor: element.backgroundColor,
    bitmapTexture: element.bitmapTexture,
    calligraphy: element.calligraphy,
    calligraphyStretch: element.calligraphyStretch,
    endArrowhead: element.endArrowhead,
    flipX: element.flipX,
    flipY: element.flipY,
    fillStyle: element.fillStyle,
    fillWeight: element.fillWeight,
    name,
    scaleStrokeWithObject: element.scaleStrokeWithObject,
    skewX: element.skewX ?? 0,
    skewY: element.skewY ?? 0,
    startArrowhead: element.startArrowhead,
    strokeBehindFill: element.strokeBehindFill,
    strokeLineCount: element.strokeLineCount,
    type: element.type
  });

  return (
    <g
      transform={getElementTransform(element)}
      data-element-id={element.id}
      data-element-name={name}
      data-element-type={element.type}
      data-kizkatt-arrowhead-scale={element.arrowheadScale}
      data-kizkatt-calligraphy={element.calligraphy ? "true" : "false"}
      data-kizkatt-calligraphy-stretch={element.calligraphyStretch}
      data-kizkatt-end-arrowhead={element.endArrowhead}
      data-kizkatt-flip-x={element.flipX ? "true" : undefined}
      data-kizkatt-flip-y={element.flipY ? "true" : undefined}
      data-kizkatt-scale-stroke-with-object={
        element.scaleStrokeWithObject ? "true" : "false"
      }
      data-kizkatt-start-arrowhead={element.startArrowhead}
      data-kizkatt-stroke-behind-fill={
        element.strokeBehindFill ? "true" : "false"
      }
      data-kizkatt-stroke-line-count={element.strokeLineCount}
      data-kizkatt-stroke-width={element.strokeWidth}
      data-image-border-enabled={
        element.imageBorderEnabled ? "true" : undefined
      }
      data-group-id={element.groupId}
      data-group-name={element.groupName}
    >
      <metadata>{metadata}</metadata>
      {children}
    </g>
  );
}
