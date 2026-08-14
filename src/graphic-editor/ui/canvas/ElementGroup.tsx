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
    name,
    skewX: element.skewX ?? 0,
    skewY: element.skewY ?? 0,
    type: element.type
  });

  return (
    <g
      transform={getElementTransform(element)}
      data-element-id={element.id}
      data-element-name={name}
      data-element-type={element.type}
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
