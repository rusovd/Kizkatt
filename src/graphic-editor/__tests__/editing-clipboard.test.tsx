import { describe, it } from "vitest";
import {
  chooseGroupedTool,
  KizkattGraphicEditor,
  expect,
  fireEvent,
  getCirclePoint,
  render,
  screen,
  vi,
  waitFor
} from "./testUtils";

describe("KizkattGraphicEditor editing and clipboard", () => {
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
    fireEvent.pointerDown(canvas, { clientX: 40, clientY: 50 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 120 });
    fireEvent.pointerUp(canvas);

    expect(canvas.querySelector(".kizkatt-line-overlay")).toBeInTheDocument();
    expect(canvas.querySelector(".kizkatt-line-overlay rect")).not
      .toBeInTheDocument();
  });

  it("rotates selected lines through the rotate handle", () => {
    render(<KizkattGraphicEditor />);

    chooseGroupedTool("Arrow", "Line");

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.pointerDown(canvas, { clientX: 40, clientY: 50 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 120 });
    fireEvent.pointerUp(canvas);

    const elementGroup = canvas.querySelector("[data-element-id]");
    expect(elementGroup?.getAttribute("transform")).toContain("rotate(0");

    const rotateHandle = canvas.querySelector("[data-handle='rotate']");
    expect(rotateHandle).toBeInTheDocument();
    const rotateHandlePoint = getCirclePoint(rotateHandle);

    fireEvent.pointerDown(rotateHandle as Element, {
      clientX: rotateHandlePoint.x,
      clientY: rotateHandlePoint.y
    });
    fireEvent.pointerMove(canvas, {
      clientX: rotateHandlePoint.x + 48,
      clientY: rotateHandlePoint.y
    });
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
    const rotateHandlePoint = getCirclePoint(rotateHandle);

    fireEvent.pointerDown(rotateHandle as Element, {
      clientX: rotateHandlePoint.x,
      clientY: rotateHandlePoint.y
    });
    fireEvent.pointerMove(canvas, {
      clientX: rotateHandlePoint.x + 48,
      clientY: rotateHandlePoint.y
    });
    fireEvent.pointerUp(canvas);

    expect(elementGroup?.getAttribute("transform")).not.toContain("rotate(0");
  });

});

