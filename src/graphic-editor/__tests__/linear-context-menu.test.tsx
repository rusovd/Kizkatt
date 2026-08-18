import { describe, it } from "vitest";
import {
  formatKeyboardShortcut,
  isPrimaryShortcutModifierPressed
} from "../platform/keyboard";
import { storeCanvasState } from "../platform/storage";
import {
  chooseGroupedTool,
  KizkattGraphicEditor,
  expect,
  fireEvent,
  firePointerEvent,
  render,
  screen,
  vi
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

function openViewSettings() {
  openEditorSettingsSubmenu("View mode");
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

  it("inserts bend points on straight lines from the midpoint handle", () => {
    render(<KizkattGraphicEditor />);

    chooseGroupedTool("Arrow", "Line");

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 50 });

    expect(canvas.querySelector(".kizkatt-bend-handle")).not.toBeInTheDocument();

    firePointerEvent(canvas, "pointerup");

    expect(canvas.querySelector("[data-element-id] line")).toBeInTheDocument();
    expect(canvas.querySelector(".kizkatt-bend-handle")).not
      .toBeInTheDocument();
    expect(canvas.querySelector(".kizkatt-selection-overlay")).not
      .toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Node edit" }));
    expect(canvas.querySelector(".kizkatt-bend-handle")).toBeInTheDocument();

    const bendHandle = canvas.querySelector(".kizkatt-bend-handle");
    firePointerEvent(bendHandle as Element, "pointerdown", { clientX: 100, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 100, clientY: 20 });

    const bendPreviewLine = canvas.querySelector(
      ".kizkatt-transform-preview-line"
    );
    const bendPreviewBounds = canvas.querySelector(
      ".kizkatt-transform-preview-bounds"
    );
    expect(bendPreviewLine).toBeInTheDocument();
    expect(bendPreviewLine?.getAttribute("d")).not.toContain("Z");
    expect(bendPreviewBounds?.getAttribute("d")).toContain("Z");

    firePointerEvent(canvas, "pointerup");

    const curvePath = canvas.querySelector("[data-element-id] path");
    expect(curvePath?.getAttribute("d")).toContain(" C ");
    expect(canvas.querySelectorAll(".kizkatt-bend-point-handle")).toHaveLength(1);
    expect(canvas.querySelector(".kizkatt-bend-point-handle.is-selected"))
      .toBeInTheDocument();
    expect(canvas.querySelectorAll(".kizkatt-bend-handle")).toHaveLength(2);
    expect(canvas.querySelector(".kizkatt-selection-overlay")).not
      .toBeInTheDocument();
    expect(canvas.querySelector(".kizkatt-bend-handle")).toBeInTheDocument();

    chooseGroupedTool("Arrow", "Line");
    fireEvent.click(screen.getByRole("button", { name: "Edges sharp" }));
    expect(curvePath?.getAttribute("d")).not.toContain(" C ");
    expect(curvePath?.getAttribute("d")).toContain(" L ");
    expect(canvas.querySelectorAll(".kizkatt-bend-point-handle")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Node edit" }));
    expect(canvas.querySelectorAll(".kizkatt-bend-point-handle")).toHaveLength(1);

    fireEvent.keyDown(screen.getByLabelText("Kizkatt diagram canvas"), {
      key: "Delete"
    });
    expect(canvas.querySelectorAll(".kizkatt-bend-point-handle")).toHaveLength(0);
    expect(canvas.querySelector("[data-element-id] line")).toBeInTheDocument();
  });

  it("moves lines and edits only the dragged endpoint in node edit mode", () => {
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
      "M 60 70 L 120 100 L 180 140"
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
      "M 60 70 L 120 100 L 180 140"
    );
    expect(canvas.querySelector(".kizkatt-transform-preview-line"))
      .toHaveAttribute("d", "M 20 30 L 120 100 L 180 140");
    expect(
      canvas.querySelector(".kizkatt-transform-preview-bounds")
        ?.getAttribute("d")
    ).toContain("Z");
    expect(canvas).toHaveStyle({ cursor: "move" });

    firePointerEvent(canvas, "pointerup", { clientX: 20, clientY: 30 });

    expect(linePath).toHaveAttribute(
      "d",
      "M 20 30 L 120 100 L 180 140"
    );
    expect(canvas.querySelector(".kizkatt-transform-preview")).not
      .toBeInTheDocument();

    const endHandle = canvas.querySelector("[data-line-endpoint='end']");
    firePointerEvent(endHandle as Element, "pointerdown", {
      clientX: 180,
      clientY: 140
    });
    firePointerEvent(canvas, "pointermove", { clientX: 200, clientY: 140 });
    firePointerEvent(canvas, "pointerup", { clientX: 200, clientY: 140 });

    expect(linePath).toHaveAttribute(
      "d",
      "M 20 30 L 120 100 L 200 140"
    );
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
    expect(screen.queryByRole("menuitemcheckbox", { name: /View mode/ }))
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

  it("uses view mode as a read-only canvas mode", () => {
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    openViewSettings();
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: /View mode/ }));

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    expect(screen.getByRole("button", { name: "Select" })).toHaveClass(
      "is-active"
    );

    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    expect(canvas.querySelector("[data-element-id]")).not.toBeInTheDocument();

    fireEvent.contextMenu(canvas, { clientX: 80, clientY: 90 });
    expect(screen.queryByRole("menuitem", { name: /Paste/ })).not
      .toBeInTheDocument();
  });

  it("hides editing panels in zen mode while keeping zoom controls available", () => {
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    expect(screen.getByRole("button", { name: "Rectangle" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();

    openViewSettings();
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: /Zen mode/ }));

    expect(screen.queryByRole("button", { name: "Rectangle" })).not
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Main menu" })).toBeInTheDocument();
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
