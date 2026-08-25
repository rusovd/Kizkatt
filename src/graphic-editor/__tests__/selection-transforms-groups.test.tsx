import { describe, it } from "vitest";
import { storeCanvasState } from "../platform/storage";
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
  revertElementToObjectBase,
  rotateElementsAroundPoint,
  screen,
  selectionBounds,
  skewElementsFromSelectionHandle,
  ungroupSelectedElements,
  vi,
  waitFor,
  withUpdatedObjectBase,
  type KizkattElement
} from "./testUtils";

function hoverContextSubmenuItem(element: Element) {
  const submenuItem = element.closest(".kizkatt-context-menu-submenu-item");

  expect(submenuItem).toBeInTheDocument();
  fireEvent.mouseEnter(submenuItem as Element);
}

function getHandleWorldPoint(element: Element | null) {
  return {
    x: Number(element?.getAttribute("data-handle-world-x") ?? 0),
    y: Number(element?.getAttribute("data-handle-world-y") ?? 0)
  };
}

function stubImageFileLoading({
  height = 1536,
  width = 2048
}: {
  height?: number;
  width?: number;
} = {}) {
  class FileReaderMock {
    result = "data:image/png;base64,kizkatt";
    onload: (() => void) | null = null;

    readAsDataURL() {
      this.onload?.();
    }
  }

  class ImageMock {
    complete = true;
    naturalHeight = height;
    naturalWidth = width;
    onerror: (() => void) | null = null;
    onload: (() => void) | null = null;

    set src(_value: string) {
      this.onload?.();
    }
  }

  vi.stubGlobal("FileReader", FileReaderMock);
  vi.stubGlobal("Image", ImageMock);
}

