import type { ReactNode } from "react";

import type { KizkattElement } from "../../model/types";
import { getElementTransform } from "./elementProps";

export function ElementGroup({
  children,
  element
}: {
  children: ReactNode;
  element: KizkattElement;
}) {
  return (
    <g transform={getElementTransform(element)} data-element-id={element.id}>
      {children}
    </g>
  );
}
