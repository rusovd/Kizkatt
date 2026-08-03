import { describe, it } from "vitest";
import {
  chooseGroupedTool,
  KizkattGraphicEditor,
  expect,
  fireEvent,
  render,
  screen,
  vi
} from "./testUtils";

describe("KizkattGraphicEditor linear tools and context menus", () => {
  it("inserts bend points on straight lines from the midpoint handle", () => {
    render(<KizkattGraphicEditor />);

    chooseGroupedTool("Arrow", "Line");

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

