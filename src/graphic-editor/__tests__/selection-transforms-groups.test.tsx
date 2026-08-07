import { describe, it } from "vitest";
import { storeCanvasState } from "kizkatt-graphic-engine";
import {
  KizkattGraphicEditor,
  canGroupSelection,
  canUngroupSelection,
  expect,
  expandElementIdsToGroups,
  fireEvent,
  firePointerEvent,
  getCirclePoint,
  getElementIdsInSelectionArea,
  getNextSelectedIdsForHit,
  groupSelectedElements,
  render,
  resizeElementsFromSelectionHandle,
  rotateElementsAroundPoint,
  screen,
  selectionBounds,
  ungroupSelectedElements,
  vi,
  waitFor,
  type KizkattElement
} from "./testUtils";

function hoverContextSubmenuItem(element: Element) {
  const submenuItem = element.closest(".kizkatt-context-menu-submenu-item");

  expect(submenuItem).toBeInTheDocument();
  fireEvent.mouseEnter(submenuItem as Element);
}

describe("KizkattGraphicEditor selection, transforms, and groups", () => {
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
    expect(
      getElementIdsInSelectionArea(
        elements,
        { x: 150, y: 100 },
        { x: 220, y: 160 },
        "contain"
      )
    ).toEqual([]);
  });

  it("selects only enclosed elements in enclosed area selection mode", () => {
    const baseElement = {
      angle: 0,
      opacity: 100,
      strokeColor: "#f08c00",
      strokeStyle: "solid" as const,
      strokeWidth: 10,
      type: "rectangle" as const
    };

    storeCanvasState({
      elements: [
        {
          ...baseElement,
          backgroundColor: "#0b3556",
          height: 40,
          id: "small-behind",
          width: 40,
          x: 100,
          y: 100
        },
        {
          ...baseElement,
          backgroundColor: "#653b00",
          height: 180,
          id: "large-front",
          width: 180,
          x: 90,
          y: 90
        }
      ],
      selectedIds: []
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.contextMenu(canvas, { clientX: 80, clientY: 90 });
    hoverContextSubmenuItem(
      screen.getByRole("menuitemradio", { name: /Select touching objects/ })
    );
    fireEvent.click(
      screen.getByRole("menuitemradio", { name: /Select enclosed objects/ })
    );

    firePointerEvent(canvas, "pointerdown", { clientX: 50, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 170, clientY: 170 });
    firePointerEvent(canvas, "pointerup", { clientX: 170, clientY: 170 });

    expect(
      canvas.querySelector("[data-element-overlay-id='small-behind']")
    ).toBeInTheDocument();
    expect(
      canvas.querySelector("[data-element-overlay-id='large-front']")
    ).not.toBeInTheDocument();
  });

  it("adds and removes clicked elements from selection with Shift and Ctrl", () => {
    const elements = [
      { id: "a" },
      { id: "b" },
      { groupId: "group-1", id: "c" },
      { groupId: "group-1", id: "d" }
    ] as KizkattElement[];

    expect(getNextSelectedIdsForHit(elements, ["a"], "b", "add")).toEqual([
      "a",
      "b"
    ]);
    expect(getNextSelectedIdsForHit(elements, ["a", "b"], "a", "remove"))
      .toEqual(["b"]);
    expect(getNextSelectedIdsForHit(elements, ["a"], "c", "add")).toEqual([
      "a",
      "c",
      "d"
    ]);
    expect(getNextSelectedIdsForHit(elements, ["a", "c", "d"], "c", "remove"))
      .toEqual(["a"]);
  });

  it("shows shared transform handles for a multi-selection", () => {
    render(<KizkattGraphicEditor />);

    const board = screen.getByLabelText("Kizkatt diagram canvas");
    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 40 });
    firePointerEvent(canvas, "pointermove", { clientX: 140, clientY: 100 });
    firePointerEvent(canvas, "pointerup");

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    firePointerEvent(canvas, "pointerdown", { clientX: 200, clientY: 160 });
    firePointerEvent(canvas, "pointermove", { clientX: 280, clientY: 220 });
    firePointerEvent(canvas, "pointerup");

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

  it("keeps the current selection when opening the context menu with right click", () => {
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 40 });
    firePointerEvent(canvas, "pointermove", { clientX: 140, clientY: 100 });
    firePointerEvent(canvas, "pointerup");

    expect(canvas.querySelector(".kizkatt-selection-overlay"))
      .toBeInTheDocument();

    firePointerEvent(canvas, "pointerdown", {
      button: 2,
      clientX: 300,
      clientY: 300
    });
    fireEvent.contextMenu(canvas, { clientX: 300, clientY: 300 });

    expect(screen.getByRole("menu", { name: "Canvas context menu" }))
      .toBeInTheDocument();
    expect(canvas.querySelector(".kizkatt-selection-overlay"))
      .toBeInTheDocument();
  });

  it("shows faint internal overlays for multi-selections with one shared rotate handle", () => {
    render(<KizkattGraphicEditor />);

    const board = screen.getByLabelText("Kizkatt diagram canvas");
    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 40 });
    firePointerEvent(canvas, "pointermove", { clientX: 140, clientY: 100 });
    firePointerEvent(canvas, "pointerup");

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    firePointerEvent(canvas, "pointerdown", { clientX: 200, clientY: 160 });
    firePointerEvent(canvas, "pointermove", { clientX: 280, clientY: 220 });
    firePointerEvent(canvas, "pointerup");

    fireEvent.keyDown(board, { ctrlKey: true, key: "a" });

    const internalOverlays = canvas.querySelectorAll(
      "[data-element-overlay-variant='internal']"
    );

    expect(internalOverlays).toHaveLength(2);
    expect(
      canvas.querySelectorAll(
        "[data-element-overlay-variant='internal'] .kizkatt-resize-handle"
      )
    ).toHaveLength(0);
    expect(
      canvas.querySelectorAll(
        "[data-element-overlay-variant='internal'] .kizkatt-rotate-handle"
      )
    ).toHaveLength(0);
    expect(canvas.querySelectorAll("[data-group-handle='rotate']")).toHaveLength(
      1
    );
    expect(
      canvas.querySelector(".kizkatt-group-selection .kizkatt-rotate-hover-icon")
    ).toBeInTheDocument();
  });

  it("normalizes shapes created from a reverse drag direction", () => {
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    firePointerEvent(canvas, "pointerdown", { clientX: 140, clientY: 100 });
    firePointerEvent(canvas, "pointermove", { clientX: 40, clientY: 40 });
    firePointerEvent(canvas, "pointerup", { clientX: 40, clientY: 40 });

    const rectangle = canvas.querySelector(
      "[data-element-type='rectangle'] rect"
    );

    expect(rectangle).toHaveAttribute("x", "40");
    expect(rectangle).toHaveAttribute("y", "40");
    expect(rectangle).toHaveAttribute("width", "100");
    expect(rectangle).toHaveAttribute("height", "60");
  });

  it("renders the selected element overlay above later canvas elements", () => {
    const baseElement = {
      angle: 0,
      backgroundColor: "#653b00",
      height: 90,
      opacity: 100,
      strokeColor: "#f08c00",
      strokeStyle: "solid" as const,
      strokeWidth: 10,
      type: "rectangle" as const,
      width: 140,
      x: 40,
      y: 40
    };

    storeCanvasState({
      elements: [
        {
          ...baseElement,
          angle: Math.PI / 8,
          id: "selected-back"
        },
        {
          ...baseElement,
          id: "front-covering",
          x: 80,
          y: 80
        }
      ],
      selectedIds: ["selected-back"]
    });

    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    const elementGroups = Array.from(
      canvas.querySelectorAll("[data-element-id]")
    );
    const overlay = canvas.querySelector(
      "[data-element-overlay-id='selected-back']"
    );

    expect(overlay).toBeInTheDocument();
    expect(elementGroups).toHaveLength(2);
    expect(
      elementGroups[elementGroups.length - 1].compareDocumentPosition(
        overlay as Element
      ) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("keeps only the moving rotate handle visible while rotating a multi-selection", () => {
    render(<KizkattGraphicEditor />);

    const board = screen.getByLabelText("Kizkatt diagram canvas");
    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 40 });
    firePointerEvent(canvas, "pointermove", { clientX: 140, clientY: 100 });
    firePointerEvent(canvas, "pointerup");

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    firePointerEvent(canvas, "pointerdown", { clientX: 200, clientY: 160 });
    firePointerEvent(canvas, "pointermove", { clientX: 280, clientY: 220 });
    firePointerEvent(canvas, "pointerup");

    fireEvent.keyDown(board, { ctrlKey: true, key: "a" });

    const rotateHandle = canvas.querySelector("[data-group-handle='rotate']");
    const startPoint = getCirclePoint(rotateHandle);
    expect(canvas.querySelector(".kizkatt-multi-selection")).toBeInTheDocument();

    firePointerEvent(rotateHandle as Element, "pointerdown", {
      clientX: startPoint.x,
      clientY: startPoint.y
    });

    expect(canvas.querySelector(".kizkatt-multi-selection")).not
      .toBeInTheDocument();
    expect(canvas.querySelector("[data-group-handle='resize']")).not
      .toBeInTheDocument();
    expect(canvas.querySelector("[data-group-handle='rotate']")).toBeInTheDocument();

    firePointerEvent(canvas, "pointermove", {
      clientX: startPoint.x + 48,
      clientY: startPoint.y
    });

    const movedPoint = getCirclePoint(
      canvas.querySelector("[data-group-handle='rotate']")
    );
    expect(movedPoint.x).not.toBe(startPoint.x);
    expect(movedPoint.y).not.toBe(startPoint.y);
  });

  it("groups selected elements from the context menu", async () => {
    render(<KizkattGraphicEditor />);

    const board = screen.getByLabelText("Kizkatt diagram canvas");
    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 40 });
    firePointerEvent(canvas, "pointermove", { clientX: 140, clientY: 100 });
    firePointerEvent(canvas, "pointerup");

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    firePointerEvent(canvas, "pointerdown", { clientX: 200, clientY: 160 });
    firePointerEvent(canvas, "pointermove", { clientX: 280, clientY: 220 });
    firePointerEvent(canvas, "pointerup");

    fireEvent.keyDown(board, { ctrlKey: true, key: "a" });
    fireEvent.contextMenu(canvas, { clientX: 80, clientY: 90 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Group" }));
    await waitFor(() => {
      expect(screen.queryByRole("menu", { name: "Canvas context menu" })).not
        .toBeInTheDocument();
    });

    expect(canvas.querySelector(".kizkatt-multi-selection")).toBeInTheDocument();
    expect(
      canvas.querySelectorAll("[data-element-overlay-variant='internal']")
    ).toHaveLength(2);

    fireEvent.contextMenu(canvas, { clientX: 80, clientY: 90 });

    expect(screen.getByRole("menuitem", { name: "Ungroup" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Group" })).not
      .toBeInTheDocument();
  });

  it("ungroups the selected group from the context menu", async () => {
    render(<KizkattGraphicEditor />);

    const board = screen.getByLabelText("Kizkatt diagram canvas");
    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 40 });
    firePointerEvent(canvas, "pointermove", { clientX: 140, clientY: 100 });
    firePointerEvent(canvas, "pointerup");

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    firePointerEvent(canvas, "pointerdown", { clientX: 200, clientY: 160 });
    firePointerEvent(canvas, "pointermove", { clientX: 280, clientY: 220 });
    firePointerEvent(canvas, "pointerup");

    fireEvent.keyDown(board, { ctrlKey: true, key: "a" });
    fireEvent.contextMenu(canvas, { clientX: 80, clientY: 90 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Group" }));
    await waitFor(() => {
      expect(screen.queryByRole("menu", { name: "Canvas context menu" })).not
        .toBeInTheDocument();
    });

    fireEvent.contextMenu(canvas, { clientX: 80, clientY: 90 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Ungroup" }));
    await waitFor(() => {
      expect(screen.queryByRole("menu", { name: "Canvas context menu" })).not
        .toBeInTheDocument();
    });

    fireEvent.contextMenu(canvas, { clientX: 80, clientY: 90 });

    expect(screen.queryByRole("menuitem", { name: "Ungroup" })).not
      .toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Group" })).toBeInTheDocument();
  });

  it("expands grouped selections as a single transform unit", () => {
    const elements: KizkattElement[] = [
      {
        angle: 0,
        backgroundColor: "#ffec99",
        height: 50,
        id: "a",
        opacity: 100,
        strokeColor: "#f08c00",
        strokeStyle: "solid",
        strokeWidth: 10,
        type: "rectangle",
        width: 100,
        x: 40,
        y: 40
      },
      {
        angle: 0,
        backgroundColor: "#ffec99",
        height: 50,
        id: "b",
        opacity: 100,
        strokeColor: "#f08c00",
        strokeStyle: "solid",
        strokeWidth: 10,
        type: "rectangle",
        width: 100,
        x: 200,
        y: 40
      },
      {
        angle: 0,
        backgroundColor: "#ffec99",
        height: 50,
        id: "c",
        opacity: 100,
        strokeColor: "#f08c00",
        strokeStyle: "solid",
        strokeWidth: 10,
        type: "rectangle",
        width: 100,
        x: 360,
        y: 40
      }
    ];
    const grouped = groupSelectedElements(elements, ["a", "b"], "group-1");

    expect(expandElementIdsToGroups(grouped, ["a"])).toEqual(["a", "b"]);
    expect(grouped[0]).toMatchObject({
      groupId: "group-1",
      groupName: "Group 1"
    });
    expect(grouped[1]).toMatchObject({
      groupId: "group-1",
      groupName: "Group 1"
    });
    expect(canUngroupSelection(grouped, ["a"])).toBe(true);
    expect(canGroupSelection(grouped, ["a"])).toBe(false);
    expect(canGroupSelection(grouped, ["a", "c"])).toBe(true);
    expect(
      ungroupSelectedElements(grouped, ["a"]).map((element) => ({
        groupId: element.groupId,
        groupName: element.groupName
      }))
    ).toEqual([
      { groupId: undefined, groupName: undefined },
      { groupId: undefined, groupName: undefined },
      { groupId: undefined, groupName: undefined }
    ]);
  });

  it("uses transformed element bounds for multi-selection frames", () => {
    const element: KizkattElement = {
      angle: Math.PI / 4,
      backgroundColor: "#ffec99",
      height: 100,
      id: "rotated",
      opacity: 100,
      strokeColor: "#d6d6d6",
      strokeStyle: "solid",
      strokeWidth: 2,
      type: "rectangle",
      width: 100,
      x: 100,
      y: 100
    };
    const localBounds = selectionBounds([element]);
    const transformedBounds = selectionBounds([element], {
      includeRotation: true
    });

    expect(localBounds).toEqual({
      height: 100,
      width: 100,
      x: 100,
      y: 100
    });
    expect(transformedBounds?.x).toBeLessThan(100);
    expect(transformedBounds?.y).toBeLessThan(100);
    expect(transformedBounds?.width).toBeGreaterThan(140);
    expect(transformedBounds?.height).toBeGreaterThan(140);
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
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

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
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    expect(canvas.querySelector("[data-element-id]")).toBeInTheDocument();

    fireEvent.keyDown(board, { key: "Delete" });

    expect(canvas.querySelector("[data-element-id]")).not.toBeInTheDocument();
  });

  it("opens a text editor when placing text on the canvas", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Text" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });

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
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });

    expect(canvas.querySelector("image")).toHaveAttribute(
      "href",
      "data:image/png;base64,kizkatt"
    );
  });

});
