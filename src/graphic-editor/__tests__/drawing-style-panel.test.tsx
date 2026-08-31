import { describe, it } from "vitest";
import { storeCanvasState } from "../platform/storage";
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
  waitFor,
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
  it("draws a polyline through click and drag points until double-click", () => {
    render(<KizkattGraphicEditor />);

    chooseGroupedTool("Draw", "Polyline");

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 90, clientY: 50 });

    expect(canvas.querySelector(".kizkatt-selection-overlay")).not
      .toBeInTheDocument();

    firePointerEvent(canvas, "pointerup", { clientX: 90, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 130, clientY: 90 });

    const previewPath = canvas.querySelector("[data-element-id] path");
    expect(previewPath).toBeInTheDocument();
    expect(previewPath?.getAttribute("d")).toContain("130 90");

    firePointerEvent(canvas, "pointerdown", { clientX: 130, clientY: 90 });
    firePointerEvent(canvas, "pointerup", { clientX: 130, clientY: 90 });
    firePointerEvent(canvas, "pointermove", { clientX: 170, clientY: 50 });
    firePointerEvent(canvas, "pointerdown", { clientX: 170, clientY: 50 });
    firePointerEvent(canvas, "pointerup", { clientX: 170, clientY: 50 });
    fireEvent.doubleClick(canvas, { clientX: 170, clientY: 50 });

    expect(canvas.querySelectorAll("[data-element-id]")).toHaveLength(1);
    expect(canvas.querySelector("[data-element-id] path")?.getAttribute("d"))
      .toContain("170 50");
    expect(screen.getByRole("button", { name: "Select" })).toHaveClass(
      "is-active"
    );
  });

  it("uses style changes made without a selection as drawing defaults", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    expect(document.querySelector(".kizkatt-object-panel"))
      .toBeInTheDocument();
    const strokeWidthInput = screen.getByLabelText("Line width");
    expect(strokeWidthInput).toBeInTheDocument();
    fireEvent.change(strokeWidthInput, { target: { value: "7" } });
    fireEvent.blur(strokeWidthInput);
    fireEvent.click(screen.getByRole("button", { name: "Stroke #1971c2" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    const rectangle = canvas.querySelector("[data-element-id] rect");
    expect(rectangle).toHaveAttribute("stroke", "#1971c2");
    expect(rectangle).toHaveAttribute("stroke-width", "7");
  });

  it("imports a monochrome bitmap texture and applies its fine settings", async () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    fireEvent.click(
      screen.getByRole("button", { name: "Monochrome texture" })
    );

    const library = screen.getByRole("dialog", { name: "Textures" });
    const thumbnailColumns = screen.getByRole("slider", {
      name: "Textures per row"
    });
    const fileInput = library.querySelector<HTMLInputElement>(
      "input[type='file']"
    );
    const catalogTextures = screen.getAllByRole("button", {
      name: /^Abstract \d{3}$/
    });
    const textureFile = new File(
      [
        '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><path d="M0 0L8 8" stroke="black"/></svg>'
      ],
      "Abstract Lines.svg",
      { lastModified: 1, type: "image/svg+xml" }
    );

    expect(fileInput).not.toBeNull();
    expect(catalogTextures).toHaveLength(34);
    expect(screen.queryByText("No textures found")).not.toBeInTheDocument();
    expect(thumbnailColumns).toHaveValue("2");
    fireEvent.change(thumbnailColumns, { target: { value: "3" } });
    expect(
      library.querySelector(".kizkatt-texture-library-groups")
    ).toHaveStyle({ "--kizkatt-texture-columns": "3" });
    expect(
      library.closest(".kizkatt-floating-panel--texture-library")
    ).toHaveStyle({ minHeight: "420px" });
    expect(
      library.querySelector("button[aria-label='Stick panel']")
    ).toBeInTheDocument();
    const texturePanel = library.closest(
      ".kizkatt-floating-panel--texture-library"
    ) as HTMLElement;
    const textureResizeHandle = texturePanel.querySelector(
      "[data-panel-resize-handle]"
    );

    expect(texturePanel.querySelector("[data-panel-drag-handle]"))
      .toBeInTheDocument();
    expect(textureResizeHandle).toBeInTheDocument();
    fireEvent.mouseDown(textureResizeHandle as Element, {
      button: 0,
      clientX: 10,
      clientY: 10
    });
    fireEvent.mouseMove(texturePanel, { clientX: 210, clientY: 160 });
    fireEvent.mouseUp(texturePanel, { clientX: 210, clientY: 160 });
    expect(texturePanel).toHaveStyle({ height: "570px" });
    expect(texturePanel.style.width).toBe("");
    fireEvent.click(catalogTextures[0]);
    await waitFor(() => {
      expect(canvas.querySelector("[data-bitmap-texture]"))
        .toHaveAttribute(
          "data-bitmap-texture",
          "monochrome.abstract.abstract-001"
        );
    });
    const catalogPattern = canvas.querySelector("[data-bitmap-texture]");
    const catalogPatternImages = catalogPattern?.querySelectorAll("image");

    expect(catalogPattern).toHaveAttribute("data-bitmap-repeat", "none");
    expect(catalogPatternImages).toHaveLength(1);
    expect(catalogPatternImages?.[0]).toHaveAttribute("width", "7360");
    expect(catalogPatternImages?.[0]).toHaveAttribute("height", "4912");
    expect(catalogPattern?.querySelector("rect")).not.toBeInTheDocument();
    expect(
      canvas.querySelector("[data-element-id] metadata")?.textContent
    ).toContain('"backgroundColor":"transparent"');
    fireEvent.change(fileInput as HTMLInputElement, {
      target: { files: [textureFile] }
    });

    await waitFor(() => {
      expect(document.querySelector(".kizkatt-bitmap-pattern-panel"))
        .toBeInTheDocument();
      expect(
        canvas
          .querySelector("[data-bitmap-texture] image")
          ?.getAttribute("href")
      ).toMatch(/^data:image\/svg\+xml/);
    });

    const pattern = canvas.querySelector("[data-bitmap-texture]");
    const patternImage = pattern?.querySelector("image");
    const bitmapPanel = document.querySelector(
      ".kizkatt-floating-panel--bitmap-pattern-fill"
    ) as HTMLElement;
    const bitmapDragHandle = bitmapPanel.querySelector(
      "[data-panel-drag-handle]"
    );
    const bitmapResizeHandle = bitmapPanel.querySelector(
      "[data-panel-resize-handle]"
    );

    expect(patternImage?.getAttribute("href")).toMatch(
      /^data:image\/svg\+xml/
    );
    expect(pattern).toHaveAttribute("data-texture-anchor", "center");
    expect(pattern).toHaveAttribute("data-texture-coordinate-space", "object");
    expect(pattern).toHaveAttribute("patternUnits", "objectBoundingBox");
    expect(pattern).toHaveAttribute("x", "0");
    expect(pattern).toHaveAttribute("y", "0");
    expect(pattern).toHaveAttribute("width", "1");
    expect(pattern).toHaveAttribute("height", "1");
    expect(pattern).toHaveAttribute("viewBox", "0 0 120 70");
    expect(pattern?.querySelector("[data-texture-transform]")).toHaveAttribute(
      "transform",
      expect.stringContaining("translate(60 35)")
    );
    expect(patternImage).toHaveAttribute("x", "-3680");
    expect(patternImage).toHaveAttribute("y", "-2456");
    expect(bitmapPanel).toHaveClass("kizkatt-floating-panel--vertical");
    expect(
      bitmapPanel.querySelector(".kizkatt-bitmap-pattern-fill-button")
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Upload texture" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Transparency" })
    ).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "Desaturate" })
    ).toBeChecked();
    expect(
      screen.getByRole("slider", { name: "Desaturate value" })
    ).toHaveValue("100");
    expect(
      canvas.querySelector("[data-bitmap-texture-filter]")
    ).toHaveAttribute("data-saturation", "0");
    expect(
      screen.getByRole("slider", { name: "Shade range" })
    ).toHaveValue("100");
    expect(pattern?.querySelector("g[filter]")).toHaveAttribute(
      "filter",
      expect.stringContaining("texture-filter")
    );
    fireEvent.doubleClick(bitmapDragHandle as Element);
    expect(bitmapPanel).toHaveClass("kizkatt-floating-panel--vertical");
    fireEvent.mouseDown(bitmapResizeHandle as Element, {
      button: 0,
      clientX: 10,
      clientY: 10
    });
    fireEvent.mouseMove(bitmapPanel, { clientX: 210, clientY: 160 });
    fireEvent.mouseUp(bitmapPanel, { clientX: 210, clientY: 160 });
    expect(bitmapPanel).toHaveStyle({ width: "820px" });
    expect(bitmapPanel.style.height).toBe("");
    expect(
      canvas.querySelector("[data-element-id] metadata")?.textContent
    ).toContain('"fillStyle":"monochromeTexture"');
    expect(
      canvas.querySelector("[data-element-id] metadata")?.textContent
    ).toContain('"name":"Abstract Lines"');

    fireEvent.click(screen.getByRole("checkbox", { name: "Luminance" }));
    expect(
      screen.queryByRole("button", { name: "Apply" })
    ).not.toBeInTheDocument();
    const luminanceSlider = screen.getByRole("slider", {
      name: "Luminance value"
    });

    luminanceSlider.focus();
    fireEvent.change(luminanceSlider, { target: { value: "-25" } });
    expect(document.activeElement).toBe(luminanceSlider);
    expect(
      screen.getByRole("slider", { name: "Luminance value" })
    ).toBe(luminanceSlider);
    expect(
      canvas.querySelector("[data-bitmap-texture-filter]")
    ).toHaveAttribute("data-contrast", "75");
    fireEvent.change(luminanceSlider, { target: { value: "10" } });
    expect(document.activeElement).toBe(luminanceSlider);
    expect(
      canvas.querySelector("[data-bitmap-texture-filter]")
    ).toHaveAttribute("data-contrast", "110");
    fireEvent.pointerUp(luminanceSlider);
    await waitFor(() => {
      expect(
        canvas.querySelector("[data-bitmap-texture-filter]")
      ).toHaveAttribute("data-contrast", "110");
    });

    fireEvent.click(screen.getByRole("checkbox", { name: "Brightness" }));
    fireEvent.change(
      screen.getByRole("slider", { name: "Brightness value" }),
      { target: { value: "-20" } }
    );
    expect(
      canvas.querySelector("[data-bitmap-texture-filter]")
    ).toHaveAttribute("data-brightness", "80");

    fireEvent.click(screen.getByRole("checkbox", { name: "Edge match" }));
    fireEvent.change(
      screen.getByRole("slider", { name: "Edge match value" }),
      { target: { value: "75" } }
    );
    expect(
      canvas.querySelector("[data-bitmap-texture-filter]")
    ).toHaveAttribute("data-edge-match", "0.75");
    expect(
      canvas.querySelector("[data-bitmap-texture-filter] feGaussianBlur")
    ).toHaveAttribute("stdDeviation", "0.75");

    expect(screen.queryByText("Transformations")).not.toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Tile texture" }))
      .toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Fit to object size" }))
      .not.toBeChecked();
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Fit to object size" })
    );
    expect(patternImage).toHaveAttribute("width", "120");
    expect(patternImage).toHaveAttribute("height", "70");
    fireEvent.click(
      screen.getByRole("button", { name: "Reset texture transformations" })
    );
    expect(screen.getByRole("checkbox", { name: "Fit to object size" }))
      .not.toBeChecked();
    expect(patternImage).toHaveAttribute("width", "7360");
    expect(patternImage).toHaveAttribute("height", "4912");

    const crop = screen.getByLabelText("Object crop on texture");
    const cropStage = crop.parentElement as HTMLElement;
    vi.spyOn(crop, "getBoundingClientRect").mockReturnValue({
      bottom: 170,
      height: 70,
      left: 100,
      right: 220,
      top: 100,
      width: 120,
      x: 100,
      y: 100,
      toJSON: () => ({})
    });
    expect(
      cropStage.querySelectorAll('[aria-label="Resize texture crop"]')
    ).toHaveLength(8);
    firePointerEvent(crop, "pointerdown", { clientX: 160, clientY: 135 });
    firePointerEvent(crop, "pointerup", { clientX: 160, clientY: 135 });
    expect(
      cropStage.querySelectorAll('[aria-label="Skew texture crop"]')
    ).toHaveLength(4);
    expect(
      cropStage.querySelectorAll('[aria-label="Rotate texture crop"]')
    ).toHaveLength(4);
    firePointerEvent(
      screen.getAllByRole("button", { name: "Rotate texture crop" })[0],
      "pointerdown",
      { clientX: 160, clientY: 85 }
    );
    firePointerEvent(crop, "pointermove", { clientX: 210, clientY: 135 });
    firePointerEvent(crop, "pointerup", { clientX: 210, clientY: 135 });
    expect(canvas.querySelector("[data-texture-transform]")).toHaveAttribute(
      "transform",
      expect.stringContaining("rotate(-90)")
    );
    await waitFor(() => {
      expect(canvas.querySelector("[data-texture-transform]")).toHaveAttribute(
        "transform",
        expect.stringContaining("rotate(-90)")
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Mirror horizontally" }));
    expect(
      canvas.querySelector("[data-texture-transform]")
        ?.getAttribute("transform")
    ).toContain("scale(-1 1)");
    await waitFor(() => {
      expect(
        canvas.querySelector("[data-texture-transform]")
          ?.getAttribute("transform")
      ).toContain("scale(-1 1)");
    });

    fireEvent.click(screen.getByRole("button", { name: "Mirror vertically" }));
    expect(
      canvas.querySelector("[data-texture-transform]")
        ?.getAttribute("transform")
    ).toContain("scale(-1 -1)");
    fireEvent.click(
      bitmapPanel.querySelector("button[aria-label='Close panel']") as Element
    );
    await waitFor(() => {
      expect(document.querySelector(".kizkatt-bitmap-pattern-panel"))
        .not.toBeInTheDocument();
      expect(
        canvas.querySelector("[data-texture-transform]")
          ?.getAttribute("transform")
      ).toContain("scale(-1 -1)");
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Background #653b00" })
    );
    expect(canvas.querySelector("[data-bitmap-texture]"))
      .not.toBeInTheDocument();
    expect(
      canvas.querySelector("[data-element-id] metadata")?.textContent
    ).toContain('"fillStyle":"solid"');
    expect(
      canvas.querySelector("[data-element-id] metadata")?.textContent
    ).not.toContain('"bitmapTexture"');
  });

  it("keeps Monochrome Texture visible only while it is stuck", async () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    const canvas = screen.getByRole("application", {
      name: "Drawing canvas"
    });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");
    fireEvent.click(
      screen.getByRole("button", { name: "Monochrome texture" })
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: /^Abstract \d{3}$/ })[0]
    );

    const bitmapPanel = document.querySelector(
      ".kizkatt-floating-panel--bitmap-pattern-fill"
    ) as HTMLElement;
    const stickButton = bitmapPanel.querySelector(
      "button[aria-label='Stick panel']"
    );

    fireEvent.click(stickButton as Element);
    expect(bitmapPanel).toHaveClass("is-pinned");

    fireEvent.click(
      screen.getByRole("button", { name: "Background #653b00" })
    );
    expect(document.querySelector(".kizkatt-bitmap-pattern-panel"))
      .toBeInTheDocument();

    fireEvent.click(
      bitmapPanel.querySelector(
        "button[aria-label='Unstick panel']"
      ) as Element
    );
    await waitFor(() => {
      expect(document.querySelector(".kizkatt-bitmap-pattern-panel"))
        .not.toBeInTheDocument();
    });
  });

  it("creates a rectangle on the SVG canvas", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    expect(canvas.querySelector("[data-element-id]")).toBeInTheDocument();
  });

  it("draws equal-sided shapes while Alt is held", () => {
    render(<KizkattGraphicEditor />);

    chooseGroupedTool("Rectangle", "Ellipse");

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", {
      clientX: 160,
      clientY: 100,
      altKey: true
    });
    firePointerEvent(canvas, "pointerup", { altKey: true });

    const ellipse = canvas.querySelector("[data-element-id] ellipse");

    expect(ellipse).toHaveAttribute("rx", "60");
    expect(ellipse).toHaveAttribute("ry", "60");
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

    chooseGroupedTool("Draw", "Line");

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
      screen.getByRole("complementary", { name: "Styling" })
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

    chooseGroupedTool("Draw", "Line");
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

  it("snaps rotation to 15-degree steps while Alt is held", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");
    firePointerEvent(canvas, "pointerdown", { clientX: 80, clientY: 80 });
    firePointerEvent(canvas, "pointerup");

    const rotateHandle = canvas.querySelector("[data-handle='rotate']");
    const rotatePoint = getCirclePoint(rotateHandle);
    const center = { x: 100, y: 85 };
    const radius = Math.hypot(
      rotatePoint.x - center.x,
      rotatePoint.y - center.y
    );
    const targetAngle =
      Math.atan2(rotatePoint.y - center.y, rotatePoint.x - center.x) +
      (20 * Math.PI) / 180;

    firePointerEvent(rotateHandle as Element, "pointerdown", {
      clientX: rotatePoint.x,
      clientY: rotatePoint.y
    });
    firePointerEvent(canvas, "pointermove", {
      clientX: center.x + Math.cos(targetAngle) * radius,
      clientY: center.y + Math.sin(targetAngle) * radius,
      altKey: true
    });
    firePointerEvent(canvas, "pointerup", { altKey: true });

    const transform = canvas
      .querySelector("[data-element-id]")
      ?.getAttribute("transform");
    const angle = Number(/rotate\(([-\d.]+)/.exec(transform ?? "")?.[1]);

    expect(angle).toBeCloseTo(15);
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

  it("preserves object proportions while resizing with Alt", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    const resizeHandle = canvas.querySelector("[data-resize-handle='se']");
    firePointerEvent(resizeHandle as Element, "pointerdown", {
      clientX: 160,
      clientY: 120
    });
    firePointerEvent(canvas, "pointermove", {
      clientX: 240,
      clientY: 160,
      altKey: true
    });
    firePointerEvent(canvas, "pointerup", { altKey: true });

    const rectangle = canvas.querySelector("[data-element-id] rect");
    const width = Number(rectangle?.getAttribute("width"));
    const height = Number(rectangle?.getAttribute("height"));

    expect(width / height).toBeCloseTo(120 / 70);
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
    expect(
      screen.getByRole("button", { name: "Background #653b00" })
    ).not.toHaveClass("is-active");
    expect(
      screen.getByRole("button", { name: "Stroke #f08c00" })
    ).not.toHaveClass("is-active");

    fireEvent.click(
      screen.getByRole("button", { name: "Background custom #653b00" })
    );
    expect(screen.getByRole("dialog", { name: "Background colors" }))
      .toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Color picker" }))
      .toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "backgroundColor palette #653b00" })
    ).toHaveClass("is-active");
    expect(
      screen.getByRole("button", { name: "backgroundColor shade #653b00" })
    ).toHaveClass("is-active");
    expect(
      screen.getAllByRole("button", { name: /backgroundColor shade/ })[11]
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
    expect(screen.getByRole("region", { name: "Color picker" }))
      .toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /strokeColor shade/ })
    ).toHaveLength(24);

    fireEvent.click(
      screen.getByRole("button", { name: "strokeColor palette #1971c2" })
    );
    expect(elementRect).toHaveAttribute("stroke", "#1971c2");
    expect(
      screen.getAllByRole("button", { name: /strokeColor shade/ })
    ).toHaveLength(24);
    expect(
      screen.getByRole("button", { name: "strokeColor shade #030b13" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "strokeColor shade #f6f9fd" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "strokeColor shade #6741d9" })
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "strokeColor shade #030b13" })
    );
    expect(elementRect).toHaveAttribute("stroke", "#030b13");
    expect(
      screen.getByRole("button", { name: "strokeColor shade #f6f9fd" })
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "strokeColor palette #6741d9" })
    );
    expect(elementRect).toHaveAttribute("stroke", "#6741d9");

    const hexInput = screen.getByRole("textbox", { name: "HEX" });

    fireEvent.change(hexInput, {
      target: { value: "8d8d8d" }
    });
    expect(hexInput).toHaveValue("8d8d8d");
    expect(elementRect).toHaveAttribute("stroke", "#8d8d8d");
    expect(
      screen.getAllByRole("button", { name: /strokeColor shade/ })[11]
    ).toHaveAttribute("aria-label", "strokeColor shade #8d8d8d");

    fireEvent.change(hexInput, {
      target: { value: "123abc" }
    });
    fireEvent.blur(hexInput);
    expect(elementRect).toHaveAttribute("stroke", "#123abc");
    expect(hexInput).toHaveValue("123abc");
    expect(
      screen.getByRole("button", { name: "Stroke #123abc" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "strokeColor shade #123abc" })
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: /strokeColor shade/ })[11]
    ).toHaveAttribute("aria-label", "strokeColor shade #123abc");
    screen
      .getAllByRole("button", { name: /strokeColor palette/ })
      .forEach((paletteButton) => {
        expect(paletteButton).not.toHaveClass("is-active");
      });
    expect(
      screen.getByRole("button", { name: "strokeColor shade #020613" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "strokeColor shade #f6f7fc" })
    ).toBeInTheDocument();
    expect(screen.queryByText("User Colors")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "strokeColor custom palette #123abc"
      })
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", {
        name: "strokeColor custom palette #123abc"
      })
    );
    expect(
      screen.getByRole("button", { name: "strokeColor shade #123abc" })
    ).toHaveClass("is-active");

    fireEvent.change(hexInput, {
      target: { value: "#abcdef" }
    });
    fireEvent.blur(hexInput);
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

  it("closes Colors explicitly and after a color double-click", () => {
    render(<KizkattGraphicEditor />);
    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Background custom #653b00" })
    );

    const closeColorsButton = screen.getByRole("button", {
      name: "Close colors"
    });
    expect(screen.getByText("Colors").closest(".kizkatt-panel-chrome"))
      .toHaveClass("kizkatt-color-popover-header");
    expect(closeColorsButton.closest(".kizkatt-panel-actions"))
      .toBeInTheDocument();
    fireEvent.click(closeColorsButton);
    expect(screen.queryByRole("dialog", { name: "Background colors" })).not
      .toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Background custom #653b00" })
    );
    const paletteColor = screen.getAllByRole("button", {
      name: /backgroundColor palette #[0-9a-f]+/i
    })[0];
    const selectedColor = paletteColor
      .getAttribute("aria-label")
      ?.split(" ")
      .at(-1);

    expect(selectedColor).toBeDefined();
    fireEvent.doubleClick(paletteColor);

    expect(screen.queryByRole("dialog", { name: "Background colors" })).not
      .toBeInTheDocument();
    expect(
      document.querySelector(
        ".kizkatt-style-feature--background .kizkatt-custom-color-swatch"
      )
    ).toHaveAttribute("aria-label", `Background ${selectedColor}`);
  });

  it("remembers a Colors representation independently from the global default", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Editor settings" }));
    fireEvent.click(screen.getByRole("button", { name: "RGB/A" }));
    fireEvent.click(screen.getByRole("button", { name: "Editor settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Background custom #653b00" })
    );

    expect(screen.getByRole("button", { name: "RGB/A" }))
      .toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "HEX" }));
    expect(
      window.localStorage.getItem(
        "kizkatt:graphic-editor:styling:color-picker-mode"
      )
    ).toBe("hex");
  });

  it("fills equally wide background and stroke color rows with shades", () => {
    const clientWidthSpy = vi
      .spyOn(HTMLElement.prototype, "clientWidth", "get")
      .mockReturnValue(400);

    render(<KizkattGraphicEditor />);
    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const colorLists = Array.from(
      document.querySelectorAll(".kizkatt-quick-color-list")
    );
    const colorCounts = colorLists.map((list) => list.children.length);
    const firstColorLabels = colorLists.map(
      (list) => list.firstElementChild?.getAttribute("aria-label")
    );

    expect(colorLists).toHaveLength(2);
    expect(colorCounts[0]).toBeGreaterThan(5);
    expect(colorCounts[0]).toBe(colorCounts[1]);
    expect(firstColorLabels).toEqual([
      "Background transparent",
      "Stroke transparent"
    ]);

    clientWidthSpy.mockRestore();
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
    const arrowLine = canvas.querySelector("[data-element-id] line");

    expect(arrowLine).toHaveAttribute(
      "fill",
      "none"
    );
    const solidArrowhead = canvas.querySelector("[data-arrowhead]");
    const expectedDefaultScale = (8 * (1 + Math.log(10))) / 10;
    const arrowLength = Math.hypot(120, 70);
    const expectedBase = {
      x: 160 - (120 / arrowLength) * expectedDefaultScale * 10,
      y: 120 - (70 / arrowLength) * expectedDefaultScale * 10
    };

    expect(arrowLine).not.toHaveAttribute("marker-end");
    expect(Number(arrowLine?.getAttribute("x2"))).toBeCloseTo(expectedBase.x);
    expect(Number(arrowLine?.getAttribute("y2"))).toBeCloseTo(expectedBase.y);
    expect(solidArrowhead).toHaveAttribute("fill", "#f08c00");
    expect(solidArrowhead).not.toHaveAttribute("data-decorative-arrowhead");
    expect(
      Number(solidArrowhead?.getAttribute("data-arrowhead-base-x"))
    ).toBeCloseTo(expectedBase.x);
    expect(
      Number(solidArrowhead?.getAttribute("data-arrowhead-base-y"))
    ).toBeCloseTo(expectedBase.y);
    expect(
      Number(solidArrowhead?.getAttribute("data-arrowhead-scale-x"))
    ).toBeCloseTo(expectedDefaultScale);

    fireEvent.change(screen.getByLabelText("Stroke style"), {
      target: { value: "zigzag" }
    });

    expect(canvas.querySelector("[data-element-id] line"))
      .not.toHaveAttribute("marker-end");
    expect(canvas.querySelector("[data-decorative-stroke='wavy']"))
      .not.toHaveAttribute("marker-end");
    const decorativeArrowhead = canvas.querySelector(
      "[data-decorative-arrowhead]"
    );
    const expectedAngle = (Math.atan2(70, 120) * 180) / Math.PI;

    expect(decorativeArrowhead).toHaveAttribute(
      "d",
      "M 0 0 L 10 5 L 0 10 z"
    );
    expect(
      Number(decorativeArrowhead?.getAttribute("data-arrowhead-angle"))
    ).toBeCloseTo(expectedAngle);
    expect(decorativeArrowhead).toHaveAttribute("fill", "#f08c00");
    expect(
      Number(decorativeArrowhead?.getAttribute("data-arrowhead-scale-x"))
    ).toBeCloseTo(expectedDefaultScale);
    expect(
      Number(decorativeArrowhead?.getAttribute("data-arrowhead-scale-y"))
    ).toBeCloseTo(expectedDefaultScale);

    fireEvent.change(screen.getByLabelText("Line width"), {
      target: { value: "50" }
    });

    const enlargedArrowhead = canvas.querySelector("[data-arrowhead]");
    const enlargedScale = Number(
      enlargedArrowhead?.getAttribute("data-arrowhead-scale-x")
    );

    expect(enlargedScale).toBeGreaterThan(expectedDefaultScale);
    expect(enlargedScale / expectedDefaultScale).toBeLessThan(2);
    expect(enlargedScale).toBeCloseTo((8 * (1 + Math.log(50))) / 10);
  });

  it("creates arrows from lines through the fine outline settings", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "transparent",
          height: 60,
          id: "line-with-heads",
          opacity: 100,
          strokeColor: "#f08c00",
          strokeStyle: "solid",
          strokeWidth: 2,
          type: "line",
          width: 160,
          x: 40,
          y: 50
        }
      ],
      selectedIds: ["line-with-heads"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    expect(screen.queryByRole("button", { name: "Arrow" })).not
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Draw" })).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Fine line settings" })
    );

    expect(
      screen.getByRole("dialog", { name: "Outline pen" })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Start"), {
      target: { value: "circle" }
    });
    fireEvent.change(screen.getByLabelText("End"), {
      target: { value: "triangle" }
    });

    expect(
      canvas.querySelector("[data-arrowhead-endpoint='start']")
    ).toHaveAttribute("data-arrowhead-style", "circle");
    expect(
      canvas.querySelector("[data-arrowhead-endpoint='end']")
    ).toHaveAttribute("data-arrowhead-style", "triangle");

    const initialEndScale = Number(
      canvas
        .querySelector("[data-arrowhead-endpoint='end']")
        ?.getAttribute("data-arrowhead-scale-x")
    );
    fireEvent.change(screen.getByLabelText("Scaling"), {
      target: { value: "200" }
    });
    expect(
      Number(
        canvas
          .querySelector("[data-arrowhead-endpoint='end']")
          ?.getAttribute("data-arrowhead-scale-x")
      )
    ).toBeGreaterThan(initialEndScale);

    fireEvent.click(screen.getByRole("checkbox", { name: "Calligraphy" }));
    fireEvent.change(screen.getByLabelText("Stretch"), {
      target: { value: "200" }
    });
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Behind the fill" })
    );

    const renderedLine = canvas.querySelector(
      "[data-element-id='line-with-heads'] > line"
    );

    expect(renderedLine).toHaveAttribute("stroke-width", "4");
    expect(renderedLine).toHaveAttribute(
      "paint-order",
      "stroke fill markers"
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

  it("applies line controls from the object panel and fill controls from the style panel", () => {
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

    const strokeWidthInput = screen.getByLabelText("Line width");
    const strokeStyleSelect = screen.getByLabelText("Stroke style");
    const opacityRange = screen.getByLabelText("Opacity");
    const opacityInput = screen.getByLabelText("Opacity value");

    expect(strokeWidthInput).toHaveValue(10);
    expect(screen.queryByLabelText("Fill weight")).not.toBeInTheDocument();
    expect(opacityInput).toHaveValue(100);

    fireEvent.change(strokeWidthInput, {
      target: { value: "24" }
    });
    expect(elementRect).toHaveAttribute("stroke-width", "24");
    expect(strokeWidthInput).toHaveValue(24);

    fireEvent.change(strokeWidthInput, {
      target: { value: "40" }
    });
    expect(elementRect).toHaveAttribute("stroke-width", "40");

    fireEvent.change(strokeWidthInput, {
      target: { value: "50" }
    });
    expect(elementRect).toHaveAttribute("stroke-width", "50");
    expect(strokeWidthInput).toHaveValue(50);

    fireEvent.change(strokeStyleSelect, { target: { value: "dashed" } });
    expect(elementRect).toHaveAttribute("stroke-dasharray", "72.50 80");

    fireEvent.change(strokeStyleSelect, { target: { value: "dotted" } });
    expect(elementRect).toHaveAttribute("stroke-dasharray", "0 75");
    expect(elementRect).toHaveAttribute("stroke-linecap", "round");
    expect(elementRect).not.toHaveAttribute("filter");

    fireEvent.click(screen.getByTitle("Use straight corners"));
    expect(elementRect).toHaveAttribute("stroke-dasharray", "50 25");
    expect(elementRect).toHaveAttribute("stroke-linecap", "butt");

    fireEvent.click(screen.getByTitle("Use rounded corners"));
    expect(elementRect).toHaveAttribute("stroke-dasharray", "0 75");

    fireEvent.change(strokeStyleSelect, { target: { value: "stitched" } });
    expect(elementRect).toHaveAttribute("stroke-dasharray", "6 90");
    expect(elementRect).toHaveAttribute("data-stroke-style", "stitched");

    fireEvent.change(strokeStyleSelect, { target: { value: "dashDot" } });
    expect(elementRect).toHaveAttribute(
      "stroke-dasharray",
      "22.50 90 0 90"
    );
    expect(elementRect).toHaveAttribute("stroke-linecap", "round");
    expect(elementRect).not.toHaveAttribute("filter");

    fireEvent.click(screen.getByTitle("Use straight corners"));
    expect(elementRect).toHaveAttribute(
      "stroke-dasharray",
      "72.50 40 50 40"
    );
    expect(elementRect).toHaveAttribute("stroke-linecap", "butt");
    fireEvent.click(screen.getByTitle("Use rounded corners"));

    fireEvent.change(strokeStyleSelect, { target: { value: "zigzag" } });
    const wavyStroke = canvas.querySelector(
      "[data-decorative-stroke='wavy']"
    );

    expect(elementRect).toHaveAttribute("data-stroke-style", "zigzag");
    expect(elementRect).toHaveAttribute("stroke-opacity", "0");
    expect(elementRect).not.toHaveAttribute("stroke-dasharray");
    expect(wavyStroke).toHaveAttribute("fill", "none");
    expect(wavyStroke?.getAttribute("d")).toContain("L");
    const wavyPathData = wavyStroke?.getAttribute("d");

    fireEvent.click(screen.getByTitle("Use straight corners"));
    const zigzagStroke = canvas.querySelector(
      "[data-decorative-stroke='zigzag']"
    );

    expect(canvas.querySelector("[data-decorative-stroke='wavy']"))
      .not.toBeInTheDocument();
    expect(elementRect).toHaveAttribute("data-stroke-style", "zigzag");
    expect(zigzagStroke).toHaveAttribute("fill", "none");
    expect(zigzagStroke?.getAttribute("d")).not.toBe(wavyPathData);

    fireEvent.change(strokeStyleSelect, { target: { value: "solid" } });
    expect(canvas.querySelector("[data-decorative-stroke]"))
      .not.toBeInTheDocument();

    const fillControls = Array.from(
      document.querySelectorAll(
        ".kizkatt-style-feature--fill .kizkatt-icon-segmented button"
      )
    ).map((button) => button.getAttribute("aria-label"));
    expect(fillControls).toEqual([
      "Fill solid",
      "Gradient fill",
      "SVG fill",
      "Texture fill",
      "Monochrome texture",
      "Fill hachure"
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Fill hachure" }));
    expect(elementRect?.getAttribute("fill")).toMatch(
      /^url\(#kizkatt-fill-/
    );
    expect(canvas.querySelector("[data-element-id] pattern")).toHaveAttribute(
      "width",
      "8"
    );

    fireEvent.click(screen.getByRole("button", { name: "Texture fill" }));
    expect(
      canvas.querySelector("[data-element-id] pattern path")?.getAttribute("d")
    ).toBe("M 0 0 L 8 8 M 0 8 L 8 0");

    fireEvent.change(strokeStyleSelect, { target: { value: "handDrawn" } });
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

    fireEvent.click(
      screen.getByRole("button", { name: "Fine line settings" })
    );
    fireEvent.change(screen.getByLabelText("Lines"), {
      target: { value: "2" }
    });
    const elementGroup = canvas.querySelector("[data-element-id]");
    const secondaryRectStroke = elementGroup?.querySelector(
      '[data-sloppiness-stroke="secondary"]'
    );
    expect(elementGroup).toHaveAttribute(
      "data-kizkatt-stroke-line-count",
      "2"
    );
    expect(elementRect).toHaveAttribute("data-stroke-line-count", "2");
    expect(secondaryRectStroke).toBeInTheDocument();
    expect(
      Number(secondaryRectStroke?.getAttribute("data-sloppiness-spacing"))
    ).toBe(66);

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

    fireEvent.click(screen.getByTitle("Use straight corners"));
    expect(elementRect).toHaveAttribute("rx", "0");
  });

  it("keeps image borders at zero until a line setting is changed", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "transparent",
          edgeStyle: "round",
          height: 80,
          id: "image",
          opacity: 100,
          src: "data:image/png;base64,kizkatt",
          strokeColor: "#f08c00",
          strokeStyle: "solid",
          strokeWidth: 10,
          type: "image",
          width: 120,
          x: 40,
          y: 50
        }
      ],
      selectedIds: ["image"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    const elementGroup = canvas.querySelector("[data-element-id='image']");
    const image = elementGroup?.querySelector("image");
    const imageBorder = elementGroup?.querySelector("[data-image-border]");
    const strokeWidthInput = screen.getByLabelText("Line width");

    expect(imageBorder).toHaveAttribute("stroke-width", "0");
    expect(image).toHaveAttribute("preserveAspectRatio", "none");
    expect(strokeWidthInput).toHaveValue(0);
    expect(elementGroup).not.toHaveAttribute("data-image-border-enabled");

    fireEvent.change(screen.getByLabelText("Stroke style"), {
      target: { value: "dashed" }
    });

    expect(imageBorder).toHaveAttribute("stroke-width", "10");
    expect(imageBorder).toHaveAttribute("data-stroke-style", "dashed");
    expect(imageBorder).toHaveAttribute("stroke-dasharray");
    expect(strokeWidthInput).toHaveValue(10);
    expect(elementGroup).toHaveAttribute("data-image-border-enabled", "true");

    fireEvent.click(
      screen.getByRole("button", {
        name: "Unlock linked width and height"
      })
    );
    fireEvent.change(screen.getByLabelText("Width"), {
      target: { value: "200" }
    });
    fireEvent.blur(screen.getByLabelText("Width"));

    expect(image).toHaveAttribute("width", "240");
    expect(image).toHaveAttribute("height", "80");
    expect(imageBorder).toHaveAttribute("width", "240");
    expect(imageBorder).toHaveAttribute("height", "80");

    fireEvent.change(strokeWidthInput, { target: { value: "4" } });
    expect(imageBorder).toHaveAttribute("stroke-width", "4");

    fireEvent.change(strokeWidthInput, { target: { value: "0" } });
    expect(imageBorder).toHaveAttribute("stroke-width", "0");
    expect(elementGroup).not.toHaveAttribute("data-image-border-enabled");

    fireEvent.click(screen.getByTitle("Use straight corners"));
    expect(imageBorder).toHaveAttribute("stroke-width", "10");
    expect(imageBorder).toHaveAttribute("rx", "0");
    expect(elementGroup).toHaveAttribute("data-image-border-enabled", "true");
  });

  it("groups live opacity changes into a single undo step", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    const elementRect = canvas.querySelector("[data-element-id] rect");
    const opacityRange = screen.getByLabelText("Opacity");

    expect(elementRect).toHaveAttribute("opacity", "1");

    fireEvent.pointerDown(opacityRange);
    fireEvent.change(opacityRange, { target: { value: "80" } });
    fireEvent.change(opacityRange, { target: { value: "65" } });
    fireEvent.change(opacityRange, { target: { value: "50" } });
    fireEvent.pointerUp(opacityRange);

    expect(elementRect).toHaveAttribute("opacity", "0.5");

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(elementRect).toHaveAttribute("opacity", "1");

    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(elementRect).toHaveAttribute("opacity", "0.5");
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
