import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SceneElement } from "../../../packages/kizkatt-graphic-engine/src/editor/SceneElement";
import type {
  KizkattElement,
  KizkattRenderElementOptions
} from "kizkatt-graphic-engine";

const rectangle: KizkattElement = {
  angle: 0,
  backgroundColor: "#ffffff",
  height: 80,
  id: "memoized-rectangle",
  opacity: 100,
  strokeColor: "#000000",
  strokeStyle: "solid",
  strokeWidth: 2,
  type: "rectangle",
  width: 120,
  x: 10,
  y: 20
};

describe("SceneElement", () => {
  it("does not render an unchanged scene element again", () => {
    const renderElement = vi.fn((element: KizkattElement) => (
      <svg data-element-id={element.id} />
    ));
    const options: KizkattRenderElementOptions = {
      linearEndpointMode: "resize",
      selectionTransformCenter: { x: 30, y: 40 },
      showRotateHandle: true
    };
    const view = render(
      <SceneElement
        element={rectangle}
        options={options}
        renderElement={renderElement}
        selected={false}
      />
    );

    view.rerender(
      <SceneElement
        element={rectangle}
        options={{
          ...options,
          selectionTransformCenter: { x: 30, y: 40 }
        }}
        renderElement={renderElement}
        selected={false}
      />
    );

    expect(renderElement).toHaveBeenCalledTimes(1);

    view.rerender(
      <SceneElement
        element={{ ...rectangle, x: 15 }}
        options={options}
        renderElement={renderElement}
        selected={false}
      />
    );

    expect(renderElement).toHaveBeenCalledTimes(2);
  });
});
