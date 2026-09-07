import { memo } from "react";
import type { ReactNode } from "react";

import type { KizkattElement, Point } from "kizkatt-graphic-engine";
import type {
  KizkattRenderElementOptions
} from "../../contracts/editorView";

type SceneElementProps = {
  element: KizkattElement;
  options: KizkattRenderElementOptions;
  renderElement: (
    element: KizkattElement,
    selected: boolean,
    options?: KizkattRenderElementOptions
  ) => ReactNode;
  selected: boolean;
};

function isSamePoint(
  first: Point | null | undefined,
  second: Point | null | undefined
) {
  return (
    first === second ||
    (Boolean(first) &&
      Boolean(second) &&
      first?.x === second?.x &&
      first?.y === second?.y)
  );
}

function isSameRenderOptions(
  first: KizkattRenderElementOptions,
  second: KizkattRenderElementOptions
) {
  return (
    first.linearEndpointMode === second.linearEndpointMode &&
    first.overlayVariant === second.overlayVariant &&
    first.selectedBendIndex === second.selectedBendIndex &&
    isSamePoint(
      first.selectionTransformCenter,
      second.selectionTransformCenter
    ) &&
    first.selectionTransformMode === second.selectionTransformMode &&
    first.showLinearBendHandles === second.showLinearBendHandles &&
    first.showRotateHoverIcon === second.showRotateHoverIcon &&
    first.showRotateHandle === second.showRotateHandle &&
    first.showSelectionBounds === second.showSelectionBounds &&
    first.wireframe === second.wireframe
  );
}

export const SceneElement = memo(
  function SceneElement({
    element,
    options,
    renderElement,
    selected
  }: SceneElementProps) {
    return <>{renderElement(element, selected, options)}</>;
  },
  (previous, next) =>
    previous.element === next.element &&
    previous.renderElement === next.renderElement &&
    previous.selected === next.selected &&
    isSameRenderOptions(previous.options, next.options)
);
