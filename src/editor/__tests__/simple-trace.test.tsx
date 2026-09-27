import { describe, it } from "vitest";
import { storeCanvasState } from "../platform/canvasStorage";

import {
  KizkattGraphicEditor,
  expect,
  fireEvent,
  render,
  screen,
  vi,
  waitFor
} from "./testUtils";

function openImageActions() {
  const imageButton = screen.getByRole("button", { name: "Image" });
  const submenuTrigger = imageButton.querySelector(
    ".kizkatt-submenu-indicator"
  );

  fireEvent.click(submenuTrigger as Element);
}

function mockTraceRaster() {
  const pixels = new Uint8ClampedArray(8 * 8 * 4);

  for (let y = 0; y < 8; y += 1) {
    for (let x = 0; x < 8; x += 1) {
      const offset = (y * 8 + x) * 4;
      const foreground = x >= 2 && x <= 5 && y >= 2 && y <= 5;
      pixels.set(
        foreground ? [220, 20, 30, 255] : [255, 255, 255, 255],
        offset
      );
    }
  }

  class ImageMock {
    complete = true;
    naturalHeight = 8;
    naturalWidth = 8;
    onerror: (() => void) | null = null;
    onload: (() => void) | null = null;

    set src(_value: string) {
      this.onload?.();
    }
  }

  vi.stubGlobal("Image", ImageMock);
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: vi.fn(),
    getImageData: () => ({ data: pixels })
  } as unknown as CanvasRenderingContext2D);
}

function storeBitmap(selected = true) {
  storeCanvasState({
    elements: [
      {
        angle: 0,
        backgroundColor: "transparent",
        height: 120,
        id: "bitmap",
        name: "Image 1",
        opacity: 100,
        src: "data:image/png;base64,kizkatt",
        strokeColor: "#000000",
        strokeStyle: "solid",
        strokeWidth: 0,
        type: "image",
        width: 160,
        x: 20,
        y: 30
      }
    ],
    selectedIds: selected ? ["bitmap"] : []
  });
}

describe("KizkattGraphicEditor simple trace", () => {
  it("enables simple trace only for one selected bitmap image", () => {
    render(<KizkattGraphicEditor />);
    openImageActions();

    expect(screen.getByRole("menuitem", { name: "Simple trace" }))
      .toBeDisabled();
  });

  it("opens simple trace from a bitmap context menu", async () => {
    mockTraceRaster();
    storeBitmap(false);
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", {
      name: "Drawing canvas"
    });
    const bitmap = canvas.querySelector("[data-element-id='bitmap'] image");

    fireEvent.contextMenu(bitmap as Element, { clientX: 80, clientY: 90 });

    const traceAction = screen.getByRole("menuitem", {
      name: "Simple trace"
    });

    fireEvent.click(traceAction);

    expect(screen.getByRole("dialog", { name: "Simple trace" }))
      .toBeInTheDocument();
    expect(screen.getByText("Image 1")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Trace" })).toBeEnabled();
    });
  });

  it("traces a selected bitmap and adds the vector result to the scene", async () => {
    mockTraceRaster();
    storeBitmap();
    render(<KizkattGraphicEditor />);
    openImageActions();

    const traceAction = screen.getByRole("menuitem", {
      name: "Simple trace"
    });
    expect(traceAction).toBeEnabled();
    fireEvent.click(traceAction);

    expect(screen.getByRole("dialog", { name: "Simple trace" }))
      .toBeInTheDocument();
    expect(screen.getByText("Image 1")).toBeInTheDocument();

    const applyButton = screen.getByRole("button", { name: "Trace" });
    await waitFor(() => expect(applyButton).toBeEnabled());
    fireEvent.click(applyButton);

    const canvas = screen.getByRole("application", {
      name: "Drawing canvas"
    });
    expect(canvas.querySelectorAll("[data-element-type='image']"))
      .toHaveLength(2);
    expect(canvas.querySelector("[data-element-type='image'] path"))
      .toBeInTheDocument();
  });
});
