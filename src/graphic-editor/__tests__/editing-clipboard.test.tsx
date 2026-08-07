import { describe, it } from "vitest";
import { storeCanvasState } from "kizkatt-graphic-engine";
import {
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

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    const exportOptions = {
      bounds: { height: 90, width: 140, x: 30, y: 40 },
      elementIds: ["selected-rectangle"],
      pixelRatio: 2,
      transparentBackground: true
    };
    const screenDpiMarkup = serializeSvg(
      canvas as SVGSVGElement,
      exportOptions
    );
    const markup = serializeSvg(canvas as SVGSVGElement, {
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

  it("rotates selected lines through the rotate handle", () => {
    render(<KizkattGraphicEditor />);

    chooseGroupedTool("Arrow", "Line");

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    const elementGroup = canvas.querySelector("[data-element-id]");
    expect(elementGroup?.getAttribute("transform")).toContain("rotate(0");

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