function getManualSvgTransformedBounds(element: KizkattElement) {
  const center = {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2
  };
  const skewX = Math.tan(element.skewX ?? 0);
  const skewY = Math.tan(element.skewY ?? 0);
  const cos = Math.cos(element.angle);
  const sin = Math.sin(element.angle);
  const corners = [
    { x: element.x, y: element.y },
    { x: element.x + element.width, y: element.y },
    { x: element.x + element.width, y: element.y + element.height },
    { x: element.x, y: element.y + element.height }
  ].map((corner) => {
    const localX = corner.x - center.x;
    const localY = corner.y - center.y;
    const skewedY = localY + localX * skewY;
    const skewedX = localX + skewedY * skewX;

    return {
      x: center.x + skewedX * cos - skewedY * sin,
      y: center.y + skewedX * sin + skewedY * cos
    };
  });
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    height: maxY - minY,
    width: maxX - minX,
    x: minX,
    y: minY
  };
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
    expect(groupHandle).toBeInTheDocument();
    expect(canvas.querySelector("[data-group-handle='rotate']")).not
      .toBeInTheDocument();

    firePointerEvent(canvas, "pointerdown", { clientX: 80, clientY: 80 });
    firePointerEvent(canvas, "pointerup");

    expect(canvas.querySelectorAll("[data-skew-handle]")).toHaveLength(4);
    expect(canvas.querySelectorAll(".kizkatt-corner-rotate-handle"))
      .toHaveLength(4);
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

  it("shows faint internal overlays for multi-selections without the hidden top rotate handle", () => {
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
      0
    );
    expect(
      canvas.querySelector(".kizkatt-group-selection .kizkatt-rotate-hover-icon")
    ).not.toBeInTheDocument();
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

  it("shows only a transform preview while rotating a multi-selection", () => {
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

    firePointerEvent(canvas, "pointerdown", { clientX: 80, clientY: 80 });
    firePointerEvent(canvas, "pointerup");

    const rotateHandle = canvas.querySelector("[data-handle='rotate']");
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
    expect(canvas.querySelector("[data-handle='rotate']")).not
      .toBeInTheDocument();

    firePointerEvent(canvas, "pointermove", {
      clientX: startPoint.x + 48,
      clientY: startPoint.y
    });

    expect(canvas.querySelector(".kizkatt-transform-preview"))
      .toBeInTheDocument();
    expect(canvas.querySelectorAll(".kizkatt-transform-preview-contour"))
      .toHaveLength(2);
    expect(
      Array.from(
        canvas.querySelectorAll(".kizkatt-transform-preview-contour")
      ).every((element) => element.tagName.toLowerCase() === "rect")
    ).toBe(true);
    expect(canvas.querySelector(".kizkatt-transform-preview-bounds"))
      .not.toBeInTheDocument();
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

  it("preserves selected group proportions during constrained resize", () => {
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
      { x: 400, y: 300 },
      { preserveAspectRatio: true }
    );
    const bounds = selectionBounds(resized);

    expect(bounds!.width / bounds!.height).toBeCloseTo(240 / 180);
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

  it("skews selected elements around a shared center", () => {
    const elements = [
      {
        angle: 0,
        backgroundColor: "#ffec99",
        height: 40,
        id: "top",
        opacity: 100,
        strokeColor: "#d6d6d6",
        strokeStyle: "solid" as const,
        strokeWidth: 2,
        type: "rectangle" as const,
        width: 80,
        x: 80,
        y: 60
      },
      {
        angle: 0,
        backgroundColor: "#ffec99",
        height: 40,
        id: "bottom",
        opacity: 100,
        strokeColor: "#d6d6d6",
        strokeStyle: "solid" as const,
        strokeWidth: 2,
        type: "rectangle" as const,
        width: 80,
        x: 80,
        y: 180
      }
    ] as KizkattElement[];
    const skewed = skewElementsFromSelectionHandle(
      elements,
      ["top", "bottom"],
      { height: 160, width: 80, x: 80, y: 60 },
      { x: 120, y: 140 },
      "top",
      { x: 120, y: 60 },
      { x: 160, y: 60 }
    );

    expect(skewed[0].skewX).toBeLessThan(0);
    expect(skewed[1].skewX).toBeLessThan(0);
    expect(skewed[0].x).toBeGreaterThan(elements[0].x);
    expect(skewed[1].x).toBeLessThan(elements[1].x);
  });

  it("skews each dragged edge toward the pointer direction", () => {
    const element = {
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
      x: 50,
      y: 60
    } as KizkattElement;
    const elements = [element];
    const bounds = { height: 80, width: 100, x: 50, y: 60 };
    const center = { x: 100, y: 100 };

    const topRight = skewElementsFromSelectionHandle(
      elements,
      ["rectangle"],
      bounds,
      center,
      "top",
      { x: 100, y: 60 },
      { x: 140, y: 60 }
    )[0];
    const bottomRight = skewElementsFromSelectionHandle(
      elements,
      ["rectangle"],
      bounds,
      center,
      "bottom",
      { x: 100, y: 140 },
      { x: 140, y: 140 }
    )[0];
    const leftDown = skewElementsFromSelectionHandle(
      elements,
      ["rectangle"],
      bounds,
      center,
      "left",
      { x: 50, y: 100 },
      { x: 50, y: 140 }
    )[0];
    const rightDown = skewElementsFromSelectionHandle(
      elements,
      ["rectangle"],
      bounds,
      center,
      "right",
      { x: 150, y: 100 },
      { x: 150, y: 140 }
    )[0];

    expect(topRight.skewX).toBeLessThan(0);
    expect(bottomRight.skewX).toBeGreaterThan(0);
    expect(leftDown.skewY).toBeLessThan(0);
    expect(rightDown.skewY).toBeGreaterThan(0);
  });

  it("switches a repeat-clicked selection into skew mode and skews from an edge handle", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "#ffec99",
          height: 70,
          id: "rectangle",
          name: "Rectangle 1",
          opacity: 100,
          skewX: 0,
          skewY: 0,
          strokeColor: "#d6d6d6",
          strokeStyle: "solid",
          strokeWidth: 2,
          type: "rectangle",
          width: 120,
          x: 40,
          y: 50
        }
      ],
      selectedIds: ["rectangle"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    expect(canvas.querySelector("[data-skew-handle]")).not.toBeInTheDocument();

    firePointerEvent(canvas, "pointerdown", { clientX: 80, clientY: 80 });
    firePointerEvent(canvas, "pointerup");

    expect(canvas.querySelectorAll("[data-skew-handle]")).toHaveLength(4);
    expect(canvas.querySelectorAll(".kizkatt-corner-rotate-handle"))
      .toHaveLength(4);

    const topSkewHandle = canvas.querySelector('[data-skew-handle="top"]');
    const topSkewHandlePath = topSkewHandle?.querySelector("path");

    expect(topSkewHandle).toBeInTheDocument();
    expect(topSkewHandlePath).toBeInTheDocument();

    firePointerEvent(topSkewHandlePath as Element, "pointerdown", {
      clientX: 100,
      clientY: 25
    });
    firePointerEvent(canvas, "pointermove", { clientX: 150, clientY: 25 });
    firePointerEvent(canvas, "pointerup");

    const elementGroup = canvas.querySelector("[data-element-id='rectangle']");

    expect(elementGroup?.getAttribute("transform")).toContain("skewX(");
    expect(elementGroup?.getAttribute("transform")).not.toContain("skewX(0)");
  });

  it("keeps skew and rotate icons on the selection bounding rectangle", () => {
    const element: KizkattElement = {
      angle: Math.PI / 10,
      backgroundColor: "#0b3556",
      height: 70,
      id: "rectangle",
      name: "Rectangle 1",
      opacity: 100,
      skewX: 0.35,
      skewY: -0.22,
      strokeColor: "#1971c2",
      strokeStyle: "solid",
      strokeWidth: 6,
      type: "rectangle",
      width: 140,
      x: 60,
      y: 70
    };
    storeCanvasState({
      elements: [element],
      selectedIds: ["rectangle"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    firePointerEvent(canvas, "pointerdown", { clientX: 130, clientY: 105 });
    firePointerEvent(canvas, "pointerup");

    const bounds = selectionBounds([element], { includeRotation: true });
    const expectedBounds = getManualSvgTransformedBounds(element);

    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeCloseTo(expectedBounds.x);
    expect(bounds!.y).toBeCloseTo(expectedBounds.y);
    expect(bounds!.width).toBeCloseTo(expectedBounds.width);
    expect(bounds!.height).toBeCloseTo(expectedBounds.height);

    const expectedCenter = {
      x: bounds!.x + bounds!.width / 2,
      y: bounds!.y + bounds!.height / 2
    };
    const topHandle = getHandleWorldPoint(
      canvas.querySelector('[data-skew-handle="top"]')
    );
    const rightHandle = getHandleWorldPoint(
      canvas.querySelector('[data-skew-handle="right"]')
    );
    const northWestRotateHandle = getHandleWorldPoint(
      canvas.querySelector(".kizkatt-corner-rotate-handle")
    );

    expect(topHandle.x).toBeCloseTo(expectedCenter.x);
    expect(topHandle.y).toBeLessThan(bounds!.y);
    expect(rightHandle.x).toBeGreaterThan(bounds!.x + bounds!.width);
    expect(rightHandle.y).toBeCloseTo(expectedCenter.y);
    expect(northWestRotateHandle.x).toBeLessThan(bounds!.x);
    expect(northWestRotateHandle.y).toBeLessThan(bounds!.y);
  });

  it("undoes a dragged move as a single history step", () => {
    storeCanvasState({
      elements: [
        {
          angle: 0,
          backgroundColor: "#ffec99",
          height: 70,
          id: "rectangle",
          name: "Rectangle 1",
          opacity: 100,
          strokeColor: "#d6d6d6",
          strokeStyle: "solid",
          strokeWidth: 2,
          type: "rectangle",
          width: 120,
          x: 40,
          y: 50
        }
      ],
      selectedIds: ["rectangle"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    const elementRect = canvas.querySelector("[data-element-id='rectangle'] rect");

    expect(elementRect).toHaveAttribute("x", "40");
    expect(elementRect).toHaveAttribute("y", "50");

    firePointerEvent(canvas, "pointerdown", { clientX: 80, clientY: 80 });
    firePointerEvent(canvas, "pointermove", { clientX: 110, clientY: 100 });
    firePointerEvent(canvas, "pointerup");

    expect(elementRect).toHaveAttribute("x", "70");
    expect(elementRect).toHaveAttribute("y", "70");

    fireEvent.click(screen.getByRole("button", { name: "Undo" }));

    expect(elementRect).toHaveAttribute("x", "40");
    expect(elementRect).toHaveAttribute("y", "50");
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

  it("stores and restores an element object base snapshot", () => {
    const element: KizkattElement = {
      angle: Math.PI / 8,
      backgroundColor: "#653b00",
      height: 40,
      id: "rectangle",
      opacity: 72,
      skewX: 0.2,
      skewY: -0.1,
      strokeColor: "#f08c00",
      strokeStyle: "dashed",
      strokeWidth: 12,
      type: "rectangle",
      width: 80,
      x: 10,
      y: 20
    };
    const based = withUpdatedObjectBase(element);
    const changed = {
      ...based,
      angle: 0,
      backgroundColor: "#ffffff",
      height: 140,
      opacity: 100,
      strokeStyle: "solid" as const,
      strokeWidth: 2,
      width: 200,
      x: 300,
      y: 400
    };

    expect(revertElementToObjectBase(changed)).toMatchObject({
      angle: element.angle,
      backgroundColor: element.backgroundColor,
      height: element.height,
      opacity: element.opacity,
      skewX: element.skewX,
      skewY: element.skewY,
      strokeColor: element.strokeColor,
      strokeStyle: element.strokeStyle,
      strokeWidth: element.strokeWidth,
      width: element.width,
      x: element.x,
      y: element.y
    });
  });

  it("does not duplicate immutable image and SVG sources in object bases", () => {
    const source = "data:image/png;base64," + "A".repeat(4_096);
    const svgContent = `<svg>${"<path />".repeat(256)}</svg>`;
    const element: KizkattElement = {
      angle: 0,
      backgroundColor: "transparent",
      height: 120,
      id: "image",
      opacity: 100,
      src: source,
      strokeColor: "#111111",
      strokeStyle: "solid",
      strokeWidth: 0,
      svgContent,
      svgUseElementStyle: true,
      svgViewBox: "0 0 160 120",
      type: "image",
      width: 160,
      x: 10,
      y: 20
    };

    const based = withUpdatedObjectBase(element);

    expect(based.base).not.toHaveProperty("src");
    expect(based.base).not.toHaveProperty("svgContent");
    expect(based.base).not.toHaveProperty("svgUseElementStyle");
    expect(based.base).not.toHaveProperty("svgViewBox");

    const restored = revertElementToObjectBase({
      ...based,
      height: 60,
      strokeWidth: 8,
      width: 80
    });

    expect(restored).toMatchObject({
      height: 120,
      src: source,
      strokeWidth: 0,
      svgContent,
      svgUseElementStyle: true,
      svgViewBox: "0 0 160 120",
      width: 160
    });
  });

  it("restores distinct object bases for multiple selected elements", () => {
    const elements: KizkattElement[] = [
      withUpdatedObjectBase({
        angle: 0,
        backgroundColor: "#653b00",
        height: 40,
        id: "first",
        opacity: 80,
        strokeColor: "#f08c00",
        strokeStyle: "solid",
        strokeWidth: 10,
        type: "rectangle",
        width: 80,
        x: 10,
        y: 20
      }),
      withUpdatedObjectBase({
        angle: Math.PI / 12,
        backgroundColor: "#0b3556",
        height: 70,
        id: "second",
        opacity: 45,
        strokeColor: "#228be6",
        strokeStyle: "dashed",
        strokeWidth: 6,
        type: "rectangle",
        width: 120,
        x: 140,
        y: 90
      })
    ];
    const changed = elements.map((element) => ({
      ...element,
      backgroundColor: "#ffffff",
      strokeColor: "#000000",
      strokeStyle: "dotted" as const,
      strokeWidth: 1
    }));
    const restored = changed.map(revertElementToObjectBase);

    expect(restored).toEqual([
      expect.objectContaining({
        backgroundColor: "#653b00",
        strokeColor: "#f08c00",
        strokeStyle: "solid",
        strokeWidth: 10
      }),
      expect.objectContaining({
        backgroundColor: "#0b3556",
        strokeColor: "#228be6",
        strokeStyle: "dashed",
        strokeWidth: 6
      })
    ]);
  });

  it("updates and reverts object bases from the context menu", async () => {
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    const rectangle = canvas.querySelector("[data-element-type='rectangle'] rect");

    expect(rectangle).toHaveAttribute("x", "40");
    expect(rectangle).toHaveAttribute("y", "50");

    firePointerEvent(canvas, "pointerdown", { clientX: 80, clientY: 80 });
    firePointerEvent(canvas, "pointermove", { clientX: 110, clientY: 100 });
    firePointerEvent(canvas, "pointerup");

    expect(rectangle).toHaveAttribute("x", "70");
    expect(rectangle).toHaveAttribute("y", "70");

    fireEvent.contextMenu(canvas, { clientX: 80, clientY: 90 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Update object base" }));
    await waitFor(() => {
      expect(screen.queryByRole("menu", { name: "Canvas context menu" })).not
        .toBeInTheDocument();
    });

    firePointerEvent(canvas, "pointerdown", { clientX: 100, clientY: 100 });
    firePointerEvent(canvas, "pointermove", { clientX: 140, clientY: 130 });
    firePointerEvent(canvas, "pointerup");

    expect(rectangle).toHaveAttribute("x", "110");
    expect(rectangle).toHaveAttribute("y", "100");

    fireEvent.change(screen.getByLabelText("Stroke style"), {
      target: { value: "dashed" }
    });
    const resizeHandle = canvas.querySelector("[data-resize-handle='se']");
    firePointerEvent(resizeHandle as Element, "pointerdown", {
      clientX: 230,
      clientY: 170
    });
    firePointerEvent(canvas, "pointermove", { clientX: 270, clientY: 210 });
    firePointerEvent(canvas, "pointerup");

    expect(rectangle).toHaveAttribute("width", "160");
    expect(rectangle).toHaveAttribute("height", "110");
    expect(rectangle).toHaveAttribute("data-stroke-style", "dashed");

    fireEvent.contextMenu(canvas, { clientX: 120, clientY: 110 });
    fireEvent.click(screen.getByRole("menuitem", { name: "Revert object base" }));
    await waitFor(() => {
      expect(screen.queryByRole("menu", { name: "Canvas context menu" })).not
        .toBeInTheDocument();
    });

    expect(rectangle).toHaveAttribute("x", "70");
    expect(rectangle).toHaveAttribute("y", "70");
    expect(rectangle).toHaveAttribute("width", "120");
    expect(rectangle).toHaveAttribute("height", "70");
    expect(rectangle).toHaveAttribute("data-stroke-style", "solid");
    expect(
      canvas.querySelector(".kizkatt-transform-center-marker--cross")
    ).toHaveAttribute("transform", "translate(130 105)");
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
    stubImageFileLoading();
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Image" }));
    fireEvent.change(screen.getByLabelText("Choose image"), {
      target: {
        files: [new File(["kizkatt"], "kizkatt.png", { type: "image/png" })]
      }
    });

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointermove", { clientX: 40, clientY: 50 });

    const preview = canvas.querySelector(
      "[data-image-placement-preview] rect"
    );

    expect(preview).toHaveAttribute("x", "40");
    expect(preview).toHaveAttribute("y", "50");
    expect(preview).toHaveAttribute("height", "1536");
    expect(preview).toHaveAttribute("width", "2048");

    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointerup", { clientX: 40, clientY: 50 });

    const image = canvas.querySelector("image");

    expect(image).toHaveAttribute(
      "href",
      "data:image/png;base64,kizkatt"
    );
    expect(image).toHaveAttribute("height", "1536");
    expect(image).toHaveAttribute("width", "2048");
    expect(image).toHaveAttribute("preserveAspectRatio", "none");
    expect(
      canvas.querySelector("[data-element-type='image'] [data-image-border]")
    ).toHaveAttribute("stroke-width", "0");
    expect(canvas.querySelector("[data-image-placement-preview]")).not
      .toBeInTheDocument();
  });

  it("previews and applies an image size dragged before placement", () => {
    stubImageFileLoading();
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Image" }));
    fireEvent.change(screen.getByLabelText("Choose image"), {
      target: {
        files: [new File(["kizkatt"], "kizkatt.png", { type: "image/png" })]
      }
    });

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 100, clientY: 120 });
    firePointerEvent(canvas, "pointermove", { clientX: 103, clientY: 123 });

    let preview = canvas.querySelector("[data-image-placement-preview] rect");

    expect(preview).toHaveAttribute("x", "100");
    expect(preview).toHaveAttribute("y", "120");
    expect(preview).toHaveAttribute("height", "1536");
    expect(preview).toHaveAttribute("width", "2048");
    expect(canvas.querySelector("image")).not.toBeInTheDocument();

    firePointerEvent(canvas, "pointermove", { clientX: 300, clientY: 270 });
    preview = canvas.querySelector("[data-image-placement-preview] rect");

    expect(preview).toHaveAttribute("x", "100");
    expect(preview).toHaveAttribute("y", "120");
    expect(preview).toHaveAttribute("height", "150");
    expect(preview).toHaveAttribute("width", "200");
    expect(canvas.querySelector("image")).not.toBeInTheDocument();

    firePointerEvent(canvas, "pointerup", { clientX: 300, clientY: 270 });

    const image = canvas.querySelector("image");

    expect(image).toHaveAttribute("x", "100");
    expect(image).toHaveAttribute("y", "120");
    expect(image).toHaveAttribute("height", "150");
    expect(image).toHaveAttribute("width", "200");
    expect(image).toHaveAttribute("preserveAspectRatio", "none");
    expect(canvas.querySelector("[data-image-placement-preview]")).not
      .toBeInTheDocument();
  });

  it("switches object positions between canvas and base-relative coordinates", () => {
    storeCanvasState({
      elements: [
        withUpdatedObjectBase({
          angle: 0,
          backgroundColor: "#653b00",
          height: 50,
          id: "rectangle",
          opacity: 100,
          strokeColor: "#f08c00",
          strokeStyle: "solid",
          strokeWidth: 10,
          type: "rectangle",
          width: 100,
          x: 100,
          y: 80
        })
      ],
      selectedIds: ["rectangle"]
    });
    render(<KizkattGraphicEditor />);

    const xInput = screen.getByLabelText("X");
    const yInput = screen.getByLabelText("Y");
    const coordinateMode = screen.getByRole("button", {
      name: "Canvas coordinates"
    });
    const rect = screen
      .getByRole("application", { name: "Drawing canvas" })
      .querySelector("[data-element-id='rectangle'] rect");

    expect(coordinateMode).toHaveAttribute("aria-pressed", "true");
    expect(xInput).toHaveValue(150);
    expect(yInput).toHaveValue(105);

    fireEvent.change(xInput, { target: { value: "200" } });
    fireEvent.blur(xInput);
    expect(rect).toHaveAttribute("x", "150");

    fireEvent.click(coordinateMode);
    expect(coordinateMode).toHaveAttribute("aria-pressed", "false");
    expect(coordinateMode).toHaveAttribute(
      "title",
      "Coordinates relative to object base"
    );
    expect(xInput).toHaveValue(50);
    expect(yInput).toHaveValue(0);

    fireEvent.change(yInput, { target: { value: "25" } });
    fireEvent.blur(yInput);
    expect(rect).toHaveAttribute("y", "105");
  });

  it("edits object geometry from the common object panel", () => {
    storeCanvasState({
      elements: [
        withUpdatedObjectBase({
          angle: 0,
          backgroundColor: "#653b00",
          height: 50,
          id: "rectangle",
          opacity: 100,
          strokeColor: "#f08c00",
          strokeStyle: "solid",
          strokeWidth: 10,
          type: "rectangle",
          width: 100,
          x: 100,
          y: 80
        })
      ],
      selectedIds: ["rectangle"]
    });
    render(<KizkattGraphicEditor />);

    expect(screen.queryByText("Width")).not.toBeInTheDocument();
    expect(screen.queryByText("Height")).not.toBeInTheDocument();
    expect(screen.queryByText("Angle")).not.toBeInTheDocument();
    expect(screen.queryByText("Line width")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Width")).toHaveValue(100);
    expect(screen.getByLabelText("Height")).toHaveValue(100);
    const strokeStyle = screen.getByLabelText("Stroke style") as HTMLSelectElement;
    expect(strokeStyle).toHaveValue("solid");
    expect(Array.from(strokeStyle.options).map((option) => option.value)).toEqual([
      "solid",
      "dashed",
      "stitched",
      "dotted",
      "dashDot",
      "wavy",
      "zigzag"
    ]);
    const lineWidth = screen.getByLabelText("Line width");
    const lineWidthPreset = screen.getByLabelText("Line width preset");
    const sloppiness = screen.getByLabelText("Sloppiness") as HTMLSelectElement;
    const objectPanel = lineWidth.closest(".kizkatt-floating-panel");
    expect(objectPanel?.querySelectorAll("[data-feature-group]")).toHaveLength(
      9
    );
    expect(strokeStyle.closest(".kizkatt-object-panel-stack")).toBe(
      lineWidth.closest(".kizkatt-object-panel-stack")
    );
    expect(strokeStyle.closest(".kizkatt-object-select-field"))
      .toHaveClass("has-no-icon");
    expect(
      screen.getByTitle("Flip selected objects left to right").parentElement
    ).toHaveClass("kizkatt-feature-group-content");
    expect(
      screen.getByTitle("Use rounded corners").parentElement
    ).toHaveClass("kizkatt-feature-group-content");
    expect(lineWidth).toHaveValue(10);
    expect(sloppiness).toHaveValue("artist");
    expect(Array.from(sloppiness.options).map((option) => option.value)).toEqual([
      "architect",
      "artist",
      "cartoonist",
      "double"
    ]);
    expect(
      lineWidthPreset.parentElement?.querySelector(
        ".kizkatt-stroke-width-preset-chevron"
      )
    ).toHaveAttribute("aria-hidden", "true");
    expect(
      lineWidthPreset.parentElement?.querySelector(
        ".kizkatt-stroke-width-preset-chevron circle"
      )
    ).toBeInTheDocument();
    expect((lineWidthPreset as HTMLSelectElement).options[0]).toHaveAttribute(
      "hidden"
    );
    expect(
      Array.from((lineWidthPreset as HTMLSelectElement).options)
        .filter((option) => !option.hidden)
        .map((option) => option.textContent)
    ).toEqual([
      "None",
      "Contour",
      "1 px",
      "2 px",
      "3 px",
      "4 px",
      "6 px",
      "8 px",
      "10 px",
      "12 px",
      "18 px",
      "24 px",
      "48 px",
      "96 px"
    ]);

    fireEvent.change(lineWidth, {
      target: { value: "12" }
    });
    expect(lineWidth).toHaveValue(12);

    fireEvent.click(
      screen.getByRole("button", { name: "Fine line settings" })
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Scale with object" })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Close line settings" })
    );

    fireEvent.change(screen.getByLabelText("Width"), {
      target: { value: "200" }
    });
    fireEvent.blur(screen.getByLabelText("Width"));
    expect(
      screen
        .getByRole("application", { name: "Drawing canvas" })
        .querySelector("[data-element-id='rectangle'] rect")
    ).toHaveAttribute("stroke-width", "24");
    fireEvent.change(strokeStyle, {
      target: { value: "dashed" }
    });
    fireEvent.change(screen.getByLabelText("Line width preset"), {
      target: { value: "2" }
    });
    expect(lineWidth).toHaveValue(2);

    const rect = screen
      .getByRole("application", { name: "Drawing canvas" })
      .querySelector("[data-element-id='rectangle'] rect");

    expect(rect).toHaveAttribute("width", "200");
    expect(rect).toHaveAttribute("height", "100");
    expect(rect).toHaveAttribute("x", "50");
    expect(rect).toHaveAttribute("y", "55");
    expect(rect).toHaveAttribute("stroke-width", "2");
    expect(rect).toHaveAttribute("stroke-dasharray");

    fireEvent.change(strokeStyle, { target: { value: "wavy" } });
    expect(rect).toHaveAttribute("data-stroke-style", "wavy");
    expect(
      screen
        .getByRole("application", { name: "Drawing canvas" })
        .querySelector("[data-decorative-stroke='wavy']")
    ).toBeInTheDocument();

    const dragHandle = objectPanel?.querySelector("[data-panel-drag-handle]");
    fireEvent.doubleClick(dragHandle as Element);

    expect(objectPanel?.querySelector(".kizkatt-object-panel")).toHaveClass(
      "kizkatt-object-panel--vertical"
    );
    expect(
      Array.from(
        objectPanel?.querySelectorAll(
          "[data-feature-group] > [data-panel-label]"
        ) ?? []
      ).map((label) => label.textContent)
    ).toEqual([
      "Position",
      "Size",
      "Rotation",
      "Mirroring",
      "Edges",
      "Line",
      "Sloppiness",
      "Layers",
      "Actions"
    ]);
  });

  it("changes a manually entered angle without resizing the object", () => {
    storeCanvasState({
      elements: [
        withUpdatedObjectBase({
          angle: 0,
          backgroundColor: "#653b00",
          height: 50,
          id: "rectangle",
          opacity: 100,
          strokeColor: "#f08c00",
          strokeStyle: "solid",
          strokeWidth: 10,
          type: "rectangle",
          width: 100,
          x: 100,
          y: 80
        })
      ],
      selectedIds: ["rectangle"]
    });
    render(<KizkattGraphicEditor />);

    const angleInput = screen.getByLabelText("Angle");
    const rectangle = screen
      .getByRole("application", { name: "Drawing canvas" })
      .querySelector("[data-element-id='rectangle'] rect");

    fireEvent.change(angleInput, { target: { value: "4" } });
    fireEvent.change(angleInput, { target: { value: "45" } });
    fireEvent.blur(angleInput);

    expect(rectangle).toHaveAttribute("width", "100");
    expect(rectangle).toHaveAttribute("height", "50");
    expect(rectangle).toHaveAttribute("x", "100");
    expect(rectangle).toHaveAttribute("y", "80");
    expect(
      rectangle?.closest("[data-element-id]")?.getAttribute("transform")
    ).toContain("translate(150 105) rotate(45)");
  });

  it("converts millimeter line width presets to canvas pixels", () => {
    window.localStorage.setItem(
      "kizkatt:graphic-engine:grid-settings",
      JSON.stringify({
        majorSize: 10,
        metricScale: 1,
        minorSize: 5,
        showMajor: true,
        showMinor: true,
        unit: "mm"
      })
    );
    storeCanvasState({
      elements: [
        withUpdatedObjectBase({
          angle: 0,
          backgroundColor: "#653b00",
          height: 50,
          id: "rectangle",
          opacity: 100,
          strokeColor: "#f08c00",
          strokeStyle: "solid",
          strokeWidth: 10,
          type: "rectangle",
          width: 100,
          x: 100,
          y: 80
        })
      ],
      selectedIds: ["rectangle"]
    });
    render(<KizkattGraphicEditor />);

    const lineWidthPreset = screen.getByLabelText(
      "Line width preset"
    ) as HTMLSelectElement;
    const lineWidth = screen.getByLabelText("Line width");
    const oneMillimeterOption = Array.from(lineWidthPreset.options).find(
      (option) => option.textContent === "1 mm"
    );
    const fiftyMillimeterOption = Array.from(lineWidthPreset.options).find(
      (option) => option.textContent === "50 mm"
    );
    const oneMillimeterInPixels = 96 / 25.4;
    const fiftyMillimetersInPixels = oneMillimeterInPixels * 50;

    expect(Number(oneMillimeterOption?.value)).toBe(1);
    expect(lineWidth).toHaveValue(2.65);
    expect(Number(fiftyMillimeterOption?.value)).toBe(50);
    fireEvent.change(lineWidthPreset, {
      target: { value: fiftyMillimeterOption?.value }
    });
    expect(lineWidth).toHaveValue(50);

    const rect = screen
      .getByRole("application", { name: "Drawing canvas" })
      .querySelector("[data-element-id='rectangle'] rect");

    expect(Number(rect?.getAttribute("stroke-width"))).toBeCloseTo(
      fiftyMillimetersInPixels
    );
  });

  it("mirrors draw paths without rewriting their arcs", () => {
    storeCanvasState({
      elements: [
        withUpdatedObjectBase({
          angle: 0,
          backgroundColor: "transparent",
          closed: false,
          height: 60,
          id: "draw",
          opacity: 100,
          pathData: "M 0 0 A 50 40 30 0 0 100 60",
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 60 }
          ],
          strokeColor: "#f08c00",
          strokeStyle: "solid",
          strokeWidth: 8,
          type: "draw",
          width: 100,
          x: 100,
          y: 100
        })
      ],
      selectedIds: ["draw"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    const drawGroup = canvas.querySelector("[data-element-id='draw']");
    const path = drawGroup?.querySelector(":scope > path");

    fireEvent.click(screen.getByTitle("Flip selected objects left to right"));

    expect(drawGroup?.getAttribute("transform")).toContain("rotate(0)");
    expect(drawGroup?.getAttribute("transform")).toContain("scale(-1 1)");
    expect(drawGroup).toHaveAttribute("data-kizkatt-flip-x", "true");
    expect(path).toHaveAttribute(
      "d",
      "M 100 100 A 50 40 30 0 0 200 160"
    );

    fireEvent.click(screen.getByTitle("Flip selected objects left to right"));
    fireEvent.click(screen.getByTitle("Flip selected objects top to bottom"));

    expect(drawGroup?.getAttribute("transform")).toContain("rotate(0)");
    expect(drawGroup?.getAttribute("transform")).toContain("scale(1 -1)");
    expect(drawGroup).not.toHaveAttribute("data-kizkatt-flip-x");
    expect(drawGroup).toHaveAttribute("data-kizkatt-flip-y", "true");
    expect(path).toHaveAttribute(
      "d",
      "M 100 100 A 50 40 30 0 0 200 160"
    );
  });

  it("mirrors both endpoints of linear objects", () => {
    storeCanvasState({
      elements: [
        withUpdatedObjectBase({
          angle: 0,
          backgroundColor: "transparent",
          height: 60,
          id: "line",
          opacity: 100,
          strokeColor: "#f08c00",
          strokeStyle: "solid",
          strokeWidth: 8,
          type: "line",
          width: 100,
          x: 100,
          y: 100
        })
      ],
      selectedIds: ["line"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    const line = canvas.querySelector("[data-element-id='line'] line");

    fireEvent.click(screen.getByTitle("Flip selected objects left to right"));

    expect(line?.parentElement?.getAttribute("transform")).toContain(
      "scale(-1 1)"
    );
    expect(line?.parentElement).toHaveAttribute("data-kizkatt-flip-x", "true");
    expect(line).toHaveAttribute("x1", "100");
    expect(line).toHaveAttribute("y1", "100");
    expect(line).toHaveAttribute("x2", "200");
    expect(line).toHaveAttribute("y2", "160");

    fireEvent.click(screen.getByTitle("Flip selected objects left to right"));
    fireEvent.click(screen.getByTitle("Flip selected objects top to bottom"));

    expect(line?.parentElement?.getAttribute("transform")).toContain(
      "scale(1 -1)"
    );
    expect(line?.parentElement).not.toHaveAttribute("data-kizkatt-flip-x");
    expect(line?.parentElement).toHaveAttribute("data-kizkatt-flip-y", "true");
    expect(line).toHaveAttribute("x1", "100");
    expect(line).toHaveAttribute("y1", "100");
    expect(line).toHaveAttribute("x2", "200");
    expect(line).toHaveAttribute("y2", "160");
  });

  it("mirrors bitmap images vertically and horizontally", () => {
    storeCanvasState({
      elements: [
        withUpdatedObjectBase({
          angle: 0,
          backgroundColor: "transparent",
          height: 80,
          id: "image",
          opacity: 100,
          src: "data:image/png;base64,kizkatt",
          strokeColor: "#1971c2",
          strokeStyle: "solid",
          strokeWidth: 0,
          type: "image",
          width: 120,
          x: 100,
          y: 80
        })
      ],
      selectedIds: ["image"]
    });
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    const imageGroup = canvas.querySelector("[data-element-id='image']");

    expect(imageGroup?.getAttribute("transform")).not.toContain("scale(");

    fireEvent.click(screen.getByTitle("Flip selected objects top to bottom"));

    expect(imageGroup).toHaveAttribute("data-kizkatt-flip-y", "true");
    expect(imageGroup?.getAttribute("transform")).toContain("scale(1 -1)");

    fireEvent.change(screen.getByLabelText("Width"), {
      target: { value: "150" }
    });
    fireEvent.blur(screen.getByLabelText("Width"));

    expect(imageGroup).toHaveAttribute("data-kizkatt-flip-y", "true");
    expect(imageGroup?.getAttribute("transform")).toContain("scale(1 -1)");

    fireEvent.click(screen.getByTitle("Flip selected objects top to bottom"));

    expect(imageGroup).not.toHaveAttribute("data-kizkatt-flip-y");
    expect(imageGroup?.getAttribute("transform")).not.toContain("scale(");

    fireEvent.click(screen.getByTitle("Flip selected objects left to right"));

    expect(imageGroup).toHaveAttribute("data-kizkatt-flip-x", "true");
    expect(imageGroup?.getAttribute("transform")).toContain("scale(-1 1)");
  });

});
