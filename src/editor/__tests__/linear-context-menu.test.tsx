import { describe, it } from "vitest";
import {
  formatKeyboardShortcut,
  isPrimaryShortcutModifierPressed
} from "kizkatt-ui";
import { storeCanvasState } from "../platform/canvasStorage";
import {
  chooseGroupedTool,
  KizkattGraphicEditor,
  expect,
  findElementAtPoint,
  fireEvent,
  firePointerEvent,
  getNodeEditCursor,
  getNodeEditLineCursor,
  getNodeEditPointCursor,
  getNodeEditSelectionCursor,
  NODE_EDIT_CURSOR,
  NODE_EDIT_LINE_CURSOR,
  NODE_EDIT_POINT_CURSOR,
  NODE_EDIT_SELECTION_CURSOR,
  render,
  screen,
  selectionBounds,
  vi,
  waitFor
} from "./testUtils";

function hoverContextSubmenuItem(element: Element) {
  const submenuItem = element.closest(".kizkatt-context-menu-submenu-item");

  expect(submenuItem).toBeInTheDocument();
  fireEvent.mouseEnter(submenuItem as Element);
}

function ensureEditorSettingsOpen() {
  const settingsButton = screen.getByRole("button", {
    name: "Editor settings"
  });

  if (settingsButton.getAttribute("aria-expanded") !== "true") {
    fireEvent.click(settingsButton);
  }
}

function openEditorSettingsSubmenu(name: string) {
  ensureEditorSettingsOpen();

  const submenuButton = screen.getByRole("menuitem", { name });

  if (submenuButton.getAttribute("aria-expanded") !== "true") {
    fireEvent.mouseEnter(submenuButton);
  }
}

function openGridSettings() {
  openEditorSettingsSubmenu("Grid");
}

function openDisplaySettings() {
  openEditorSettingsSubmenu("Display");
}

function getPrimaryCheckbox(name: RegExp) {
  return screen.getAllByRole("menuitemcheckbox", { name })[0];
}

function getSubmenuCheckbox(name: RegExp) {
  const items = screen.getAllByRole("menuitemcheckbox", { name });

  return items[items.length - 1];
}

