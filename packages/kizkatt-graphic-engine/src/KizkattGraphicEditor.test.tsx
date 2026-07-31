import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_GRID_COLOR,
  KizkattGraphicEditor,
  storeCanvasBackgroundColor,
  storeGridColor,
  storeTheme
} from ".";
import {
  findElementAtPoint,
  getElementIdsInSelectionArea,
  getResizeAnchorPoint,
  getResizeCursor,
  reorderElementsByLayerAction,
  resizeElementsFromSelectionHandle,
  resizeElementFromHandle,
  rotateElementsAroundPoint,
  type ResizeHandle
} from "./KizkattGraphicEditor";
import type { KizkattElement } from "./model/types";
import { renderElement } from "./ui/canvas/renderElement";
import * as Icons from "./ui/icons";

afterEach(() => {
  window.localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("KizkattGraphicEditor", () => {
  it("renders a full viewport Kizkatt editor with the initial toolset", () => {
    render(<KizkattGraphicEditor />);

    expect(screen.getByLabelText("Kizkatt diagram canvas")).toHaveClass(
      "kizkatt-board"
    );
    expect(screen.getByLabelText("Kizkatt diagram canvas")).toHaveClass(
      "kizkatt-board--dark"
    );
    expect(screen.getByRole("application", { name: "Drawing canvas" }))
      .toBeInTheDocument();
    expect(screen.getByRole("application", { name: "Drawing canvas" }))
      .toHaveStyle({ cursor: "default" });
    expect(screen.getByRole("button", { name: "Select" })).toHaveClass(
      "is-active"
    );
    expect(screen.queryByRole("button", { name: "Library" })).not
      .toBeInTheDocument();
  });

  it("starts with the Kizkatt default canvas background", () => {
    render(<KizkattGraphicEditor />);

    expect(screen.getByRole("application", { name: "Drawing canvas" }))
      .toHaveStyle({ backgroundColor: DEFAULT_CANVAS_BACKGROUND });
  });

  it("restores and stores the canvas background in the Kizkatt namespace", () => {
    storeCanvasBackgroundColor("#121212");

    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    expect(canvas).toHaveStyle({ backgroundColor: "#121212" });

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: "Canvas background #211a16"
      })
    );

    expect(
      window.localStorage.getItem("kizkatt:graphic-engine:canvas-background")
    ).toBe("#211a16");
  });

  it("restores and stores the grid color in the Kizkatt namespace", () => {
    const blueGridColor = "rgba(132, 190, 255, 0.18)";

    storeGridColor(blueGridColor);

    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    expect(canvas.style.getPropertyValue("--kizkatt-canvas-grid")).toBe(
      blueGridColor
    );

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: `Grid color ${DEFAULT_GRID_COLOR}`
      })
    );

    expect(
      window.localStorage.getItem("kizkatt:graphic-engine:grid-color")
    ).toBe(DEFAULT_GRID_COLOR);
  });

  it("ignores legacy canvas background storage and applies the default color", () => {
    window.localStorage.setItem("kizkatt:canvas-background", "#121212");

    render(<KizkattGraphicEditor />);

    expect(screen.getByRole("application", { name: "Drawing canvas" }))
      .toHaveStyle({ backgroundColor: DEFAULT_CANVAS_BACKGROUND });
  });

  it("renders the Kizkatt main menu actions, theme picker, and canvas backgrounds", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));

    expect(screen.getByRole("button", { name: /Open/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Theme" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Canvas background #161719" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Canvas background #211a16" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Canvas background #f5faff" })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Light theme" }));
    expect(
      screen.getByRole("button", { name: "Canvas background #f5faff" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Pick canvas background" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Grid color rgba(210, 72, 115, 0.34)"
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Grid color rgba(37, 126, 220, 0.34)"
      })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Find on canvas/ })).not
      .toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Help" })).not
      .toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Library" })).not
      .toBeInTheDocument();
    expect(screen.queryByLabelText("Element style")).not.toBeInTheDocument();
  });

  it("stores picked canvas backgrounds as the custom background swatch", async () => {
    vi.stubGlobal(
      "EyeDropper",
      class {
        open() {
          return Promise.resolve({ sRGBHex: "#abcdef" });
        }
      }
    );

    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Pick canvas background" })
    );

    await waitFor(() => {
      expect(
        window.localStorage.getItem(
          "kizkatt:graphic-engine:custom-canvas-background:dark"
        )
      ).toBe("#abcdef");
    });

    expect(screen.getByRole("application", { name: "Drawing canvas" }))
      .toHaveStyle({ backgroundColor: "#abcdef" });
    expect(
      screen.getByRole("button", {
        name: "Canvas background custom #abcdef"
      })
    ).toBeInTheDocument();
  });

  it("switches the editor theme from the main menu and stores it", () => {
    render(<KizkattGraphicEditor />);

    const board = screen.getByLabelText("Kizkatt diagram canvas");
    expect(board).toHaveClass("kizkatt-board--dark");

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Light theme" }));

    expect(board).toHaveClass("kizkatt-board--light");
    expect(window.localStorage.getItem("kizkatt:graphic-engine:theme")).toBe(
      "light"
    );
  });

  it("uses shifted default colors for the light theme", () => {
    storeTheme("light");

    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.pointerDown(canvas, { clientX: 40, clientY: 50 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 120 });
    fireEvent.pointerUp(canvas);

    const elementRect = canvas.querySelector("[data-element-id] rect");

    expect(elementRect).toHaveAttribute("fill", "#fbdfb8");
    expect(elementRect).toHaveAttribute("stroke", "#f08c00");
    expect(
      screen.getByRole("button", { name: "Background custom #fbdfb8" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Stroke custom #f08c00" })
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Background custom #fbdfb8" })
    );

    expect(
      screen.getByRole("button", { name: "backgroundColor palette #fbdfb8" })
    ).toHaveClass("is-active");
    expect(
      screen.getAllByRole("button", { name: /backgroundColor shade/ })[7]
    ).toHaveAttribute("aria-label", "backgroundColor shade #fbdfb8");
  });

  it("switches untouched default drawing colors with the theme", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Light theme" }));
    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.pointerDown(canvas, { clientX: 40, clientY: 50 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 120 });
    fireEvent.pointerUp(canvas);

    const elementRect = canvas.querySelector("[data-element-id] rect");

    expect(elementRect).toHaveAttribute("fill", "#fbdfb8");
    expect(elementRect).toHaveAttribute("stroke", "#f08c00");
  });

  it("closes the main menu when clicking on the canvas", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    expect(screen.getByRole("navigation", { name: "Canvas menu" }))
      .toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole("application", { name: "Drawing canvas" }));

    expect(screen.queryByRole("navigation", { name: "Canvas menu" })).not
      .toBeInTheDocument();
  });

  it("shows the style panel for drawing tools without covering the main menu", () => {
    render(<KizkattGraphicEditor />);

    expect(screen.queryByLabelText("Element style")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    expect(screen.getByLabelText("Element style")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    expect(screen.queryByLabelText("Element style")).not.toBeInTheDocument();
  });

  it("keeps copied toolbar icons under the original source names", () => {
    expect(Icons.LockedIcon).toBeTruthy();
    expect(Icons.SelectionIcon).toBeTruthy();
    expect(Icons.RectangleIcon).toBeTruthy();
    expect(Icons.DiamondIcon).toBeTruthy();
    expect(Icons.EllipseIcon).toBeTruthy();
    expect(Icons.ArrowIcon).toBeTruthy();
    expect(Icons.LineIcon).toBeTruthy();
    expect(Icons.FreedrawIcon).toBeTruthy();
    expect(Icons.TextIcon).toBeTruthy();
    expect(Icons.ImageIcon).toBeTruthy();
    expect(Icons.EraserIcon).toBeTruthy();
    expect(Icons.StrokeStyleSolidIcon).toBeTruthy();
    expect(Icons.StrokeStyleDashedIcon).toBeTruthy();
    expect(Icons.StrokeStyleDottedIcon).toBeTruthy();
    expect(Icons.EdgeSharpIcon).toBeTruthy();
    expect(Icons.EdgeRoundIcon).toBeTruthy();
    expect(Icons.HamburgerMenuIcon).toBeTruthy();
    expect(Icons.OpenIcon).toBeTruthy();
    expect(Icons.ExportIcon).toBeTruthy();
    expect(Icons.ResetIcon).toBeTruthy();
    expect(Icons.SunIcon).toBeTruthy();
    expect(Icons.MoonIcon).toBeTruthy();
    expect(Icons.UndoIcon).toBeTruthy();
    expect(Icons.RedoIcon).toBeTruthy();
    expect(Icons.handIcon).toBeTruthy();
  });

  it("creates a rectangle on the SVG canvas", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.pointerDown(canvas, { clientX: 40, clientY: 50 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 120 });
    fireEvent.pointerUp(canvas);

    expect(canvas.querySelector("[data-element-id]")).toBeInTheDocument();
  });

  it("does not create throwaway line elements from a click without dragging", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Line" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.pointerDown(canvas, { clientX: 40, clientY: 50 });
    fireEvent.pointerUp(canvas, { clientX: 40, clientY: 50 });

    expect(canvas.querySelector("[data-element-id]")).not.toBeInTheDocument();
  });

  it("returns to select mode after drawing an element", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    expect(canvas).toHaveStyle({ cursor: "crosshair" });

    fireEvent.pointerDown(canvas, { clientX: 40, clientY: 50 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 120 });
    fireEvent.pointerUp(canvas);

    expect(screen.getByRole("button", { name: "Select" })).toHaveClass(
      "is-active"
    );
    expect(canvas).toHaveStyle({ cursor: "default" });
  });

  it("shows rotate handles only after drawing finishes", () => {
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    fireEvent.pointerDown(canvas, { clientX: 40, clientY: 50 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 120 });

    expect(canvas.querySelector(".kizkatt-rotate-handle")).not
      .toBeInTheDocument();

    fireEvent.pointerUp(canvas);

    expect(canvas.querySelector(".kizkatt-rotate-handle")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Line" }));
    fireEvent.pointerDown(canvas, { clientX: 220, clientY: 50 });
    fireEvent.pointerMove(canvas, { clientX: 320, clientY: 120 });

    const rotateHandlesWhileDrawing = canvas.querySelectorAll(
      ".kizkatt-rotate-handle"
    );
    expect(rotateHandlesWhileDrawing).toHaveLength(0);

    fireEvent.pointerUp(canvas);

    expect(canvas.querySelector(".kizkatt-rotate-handle")).toBeInTheDocument();
  });

  it("keeps the rectangle rotate handle on the element rotation orbit", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.pointerDown(canvas, { clientX: 40, clientY: 50 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 120 });
    fireEvent.pointerUp(canvas);

    const initialRotateHandle = canvas.querySelector(
      "[data-element-id] .kizkatt-rotate-handle"
    );
    const initialCx = initialRotateHandle?.getAttribute("cx");
    const initialCy = initialRotateHandle?.getAttribute("cy");
    expect(initialCx).toBeTruthy();
    expect(initialCy).toBeTruthy();

    fireEvent.pointerDown(initialRotateHandle as Element, {
      clientX: 100,
      clientY: 26
    });
    fireEvent.pointerMove(canvas, { clientX: 180, clientY: 140 });
    fireEvent.pointerUp(canvas);

    const elementGroup = canvas.querySelector("[data-element-id]");
    const rotatedHandle = canvas.querySelector(
      "[data-element-id] .kizkatt-rotate-handle"
    );
    expect(elementGroup?.getAttribute("transform")).not.toContain("rotate(0");
    expect(rotatedHandle).toHaveAttribute("cx", initialCx);
    expect(rotatedHandle).toHaveAttribute("cy", initialCy);
  });

  it("shows resize handles on every selected rectangle corner", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.pointerDown(canvas, { clientX: 40, clientY: 50 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 120 });
    fireEvent.pointerUp(canvas);

    const resizeHandles = Array.from(
      canvas.querySelectorAll("[data-resize-handle]")
    ).map((handle) => handle.getAttribute("data-resize-handle"));

    expect(resizeHandles).toEqual(["nw", "ne", "se", "sw"]);
  });

  it("opens color shades and applies transparent and hex colors", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.pointerDown(canvas, { clientX: 40, clientY: 50 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 120 });
    fireEvent.pointerUp(canvas);

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
    expect(
      screen.getByLabelText("strokeColor native color picker")
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

    fireEvent.change(screen.getByLabelText("strokeColor native color picker"), {
      target: { value: "#abcdef" }
    });
    expect(elementRect).toHaveAttribute("stroke", "#abcdef");
    expect(screen.queryByText("User Colors")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Background custom #653b00" })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "backgroundColor palette transparent" })
    );
    expect(elementRect).toHaveAttribute("fill", "transparent");
    expect(screen.queryByRole("dialog", { name: "Stroke colors" })).not
      .toBeInTheDocument();
  });

  it("applies stroke style and edge controls from the style panel", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.pointerDown(canvas, { clientX: 40, clientY: 50 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 120 });
    fireEvent.pointerUp(canvas);

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

  it("runs duplicate and delete actions from the style panel", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.pointerDown(canvas, { clientX: 40, clientY: 50 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 120 });
    fireEvent.pointerUp(canvas);

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
    const handles: ResizeHandle[] = ["nw", "ne", "se", "sw"];
    const xAxis = {
      x: Math.cos(element.angle),
      y: Math.sin(element.angle)
    };
    const yAxis = {
      x: -Math.sin(element.angle),
      y: Math.cos(element.angle)
    };
    const signs: Record<ResizeHandle, { sx: -1 | 1; sy: -1 | 1 }> = {
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

  it("selects all elements intersecting a dragged selection area", () => {
    const elements = [
      {
        angle: 0,
        backgroundColor: "#ffec99",
        height: 80,
        id: "rectangle",
        opacity: 100,
        strokeColor: "#d6d6d6",
        strokeStyle: "solid" as const,
        strokeWidth: 2,
        type: "rectangle" as const,
        width: 100,
        x: 40,
        y: 40
      },
      {
        angle: 0,
        backgroundColor: "#ffec99",
        height: 60,
        id: "ellipse",
        opacity: 100,
        strokeColor: "#d6d6d6",
        strokeStyle: "solid" as const,
        strokeWidth: 2,
        type: "ellipse" as const,
        width: 120,
        x: 240,
        y: 220
      },
      {
        angle: 0,
        backgroundColor: "transparent",
        height: 40,
        id: "line",
        opacity: 100,
        strokeColor: "#d6d6d6",
        strokeStyle: "solid" as const,
        strokeWidth: 2,
        type: "line" as const,
        width: 160,
        x: 170,
        y: 120
      }
    ];

    expect(
      getElementIdsInSelectionArea(elements, { x: 30, y: 30 }, { x: 380, y: 300 })
    ).toEqual(["rectangle", "ellipse", "line"]);
    expect(
      getElementIdsInSelectionArea(elements, { x: 150, y: 100 }, { x: 220, y: 160 })
    ).toEqual(["line"]);
  });

  it("shows shared transform handles for a multi-selection", () => {
    render(<KizkattGraphicEditor />);

    const board = screen.getByLabelText("Kizkatt diagram canvas");
    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    fireEvent.pointerDown(canvas, { clientX: 40, clientY: 40 });
    fireEvent.pointerMove(canvas, { clientX: 140, clientY: 100 });
    fireEvent.pointerUp(canvas);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    fireEvent.pointerDown(canvas, { clientX: 200, clientY: 160 });
    fireEvent.pointerMove(canvas, { clientX: 280, clientY: 220 });
    fireEvent.pointerUp(canvas);

    fireEvent.keyDown(board, { ctrlKey: true, key: "a" });

    const groupHandle = canvas.querySelector(
      "[data-group-handle='resize'][data-resize-handle='se']"
    );
    const rotateHandle = canvas.querySelector(
      "[data-group-handle='rotate']"
    );

    expect(groupHandle).toBeInTheDocument();
    expect(rotateHandle).toBeInTheDocument();
  });

  it("resizes all selected elements from the group bounds", () => {
    const elements = [
      {
        angle: 0,
        backgroundColor: "#ffec99",
        height: 60,
        id: "first",
        opacity: 100,
        strokeColor: "#d6d6d6",
        strokeStyle: "solid" as const,
        strokeWidth: 2,
        type: "rectangle" as const,
        width: 100,
        x: 40,
        y: 40
      },
      {
        angle: 0,
        backgroundColor: "#a5d8ff",
        height: 60,
        id: "second",
        opacity: 100,
        strokeColor: "#d6d6d6",
        strokeStyle: "solid" as const,
        strokeWidth: 2,
        type: "rectangle" as const,
        width: 80,
        x: 200,
        y: 160
      }
    ];
    const resized = resizeElementsFromSelectionHandle(
      elements,
      ["first", "second"],
      { height: 180, width: 240, x: 40, y: 40 },
      "se",
      { x: 400, y: 300 }
    );

    expect(resized[0].x).toBe(40);
    expect(resized[0].y).toBe(40);
    expect(resized[0].width).toBeCloseTo(150);
    expect(resized[0].height).toBeCloseTo(86.67);
    expect(resized[1].x).toBeCloseTo(280);
    expect(resized[1].y).toBeCloseTo(213.33);
    expect(resized[1].width).toBeCloseTo(120);
    expect(resized[1].height).toBeCloseTo(86.67);
  });

  it("rotates all selected elements around the group center", () => {
    const elements = [
      {
        angle: 0,
        backgroundColor: "#ffec99",
        height: 60,
        id: "first",
        opacity: 100,
        strokeColor: "#d6d6d6",
        strokeStyle: "solid" as const,
        strokeWidth: 2,
        type: "rectangle" as const,
        width: 100,
        x: 40,
        y: 40
      },
      {
        angle: 0,
        backgroundColor: "#a5d8ff",
        height: 60,
        id: "second",
        opacity: 100,
        strokeColor: "#d6d6d6",
        strokeStyle: "solid" as const,
        strokeWidth: 2,
        type: "rectangle" as const,
        width: 80,
        x: 200,
        y: 160
      }
    ];
    const rotated = rotateElementsAroundPoint(
      elements,
      ["first", "second"],
      { x: 160, y: 130 },
      Math.PI / 2
    );

    expect(rotated[0].angle).toBe(Math.PI / 2);
    expect(rotated[0].x).toBeCloseTo(170);
    expect(rotated[0].y).toBeCloseTo(30);
    expect(rotated[1].angle).toBe(Math.PI / 2);
    expect(rotated[1].x).toBeCloseTo(60);
    expect(rotated[1].y).toBeCloseTo(180);
  });

  it("supports undo and redo for element creation", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.pointerDown(canvas, { clientX: 40, clientY: 50 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 120 });
    fireEvent.pointerUp(canvas);

    expect(canvas.querySelector("[data-element-id]")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(canvas.querySelector("[data-element-id]")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Redo" }));
    expect(canvas.querySelector("[data-element-id]")).toBeInTheDocument();
  });

  it("deletes the selected element with Delete", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const board = screen.getByLabelText("Kizkatt diagram canvas");
    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.pointerDown(canvas, { clientX: 40, clientY: 50 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 120 });
    fireEvent.pointerUp(canvas);

    expect(canvas.querySelector("[data-element-id]")).toBeInTheDocument();

    fireEvent.keyDown(board, { key: "Delete" });

    expect(canvas.querySelector("[data-element-id]")).not.toBeInTheDocument();
  });

  it("opens a text editor when placing text on the canvas", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Text" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.pointerDown(canvas, { clientX: 40, clientY: 50 });

    const editor = screen.getByRole("textbox", { name: "Edit text" });
    fireEvent.change(editor, { target: { value: "Hello Kizkatt" } });

    expect(editor).toHaveValue("Hello Kizkatt");
    expect(canvas).toHaveTextContent("Hello Kizkatt");
  });

  it("inserts selected image files on the canvas", () => {
    class FileReaderMock {
      result = "data:image/png;base64,kizkatt";
      onload: (() => void) | null = null;

      readAsDataURL() {
        this.onload?.();
      }
    }

    vi.stubGlobal("FileReader", FileReaderMock);
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Image" }));
    fireEvent.change(screen.getByLabelText("Choose image"), {
      target: {
        files: [new File(["kizkatt"], "kizkatt.png", { type: "image/png" })]
      }
    });

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.pointerDown(canvas, { clientX: 40, clientY: 50 });

    expect(canvas.querySelector("image")).toHaveAttribute(
      "href",
      "data:image/png;base64,kizkatt"
    );
  });

  it("pastes clipboard text as a text element", () => {
    render(<KizkattGraphicEditor />);

    const board = screen.getByLabelText("Kizkatt diagram canvas");
    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.paste(board, {
      clipboardData: {
        files: [],
        getData: (type: string) =>
          type === "text/plain" ? "Hello from clipboard" : "",
        items: []
      }
    });

    expect(canvas).toHaveTextContent("Hello from clipboard");
    expect(canvas.querySelector("[data-element-id] text")).toBeInTheDocument();
  });

  it("pastes clipboard images as image elements", () => {
    class FileReaderMock {
      result = "data:image/png;base64,clipboard";
      onload: (() => void) | null = null;

      readAsDataURL() {
        this.onload?.();
      }
    }

    vi.stubGlobal("FileReader", FileReaderMock);
    render(<KizkattGraphicEditor />);

    const imageFile = new File(["kizkatt"], "clipboard.png", {
      type: "image/png"
    });
    const board = screen.getByLabelText("Kizkatt diagram canvas");
    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.paste(board, {
      clipboardData: {
        files: [imageFile],
        getData: () => "",
        items: [
          {
            getAsFile: () => imageFile,
            type: "image/png"
          }
        ]
      }
    });

    expect(canvas.querySelector("image")).toHaveAttribute(
      "href",
      "data:image/png;base64,clipboard"
    );
  });

  it("ignores unsupported clipboard content", () => {
    render(<KizkattGraphicEditor />);

    const board = screen.getByLabelText("Kizkatt diagram canvas");
    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.paste(board, {
      clipboardData: {
        files: [],
        getData: () => "",
        items: [
          {
            getAsFile: () => null,
            type: "application/json"
          }
        ]
      }
    });

    expect(canvas.querySelector("[data-element-id]")).not.toBeInTheDocument();
  });

  it("selects lines with endpoint handles instead of a rectangle frame", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Line" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.pointerDown(canvas, { clientX: 40, clientY: 50 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 120 });
    fireEvent.pointerUp(canvas);

    expect(canvas.querySelector(".kizkatt-line-overlay")).toBeInTheDocument();
    expect(canvas.querySelector(".kizkatt-line-overlay rect")).not
      .toBeInTheDocument();
  });

  it("rotates selected lines through the rotate handle", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Line" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.pointerDown(canvas, { clientX: 40, clientY: 50 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 120 });
    fireEvent.pointerUp(canvas);

    const elementGroup = canvas.querySelector("[data-element-id]");
    expect(elementGroup?.getAttribute("transform")).toContain("rotate(0");

    const rotateHandle = canvas.querySelector("[data-handle='rotate']");
    expect(rotateHandle).toBeInTheDocument();

    fireEvent.pointerDown(rotateHandle as Element, { clientX: 100, clientY: 40 });
    fireEvent.pointerMove(canvas, { clientX: 180, clientY: 140 });
    fireEvent.pointerUp(canvas);

    expect(elementGroup?.getAttribute("transform")).not.toContain("rotate(0");
  });

  it("does not show the freehand selection frame while drawing", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Draw" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(canvas, { clientX: 140, clientY: 180 });

    expect(canvas.querySelector("[data-element-id] path")).toBeInTheDocument();
    expect(canvas.querySelector(".kizkatt-selection-overlay")).not
      .toBeInTheDocument();

    fireEvent.pointerUp(canvas);

    expect(canvas.querySelector(".kizkatt-selection-overlay")).toBeInTheDocument();
  });

  it("can select, resize, and rotate freehand drawings after creation", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Draw" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(canvas, { clientX: 140, clientY: 180 });
    fireEvent.pointerMove(canvas, { clientX: 200, clientY: 130 });
    fireEvent.pointerUp(canvas);

    expect(canvas.querySelector(".kizkatt-selection-overlay")).toBeInTheDocument();

    const resizeHandle = canvas.querySelector("[data-resize-handle='se']");
    expect(resizeHandle).toBeInTheDocument();

    fireEvent.pointerDown(resizeHandle as Element, {
      clientX: 200,
      clientY: 180
    });
    fireEvent.pointerMove(canvas, { clientX: 260, clientY: 240 });
    fireEvent.pointerUp(canvas);

    const rotateHandle = canvas.querySelector("[data-handle='rotate']");
    const elementGroup = canvas.querySelector("[data-element-id]");
    expect(rotateHandle).toBeInTheDocument();

    fireEvent.pointerDown(rotateHandle as Element, {
      clientX: 150,
      clientY: 90
    });
    fireEvent.pointerMove(canvas, { clientX: 240, clientY: 220 });
    fireEvent.pointerUp(canvas);

    expect(elementGroup?.getAttribute("transform")).not.toContain("rotate(0");
  });

  it("inserts bend points on straight lines from the midpoint handle", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Line" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.pointerDown(canvas, { clientX: 40, clientY: 50 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 50 });

    expect(canvas.querySelector(".kizkatt-bend-handle")).not.toBeInTheDocument();

    fireEvent.pointerUp(canvas);

    expect(canvas.querySelector("[data-element-id] line")).toBeInTheDocument();
    expect(canvas.querySelector(".kizkatt-bend-handle")).toBeInTheDocument();
    expect(canvas.querySelector(".kizkatt-selection-overlay")).not
      .toBeInTheDocument();

    const bendHandle = canvas.querySelector(".kizkatt-bend-handle");
    fireEvent.pointerDown(bendHandle as Element, { clientX: 100, clientY: 50 });
    fireEvent.pointerMove(canvas, { clientX: 100, clientY: 20 });
    fireEvent.pointerUp(canvas);

    const curvePath = canvas.querySelector("[data-element-id] path");
    expect(curvePath?.getAttribute("d")).toContain(" C ");
    expect(canvas.querySelectorAll(".kizkatt-bend-point-handle")).toHaveLength(1);
    expect(canvas.querySelectorAll(".kizkatt-bend-handle")).toHaveLength(2);
    expect(canvas.querySelector(".kizkatt-selection-overlay")).toBeInTheDocument();
    expect(canvas.querySelector(".kizkatt-bend-handle")).toBeInTheDocument();
  });

  it("opens the canvas context menu with expected actions", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.contextMenu(
      screen.getByRole("application", { name: "Drawing canvas" }),
      { clientX: 80, clientY: 90 }
    );

    expect(screen.getByRole("menu", { name: "Canvas context menu" }))
      .toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Paste/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Copy to clipboard as PNG" }))
      .toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Copy to clipboard as SVG" }))
      .toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Select all/ }))
      .toBeInTheDocument();
    expect(screen.getByRole("menuitemcheckbox", { name: /Toggle grid/ }))
      .toBeInTheDocument();
  });

  it("toggles the grid from the canvas context menu", () => {
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    expect(canvas.querySelector(".kizkatt-grid")).toBeInTheDocument();

    fireEvent.contextMenu(canvas, { clientX: 80, clientY: 90 });
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: /Toggle grid/ }));

    expect(canvas.querySelector(".kizkatt-grid")).not.toBeInTheDocument();
  });

  it("blocks drawing shortcuts while preserving edit shortcuts", () => {
    const downstreamKeyDown = vi.fn();

    render(
      <div onKeyDown={downstreamKeyDown}>
        <KizkattGraphicEditor />
      </div>
    );

    const board = screen.getByLabelText("Kizkatt diagram canvas");

    fireEvent.keyDown(board, { key: "r" });
    expect(downstreamKeyDown).not.toHaveBeenCalled();

    fireEvent.keyDown(board, { key: "z", ctrlKey: true });
    expect(downstreamKeyDown).toHaveBeenCalledTimes(1);
  });
});
