import { describe, it } from "vitest";
import { storeCanvasState } from "kizkatt-graphic-engine";
import {
  act,
  KizkattGraphicEditor,
  chooseGroupedTool,
  expect,
  findElementAtPoint,
  fireEvent,
  firePointerEvent,
  getCirclePoint,
  getResizeAnchorPoint,
  getResizeCursor,
  render,
  renderElement,
  reorderElementsByLayerAction,
  resizeElementFromHandle,
  screen,
  vi,
  type KizkattElement
} from "./testUtils";

function getTranslatePoint(element: Element | null) {
  const match = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(
    element?.getAttribute("transform") ?? ""
  );

  return {
    x: Number(match?.[1] ?? 0),
    y: Number(match?.[2] ?? 0)
  };
}

describe("KizkattGraphicEditor drawing and style panel", () => {
  it("creates a rectangle on the SVG canvas", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    expect(canvas.querySelector("[data-element-id]")).toBeInTheDocument();
  });

  it("names created elements and writes names into SVG metadata", () => {
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    firePointerEvent(canvas, "pointerdown", { clientX: 190, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 260, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    const elementGroups = canvas.querySelectorAll("[data-element-id]");

    expect(elementGroups[0]).toHaveAttribute(
      "data-element-name",
      "Rectangle 1"
    );
    expect(elementGroups[0].querySelector("metadata")?.textContent).toContain(
      '"name":"Rectangle 1"'
    );
    expect(elementGroups[1]).toHaveAttribute(
      "data-element-name",
      "Rectangle 2"
    );
  });

  it("does not create throwaway line elements from a click without dragging", () => {
    render(<KizkattGraphicEditor />);

    chooseGroupedTool("Arrow", "Line");

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointerup", { clientX: 40, clientY: 50 });

    expect(canvas.querySelector("[data-element-id]")).not.toBeInTheDocument();
  });

  it("drops quick tiny shape drags but keeps deliberate tiny held drags", () => {
    vi.useFakeTimers();

    try {
      render(<KizkattGraphicEditor />);

      const canvas = screen.getByRole("application", {
        name: "Drawing canvas"
      });

      fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
      firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
      firePointerEvent(canvas, "pointermove", { clientX: 43, clientY: 52 });
      firePointerEvent(canvas, "pointerup", { clientX: 43, clientY: 52 });

      expect(canvas.querySelector("[data-element-id]")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
      firePointerEvent(canvas, "pointerdown", { clientX: 60, clientY: 60 });
      act(() => {
        vi.advanceTimersByTime(160);
      });
      firePointerEvent(canvas, "pointermove", { clientX: 63, clientY: 62 });
      firePointerEvent(canvas, "pointerup", { clientX: 63, clientY: 62 });

      expect(canvas.querySelectorAll("[data-element-id]")).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns to select mode after drawing an element", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    expect(canvas).toHaveStyle({ cursor: "crosshair" });

    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    expect(screen.getByRole("button", { name: "Select" })).toHaveClass(
      "is-active"
    );
    expect(canvas).toHaveStyle({ cursor: "default" });
  });

  it("keeps the select tool active when a non-group element is clicked", () => {
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    firePointerEvent(canvas, "pointerdown", { clientX: 100, clientY: 50 });

    expect(screen.getByRole("button", { name: "Select" })).toHaveClass(
      "is-active"
    );
    expect(screen.getByRole("button", { name: "Rectangle" })).not.toHaveClass(
      "is-active"
    );
    expect(
      screen.getByRole("complementary", { name: "Element style" })
    ).toBeInTheDocument();
  });

  it("keeps the top rotate handle hidden by default", () => {
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });

    expect(canvas.querySelector(".kizkatt-rotate-handle")).not
      .toBeInTheDocument();

    firePointerEvent(canvas, "pointerup");

    expect(canvas.querySelector(".kizkatt-rotate-handle")).not
      .toBeInTheDocument();

    chooseGroupedTool("Arrow", "Line");
    firePointerEvent(canvas, "pointerdown", { clientX: 220, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 320, clientY: 120 });

    const rotateHandlesWhileDrawing = canvas.querySelectorAll(
      ".kizkatt-rotate-handle"
    );
    expect(rotateHandlesWhileDrawing).toHaveLength(0);

    firePointerEvent(canvas, "pointerup");

    expect(canvas.querySelector(".kizkatt-rotate-handle")).not
      .toBeInTheDocument();
  });

  it("shows corner rotate handles in the second-click transform mode", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    firePointerEvent(canvas, "pointerdown", { clientX: 80, clientY: 80 });
    firePointerEvent(canvas, "pointerup");

    const cornerRotateHandle = canvas.querySelector("[data-handle='rotate']");
    expect(cornerRotateHandle).toBeInTheDocument();
    const initialPoint = getCirclePoint(cornerRotateHandle);

    firePointerEvent(cornerRotateHandle as Element, "pointerdown", {
      clientX: initialPoint.x,
      clientY: initialPoint.y
    });
    expect(canvas.querySelector("[data-resize-handle]")).not
      .toBeInTheDocument();
    expect(canvas.querySelector(".kizkatt-transform-preview"))
      .toBeInTheDocument();
    firePointerEvent(canvas, "pointermove", {
      clientX: initialPoint.x + 48,
      clientY: initialPoint.y
    });
    expect(canvas.querySelector(".kizkatt-transform-preview")).toBeInTheDocument();
    firePointerEvent(canvas, "pointerup");

    const elementGroup = canvas.querySelector("[data-element-id]");
    expect(elementGroup?.getAttribute("transform")).not.toContain("rotate(0");
  });

  it("shows resize handles on every selected rectangle corner and edge", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    const resizeHandles = Array.from(
      canvas.querySelectorAll("[data-resize-handle]")
    ).map((handle) => handle.getAttribute("data-resize-handle"));

    expect(resizeHandles).toEqual(["nw", "n", "ne", "e", "se", "s", "sw", "w"]);
  });

  it("recomputes the selection center and keeps resize handles screen-aligned after resize", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    expect(
      getTranslatePoint(
        canvas.querySelector(".kizkatt-transform-center-marker--cross")
      )
    ).toEqual({ x: 100, y: 85 });

    const resizeHandle = canvas.querySelector("[data-resize-handle='se']");
    expect(resizeHandle).toBeInTheDocument();
    expect(resizeHandle?.closest(".kizkatt-selection-overlay--world"))
      .toBeInTheDocument();
    expect(resizeHandle).not.toHaveAttribute("transform");

    firePointerEvent(resizeHandle as Element, "pointerdown", {
      clientX: 160,
      clientY: 120
    });
    firePointerEvent(canvas, "pointermove", { clientX: 220, clientY: 180 });
    firePointerEvent(canvas, "pointerup");

    expect(
      getTranslatePoint(
        canvas.querySelector(".kizkatt-transform-center-marker--cross")
      )
    ).toEqual({ x: 130, y: 115 });
  });

  it("keeps active transform cursors after the pointer leaves a handle", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    const resizeHandle = canvas.querySelector("[data-resize-handle='se']");
    expect(resizeHandle).toBeInTheDocument();

    firePointerEvent(resizeHandle as Element, "pointerdown", {
      clientX: 160,
      clientY: 120
    });
    firePointerEvent(canvas, "pointermove", { clientX: 220, clientY: 160 });

    expect(canvas).toHaveStyle({ cursor: getResizeCursor(0, "se") });

    firePointerEvent(canvas, "pointerup");
    expect(canvas).toHaveStyle({ cursor: "default" });

    firePointerEvent(canvas, "pointerdown", { clientX: 100, clientY: 80 });
    firePointerEvent(canvas, "pointerup");

    const rotateHandle = canvas.querySelector("[data-handle='rotate']");
    expect(rotateHandle).toBeInTheDocument();
    const rotatePoint = getCirclePoint(rotateHandle);

    firePointerEvent(rotateHandle as Element, "pointerdown", {
      clientX: rotatePoint.x,
      clientY: rotatePoint.y
    });
    firePointerEvent(canvas, "pointermove", {
      clientX: rotatePoint.x + 48,
      clientY: rotatePoint.y
    });

    expect(canvas).toHaveStyle({ cursor: "grabbing" });

    firePointerEvent(canvas, "pointerup");
    expect(canvas).toHaveStyle({ cursor: "default" });
  });

  it("resizes a single rotated rectangle along its local axes", () => {
    const angle = Math.PI / 4;
    const element: KizkattElement = {
      angle,
      backgroundColor: "#0b3556",
      height: 70,
      id: "rotated-rectangle",
      opacity: 100,
      strokeColor: "#2f9e44",
      strokeStyle: "solid",
      strokeWidth: 10,
      type: "rectangle",
      width: 120,
      x: 100,
      y: 100
    };
    const xAxis = {
      x: Math.cos(angle),
      y: Math.sin(angle)
    };
    const yAxis = {
      x: -Math.sin(angle),
      y: Math.cos(angle)
    };
    const startPoint = getResizeAnchorPoint(element, "sw");
    const nextPoint = {
      x: startPoint.x + 6 * xAxis.x - 6 * yAxis.x,
      y: startPoint.y + 6 * xAxis.y - 6 * yAxis.y
    };

    storeCanvasState({
      elements: [element],
      selectedIds: [element.id]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    const resizeHandle = canvas.querySelector("[data-resize-handle='ne']");
    expect(resizeHandle).toBeInTheDocument();

    firePointerEvent(resizeHandle as Element, "pointerdown", {
      clientX: startPoint.x,
      clientY: startPoint.y
    });
    firePointerEvent(canvas, "pointermove", {
      clientX: nextPoint.x,
      clientY: nextPoint.y
    });
    firePointerEvent(canvas, "pointerup");

    const elementRect = canvas.querySelector("[data-element-id] rect");

    expect(Number(elementRect?.getAttribute("width"))).toBeCloseTo(126);
    expect(Number(elementRect?.getAttribute("height"))).toBeCloseTo(76);
  });

  it("opens color shades and applies transparent and hex colors", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    const elementRect = canvas.querySelector("[data-element-id] rect");

    expect(elementRect).toHaveAttribute("fill", "#653b00");
    expect(elementRect).toHaveAttribute("stroke", "#f08c00");
    expect(
      screen.getByRole("button", { name: "Background custom #653b00" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Stroke custom #f08c00" })
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Background custom #653b00" })
    );
    expect(screen.getByRole("dialog", { name: "Background colors" }))
      .toBeInTheDocument();
    expect(
      screen.getByLabelText("Background native color picker")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "backgroundColor palette #653b00" })
    ).toHaveClass("is-active");
    expect(
      screen.getByRole("button", { name: "backgroundColor shade #653b00" })
    ).toHaveClass("is-active");
    expect(
      screen.getAllByRole("button", { name: /backgroundColor shade/ })[7]
    ).toHaveAttribute("aria-label", "backgroundColor shade #653b00");

    fireEvent.click(screen.getByRole("button", { name: "Stroke #1971c2" }));
    expect(elementRect).toHaveAttribute("stroke", "#1971c2");
    expect(screen.queryByRole("dialog", { name: "Stroke colors" })).not
      .toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Stroke custom #1971c2" })
    );
    expect(elementRect).toHaveAttribute("stroke", "#1971c2");
    expect(screen.getByRole("dialog", { name: "Stroke colors" }))
      .toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "strokeColor eyedropper" })
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("strokeColor native color picker")).not
      .toBeInTheDocument();
    expect(
      screen.getByLabelText("Stroke native color picker")
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /strokeColor shade/ })
    ).toHaveLength(15);

    fireEvent.click(
      screen.getByRole("button", { name: "strokeColor palette #1971c2" })
    );
    expect(elementRect).toHaveAttribute("stroke", "#1971c2");
    expect(
      screen.getAllByRole("button", { name: /strokeColor shade/ })
    ).toHaveLength(15);
    expect(
      screen.getByRole("button", { name: "strokeColor shade #051423" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "strokeColor shade #dae8f5" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "strokeColor shade #6741d9" })
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "strokeColor shade #051423" })
    );
    expect(elementRect).toHaveAttribute("stroke", "#051423");
    expect(
      screen.getByRole("button", { name: "strokeColor shade #dae8f5" })
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "strokeColor palette #6741d9" })
    );
    expect(elementRect).toHaveAttribute("stroke", "#6741d9");

    const hexInput = screen.getByRole("textbox", { name: "Hex color" });

    fireEvent.change(hexInput, {
      target: { value: "8d" }
    });
    expect(hexInput).toHaveValue("8d");
    expect(elementRect).toHaveAttribute("stroke", "#8d8d8d");
    expect(
      screen.getAllByRole("button", { name: /strokeColor shade/ })[7]
    ).toHaveAttribute("aria-label", "strokeColor shade #8d8d8d");

    fireEvent.change(hexInput, {
      target: { value: "123abc" }
    });
    expect(elementRect).toHaveAttribute("stroke", "#123abc");
    expect(hexInput).toHaveValue("123abc");
    expect(
      screen.getByRole("button", { name: "Stroke #123abc" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "strokeColor shade #123abc" })
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /strokeColor shade/ })[7]
    ).toHaveAttribute("aria-label", "strokeColor shade #123abc");
    screen
      .getAllByRole("button", { name: /strokeColor palette/ })
      .forEach((paletteButton) => {
        expect(paletteButton).not.toHaveClass("is-active");
      });
    expect(
      screen.getByRole("button", { name: "strokeColor shade #030a22" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "strokeColor shade #d9dff4" })
    ).toBeInTheDocument();
    expect(screen.queryByText("User Colors")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Stroke native color picker"), {
      target: { value: "#abcdef" }
    });
    expect(elementRect).toHaveAttribute("stroke", "#abcdef");

    fireEvent.click(
      screen.getByRole("button", { name: "Background custom #653b00" })
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "backgroundColor palette transparent"
      })
    );
    expect(elementRect).toHaveAttribute("fill", "transparent");
    expect(screen.queryByRole("dialog", { name: "Stroke colors" })).not
      .toBeInTheDocument();
  });

  it("disables fill colors for selected arrows", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "#653b00",
          height: 70,
          id: "arrow",
          opacity: 100,
          strokeColor: "#f08c00",
          strokeStyle: "solid",
          strokeWidth: 10,
          type: "arrow",
          width: 120,
          x: 40,
          y: 50
        }
      ],
      selectedIds: ["arrow"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    expect(
      screen.getByRole("button", { name: "Background custom #653b00" })
    ).toBeDisabled();
    expect(canvas.querySelector("[data-element-id] line")).toHaveAttribute(
      "fill",
      "none"
    );
  });

  it("enables fill colors after an open line is closed", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "#653b00",
          height: 70,
          id: "line",
          opacity: 100,
          strokeColor: "#f08c00",
          strokeStyle: "solid",
          strokeWidth: 10,
          type: "line",
          width: 120,
          x: 40,
          y: 50
        }
      ],
      selectedIds: ["line"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    expect(
      screen.getByRole("button", { name: "Background custom #653b00" })
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Close path" }));

    expect(
      screen.getByRole("button", { name: "Background custom #653b00" })
    ).not.toBeDisabled();
    expect(canvas.querySelector("[data-element-type='line'] > path"))
      .toHaveAttribute(
      "fill",
      "#653b00"
    );
  });

  it("applies stroke style and edge controls from the style panel", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    const elementRect = canvas.querySelector("[data-element-id] rect");

    expect(elementRect).toHaveAttribute("rx", "12");
    expect(elementRect).toHaveAttribute("stroke-width", "10");
    expect(elementRect).toHaveAttribute("opacity", "1");
    expect(elementRect).toHaveAttribute("stroke-linecap", "butt");

    const strokeWidthRange = screen.getByLabelText("Stroke width");
    const strokeWidthInput = screen.getByLabelText("Stroke width value");
    const opacityRange = screen.getByLabelText("Opacity");
    const opacityInput = screen.getByLabelText("Opacity value");
    const fillWeightInput = screen.getByLabelText("Fill weight");
    const sloppinessGapInput = screen.getByLabelText("Sloppiness gap");

    expect(strokeWidthInput).toHaveValue(10);
    expect(fillWeightInput).toHaveValue(1);
    expect(sloppinessGapInput).toHaveValue(16);
    expect(opacityInput).toHaveValue(100);

    fireEvent.change(strokeWidthRange, {
      target: { value: "24" }
    });
    expect(elementRect).toHaveAttribute("stroke-width", "24");
    expect(strokeWidthInput).toHaveValue(24);

    fireEvent.change(strokeWidthInput, {
      target: { value: "40" }
    });
    expect(elementRect).toHaveAttribute("stroke-width", "40");
    expect(strokeWidthRange).toHaveValue("40");

    fireEvent.change(strokeWidthInput, {
      target: { value: "80" }
    });
    expect(elementRect).toHaveAttribute("stroke-width", "50");
    expect(strokeWidthInput).toHaveValue(50);

    fireEvent.click(screen.getByRole("button", { name: "dashed" }));
    expect(elementRect).toHaveAttribute("stroke-dasharray", "72.50 80");

    fireEvent.click(screen.getByRole("button", { name: "dotted" }));
    expect(elementRect).toHaveAttribute("stroke-dasharray", "6 90");

    const fillControls = screen
      .getAllByRole("button", { name: /^Fill / })
      .map((button) => button.getAttribute("aria-label"));
    expect(fillControls).toEqual([
      "Fill solid",
      "Fill hachure",
      "Fill crossHatch"
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Fill hachure" }));
    expect(elementRect?.getAttribute("fill")).toMatch(
      /^url\(#kizkatt-fill-/
    );
    expect(canvas.querySelector("[data-element-id] pattern")).toHaveAttribute(
      "width",
      "8"
    );

    fireEvent.change(fillWeightInput, {
      target: { value: "0.5" }
    });
    expect(fillWeightInput).toHaveValue(0.5);
    expect(canvas.querySelector("[data-element-id] pattern")).toHaveAttribute(
      "width",
      "16"
    );

    fireEvent.change(fillWeightInput, {
      target: { value: "30" }
    });
    expect(fillWeightInput).toHaveValue(6);

    fireEvent.click(screen.getByRole("button", { name: "Fill crossHatch" }));
    expect(
      canvas.querySelector("[data-element-id] pattern path")?.getAttribute("d")
    ).toBe("M 0 0 L 1.3333333333333333 1.3333333333333333 M 0 1.3333333333333333 L 1.3333333333333333 0");

    fireEvent.click(
      screen.getByRole("button", { name: "Sloppiness artist" })
    );
    expect(elementRect?.getAttribute("filter")).toMatch(
      /^url\(#kizkatt-sloppy-/
    );
    expect(canvas.querySelector("[data-element-id] filter")).toHaveAttribute(
      "x",
      "-60%"
    );
    expect(
      Number(
        canvas
          .querySelector("[data-element-id] feDisplacementMap")
          ?.getAttribute("scale")
      )
    ).toBeGreaterThan(7);

    fireEvent.click(screen.getByRole("button", { name: "Sloppiness double" }));
    fireEvent.change(sloppinessGapInput, {
      target: { value: "24" }
    });
    const elementGroup = canvas.querySelector("[data-element-id]");
    const secondaryRectStroke = elementGroup?.querySelector(
      '[data-sloppiness-stroke="secondary"]'
    );
    expect(secondaryRectStroke).toBeInTheDocument();
    expect(
      Number(secondaryRectStroke?.getAttribute("data-sloppiness-spacing"))
    ).toBe(74);

    fireEvent.change(sloppinessGapInput, {
      target: { value: "120" }
    });
    expect(sloppinessGapInput).toHaveValue(80);

    fireEvent.change(opacityRange, {
      target: { value: "35" }
    });
    expect(elementRect).toHaveAttribute("opacity", "0.35");
    expect(opacityInput).toHaveValue(35);

    fireEvent.change(opacityInput, {
      target: { value: "125" }
    });
    expect(elementRect).toHaveAttribute("opacity", "1");
    expect(opacityRange).toHaveValue("100");

    fireEvent.change(opacityInput, {
      target: { value: "-10" }
    });
    expect(elementRect).toHaveAttribute("opacity", "0");
    expect(opacityInput).toHaveValue(0);

    fireEvent.click(screen.getByRole("button", { name: "Edges sharp" }));
    expect(elementRect).toHaveAttribute("rx", "0");
  });

  it("groups live range style changes into a single undo step", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    const elementRect = canvas.querySelector("[data-element-id] rect");
    const strokeWidthRange = screen.getByLabelText("Stroke width");

    expect(elementRect).toHaveAttribute("stroke-width", "10");

    fireEvent.pointerDown(strokeWidthRange);
    fireEvent.change(strokeWidthRange, { target: { value: "20" } });
    fireEvent.change(strokeWidthRange, { target: { value: "35" } });
    fireEvent.change(strokeWidthRange, { target: { value: "50" } });
    fireEvent.pointerUp(strokeWidthRange);

    expect(elementRect).toHaveAttribute("stroke-width", "50");

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(elementRect).toHaveAttribute("stroke-width", "10");

    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(elementRect).toHaveAttribute("stroke-width", "50");
  });

  it("runs duplicate and delete actions from the style panel", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    expect(canvas.querySelectorAll("[data-element-id]")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
    expect(canvas.querySelectorAll("[data-element-id]")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(canvas.querySelectorAll("[data-element-id]")).toHaveLength(1);
  });

  it("moves pattern fills with their element", () => {
    const element: KizkattElement = {
      angle: 0,
      backgroundColor: "#f08c00",
      fillStyle: "hachure",
      fillWeight: 1,
      height: 70,
      id: "patterned",
      opacity: 100,
      strokeColor: "#f08c00",
      strokeStyle: "solid",
      strokeWidth: 10,
      type: "rectangle",
      width: 120,
      x: 40,
      y: 50
    };
    const { container, rerender } = render(
      <svg>{renderElement(element, false)}</svg>
    );

    expect(container.querySelector("pattern")).toHaveAttribute(
      "patternTransform",
      "translate(40 50)"
    );

    rerender(
      <svg>{renderElement({ ...element, x: 80, y: 80 }, false)}</svg>
    );

    expect(container.querySelector("pattern")).toHaveAttribute(
      "patternTransform",
      "translate(80 80)"
    );
  });

  it("reorders selected elements through layer actions", () => {
    const elements = [
      { id: "a" },
      { id: "b" },
      { id: "c" }
    ] as Parameters<typeof reorderElementsByLayerAction>[0];

    expect(
      reorderElementsByLayerAction(elements, ["b"], "back").map(
        (element) => element.id
      )
    ).toEqual(["b", "a", "c"]);
    expect(
      reorderElementsByLayerAction(elements, ["b"], "backward").map(
        (element) => element.id
      )
    ).toEqual(["b", "a", "c"]);
    expect(
      reorderElementsByLayerAction(elements, ["b"], "forward").map(
        (element) => element.id
      )
    ).toEqual(["a", "c", "b"]);
    expect(
      reorderElementsByLayerAction(elements, ["b"], "front").map(
        (element) => element.id
      )
    ).toEqual(["a", "c", "b"]);
  });

  it("chooses resize cursors from the rotated handle angle", () => {
    expect(getResizeCursor(0, "se")).toBe("nwse-resize");
    expect(getResizeCursor(Math.PI / 4, "se")).toBe("ns-resize");
    expect(getResizeCursor(Math.PI / 2, "se")).toBe("nesw-resize");
    expect(getResizeCursor(Math.PI / 4, "ne")).toBe("ew-resize");
  });

  it("resizes rotated elements while pinning the opposite corner", () => {
    const element = {
      angle: Math.PI / 4,
      backgroundColor: "transparent",
      height: 70,
      id: "rectangle",
      opacity: 100,
      strokeColor: "#d6d6d6",
      strokeStyle: "solid" as const,
      strokeWidth: 2,
      type: "rectangle" as const,
      width: 120,
      x: 40,
      y: 50
    };
    const handles = ["nw", "ne", "se", "sw"] as const;
    const xAxis = {
      x: Math.cos(element.angle),
      y: Math.sin(element.angle)
    };
    const yAxis = {
      x: -Math.sin(element.angle),
      y: Math.cos(element.angle)
    };
    const signs: Record<
      (typeof handles)[number],
      { sx: -1 | 1; sy: -1 | 1 }
    > = {
      ne: { sx: 1, sy: -1 },
      nw: { sx: -1, sy: -1 },
      se: { sx: 1, sy: 1 },
      sw: { sx: -1, sy: 1 }
    };

    handles.forEach((handle) => {
      const anchor = getResizeAnchorPoint(element, handle);
      const { sx, sy } = signs[handle];
      const resized = resizeElementFromHandle(element, handle, {
        x: anchor.x + sx * 220 * xAxis.x + sy * 160 * yAxis.x,
        y: anchor.y + sx * 220 * xAxis.y + sy * 160 * yAxis.y
      });
      const nextAnchor = getResizeAnchorPoint(resized, handle);

      expect(resized.width).toBeCloseTo(220);
      expect(resized.height).toBeCloseTo(160);
      expect(nextAnchor.x).toBeCloseTo(anchor.x);
      expect(nextAnchor.y).toBeCloseTo(anchor.y);
    });
  });

  it("resizes elements from edge handles on a single axis", () => {
    const element: KizkattElement = {
      angle: 0,
      backgroundColor: "transparent",
      height: 70,
      id: "rectangle",
      opacity: 100,
      strokeColor: "#d6d6d6",
      strokeStyle: "solid",
      strokeWidth: 2,
      type: "rectangle",
      width: 120,
      x: 40,
      y: 50
    };

    const eastAnchor = getResizeAnchorPoint(element, "e");
    const eastResized = resizeElementFromHandle(element, "e", {
      x: eastAnchor.x + 180,
      y: eastAnchor.y + 500
    });

    expect(eastResized.x).toBeCloseTo(element.x);
    expect(eastResized.y).toBeCloseTo(element.y);
    expect(eastResized.width).toBeCloseTo(180);
    expect(eastResized.height).toBeCloseTo(element.height);

    const southAnchor = getResizeAnchorPoint(element, "s");
    const southResized = resizeElementFromHandle(element, "s", {
      x: southAnchor.x + 500,
      y: southAnchor.y + 110
    });

    expect(southResized.x).toBeCloseTo(element.x);
    expect(southResized.y).toBeCloseTo(element.y);
    expect(southResized.width).toBeCloseTo(element.width);
    expect(southResized.height).toBeCloseTo(110);
  });

  it("scales freehand points when resizing", () => {
    const element = {
      angle: 0,
      backgroundColor: "transparent",
      height: 50,
      id: "draw",
      opacity: 100,
      points: [
        { x: 0, y: 0 },
        { x: 50, y: 25 },
        { x: 100, y: 50 }
      ],
      strokeColor: "#d6d6d6",
      strokeStyle: "solid" as const,
      strokeWidth: 2,
      type: "draw" as const,
      width: 100,
      x: 10,
      y: 20
    };

    const resized = resizeElementFromHandle(element, "se", {
      x: 210,
      y: 120
    });

    expect(resized.width).toBe(200);
    expect(resized.height).toBe(100);
    expect(resized.points).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 50 },
      { x: 200, y: 100 }
    ]);
  });

  it("selects freehand drawings by clicking near the drawn stroke", () => {
    const drawElement = {
      angle: 0,
      backgroundColor: "transparent",
      height: 120,
      id: "draw",
      opacity: 100,
      points: [
        { x: 0, y: 0 },
        { x: 80, y: 80 },
        { x: 160, y: 40 }
      ],
      strokeColor: "#d6d6d6",
      strokeStyle: "solid" as const,
      strokeWidth: 2,
      type: "draw" as const,
      width: 160,
      x: 100,
      y: 100
    };

    expect(findElementAtPoint([drawElement], { x: 183, y: 181 })?.id)
      .toBe("draw");
    expect(findElementAtPoint([drawElement], { x: 105, y: 215 })).toBeUndefined();
  });

  it("prioritizes object strokes over another object's fill", () => {
    const innerRectangle = {
      angle: 0,
      backgroundColor: "transparent",
      height: 60,
      id: "inner",
      opacity: 100,
      strokeColor: "#d6d6d6",
      strokeStyle: "solid" as const,
      strokeWidth: 2,
      type: "rectangle" as const,
      width: 80,
      x: 100,
      y: 100
    };
    const outerRectangle = {
      ...innerRectangle,
      backgroundColor: "#ffec99",
      height: 220,
      id: "outer",
      width: 260,
      x: 40,
      y: 40
    };

    expect(
      findElementAtPoint([innerRectangle, outerRectangle], {
        x: innerRectangle.x,
        y: innerRectangle.y + 30
      })?.id
    ).toBe("inner");
  });

});