describe("KizkattGraphicEditor linear tools and context menus", () => {
  it("formats editing shortcuts for the current keyboard platform", () => {
    expect(formatKeyboardShortcut("c", { platform: "MacIntel" })).toBe("⌘C");
    expect(
      formatKeyboardShortcut("z", { platform: "MacIntel", shift: true })
    ).toBe("⇧⌘Z");
    expect(formatKeyboardShortcut("c", { platform: "Win32" })).toBe("Ctrl+C");
    expect(formatKeyboardShortcut("z", { platform: "Linux x86_64", shift: true }))
      .toBe("Ctrl+Shift+Z");
    expect(
      isPrimaryShortcutModifierPressed(
        { altKey: false, ctrlKey: false, key: "z", metaKey: true },
        "MacIntel"
      )
    ).toBe(true);
    expect(
      isPrimaryShortcutModifierPressed(
        { altKey: false, ctrlKey: true, key: "z", metaKey: false },
        "MacIntel"
      )
    ).toBe(false);
    expect(
      isPrimaryShortcutModifierPressed(
        { altKey: false, ctrlKey: true, key: "z", metaKey: false },
        "Win32"
      )
    ).toBe(true);
  });

  it("renders a single transform center for bent lines in select mode", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "#653b00",
          bends: [{ x: 80, y: 20 }],
          edgeStyle: "round",
          height: 110,
          id: "line",
          opacity: 100,
          sloppiness: "architect",
          strokeColor: "#f08c00",
          strokeStyle: "solid",
          strokeWidth: 10,
          type: "line",
          width: 180,
          x: 40,
          y: 50
        }
      ],
      selectedIds: ["line"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    expect(canvas.querySelectorAll(".kizkatt-transform-center-marker"))
      .toHaveLength(1);
    expect(canvas.querySelectorAll(".kizkatt-linear-node-preview"))
      .toHaveLength(3);
    expect(canvas.querySelectorAll(".kizkatt-linear-node-preview[data-handle]"))
      .toHaveLength(0);
    expect(canvas.querySelectorAll(
      ".kizkatt-linear-node-preview[data-node-shape='triangle']"
    )).toHaveLength(2);
    expect(canvas.querySelectorAll(
      ".kizkatt-linear-node-preview[data-node-shape='circle']"
    )).toHaveLength(1);
    expect(canvas.querySelectorAll(".kizkatt-bezier-control-handle"))
      .toHaveLength(0);
  });

  it("renders closed line endpoints as regular nodes", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "#653b00",
          bends: [
            { x: 80, y: 0 },
            { x: 80, y: 80 },
            { x: 0, y: 80 }
          ],
          edgeStyle: "sharp",
          height: 0,
          id: "line",
          opacity: 100,
          sloppiness: "architect",
          strokeColor: "#f08c00",
          strokeStyle: "solid",
          strokeWidth: 10,
          type: "line",
          width: 0,
          x: 40,
          y: 50
        }
      ],
      selectedIds: ["line"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    expect(canvas.querySelectorAll(".kizkatt-linear-node-preview"))
      .toHaveLength(4);
    expect(canvas.querySelectorAll(
      ".kizkatt-linear-node-preview[data-node-shape='triangle']"
    )).toHaveLength(0);
  });

  it("drags coincident closed line endpoints as one node", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "#653b00",
          bends: [
            { x: 80, y: 0 },
            { x: 80, y: 80 },
            { x: 0, y: 80 }
          ],
          closed: true,
          edgeStyle: "sharp",
          height: 0,
          id: "line",
          opacity: 100,
          sloppiness: "architect",
          strokeColor: "#f08c00",
          strokeStyle: "solid",
          strokeWidth: 10,
          type: "line",
          width: 0,
          x: 40,
          y: 50
        }
      ],
      selectedIds: ["line"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.click(screen.getByRole("button", { name: "Node edit" }));

    expect(canvas.querySelectorAll("[data-line-endpoint]")).toHaveLength(1);
    expect(canvas.querySelector(".kizkatt-linear-path-overlay")
      ?.getAttribute("d")).toMatch(/ Z$/);

    const startEndpoint = canvas.querySelector("[data-line-endpoint='start']");
    firePointerEvent(startEndpoint as Element, "pointerdown", {
      clientX: 40,
      clientY: 50
    });
    firePointerEvent(canvas, "pointermove", { clientX: 50, clientY: 60 });

    expect(canvas.querySelector(".kizkatt-transform-preview-line")
      ?.getAttribute("d")).toMatch(/ Z$/);

    firePointerEvent(canvas, "pointerup", { clientX: 50, clientY: 60 });

    expect(canvas.querySelector("[data-element-type='line'] > path"))
      .toHaveAttribute(
        "d",
        "M 50 60 L 120 50 L 120 130 L 40 130 L 50 60 Z"
      );
  });

  it("keeps the selected line overlay visible above the line in node edit", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "transparent",
          bends: [{ x: 80, y: -10 }],
          edgeStyle: "round",
          height: 80,
          id: "line",
          opacity: 100,
          sloppiness: "architect",
          strokeColor: "#f08c00",
          strokeStyle: "solid",
          strokeWidth: 24,
          type: "line",
          width: 180,
          x: 40,
          y: 90
        }
      ],
      selectedIds: ["line"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    expect(canvas.querySelector(".kizkatt-linear-path-overlay")).not
      .toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Node edit" }));

    expect(canvas.style.cursor).toBe(NODE_EDIT_SELECTION_CURSOR);

    const linePath = canvas.querySelector("[data-element-type='line'] > path");
    const lineOverlay = canvas.querySelector(".kizkatt-linear-path-overlay");
    const startEndpoint = canvas.querySelector("[data-line-endpoint='start']");
    expect(lineOverlay).toBeInTheDocument();
    expect((startEndpoint as HTMLElement).style.cursor)
      .toBe(NODE_EDIT_POINT_CURSOR);
    expect(lineOverlay?.getAttribute("d")).toContain("M 40 90 C ");
    expect(
      (linePath as Element).compareDocumentPosition(lineOverlay as Element) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("uses the plain node edit cursor when nothing is selected", () => {
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.click(screen.getByRole("button", { name: "Node edit" }));

    expect(canvas.style.cursor).toBe(NODE_EDIT_CURSOR);
  });

  it("switches node edit cursors with the theme", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "transparent",
          edgeStyle: "round",
          height: 80,
          id: "line",
          opacity: 100,
          sloppiness: "architect",
          strokeColor: "#f08c00",
          strokeStyle: "solid",
          strokeWidth: 8,
          type: "line",
          width: 160,
          x: 40,
          y: 90
        }
      ],
      selectedIds: ["line"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Light theme" }));
    fireEvent.click(screen.getByRole("button", { name: "Node edit" }));

    expect(canvas.style.cursor).toBe(getNodeEditSelectionCursor("light"));
    expect(canvas.style.cursor).not.toBe(NODE_EDIT_SELECTION_CURSOR);
    expect((canvas.querySelector("[data-line-endpoint='start']") as HTMLElement)
      .style.cursor).toBe(getNodeEditPointCursor("light"));
    expect((canvas.querySelector(".kizkatt-linear-segment-hit") as HTMLElement)
      .style.cursor).toBe(getNodeEditLineCursor("light"));

    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    fireEvent.click(screen.getByRole("button", { name: "Node edit" }));
    firePointerEvent(canvas, "pointerdown", { clientX: 10, clientY: 10 });
    firePointerEvent(canvas, "pointerup", { clientX: 10, clientY: 10 });

    expect(canvas.style.cursor).toBe(getNodeEditCursor("light"));
  });

  it("moves a straight segment with both endpoints without curving it", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "transparent",
          bends: [
            { x: 60, y: 0 },
            { x: 120, y: 50 }
          ],
          edgeStyle: "sharp",
          height: 50,
          id: "line",
          opacity: 100,
          sloppiness: "architect",
          strokeColor: "#f08c00",
          strokeStyle: "solid",
          strokeWidth: 8,
          type: "line",
          width: 180,
          x: 40,
          y: 50
        }
      ],
      selectedIds: ["line"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.click(screen.getByRole("button", { name: "Node edit" }));

    const middleSegment = canvas.querySelector(
      ".kizkatt-linear-segment-hit[data-segment-index='1']"
    );
    expect(middleSegment).toBeInTheDocument();

    firePointerEvent(middleSegment as Element, "pointerdown", {
      clientX: 130,
      clientY: 75
    });
    firePointerEvent(canvas, "pointermove", { clientX: 130, clientY: 105 });

    expect(canvas.querySelector(".kizkatt-transform-preview-line"))
      .toHaveAttribute("d", "M 40 50 L 100 80 L 160 130 L 220 100");
    expect(canvas.querySelector(".kizkatt-transform-preview-line")
      ?.getAttribute("d")).not.toContain(" C ");

    firePointerEvent(canvas, "pointerup", { clientX: 130, clientY: 105 });

    expect(canvas.querySelector("[data-element-type='line'] > path"))
      .toHaveAttribute("d", "M 40 50 L 100 80 L 160 130 L 220 100");
  });

  it("inserts a movable point by double-clicking a line in node edit", () => {
    render(<KizkattGraphicEditor />);

    chooseGroupedTool("Draw", "Line");

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 50 });
    firePointerEvent(canvas, "pointerup", { clientX: 160, clientY: 50 });
    fireEvent.click(screen.getByRole("button", { name: "Node edit" }));

    const segment = canvas.querySelector(".kizkatt-linear-segment-hit");
    expect(segment).toBeInTheDocument();
    firePointerEvent(segment as Element, "pointerdown", {
      clientX: 100,
      clientY: 50
    });
    firePointerEvent(canvas, "pointerup", { clientX: 100, clientY: 50 });
    expect(canvas.querySelectorAll(".kizkatt-bend-point-handle"))
      .toHaveLength(0);

    fireEvent.doubleClick(
      canvas.querySelector(".kizkatt-linear-segment-hit") as Element,
      { clientX: 100, clientY: 50 }
    );

    expect(canvas.querySelectorAll(".kizkatt-bend-point-handle"))
      .toHaveLength(1);
    expect(canvas.querySelector(".kizkatt-bend-point-handle.is-selected"))
      .toBeInTheDocument();
    expect(canvas.querySelector("[data-element-id] path")).toBeInTheDocument();
  });

  it("splits a curved line segment on double-click without changing its shape", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "transparent",
          edgeStyle: "round",
          height: 0,
          id: "line",
          linearSegmentControls: [
            {
              cp1: { x: 40, y: -40 },
              cp2: { x: 80, y: -40 },
              mode: "curve"
            }
          ],
          opacity: 100,
          sloppiness: "architect",
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
    fireEvent.click(screen.getByRole("button", { name: "Node edit" }));

    const linePath = canvas.querySelector("[data-element-type='line'] > path");
    expect(linePath).toHaveAttribute(
      "d",
      "M 40 50 C 80 10 120 10 160 50"
    );

    fireEvent.doubleClick(linePath as Element, { clientX: 100, clientY: 20 });

    const splitPath = canvas.querySelector("[data-element-type='line'] > path");
    expect(splitPath).toHaveAttribute(
      "d",
      "M 40 50 C 60 30 80 20 100 20 C 120 20 140 30 160 50"
    );
    expect(canvas.querySelectorAll(".kizkatt-bend-point-handle"))
      .toHaveLength(1);
    expect(canvas.querySelector(".kizkatt-bend-point-handle.is-selected"))
      .toBeInTheDocument();
  });

  it("clears fill when splitting a closed linear shape into open lines", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "#653b00",
          bends: [
            { x: 60, y: 30 },
            { x: 120, y: 20 }
          ],
          closed: true,
          edgeStyle: "sharp",
          height: 70,
          id: "line",
          opacity: 100,
          sloppiness: "architect",
          strokeColor: "#111111",
          strokeStyle: "solid",
          strokeWidth: 4,
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
    fireEvent.click(screen.getByRole("button", { name: "Node edit" }));

    const bendHandle = canvas.querySelector("[data-bend-index='0']");
    firePointerEvent(bendHandle as Element, "pointerdown", {
      clientX: 100,
      clientY: 80
    });
    firePointerEvent(canvas, "pointerup", { clientX: 100, clientY: 80 });
    fireEvent.click(screen.getByRole("button", { name: "Split point" }));

    const splitLines = canvas.querySelectorAll(
      "[data-element-type='line'] line, [data-element-type='line'] path"
    );
    expect(splitLines.length).toBeGreaterThan(0);
    splitLines.forEach((line) => {
      expect(line).toHaveAttribute("fill", "none");
    });
  });

  it("merges selected line endpoints into one start point", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "#653b00",
          bends: [{ x: 60, y: 30 }],
          edgeStyle: "sharp",
          height: 70,
          id: "line",
          opacity: 100,
          sloppiness: "architect",
          strokeColor: "#111111",
          strokeStyle: "solid",
          strokeWidth: 4,
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
    fireEvent.click(screen.getByRole("button", { name: "Node edit" }));

    const startEndpoint = canvas.querySelector("[data-line-endpoint='start']");
    firePointerEvent(startEndpoint as Element, "pointerdown", {
      clientX: 40,
      clientY: 50
    });
    firePointerEvent(canvas, "pointerup", { clientX: 40, clientY: 50 });
    const endEndpoint = canvas.querySelector("[data-line-endpoint='end']");
    firePointerEvent(endEndpoint as Element, "pointerdown", {
      clientX: 160,
      clientY: 120,
      shiftKey: true
    });
    firePointerEvent(canvas, "pointerup", { clientX: 160, clientY: 120 });

    const mergeButton = screen.getByRole("button", { name: "Merge points" });
    expect(mergeButton).toBeEnabled();
    fireEvent.click(mergeButton);

    expect(canvas.querySelector("[data-element-type='line'] > path"))
      .toHaveAttribute("d", "M 40 50 L 100 80 L 40 50 Z");
    expect(canvas.querySelector("[data-element-type='line'] > path"))
      .toHaveAttribute("fill", "#653b00");
    expect(canvas.querySelectorAll(".kizkatt-endpoint-handle"))
      .toHaveLength(0);
    const mergedNode = canvas.querySelector("[data-line-endpoint='start']");
    expect(mergedNode).toBeInTheDocument();
    expect(mergedNode).toHaveAttribute("data-node-shape", "square");
    expect(mergedNode).toHaveAttribute("fill", "#121212");
    expect(mergedNode)
      .toHaveAttribute("data-line-endpoint", "start");
    expect(canvas.querySelector(".kizkatt-bend-point-handle.is-selected"))
      .toBeInTheDocument();

    firePointerEvent(mergedNode as Element, "pointerdown", {
      clientX: 40,
      clientY: 50
    });
    firePointerEvent(canvas, "pointermove", { clientX: 20, clientY: 30 });
    firePointerEvent(canvas, "pointerup", { clientX: 20, clientY: 30 });

    const movedClosedLine = canvas.querySelector("[data-element-type='line'] > path");
    expect(movedClosedLine).toHaveAttribute("d", "M 20 30 L 100 80 L 20 30 Z");
    expect(movedClosedLine).toHaveAttribute("fill", "#653b00");
    expect(canvas.querySelectorAll("[data-line-endpoint]")).toHaveLength(2);
  });

  it("enables endpoint merging for line ends selected with the node edit area", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "transparent",
          bends: [
            { x: 220, y: -30 },
            { x: 400, y: 100 }
          ],
          edgeStyle: "sharp",
          height: 70,
          id: "line",
          opacity: 100,
          sloppiness: "architect",
          strokeColor: "#111111",
          strokeStyle: "solid",
          strokeWidth: 4,
          type: "line",
          width: 20,
          x: 100,
          y: 100
        }
      ],
      selectedIds: ["line"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.click(screen.getByRole("button", { name: "Node edit" }));

    firePointerEvent(canvas, "pointerdown", { clientX: 110, clientY: 70 });
    firePointerEvent(canvas, "pointermove", { clientX: 130, clientY: 180 });
    firePointerEvent(canvas, "pointerup", { clientX: 130, clientY: 180 });

    const mergeButton = screen.getByRole("button", { name: "Merge points" });
    expect(mergeButton).toBeEnabled();
    fireEvent.click(mergeButton);

    expect(canvas.querySelector("[data-element-type='line'] > path"))
      .toHaveAttribute("d", "M 100 100 L 320 70 L 500 200 L 100 100 Z");
  });

  it("moves a straight closing segment without curving it", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "#653b00",
          bends: [{ x: 220, y: -30 }],
          closed: true,
          edgeStyle: "sharp",
          height: 100,
          id: "line",
          opacity: 100,
          sloppiness: "architect",
          strokeColor: "#f08c00",
          strokeStyle: "solid",
          strokeWidth: 10,
          type: "line",
          width: 400,
          x: 100,
          y: 100
        }
      ],
      selectedIds: ["line"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.click(screen.getByRole("button", { name: "Node edit" }));

    const closingSegment = canvas.querySelector(
      ".kizkatt-linear-segment-hit[data-segment-index='2']"
    );
    expect(closingSegment).toBeInTheDocument();
    expect((closingSegment as HTMLElement).style.cursor)
      .toBe(NODE_EDIT_LINE_CURSOR);

    firePointerEvent(closingSegment as Element, "pointerdown", {
      clientX: 300,
      clientY: 150
    });
    firePointerEvent(canvas, "pointermove", { clientX: 280, clientY: 80 });

    const previewPath = canvas.querySelector(".kizkatt-transform-preview-line")
      ?.getAttribute("d");

    expect(previewPath).toBe("M 80 30 L 320 70 L 480 130 L 80 30 Z");
    expect(previewPath).not.toContain(" C ");
  });

  it("combines selected lines and merges only open endpoints", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "transparent",
          bends: [{ x: 60, y: 20 }],
          edgeStyle: "sharp",
          height: 0,
          id: "line-a",
          opacity: 100,
          sloppiness: "architect",
          strokeColor: "#111111",
          strokeStyle: "solid",
          strokeWidth: 4,
          type: "line",
          width: 100,
          x: 40,
          y: 50
        },
        {
          angle: 0,
          backgroundColor: "transparent",
          bends: [{ x: 20, y: 60 }],
          edgeStyle: "sharp",
          height: 80,
          id: "line-b",
          opacity: 100,
          sloppiness: "artist",
          strokeColor: "#f08c00",
          strokeStyle: "dashed",
          strokeWidth: 10,
          type: "line",
          width: 0,
          x: 180,
          y: 80
        }
      ],
      selectedIds: ["line-a", "line-b"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.contextMenu(canvas, { clientX: 80, clientY: 90 });

    const combineItem = screen.getByRole("menuitem", { name: "Combine" });
    expect(combineItem).toBeEnabled();
    fireEvent.click(combineItem);

    fireEvent.click(screen.getByRole("button", { name: "Node edit" }));
    const endpoints = canvas.querySelectorAll("[data-line-endpoint]");
    expect(endpoints).toHaveLength(4);
    const firstLineEnd = endpoints[1];

    firePointerEvent(firstLineEnd, "pointerdown", {
      clientX: 140,
      clientY: 50
    });
    firePointerEvent(canvas, "pointerup", { clientX: 140, clientY: 50 });
    const secondLineStart = canvas.querySelectorAll("[data-line-endpoint]")[2];
    firePointerEvent(secondLineStart, "pointerdown", {
      clientX: 180,
      clientY: 80,
      shiftKey: true
    });
    firePointerEvent(canvas, "pointerup", { clientX: 180, clientY: 80 });

    const mergeButton = screen.getByRole("button", { name: "Merge points" });
    expect(mergeButton).toBeEnabled();
    fireEvent.click(mergeButton);

    const renderedLines = canvas.querySelectorAll("[data-element-type='line']");
    expect(renderedLines).toHaveLength(1);
    expect(canvas.querySelector("[data-element-type='line'] > path"))
      .toHaveAttribute(
        "d",
        "M 40 50 L 100 70 L 140 50 L 200 140 L 180 160"
      );
    expect(canvas.querySelectorAll("[data-line-endpoint]")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Merge points" }))
      .toBeDisabled();
  });

  it("keeps group available for line combinations and breaks combinations apart", async () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "transparent",
          height: 0,
          id: "line-a",
          opacity: 100,
          sloppiness: "architect",
          strokeColor: "#111111",
          strokeStyle: "solid",
          strokeWidth: 4,
          type: "line",
          width: 100,
          x: 40,
          y: 50
        },
        {
          angle: 0,
          backgroundColor: "transparent",
          height: 80,
          id: "line-b",
          opacity: 100,
          sloppiness: "artist",
          strokeColor: "#f08c00",
          strokeStyle: "dashed",
          strokeWidth: 10,
          type: "line",
          width: 0,
          x: 180,
          y: 80
        }
      ],
      selectedIds: ["line-a", "line-b"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.contextMenu(canvas, { clientX: 80, clientY: 90 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Combine" }));
    await waitFor(() => {
      expect(screen.queryByRole("menu", { name: "Canvas context menu" })).not
        .toBeInTheDocument();
    });

    fireEvent.contextMenu(canvas, { clientX: 80, clientY: 90 });

    expect(screen.getByRole("menuitem", { name: "Group" })).toBeEnabled();
    expect(screen.getByRole("menuitem", { name: "Break apart" })).toBeEnabled();
    expect(screen.queryByRole("menuitem", { name: "Combine" })).not
      .toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: "Break apart" }));
    await waitFor(() => {
      expect(screen.queryByRole("menu", { name: "Canvas context menu" })).not
        .toBeInTheDocument();
    });

    fireEvent.contextMenu(canvas, { clientX: 80, clientY: 90 });

    expect(screen.queryByRole("menuitem", { name: "Break apart" })).not
      .toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Group" })).toBeEnabled();
    expect(screen.getByRole("menuitem", { name: "Combine" })).toBeEnabled();
  });

  it("keeps combine disabled for non-line selections", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "transparent",
          height: 80,
          id: "rectangle",
          opacity: 100,
          sloppiness: "architect",
          strokeColor: "#111111",
          strokeStyle: "solid",
          strokeWidth: 4,
          type: "rectangle",
          width: 100,
          x: 40,
          y: 50
        }
      ],
      selectedIds: ["rectangle"]
    });
    render(<KizkattGraphicEditor />);

    fireEvent.contextMenu(
      screen.getByRole("application", { name: "Drawing canvas" }),
      { clientX: 80, clientY: 90 }
    );

    expect(screen.getByRole("menuitem", { name: "Combine" })).toBeDisabled();
  });

  it("moves straight segments and edits only the dragged endpoint in node edit mode", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "transparent",
          bends: [{ x: 60, y: 30 }],
          edgeStyle: "sharp",
          height: 70,
          id: "line",
          opacity: 100,
          sloppiness: "architect",
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
    fireEvent.click(screen.getByRole("button", { name: "Node edit" }));

    expect(canvas.querySelector("[data-resize-handle]")).not
      .toBeInTheDocument();
    expect(canvas.querySelector("[data-handle='rotate']")).not
      .toBeInTheDocument();
    expect(canvas.querySelector("[data-handle='transform-center']")).not
      .toBeInTheDocument();

    const linePath = canvas.querySelector("[data-element-type='line'] > path");
    firePointerEvent(linePath as Element, "pointerdown", {
      clientX: 70,
      clientY: 65
    });
    firePointerEvent(canvas, "pointermove", { clientX: 90, clientY: 85 });
    firePointerEvent(canvas, "pointerup", { clientX: 90, clientY: 85 });
    expect(linePath).toHaveAttribute(
      "d",
      "M 60 70 L 120 100 L 160 120"
    );
    expect(screen.getByRole("button", { name: "Node edit" }))
      .toHaveClass("is-active");

    const startHandle = canvas.querySelector(
      "[data-line-endpoint='start']"
    );
    expect(startHandle).toHaveAttribute("data-endpoint-mode", "node");
    firePointerEvent(startHandle as Element, "pointerdown", {
      clientX: 60,
      clientY: 70
    });
    firePointerEvent(canvas, "pointermove", { clientX: 20, clientY: 30 });

    expect(linePath).toHaveAttribute(
      "d",
      "M 60 70 L 120 100 L 160 120"
    );
    expect(canvas.querySelector(".kizkatt-transform-preview-line")
      ?.getAttribute("d")).toContain("M 20 30 ");
    expect(canvas.querySelector(".kizkatt-transform-preview-line")
      ?.getAttribute("d")).toContain("120 100 L 160 120");
    expect(canvas.querySelector(".kizkatt-transform-preview-bounds"))
      .not.toBeInTheDocument();
    expect(canvas).toHaveStyle({ cursor: NODE_EDIT_POINT_CURSOR });

    firePointerEvent(canvas, "pointerup", { clientX: 20, clientY: 30 });

    expect(linePath?.getAttribute("d")).toContain("M 20 30 ");
    expect(linePath?.getAttribute("d")).toContain("120 100 L 160 120");
    expect(canvas.querySelector(".kizkatt-transform-preview")).not
      .toBeInTheDocument();

    const endHandle = canvas.querySelector("[data-line-endpoint='end']");
    firePointerEvent(endHandle as Element, "pointerdown", {
      clientX: 180,
      clientY: 120
    });
    firePointerEvent(canvas, "pointermove", { clientX: 200, clientY: 140 });
    firePointerEvent(canvas, "pointerup", { clientX: 200, clientY: 140 });

    expect(linePath?.getAttribute("d")).toContain("M 20 30 ");
    expect(linePath?.getAttribute("d")).toContain("120 100 L 200 140");
  });

  it("keeps curved line transform previews in line point coordinates", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "transparent",
          edgeStyle: "round",
          height: 0,
          id: "line",
          linearSegmentControls: [
            {
              cp1: { x: 40, y: -40 },
              cp2: { x: 80, y: -40 },
              mode: "curve"
            }
          ],
          opacity: 100,
          sloppiness: "architect",
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
    const linePath = canvas.querySelector("[data-element-type='line'] > path");

    expect(linePath).toHaveAttribute(
      "d",
      "M 40 50 C 80 10 120 10 160 50"
    );

    firePointerEvent(canvas, "pointerdown", {
      clientX: 100,
      clientY: 20
    });
    firePointerEvent(canvas, "pointermove", { clientX: 130, clientY: 70 });

    expect(canvas.querySelector(".kizkatt-transform-preview-line"))
      .toHaveAttribute("d", "M 70 100 C 110 60 150 60 190 100");
  });

  it("includes curved line stroke extents in bounds and hit testing", () => {
    const line = {
      angle: 0,
      backgroundColor: "transparent",
      edgeStyle: "round" as const,
      height: 0,
      id: "line",
      linearSegmentControls: [
        {
          cp1: { x: 40, y: -40 },
          cp2: { x: 80, y: -40 },
          mode: "curve" as const
        }
      ],
      opacity: 100,
      sloppiness: "architect" as const,
      strokeColor: "#f08c00",
      strokeStyle: "solid" as const,
      strokeWidth: 20,
      type: "line" as const,
      width: 120,
      x: 40,
      y: 50
    };
    const bounds = selectionBounds([line]);

    expect(bounds?.x).toBeCloseTo(30);
    expect(bounds?.y).toBeCloseTo(10);
    expect(bounds?.width).toBeCloseTo(140);
    expect(bounds?.height).toBeCloseTo(50);
    expect(findElementAtPoint([line], { x: 100, y: 20 })?.id).toBe("line");
  });

  it("selects closed linear shapes by their visible fill", () => {
    const closedLine = {
      angle: 0,
      backgroundColor: "#653b00",
      bends: [
        { x: 120, y: 0 },
        { x: 120, y: 90 },
        { x: 0, y: 90 }
      ],
      closed: true,
      edgeStyle: "sharp" as const,
      height: 0,
      id: "closed-line",
      opacity: 100,
      sloppiness: "architect" as const,
      strokeColor: "#f08c00",
      strokeStyle: "solid" as const,
      strokeWidth: 8,
      type: "line" as const,
      width: 0,
      x: 40,
      y: 50
    };

    expect(findElementAtPoint([closedLine], { x: 90, y: 90 })?.id)
      .toBe("closed-line");
    expect(findElementAtPoint([
      { ...closedLine, backgroundColor: "transparent", id: "transparent-line" }
    ], { x: 90, y: 90 })).toBeUndefined();
    expect(findElementAtPoint([
      { ...closedLine, closed: false, id: "open-line" }
    ], { x: 90, y: 90 })).toBeUndefined();
  });

  it("applies transforms to curved line transform previews while rotating", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "transparent",
          bends: [{ x: 60, y: -30 }],
          edgeStyle: "round",
          height: 0,
          id: "line",
          opacity: 100,
          sloppiness: "architect",
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
    firePointerEvent(canvas, "pointerdown", { clientX: 100, clientY: 30 });
    firePointerEvent(canvas, "pointerup", { clientX: 100, clientY: 30 });

    const rotateHandle = canvas.querySelector(".kizkatt-corner-rotate-handle");
    expect(rotateHandle).toBeInTheDocument();
    const handleX = Number(rotateHandle?.getAttribute("data-handle-world-x"));
    const handleY = Number(rotateHandle?.getAttribute("data-handle-world-y"));

    firePointerEvent(rotateHandle as Element, "pointerdown", {
      clientX: handleX,
      clientY: handleY
    });
    firePointerEvent(canvas, "pointermove", {
      clientX: handleX + 30,
      clientY: handleY
    });

    const previewLine = canvas.querySelector(".kizkatt-transform-preview-line");
    expect(previewLine).toBeInTheDocument();
    expect(previewLine?.parentElement?.getAttribute("transform")).toContain(
      "rotate("
    );
    expect(previewLine?.parentElement?.getAttribute("transform")).not
      .toContain("rotate(0)");
  });

  it("selects and moves multiple bend points in node edit mode", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "transparent",
          bends: [
            { x: 60, y: 0 },
            { x: 80, y: 40 }
          ],
          edgeStyle: "sharp",
          height: 60,
          id: "line",
          opacity: 100,
          sloppiness: "architect",
          strokeColor: "#111111",
          strokeStyle: "solid",
          strokeWidth: 4,
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
    fireEvent.click(screen.getByRole("button", { name: "Node edit" }));

    expect(canvas.querySelectorAll(".kizkatt-endpoint-handle"))
      .toHaveLength(2);
    expect(canvas.querySelectorAll(".kizkatt-bend-point-handle"))
      .toHaveLength(2);
    expect(canvas.querySelectorAll(
      ".kizkatt-bend-point-handle[data-node-shape='square']"
    )).toHaveLength(2);
    expect(canvas.querySelectorAll(".kizkatt-bend-handle"))
      .toHaveLength(0);

    firePointerEvent(
      canvas.querySelectorAll(".kizkatt-bend-point-handle")[0],
      "pointerdown",
      { clientX: 100, clientY: 50 }
    );
    firePointerEvent(canvas, "pointerup", { clientX: 100, clientY: 50 });
    expect(canvas.querySelectorAll(".kizkatt-bend-handle"))
      .toHaveLength(0);

    firePointerEvent(
      canvas.querySelectorAll(".kizkatt-bend-point-handle")[1],
      "pointerdown",
      {
        clientX: 120,
        clientY: 90,
        shiftKey: true
      }
    );

    expect(canvas.querySelectorAll(".kizkatt-bend-point-handle.is-selected"))
      .toHaveLength(2);
    expect(canvas.querySelectorAll(".kizkatt-bend-handle"))
      .toHaveLength(0);

    const linePath = canvas.querySelector("[data-element-type='line'] > path");
    firePointerEvent(
      canvas.querySelectorAll(".kizkatt-bend-point-handle")[0],
      "pointerdown",
      { clientX: 100, clientY: 50 }
    );
    firePointerEvent(canvas, "pointermove", { clientX: 110, clientY: 65 });

    expect(linePath).toHaveAttribute(
      "d",
      "M 40 50 L 100 50 L 120 90 L 160 110"
    );
    expect(canvas.querySelector(".kizkatt-transform-preview-line"))
      .toHaveAttribute("d", "M 40 50 L 110 65 L 130 105 L 160 110");

    firePointerEvent(canvas, "pointerup", { clientX: 110, clientY: 65 });
    expect(linePath).toHaveAttribute(
      "d",
      "M 40 50 L 110 65 L 130 105 L 160 110"
    );
  });

  it("hides bezier handles while deforming a curve by dragging its node", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "transparent",
          bends: [{ x: 60, y: 30 }],
          edgeStyle: "round",
          height: 70,
          id: "line",
          opacity: 100,
          sloppiness: "architect",
          strokeColor: "#111111",
          strokeStyle: "solid",
          strokeWidth: 4,
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
    fireEvent.click(screen.getByRole("button", { name: "Node edit" }));

    firePointerEvent(
      canvas.querySelector(".kizkatt-bend-point-handle") as Element,
      "pointerdown",
      { clientX: 100, clientY: 80 }
    );
    firePointerEvent(canvas, "pointerup", { clientX: 100, clientY: 80 });

    expect(canvas.querySelector(".kizkatt-bend-point-handle"))
      .toHaveAttribute("data-node-shape", "circle");
    expect(canvas.querySelectorAll(".kizkatt-bezier-control-handle"))
      .toHaveLength(2);

    firePointerEvent(
      canvas.querySelector(".kizkatt-bend-point-handle") as Element,
      "pointerdown",
      { clientX: 100, clientY: 80 }
    );
    firePointerEvent(canvas, "pointermove", { clientX: 112, clientY: 92 });

    expect(canvas.querySelector(".kizkatt-transform-preview-line"))
      .toBeInTheDocument();
    expect(canvas.querySelectorAll(".kizkatt-bezier-handle-line"))
      .toHaveLength(0);
    expect(canvas.querySelectorAll(".kizkatt-bezier-control-handle"))
      .toHaveLength(0);

    firePointerEvent(canvas, "pointerup", { clientX: 112, clientY: 92 });
  });

  it("shows node editor actions for bend point editing", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "transparent",
          bends: [{ x: 60, y: 30 }],
          edgeStyle: "sharp",
          height: 70,
          id: "line",
          opacity: 100,
          sloppiness: "architect",
          strokeColor: "#111111",
          strokeStyle: "solid",
          strokeWidth: 4,
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
    fireEvent.click(screen.getByRole("button", { name: "Node edit" }));

    const bendHandle = canvas.querySelector(".kizkatt-bend-point-handle");
    firePointerEvent(bendHandle as Element, "pointerdown", {
      clientX: 100,
      clientY: 80
    });
    firePointerEvent(canvas, "pointerup", { clientX: 100, clientY: 80 });

    fireEvent.click(screen.getByRole("button", { name: "Make segment curved" }));
    expect(canvas.querySelector("[data-element-type='line'] > path")
      ?.getAttribute("d")).toContain(" C ");
    expect(canvas.querySelectorAll(".kizkatt-bezier-control-handle"))
      .toHaveLength(2);

    const curvePathBeforeDrag = canvas
      .querySelector("[data-element-type='line'] > path")
      ?.getAttribute("d");
    const firstBezierHandle = canvas.querySelector(
      ".kizkatt-bezier-control-handle[data-control-point='cp1']"
    );
    expect((firstBezierHandle as HTMLElement).style.cursor)
      .toBe(NODE_EDIT_POINT_CURSOR);

    firePointerEvent(firstBezierHandle as Element, "pointerdown", {
      clientX: 80,
      clientY: 70
    });
    expect(canvas.querySelectorAll(".kizkatt-bezier-control-handle"))
      .toHaveLength(2);
    firePointerEvent(canvas, "pointermove", { clientX: 70, clientY: 40 });
    expect(canvas.querySelector("[data-element-type='line'] > path")
      ?.getAttribute("d")).toBe(curvePathBeforeDrag);
    expect(canvas.querySelector(".kizkatt-transform-preview-line")
      ?.getAttribute("d")).not.toBe(curvePathBeforeDrag);
    expect(canvas.querySelectorAll(".kizkatt-bezier-control-handle"))
      .toHaveLength(2);
    firePointerEvent(canvas, "pointerup", { clientX: 70, clientY: 40 });
    expect(canvas.querySelector("[data-element-type='line'] > path")
      ?.getAttribute("d")).not.toBe(curvePathBeforeDrag);

    fireEvent.click(screen.getByRole("button", { name: "Make segment straight" }));
    expect(canvas.querySelector("[data-element-type='line'] > path")
      ?.getAttribute("d")).toContain(" L ");

    fireEvent.click(screen.getByRole("button", { name: "Split point" }));
    expect(canvas.querySelectorAll("[data-element-type='line']"))
      .toHaveLength(2);
    expect(canvas.querySelectorAll(".kizkatt-bend-point-handle"))
      .toHaveLength(0);
  });

  it("selects an arbitrary linear segment for node editor segment actions", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "transparent",
          bends: [
            { x: 50, y: 0 },
            { x: 95, y: 45 }
          ],
          edgeStyle: "sharp",
          height: 70,
          id: "line",
          opacity: 100,
          sloppiness: "architect",
          strokeColor: "#111111",
          strokeStyle: "solid",
          strokeWidth: 4,
          type: "line",
          width: 140,
          x: 40,
          y: 50
        }
      ],
      selectedIds: ["line"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    fireEvent.click(screen.getByRole("button", { name: "Node edit" }));

    const secondSegment = canvas.querySelector(
      ".kizkatt-linear-segment-hit[data-segment-index='1']"
    );
    firePointerEvent(secondSegment as Element, "pointerdown", {
      clientX: 112,
      clientY: 72
    });
    firePointerEvent(canvas, "pointerup", { clientX: 112, clientY: 72 });

    expect(canvas.querySelector(".kizkatt-linear-segment-hit.is-selected"))
      .toHaveAttribute("data-segment-index", "1");
    expect(canvas.querySelectorAll(".kizkatt-bend-point-handle.is-selected"))
      .toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Make segment curved" }));
    expect(canvas.querySelector("[data-element-type='line'] > path")
      ?.getAttribute("d")).toContain(" L 90 50 C ");

    fireEvent.click(screen.getByRole("button", { name: "Make segment straight" }));
    expect(canvas.querySelector("[data-element-type='line'] > path")
      ?.getAttribute("d")).toContain(" L 90 50 L 135 95");
  });

  it("moves non-linear objects without leaving node edit mode", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "#653b00",
          height: 60,
          id: "rectangle",
          opacity: 100,
          strokeColor: "#f08c00",
          strokeStyle: "solid",
          strokeWidth: 10,
          type: "rectangle",
          width: 100,
          x: 40,
          y: 50
        }
      ],
      selectedIds: ["rectangle"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    const rectangle = canvas.querySelector(
      "[data-element-type='rectangle'] > rect"
    );
    const nodeEditButton = screen.getByRole("button", { name: "Node edit" });
    fireEvent.click(nodeEditButton);

    firePointerEvent(rectangle as Element, "pointerdown", {
      clientX: 80,
      clientY: 80
    });
    firePointerEvent(canvas, "pointermove", { clientX: 100, clientY: 110 });
    firePointerEvent(canvas, "pointerup", { clientX: 100, clientY: 110 });

    expect(rectangle).toHaveAttribute("x", "60");
    expect(rectangle).toHaveAttribute("y", "80");
    expect(nodeEditButton).toHaveClass("is-active");
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
    const copyItem = screen.getByRole("menuitem", { name: /Copy/ });
    expect(copyItem).toBeDisabled();
    hoverContextSubmenuItem(copyItem);
    expect(
      screen.getByRole("menuitem", { name: "Copy to clipboard as PNG" })
    ).toBeDisabled();
    expect(
      screen.getByRole("menuitem", { name: "Copy as SVG code" })
    ).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: /Select all/ }))
      .toBeInTheDocument();
    expect(screen.queryByRole("menuitemcheckbox", { name: /Toggle grid/ }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole("menuitemcheckbox", { name: /Snap to grid/ }))
      .not.toBeInTheDocument();
    expect(screen.getAllByRole("menuitem")[0]).toHaveAccessibleName(
      /Refresh page/
    );
    hoverContextSubmenuItem(getPrimaryCheckbox(/Snap to objects/));
    expect(getSubmenuCheckbox(/Snap to objects/))
      .toBeInTheDocument();
    expect(screen.getByRole("menuitemradio", { name: /Select touching objects/ }))
      .toHaveAttribute("aria-checked", "true");
    const selectTouchingItem = screen.getByRole("menuitemradio", {
      name: /Select touching objects/
    });
    hoverContextSubmenuItem(selectTouchingItem);
    fireEvent.mouseLeave(
      selectTouchingItem.closest(".kizkatt-context-menu-submenu-item") as Element
    );
    expect(screen.getByRole("menuitemradio", { name: /Select enclosed objects/ }))
      .toHaveAttribute("aria-checked", "false");
  });

  it("toggles the grid from the editor settings menu", () => {
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    expect(canvas.querySelector(".kizkatt-grid")).toBeInTheDocument();

    openGridSettings();
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: /Toggle grid/ }));

    expect(canvas.querySelector(".kizkatt-grid")).not.toBeInTheDocument();
  });

  it("toggles snap to grid from the editor settings menu", () => {
    render(<KizkattGraphicEditor />);

    openGridSettings();
    const snapToGridItem = screen.getByRole("menuitemcheckbox", {
      name: /Snap to grid/
    });

    expect(snapToGridItem).toHaveAttribute("aria-checked", "false");

    fireEvent.click(snapToGridItem);
    expect(
      screen.getByRole("menuitemcheckbox", { name: /Snap to grid/ })
    ).toHaveAttribute("aria-checked", "true");
  });

  it("snaps new shapes to grid points when snap to grid is enabled", () => {
    window.localStorage.setItem(
      "kizkatt:graphic-engine:grid-settings",
      JSON.stringify({ unit: "px", majorSize: 30, minorSize: 10 })
    );
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    openGridSettings();
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: /Snap to grid/ }));

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    firePointerEvent(canvas, "pointerdown", { clientX: 49, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 161, clientY: 121 });
    firePointerEvent(canvas, "pointerup", { clientX: 161, clientY: 121 });

    const rectangle = canvas.querySelector("[data-element-type='rectangle'] > rect");

    expect(rectangle).toHaveAttribute("x", "50");
    expect(rectangle).toHaveAttribute("y", "50");
    expect(rectangle).toHaveAttribute("width", "110");
    expect(rectangle).toHaveAttribute("height", "70");
  });

  it("renders wireframes while keeping the canvas editable", () => {
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    openDisplaySettings();
    fireEvent.click(
      screen.getByRole("menuitemcheckbox", { name: "Wireframe" })
    );

    const wireframeShape = canvas.querySelector(
      "[data-wireframe-element='true'] > rect"
    );

    expect(wireframeShape).toHaveAttribute("fill", "none");
    expect(wireframeShape).toHaveAttribute(
      "stroke",
      "var(--kizkatt-wireframe-stroke)"
    );
    expect(wireframeShape).toHaveAttribute("stroke-width", "1");
    expect(canvas).toHaveStyle({
      backgroundColor: "var(--kizkatt-wireframe-canvas)"
    });
    expect(screen.getByRole("button", { name: "Wireframe" }))
      .toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    firePointerEvent(canvas, "pointerdown", { clientX: 220, clientY: 80 });
    firePointerEvent(canvas, "pointermove", { clientX: 300, clientY: 150 });
    firePointerEvent(canvas, "pointerup");
    expect(canvas.querySelectorAll("[data-wireframe-element='true']"))
      .toHaveLength(2);
  });

  it("replaces bitmap content with a crossed wireframe placeholder", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "#ff00aa",
          height: 80,
          id: "bitmap",
          opacity: 45,
          src: "data:image/png;base64,kizkatt",
          strokeColor: "#f08c00",
          strokeStyle: "dashed",
          strokeWidth: 12,
          type: "image",
          width: 120,
          x: 40,
          y: 50
        }
      ],
      selectedIds: []
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    expect(canvas.querySelector("[data-element-id='bitmap'] image"))
      .toBeInTheDocument();

    openDisplaySettings();
    fireEvent.click(
      screen.getByRole("menuitemcheckbox", { name: "Wireframe" })
    );

    const wireframe = canvas.querySelector(
      "[data-element-id='bitmap'] [data-wireframe-element='true']"
    );
    expect(canvas.querySelector("[data-element-id='bitmap'] image"))
      .not.toBeInTheDocument();
    expect(wireframe?.querySelectorAll("rect")).toHaveLength(1);
    expect(wireframe?.querySelectorAll("line")).toHaveLength(2);
  });

  it("makes preview and wireframe mutually exclusive and reuses the last mode shortcut", () => {
    render(<KizkattGraphicEditor />);

    expect(screen.getByRole("button", { name: "Rectangle" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();

    openDisplaySettings();
    fireEvent.click(
      screen.getByRole("menuitemcheckbox", { name: "Wireframe" })
    );
    expect(screen.getByRole("menuitemcheckbox", { name: "Wireframe" }))
      .toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Info mode" }));
    expect(screen.getByRole("menuitemcheckbox", { name: "Info mode" }))
      .toHaveAttribute("aria-checked", "true");

    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Preview" }));

    expect(screen.queryByRole("button", { name: "Rectangle" })).not
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Main menu" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview" }))
      .toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("menuitemcheckbox", { name: "Info mode" }))
      .toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemcheckbox", { name: "Wireframe" }))
      .toHaveAttribute("aria-checked", "false");

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getByRole("button", { name: "Rectangle" })).toBeInTheDocument();
  });

  it("shows horizontal callouts with full object names and one-based layer numbers", () => {
    storeCanvasState({
      elements: [
        {
          angle: Math.PI / 4,
          backgroundColor: "#cc3344",
          height: 80,
          id: "first-layer",
          name: "Rectangle 12",
          opacity: 100,
          strokeColor: "#111111",
          strokeStyle: "solid",
          strokeWidth: 4,
          type: "rectangle",
          width: 160,
          x: 40,
          y: 50
        },
        {
          angle: 0,
          backgroundColor: "#3366cc",
          height: 90,
          id: "second-layer",
          name: "Ellipse 27",
          opacity: 100,
          strokeColor: "#111111",
          strokeStyle: "solid",
          strokeWidth: 4,
          type: "ellipse",
          width: 180,
          x: 260,
          y: 100
        }
      ],
      selectedIds: []
    });
    render(<KizkattGraphicEditor />);

    openDisplaySettings();
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Info mode" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    const firstLabel = canvas.querySelector(
      "[data-info-element-id='first-layer']"
    );
    const secondLabel = canvas.querySelector(
      "[data-info-element-id='second-layer']"
    );

    expect(firstLabel).toHaveAttribute("data-layer-start", "1");
    expect(firstLabel).not.toHaveAttribute("transform");
    expect(firstLabel?.querySelector(".kizkatt-info-leader"))
      .toBeInTheDocument();
    expect(firstLabel?.querySelector(".kizkatt-info-anchor"))
      .toBeInTheDocument();
    expect(firstLabel?.querySelector("text")).toHaveTextContent(
      "Rectangle 12 · Layer 1"
    );
    expect(secondLabel).toHaveAttribute("data-layer-start", "2");
    expect(secondLabel?.querySelector("text")).toHaveTextContent(
      "Ellipse 27 · Layer 2"
    );
  });

  it("collapses grouped elements into one group callout with a layer range", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "transparent",
          groupId: "tools-group",
          groupName: "Tools 4",
          height: 40,
          id: "group-line",
          name: "Line 8",
          opacity: 100,
          strokeColor: "#111111",
          strokeStyle: "solid",
          strokeWidth: 4,
          type: "line",
          width: 100,
          x: 40,
          y: 80
        },
        {
          angle: Math.PI / 8,
          backgroundColor: "#3366cc",
          groupId: "tools-group",
          groupName: "Tools 4",
          height: 80,
          id: "group-shape",
          name: "Rectangle 9",
          opacity: 100,
          strokeColor: "#111111",
          strokeStyle: "solid",
          strokeWidth: 4,
          type: "rectangle",
          width: 120,
          x: 120,
          y: 100
        }
      ],
      selectedIds: []
    });
    render(<KizkattGraphicEditor />);

    openDisplaySettings();
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Info mode" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    const groupLabel = canvas.querySelector(
      "[data-info-group-id='tools-group']"
    );

    expect(groupLabel).toHaveAttribute("data-info-kind", "group");
    expect(groupLabel).toHaveAttribute("data-layer-start", "1");
    expect(groupLabel).toHaveAttribute("data-layer-end", "2");
    expect(groupLabel?.querySelector("text")).toHaveTextContent(
      "Tools 4 · Layers 1–2"
    );
    expect(canvas.querySelector("[data-info-element-id='group-line']"))
      .not.toBeInTheDocument();
    expect(canvas.querySelector("[data-info-element-id='group-shape']"))
      .not.toBeInTheDocument();
  });

  it("snaps new shapes to nearby object points when snap to objects is enabled", () => {
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    fireEvent.contextMenu(canvas, { clientX: 80, clientY: 90 });
    hoverContextSubmenuItem(getPrimaryCheckbox(/Snap to objects/));
    fireEvent.click(getSubmenuCheckbox(/Snap to objects/));

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    firePointerEvent(canvas, "pointerdown", { clientX: 200, clientY: 200 });
    firePointerEvent(canvas, "pointermove", { clientX: 156, clientY: 118 });
    firePointerEvent(canvas, "pointerup", { clientX: 156, clientY: 118 });

    const rectangles = canvas.querySelectorAll(
      "[data-element-type='rectangle'] > rect"
    );

    expect(rectangles[1]).toHaveAttribute("x", "160");
    expect(rectangles[1]).toHaveAttribute("y", "120");
    expect(rectangles[1]).toHaveAttribute("width", "40");
    expect(rectangles[1]).toHaveAttribute("height", "80");
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
