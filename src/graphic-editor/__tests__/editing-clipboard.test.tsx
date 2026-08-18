import { describe, it } from "vitest";
import { storeCanvasState } from "../platform/storage";
import {
  act,
  chooseGroupedTool,
  KizkattGraphicEditor,
  expect,
  fireEvent,
  firePointerEvent,
  getCirclePoint,
  render,
  screen,
  vi,
  waitFor
} from "./testUtils";
import { serializeSvg } from "../ui/canvas/svgExport";

function hoverContextSubmenuItem(element: Element) {
  const submenuItem = element.closest(".kizkatt-context-menu-submenu-item");

  expect(submenuItem).toBeInTheDocument();
  fireEvent.mouseEnter(submenuItem as Element);
}

describe("KizkattGraphicEditor editing and clipboard", () => {
  it("shows a loader while an image file is being read and decoded", () => {
    let completeRead = () => {};

    class FileReaderMock {
      result = "data:image/png;base64,deferred";
      onerror: (() => void) | null = null;
      onload: (() => void) | null = null;

      readAsDataURL() {
        completeRead = () => this.onload?.();
      }
    }
    class ImageMock {
      complete = false;
      naturalHeight = 100;
      naturalWidth = 200;
      onerror: (() => void) | null = null;
      onload: (() => void) | null = null;

      set src(_value: string) {
        this.complete = true;
        this.onload?.();
      }
    }

    vi.stubGlobal("FileReader", FileReaderMock);
    vi.stubGlobal("Image", ImageMock);
    render(<KizkattGraphicEditor />);

    fireEvent.change(screen.getByLabelText("Choose image"), {
      target: {
        files: [new File(["kizkatt"], "kizkatt.png", { type: "image/png" })]
      }
    });

    expect(screen.getByRole("status", { name: "Loading" }))
      .toBeInTheDocument();

    act(() => completeRead());

    expect(screen.queryByRole("status", { name: "Loading" })).not
      .toBeInTheDocument();
  });

  it("serializes selected objects as a cropped transparent export", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "#653b00",
          height: 70,
          id: "selected-rectangle",
          opacity: 100,
          strokeColor: "#f08c00",
          strokeStyle: "solid",
          strokeWidth: 10,
          type: "rectangle",
          width: 120,
          x: 40,
          y: 50
        },
        {
          angle: 0,
          backgroundColor: "#0b3556",
          height: 70,
          id: "unselected-rectangle",
          opacity: 100,
          strokeColor: "#1971c2",
          strokeStyle: "solid",
          strokeWidth: 10,
          type: "rectangle",
          width: 120,
          x: 240,
          y: 50
        }
      ],
      selectedIds: ["selected-rectangle"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = document.querySelector<SVGSVGElement>(
      "svg[role='application'][aria-label='Drawing canvas']"
    );
    expect(canvas).not.toBeNull();

    if (!canvas) {
      throw new Error("Drawing canvas was not rendered");
    }
    const exportOptions = {
      bounds: { height: 90, width: 140, x: 30, y: 40 },
      elementIds: ["selected-rectangle"],
      pixelRatio: 2,
      transparentBackground: true
    };
    const screenDpiMarkup = serializeSvg(
      canvas,
      exportOptions
    );
    const markup = serializeSvg(canvas, {
      ...exportOptions,
      scaleStrokes: true
    });

    expect(screenDpiMarkup).toContain("vector-effect");
    expect(markup).toContain('width="280"');
    expect(markup).toContain('height="180"');
    expect(markup).toContain('viewBox="30 40 140 90"');
    expect(markup).toContain('data-element-id="selected-rectangle"');
    expect(markup).not.toContain("unselected-rectangle");
    expect(markup).not.toContain("kizkatt-grid");
    expect(markup).not.toContain("vector-effect");
    expect(markup).toContain("background: transparent");
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

  it("pastes clipboard images as fitted image elements", async () => {
    class FileReaderMock {
      result = "data:image/png;base64,clipboard";
      onload: (() => void) | null = null;

      readAsDataURL() {
        this.onload?.();
      }
    }
    class ImageMock {
      complete = false;
      naturalHeight = 400;
      naturalWidth = 800;
      onload: (() => void) | null = null;

      set src(_value: string) {
        this.complete = true;
        this.onload?.();
      }
    }

    vi.stubGlobal("FileReader", FileReaderMock);
    vi.stubGlobal("Image", ImageMock);
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
    await waitFor(() => {
      expect(canvas.querySelector("image")).toHaveAttribute("width", "480");
      expect(canvas.querySelector("image")).toHaveAttribute("height", "240");
    });
  });

  it("copies selected objects from the context menu for object paste", async () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "#653b00",
          height: 70,
          id: "selected-rectangle",
          opacity: 100,
          strokeColor: "#f08c00",
          strokeStyle: "solid",
          strokeWidth: 10,
          type: "rectangle",
          width: 120,
          x: 40,
          y: 50
        }
      ],
      selectedIds: ["selected-rectangle"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.contextMenu(canvas, { clientX: 80, clientY: 90 });
    fireEvent.click(screen.getByRole("menuitem", { name: /Copy/ }));
    fireEvent.contextMenu(canvas, { clientX: 180, clientY: 190 });
    fireEvent.click(screen.getByRole("menuitem", { name: /Paste/ }));

    await waitFor(() => {
      expect(canvas.querySelectorAll("[data-element-id]")).toHaveLength(2);
    });
  });

  it("pastes SVG code from the context menu as an editable inline SVG object", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: vi.fn().mockResolvedValue(
          '<svg width="80" height="40" viewBox="0 0 80 40"><rect width="80" height="40" fill="red"/></svg>'
        )
      }
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.contextMenu(canvas, { clientX: 80, clientY: 90 });
    hoverContextSubmenuItem(screen.getByRole("menuitem", { name: /Paste/ }));
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Paste SVG code as object" })
    );

    await waitFor(() => {
      expect(canvas.querySelector(".kizkatt-inline-svg-object"))
        .toHaveAttribute("width", "80");
      expect(canvas.querySelector(".kizkatt-inline-svg-object"))
        .toHaveAttribute("height", "40");
    });
    expect(canvas.querySelector("image")).not.toBeInTheDocument();
    expect(canvas.querySelector(".kizkatt-inline-svg-object rect"))
      .toBeInTheDocument();
  });

  it("automatically breaks apart Kizkatt SVG exports on paste", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: vi.fn().mockResolvedValue(`
          <svg class="kizkatt-canvas" role="application" aria-label="Drawing canvas" width="200" height="120" viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg">
            <g>
              <g data-element-id="exported-rectangle" data-element-type="rectangle">
                <rect x="10" y="20" width="80" height="40" rx="12" fill="#653b00" stroke="#f08c00" stroke-width="21" stroke-opacity="0" data-stroke-style="wavy" />
                <path d="M 22 20 L 30 24 L 38 20" fill="none" stroke="#f08c00" stroke-width="21" data-decorative-stroke="wavy" />
              </g>
              <g data-element-id="exported-image" data-element-type="image" data-image-border-enabled="true">
                <image href="data:image/svg+xml,%3Csvg%3E%3Crect%20width%3D%2210%22%20height%3D%2210%22%2F%3E%3C%2Fsvg%3E" x="120" y="20" width="50" height="40" />
                <rect data-image-border="true" x="120" y="20" width="50" height="40" rx="0" fill="none" stroke="#1971c2" stroke-width="6" data-stroke-style="dashed" />
              </g>
            </g>
          </svg>
        `)
      }
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.contextMenu(canvas, { clientX: 80, clientY: 90 });
    hoverContextSubmenuItem(screen.getByRole("menuitem", { name: /Paste/ }));
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Paste SVG code as object" })
    );

    await waitFor(() => {
      expect(canvas.querySelectorAll("[data-element-id]")).toHaveLength(2);
    });

    const exportedRect = canvas.querySelector(
      "[data-element-type='rectangle'] > rect"
    );
    const image = canvas.querySelector("[data-element-type='image'] > image");
    const imageBorder = canvas.querySelector(
      "[data-element-type='image'] > [data-image-border]"
    );

    expect(canvas.querySelector(".kizkatt-inline-svg-object")).not
      .toBeInTheDocument();
    expect(exportedRect).toHaveAttribute("stroke", "#f08c00");
    expect(exportedRect).toHaveAttribute("stroke-width", "21");
    expect(exportedRect).toHaveAttribute("data-stroke-style", "wavy");
    expect(canvas.querySelector("[data-decorative-stroke='wavy']"))
      .toBeInTheDocument();
    expect(image).toHaveAttribute(
      "href",
      "data:image/svg+xml,%3Csvg%3E%3Crect%20width%3D%2210%22%20height%3D%2210%22%2F%3E%3C%2Fsvg%3E"
    );
    expect(imageBorder).toHaveAttribute("stroke", "#1971c2");
    expect(imageBorder).toHaveAttribute("stroke-width", "6");
    expect(imageBorder).toHaveAttribute("data-stroke-style", "dashed");
    expect(imageBorder).toHaveAttribute("rx", "0");
  });

  it("breaks apart Kizkatt SVG objects while keeping image children as images", async () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "transparent",
          fillStyle: "solid",
          fillWeight: 1,
          height: 120,
          id: "svg-object",
          name: "Image 1",
          opacity: 100,
          sloppiness: "architect",
          sloppinessGap: 16,
          strokeColor: "#1971c2",
          strokeStyle: "solid",
          strokeWidth: 4,
          svgContent: `
            <g>
              <g data-element-id="exported-rectangle" data-element-type="rectangle">
                <rect x="10" y="20" width="80" height="40" rx="12" fill="#653b00" stroke="#f08c00" stroke-width="10" stroke-dasharray="14.5 8 2 8" />
              </g>
              <g data-element-id="exported-image" data-element-type="image">
                <image href="data:image/svg+xml,%3Csvg%3E%3Crect%20width%3D%2210%22%20height%3D%2210%22%2F%3E%3C%2Fsvg%3E" x="120" y="20" width="50" height="40" />
              </g>
            </g>
          `,
          svgUseElementStyle: false,
          svgViewBox: "0 0 200 120",
          type: "image",
          width: 200,
          x: 40,
          y: 50
        }
      ],
      selectedIds: ["svg-object"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.contextMenu(canvas, { clientX: 80, clientY: 90 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Break apart" }));

    await waitFor(() => {
      expect(canvas.querySelectorAll("[data-element-id]")).toHaveLength(2);
    });

    const rectangle = canvas.querySelector(
      "[data-element-type='rectangle'] > rect"
    );
    const image = canvas.querySelector("[data-element-type='image'] > image");

    expect(rectangle).toHaveAttribute("stroke", "#f08c00");
    expect(rectangle).toHaveAttribute("stroke-width", "10");
    expect(rectangle).toHaveAttribute("stroke-dasharray", "4.50 18 0 18");
    expect(image).toHaveAttribute(
      "href",
      "data:image/svg+xml,%3Csvg%3E%3Crect%20width%3D%2210%22%20height%3D%2210%22%2F%3E%3C%2Fsvg%3E"
    );
  });

  it("manually breaks apart generic SVG objects into editable elements", async () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "transparent",
          fillStyle: "solid",
          fillWeight: 1,
          height: 240,
          id: "generic-svg-object",
          name: "Image 1",
          opacity: 100,
          sloppiness: "architect",
          sloppinessGap: 16,
          strokeColor: "#f08c00",
          strokeStyle: "solid",
          strokeWidth: 4,
          svgContent: `
            <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <rect x="2" y="3" width="8" height="6" fill="#653b00" stroke="#f08c00" stroke-width="1.5" />
              <circle cx="18" cy="6" r="3" fill="#1971c2" stroke="#2f9e44" stroke-width="1" />
              <path d="M4 18 C 8 10 16 26 20 18" />
            </g>
          `,
          svgUseElementStyle: true,
          svgViewBox: "0 0 24 24",
          type: "image",
          width: 240,
          x: 40,
          y: 50
        }
      ],
      selectedIds: ["generic-svg-object"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.contextMenu(canvas, { clientX: 80, clientY: 90 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Break apart" }));

    await waitFor(() => {
      expect(canvas.querySelectorAll("[data-element-id]")).toHaveLength(3);
    });

    const rectangle = canvas.querySelector(
      "[data-element-type='rectangle'] > rect"
    );
    const ellipse = canvas.querySelector("[data-element-type='ellipse'] > ellipse");
    const drawPath = canvas.querySelector("[data-element-type='draw'] > path");

    expect(canvas.querySelector(".kizkatt-inline-svg-object")).not
      .toBeInTheDocument();
    expect(rectangle).toHaveAttribute("fill", "#653b00");
    expect(rectangle).toHaveAttribute("stroke", "#f08c00");
    expect(ellipse).toHaveAttribute("fill", "#1971c2");
    expect(ellipse).toHaveAttribute("stroke", "#f08c00");
    expect(drawPath).toHaveAttribute("stroke", "#f08c00");
    expect(drawPath?.getAttribute("d")).toContain("C");

    fireEvent.change(screen.getByLabelText("Stroke width value"), {
      target: { value: "8" }
    });

    await waitFor(() => {
      expect(drawPath).toHaveAttribute("stroke-width", "8");
    });
  });

  it("preserves fitted aspect ratio when breaking apart generic SVG objects", async () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "transparent",
          fillStyle: "solid",
          fillWeight: 1,
          height: 480,
          id: "tall-svg-object",
          name: "Image 1",
          opacity: 100,
          sloppiness: "architect",
          sloppinessGap: 16,
          strokeColor: "#f08c00",
          strokeStyle: "solid",
          strokeWidth: 1.5,
          svgContent: `
            <rect x="0" y="0" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" />
          `,
          svgUseElementStyle: true,
          svgViewBox: "0 0 24 24",
          type: "image",
          width: 240,
          x: 40,
          y: 50
        }
      ],
      selectedIds: ["tall-svg-object"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.contextMenu(canvas, { clientX: 80, clientY: 90 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Break apart" }));

    await waitFor(() => {
      expect(canvas.querySelectorAll("[data-element-id]")).toHaveLength(1);
    });

    const rectangle = canvas.querySelector(
      "[data-element-type='rectangle'] > rect"
    );

    expect(rectangle).toHaveAttribute("x", "40");
    expect(rectangle).toHaveAttribute("y", "170");
    expect(rectangle).toHaveAttribute("width", "240");
    expect(rectangle).toHaveAttribute("height", "240");
  });

  it("pastes SVG fragment code from icon snippets", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: vi.fn().mockResolvedValue(`
          <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M14.5 8.5l1-1" />
            <path d="M9.2 15.8l6.3-6.3" />
          </g>
        `)
      }
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.contextMenu(canvas, { clientX: 80, clientY: 90 });
    hoverContextSubmenuItem(screen.getByRole("menuitem", { name: /Paste/ }));
    fireEvent.click(
      screen.getByRole("menuitem", { name: "Paste SVG code as object" })
    );

    await waitFor(() => {
      expect(canvas.querySelector(".kizkatt-inline-svg-object"))
        .toHaveAttribute("width", "24");
      expect(canvas.querySelector(".kizkatt-inline-svg-object"))
        .toHaveAttribute("height", "24");
    });

    const inlineSvg = canvas.querySelector(
      ".kizkatt-inline-svg-object"
    ) as SVGSVGElement;

    expect(inlineSvg).toHaveAttribute("viewBox", "0 0 24 24");
    expect(inlineSvg.innerHTML).toContain("stroke-linecap=\"round\"");
    expect(inlineSvg).toHaveAttribute("color", "#f08c00");

    fireEvent.change(screen.getByLabelText("Stroke width value"), {
      target: { value: "8" }
    });

    await waitFor(() => {
      expect(inlineSvg.style.getPropertyValue(
        "--kizkatt-inline-svg-stroke-width"
      )).toBe("8");
    });
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

    chooseGroupedTool("Arrow", "Line");

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    expect(canvas.querySelector(".kizkatt-line-overlay")).toBeInTheDocument();
    expect(canvas.querySelector(".kizkatt-line-overlay rect")).not
      .toBeInTheDocument();
  });

  it("resizes a selected line from either endpoint", () => {
    render(<KizkattGraphicEditor />);

    chooseGroupedTool("Arrow", "Line");

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    const startHandle = canvas.querySelector(
      "[data-line-endpoint='start']"
    );
    expect(startHandle).toHaveAttribute("data-endpoint-mode", "resize");
    firePointerEvent(startHandle as Element, "pointerdown", {
      clientX: 40,
      clientY: 50
    });
    firePointerEvent(canvas, "pointermove", { clientX: 20, clientY: 30 });

    expect(canvas.querySelector(".kizkatt-transform-preview-line"))
      .toHaveAttribute("d", "M 20 30 L 160 120");
    expect(
      canvas.querySelector(".kizkatt-transform-preview-bounds")
        ?.getAttribute("d")
    ).toContain("Z");

    firePointerEvent(canvas, "pointerup", { clientX: 20, clientY: 30 });

    const line = canvas.querySelector("[data-element-id] line");
    expect(line).toHaveAttribute("x1", "20");
    expect(line).toHaveAttribute("y1", "30");
    expect(line).toHaveAttribute("x2", "160");
    expect(line).toHaveAttribute("y2", "120");

    const endHandle = canvas.querySelector("[data-line-endpoint='end']");
    firePointerEvent(endHandle as Element, "pointerdown", {
      clientX: 160,
      clientY: 120
    });
    firePointerEvent(canvas, "pointermove", { clientX: 200, clientY: 150 });
    firePointerEvent(canvas, "pointerup", { clientX: 200, clientY: 150 });

    expect(line).toHaveAttribute("x1", "20");
    expect(line).toHaveAttribute("y1", "30");
    expect(line).toHaveAttribute("x2", "200");
    expect(line).toHaveAttribute("y2", "150");

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(line).toHaveAttribute("x1", "20");
    expect(line).toHaveAttribute("y1", "30");
    expect(line).toHaveAttribute("x2", "160");
    expect(line).toHaveAttribute("y2", "120");

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));
    expect(line).toHaveAttribute("x1", "40");
    expect(line).toHaveAttribute("y1", "50");
    expect(line).toHaveAttribute("x2", "160");
    expect(line).toHaveAttribute("y2", "120");
  });

  it("rotates selected lines through the rotate handle", () => {
    render(<KizkattGraphicEditor />);

    chooseGroupedTool("Arrow", "Line");

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    const elementGroup = canvas.querySelector("[data-element-id]");
    expect(elementGroup?.getAttribute("transform")).toContain("rotate(0");

    firePointerEvent(canvas, "pointerdown", { clientX: 80, clientY: 80 });
    firePointerEvent(canvas, "pointerup");

    const rotateHandle = canvas.querySelector("[data-handle='rotate']");
    expect(rotateHandle).toBeInTheDocument();
    const rotateHandlePoint = getCirclePoint(rotateHandle);

    firePointerEvent(rotateHandle as Element, "pointerdown", {
      clientX: rotateHandlePoint.x,
      clientY: rotateHandlePoint.y
    });
    firePointerEvent(canvas, "pointermove", {
      clientX: rotateHandlePoint.x + 48,
      clientY: rotateHandlePoint.y
    });

    const rotatePreviewLine = canvas.querySelector(
      ".kizkatt-transform-preview-line"
    );
    const rotatePreviewBounds = canvas.querySelector(
      ".kizkatt-transform-preview-bounds"
    );
    expect(rotatePreviewLine).toBeInTheDocument();
    expect(rotatePreviewLine?.getAttribute("d")).not.toContain("Z");
    expect(rotatePreviewBounds?.getAttribute("d")).toContain("Z");

    firePointerEvent(canvas, "pointerup");

    expect(elementGroup?.getAttribute("transform")).not.toContain("rotate(0");
  });

  it("does not show the freehand selection frame while drawing", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Draw" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 100, clientY: 100 });
    firePointerEvent(canvas, "pointermove", { clientX: 140, clientY: 180 });

    expect(canvas.querySelector("[data-element-id] path")).toBeInTheDocument();
    expect(canvas.querySelector(".kizkatt-selection-overlay")).not
      .toBeInTheDocument();

    firePointerEvent(canvas, "pointerup");

    expect(canvas.querySelector(".kizkatt-selection-overlay")).toBeInTheDocument();
  });

  it("can select, resize, and rotate freehand drawings after creation", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Draw" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 100, clientY: 100 });
    firePointerEvent(canvas, "pointermove", { clientX: 140, clientY: 180 });
    firePointerEvent(canvas, "pointermove", { clientX: 200, clientY: 130 });
    firePointerEvent(canvas, "pointerup");

    expect(canvas.querySelector(".kizkatt-selection-overlay")).toBeInTheDocument();

    const resizeHandle = canvas.querySelector("[data-resize-handle='se']");
    expect(resizeHandle).toBeInTheDocument();

    firePointerEvent(resizeHandle as Element, "pointerdown", {
      clientX: 200,
      clientY: 180
    });
    firePointerEvent(canvas, "pointermove", { clientX: 260, clientY: 240 });
    firePointerEvent(canvas, "pointerup");

    firePointerEvent(canvas, "pointerdown", { clientX: 132, clientY: 170 });
    firePointerEvent(canvas, "pointerup");

    const rotateHandle = canvas.querySelector("[data-handle='rotate']");
    const elementGroup = canvas.querySelector("[data-element-id]");
    expect(rotateHandle).toBeInTheDocument();
    const rotateHandlePoint = getCirclePoint(rotateHandle);

    firePointerEvent(rotateHandle as Element, "pointerdown", {
      clientX: rotateHandlePoint.x,
      clientY: rotateHandlePoint.y
    });
    firePointerEvent(canvas, "pointermove", {
      clientX: rotateHandlePoint.x + 48,
      clientY: rotateHandlePoint.y
    });
    firePointerEvent(canvas, "pointerup");

    expect(elementGroup?.getAttribute("transform")).not.toContain("rotate(0");
  });

});
