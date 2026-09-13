import { describe, it } from "vitest";
import { extractKizkattSceneArchive } from "kizkatt-graphic-engine";
import {
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_CANVAS_BACKGROUND_BY_THEME,
  DEFAULT_GRID_COLOR,
  DEFAULT_GRID_COLOR_BY_THEME,
  Icons,
  KizkattGraphicEditor,
  act,
  chooseGroupedTool,
  expect,
  fireEvent,
  firePointerEvent,
  render,
  screen,
  storeCanvasBackgroundColor,
  storeGridColor,
  storeTheme,
  vi,
  waitFor
} from "./testUtils";

function openEditorSettings() {
  fireEvent.click(screen.getByRole("button", { name: "Editor settings" }));
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

describe("KizkattGraphicEditor shell", () => {
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
    expect(screen.getByRole("button", { name: "Node edit" }))
      .toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Library" })).not
      .toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lock" })).not
      .toBeInTheDocument();
  });

  it("starts with the Kizkatt default canvas background", () => {
    render(<KizkattGraphicEditor />);

    expect(screen.getByRole("application", { name: "Drawing canvas" }))
      .toHaveStyle({
        backgroundColor: DEFAULT_CANVAS_BACKGROUND_BY_THEME.dark
      });
  });

  it("zooms from the navigation tool and exposes viewport fit commands", () => {
    render(<KizkattGraphicEditor />);

    chooseGroupedTool("Hand", "Zoom");

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    const zoomButton = screen.getByRole("button", { name: "Zoom" });

    expect(zoomButton).toHaveClass("is-active");
    expect(zoomButton).toHaveClass("has-submenu");
    expect(screen.getByRole("button", { name: "Zoom to selected" }))
      .toBeDisabled();
    expect(screen.getByRole("button", { name: "Zoom to all objects" }))
      .toBeDisabled();
    expect(screen.getByRole("button", { name: "Zoom to page" }))
      .toBeEnabled();
    expect(screen.getByRole("button", { name: "Zoom to page width" }))
      .toBeEnabled();
    expect(screen.getByRole("button", { name: "Zoom to page height" }))
      .toBeEnabled();

    firePointerEvent(canvas, "pointerdown", { clientX: 100, clientY: 80 });
    firePointerEvent(canvas, "pointerup", { clientX: 100, clientY: 80 });
    expect(screen.getByText("125%")).toBeInTheDocument();
    expect(
      canvas.querySelector(":scope > g[transform]")?.getAttribute("transform")
    ).toContain("scale(1.25)");

    fireEvent.wheel(canvas, { deltaY: -100 });
    expect(screen.getByText("135%")).toBeInTheDocument();
  });

  it("fits a dragged zoom area without applying the click increment", () => {
    render(<KizkattGraphicEditor />);

    chooseGroupedTool("Hand", "Zoom");

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    firePointerEvent(canvas, "pointerdown", { clientX: 100, clientY: 100 });
    firePointerEvent(canvas, "pointermove", { clientX: 500, clientY: 400 });

    expect(canvas.querySelector(".kizkatt-area-selection"))
      .toBeInTheDocument();

    firePointerEvent(canvas, "pointerup", { clientX: 500, clientY: 400 });

    expect(screen.getByText("256%")).toBeInTheDocument();
    expect(canvas.querySelector(".kizkatt-area-selection"))
      .not.toBeInTheDocument();
  });

  it("restores and stores the canvas background in the Kizkatt namespace", () => {
    storeCanvasBackgroundColor("#161719", "dark");

    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    expect(canvas).toHaveStyle({ backgroundColor: "#161719" });

    openEditorSettings();
    fireEvent.click(
      screen.getByRole("button", {
        name: "Canvas background #211a16"
      })
    );

    expect(
      window.localStorage.getItem(
        "kizkatt:graphic-engine:canvas-background:dark"
      )
    ).toBe("#211a16");
    expect(
      window.localStorage.getItem("kizkatt:graphic-engine:canvas-background")
    ).toBeNull();
  });

  it("restores and stores the grid color in the Kizkatt namespace", () => {
    const blueGridColor = "rgba(132, 190, 255, 0.18)";

    storeGridColor(blueGridColor, "dark");

    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    expect(canvas.style.getPropertyValue("--kizkatt-canvas-grid")).toBe(
      blueGridColor
    );

    openGridSettings();
    fireEvent.click(
      screen.getByRole("button", {
        name: `Grid color ${DEFAULT_GRID_COLOR}`
      })
    );

    expect(
      window.localStorage.getItem("kizkatt:graphic-engine:grid-color:dark")
    ).toBe(DEFAULT_GRID_COLOR);
    expect(
      window.localStorage.getItem("kizkatt:graphic-engine:grid-color")
    ).toBeNull();
  });

  it("draws and stores configurable grid spacing from the editor settings", () => {
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    const minorGrid = canvas.querySelector("#kizkatt-grid-minor");
    const minorPath = minorGrid?.querySelector("path");

    expect(minorGrid).toHaveAttribute("width", "30");
    expect(minorGrid).toHaveAttribute("height", "30");
    expect(minorPath?.getAttribute("d")).toContain("M 1.75 3 H 4.25");

    openGridSettings();

    expect(screen.getByRole("group", { name: "Global units" }))
      .toBeInTheDocument();
    expect(screen.getByLabelText("Major spacing (px)")).toHaveValue(30);
    expect(screen.getByLabelText("Minor spacing (px)")).toHaveValue(3);
    expect(screen.getByRole("checkbox", { name: /Major grid/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Minor grid/ })).toBeChecked();

    fireEvent.change(screen.getByLabelText("Major spacing (px)"), {
      target: { value: "60" }
    });
    fireEvent.change(screen.getByLabelText("Minor spacing (px)"), {
      target: { value: "6" }
    });

    expect(
      window.localStorage.getItem("kizkatt:graphic-engine:grid-settings")
    ).toBe(
      JSON.stringify({
        unit: "px",
        metricScale: 1,
        majorSize: 60,
        minorSize: 6,
        showMajor: true,
        showMinor: true
      })
    );
    expect(minorGrid).toHaveAttribute("width", "60");
    expect(minorPath?.getAttribute("d")).toContain("M 4.75 6 H 7.25");

    fireEvent.click(screen.getByRole("button", { name: "Millimeters" }));

    expect(screen.getByLabelText("Major spacing (mm)")).toHaveValue(10);
    expect(screen.getByLabelText("Minor spacing (mm)")).toHaveValue(5);
    fireEvent.change(screen.getByLabelText("Minor spacing (mm)"), {
      target: { value: "0.1" }
    });
    expect(screen.getByLabelText("Minor spacing (mm)")).toHaveValue(0.1);
    fireEvent.change(screen.getByLabelText("Minor spacing (mm)"), {
      target: { value: "" }
    });
    expect(screen.getByLabelText("Minor spacing (mm)")).toHaveValue(null);
    fireEvent.change(screen.getByLabelText("Minor spacing (mm)"), {
      target: { value: "1" }
    });
    expect(screen.getByLabelText("Minor spacing (mm)")).toHaveValue(1);
    expect(
      window.localStorage.getItem("kizkatt:graphic-engine:grid-settings")
    ).toBe(
      JSON.stringify({
        unit: "mm",
        metricScale: 1,
        majorSize: 10,
        minorSize: 1,
        showMajor: true,
        showMinor: true
      })
    );
    expect(Number(minorGrid?.getAttribute("width"))).toBeCloseTo(
      (10 * 96) / 25.4
    );

    fireEvent.change(screen.getByLabelText("Calibrate mm"), {
      target: { value: "1.5" }
    });

    expect(
      window.localStorage.getItem("kizkatt:graphic-engine:grid-settings")
    ).toBe(
      JSON.stringify({
        unit: "mm",
        metricScale: 1.5,
        majorSize: 10,
        minorSize: 1,
        showMajor: true,
        showMinor: true
      })
    );
    expect(Number(minorGrid?.getAttribute("width"))).toBeCloseTo(
      ((10 * 96) / 25.4) * 1.5
    );
    expect(
      Number(
        screen
          .getByRole("img", { name: "30 mm calibration ruler" })
          .style.width.replace("px", "")
      )
    ).toBeCloseTo((30 * 96 * 1.5) / 25.4);

    fireEvent.click(screen.getByRole("checkbox", { name: /Major grid/ }));

    expect(canvas.querySelector(".kizkatt-grid-major")).not
      .toBeInTheDocument();
    expect(canvas.querySelector(".kizkatt-grid")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: /Minor grid/ }));

    expect(canvas.querySelector(".kizkatt-grid-major")).not
      .toBeInTheDocument();
    expect(canvas.querySelector(".kizkatt-grid")).not.toBeInTheDocument();

    const toggleGridItem = screen.getByRole("menuitemcheckbox", {
      name: /Toggle grid/
    });

    expect(toggleGridItem).toBeDisabled();
    expect(toggleGridItem).toHaveAttribute("aria-checked", "false");
  });

  it("stores the global DPI used for raster output", () => {
    const { unmount } = render(<KizkattGraphicEditor />);

    openEditorSettings();

    const dpiSelect = screen.getByLabelText("DPI") as HTMLSelectElement;
    const globalUnits = screen.getByRole("group", { name: "Global units" });

    expect(dpiSelect).toHaveValue("150");
    expect(
      globalUnits.compareDocumentPosition(dpiSelect) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(Array.from(dpiSelect.options).map((option) => option.value)).toEqual([
      "72",
      "96",
      "150",
      "203",
      "300"
    ]);

    fireEvent.change(dpiSelect, { target: { value: "300" } });

    expect(window.localStorage.getItem("kizkatt:graphic-engine:dpi")).toBe(
      "300"
    );

    unmount();
    render(<KizkattGraphicEditor />);
    openEditorSettings();

    expect(screen.getByLabelText("DPI")).toHaveValue("300");
  });

  it("stores the global default color representation", () => {
    render(<KizkattGraphicEditor />);

    openEditorSettings();
    fireEvent.click(screen.getByRole("button", { name: "RGB/A" }));

    expect(
      window.localStorage.getItem(
        "kizkatt:graphic-editor:settings:color-mode"
      )
    ).toBe("rgba");
    expect(screen.getByRole("button", { name: "RGB/A" }))
      .toHaveClass("is-active");
  });

  it("ignores legacy canvas background storage and applies the default color", () => {
    window.localStorage.setItem("kizkatt:canvas-background", "#121212");

    render(<KizkattGraphicEditor />);

    expect(screen.getByRole("application", { name: "Drawing canvas" }))
      .toHaveStyle({
        backgroundColor: DEFAULT_CANVAS_BACKGROUND_BY_THEME.dark
      });
  });

  it("does not let the legacy shared background override the stored dark theme", () => {
    storeTheme("dark");
    window.localStorage.setItem(
      "kizkatt:graphic-engine:canvas-background",
      DEFAULT_CANVAS_BACKGROUND
    );
    window.localStorage.setItem(
      "kizkatt:graphic-engine:grid-color",
      DEFAULT_GRID_COLOR_BY_THEME.light
    );

    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    expect(canvas).toHaveStyle({
      backgroundColor: DEFAULT_CANVAS_BACKGROUND_BY_THEME.dark
    });
    expect(canvas.style.getPropertyValue("--kizkatt-canvas-grid")).toBe(
      DEFAULT_GRID_COLOR_BY_THEME.dark
    );
  });

  it("separates document actions from editor settings", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));

    expect(screen.getByRole("button", { name: "New" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save as..." }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Print" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reset" })).not
      .toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Theme" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Language" }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Canvas background" }))
      .not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    openEditorSettings();
    expect(screen.getByRole("combobox", { name: "Language" })).toHaveValue(
      "en"
    );
    expect(
      screen.getByRole("button", { name: "Canvas background #161719" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Canvas background #211a16" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Canvas background #f5faff" })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Editor settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Light theme" }));
    openEditorSettings();
    expect(
      screen.getByRole("button", { name: "Canvas background #f5faff" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Pick canvas background" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Grid color" })).not
      .toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Find on canvas/ })).not
      .toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Help" })).not
      .toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Library" })).not
      .toBeInTheDocument();
    expect(screen.queryByLabelText("Styling")).not.toBeInTheDocument();
  });

  it("exposes localized tooltips on editor controls", () => {
    render(<KizkattGraphicEditor />);

    expect(screen.getByRole("button", { name: "Select" })).toHaveAttribute(
      "title",
      "Select, move, resize, and rotate objects"
    );
    expect(screen.getByRole("button", { name: "Node edit" })).toHaveAttribute(
      "title",
      "Edit line nodes and bend points"
    );
    expect(screen.getByRole("button", { name: "Zoom in" })).toHaveAttribute(
      "title",
      "Zoom into the canvas"
    );
    expect(screen.getByRole("button", { name: "Undo" })).toHaveAttribute(
      "title",
      "Undo the last change"
    );

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));

    expect(screen.getByRole("button", { name: "Load" })).toHaveAttribute(
      "title",
      "Replace the current scene from a Kizkatt file"
    );
    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    openEditorSettings();
    expect(
      screen.getByRole("button", { name: "Canvas background #161719" })
    ).toHaveAttribute("title", "Set canvas background to #161719");

    fireEvent.click(screen.getByRole("button", { name: "Editor settings" }));
    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    expect(screen.getByRole("button", { name: "Fill solid" }))
      .toHaveAttribute("title", "Use solid fill");
    expect(screen.getByRole("button", { name: "Send to back" }))
      .toHaveAttribute("title", "Move selected objects to the back");
  });

  it("stores dragged panel positions and docks button controls to the top", () => {
    render(<KizkattGraphicEditor />);

    const rectangleButton = screen.getByRole("button", { name: "Rectangle" });
    const toolbarPanel = rectangleButton.closest(".kizkatt-floating-panel");
    const dragHandle = toolbarPanel?.querySelector("[data-panel-drag-handle]");

    expect(toolbarPanel).not.toBeNull();
    expect(dragHandle).not.toBeNull();

    fireEvent.mouseDown(dragHandle as Element, {
      button: 0,
      clientX: 20,
      clientY: 20
    });
    fireEvent.mouseMove(toolbarPanel as Element, {
      clientX: 160,
      clientY: 8
    });
    fireEvent.mouseUp(toolbarPanel as Element, {
      clientX: 160,
      clientY: 8
    });

    expect(
      window.localStorage.getItem("kizkatt:graphic-editor:panel:toolbar")
    ).toBe(JSON.stringify({ x: 140, y: 16 }));
    expect(rectangleButton).not.toHaveClass("is-active");
  });

  it("keeps the main menu pinned in its top-right anchor", () => {
    window.localStorage.setItem(
      "kizkatt:graphic-editor:panel:main-menu",
      JSON.stringify({ x: 120, y: 160 })
    );
    render(<KizkattGraphicEditor />);

    const menuButton = screen.getByRole("button", { name: "Main menu" });

    expect(menuButton.closest(".kizkatt-main-menu-anchor")).not.toBeNull();
    expect(menuButton.closest(".kizkatt-floating-panel")).toBeNull();
  });

  it("lets docked panels move freely before snapping on release", () => {
    render(<KizkattGraphicEditor />);

    const nodeEditButton = screen.getByRole("button", { name: "Node edit" });
    const toolbarPanel = nodeEditButton.closest(".kizkatt-floating-panel");
    const dragHandle = toolbarPanel?.querySelector("[data-panel-drag-handle]");

    expect(toolbarPanel).not.toBeNull();
    expect(dragHandle).not.toBeNull();

    fireEvent.mouseDown(dragHandle as Element, {
      button: 0,
      clientX: 20,
      clientY: 20
    });
    fireEvent.mouseMove(toolbarPanel as Element, {
      clientX: 160,
      clientY: 30
    });

    expect(toolbarPanel).toHaveStyle({ left: "140px", top: "10px" });

    fireEvent.mouseUp(toolbarPanel as Element, {
      clientX: 160,
      clientY: 30
    });

    expect(
      window.localStorage.getItem("kizkatt:graphic-editor:panel:toolbar")
    ).toBe(JSON.stringify({ x: 140, y: 16 }));
  });

  it("opens grouped tools and applies shared panel settings", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    expect(screen.queryByRole("menuitem", { name: "Diamond" })).not
      .toBeInTheDocument();

    chooseGroupedTool("Rectangle", "Diamond");

    expect(screen.getByRole("button", { name: "Diamond" })).toHaveClass(
      "is-active"
    );

    chooseGroupedTool("Draw", "Line");

    expect(screen.getByRole("button", { name: "Line" })).toHaveClass(
      "is-active"
    );

    openEditorSettings();
    fireEvent.click(
      screen.getByRole("menuitemcheckbox", { name: /Stick panels/ })
    );

    const toolbarPanel = screen
      .getByLabelText("Kizkatt tools")
      .closest(".kizkatt-floating-panel");
    const pinnedPanelIds = JSON.parse(
      window.localStorage.getItem(
        "kizkatt:graphic-editor:settings:pinned-panels"
      ) ?? "[]"
    );

    expect(pinnedPanelIds).toContain("style-panel");
    expect(pinnedPanelIds).not.toContain("toolbar");
    expect(toolbarPanel).not.toHaveClass("is-pinned");
    expect(
      toolbarPanel?.querySelector("button[aria-label='Stick panel']")
    ).not.toBeInTheDocument();
    expect(
      toolbarPanel?.querySelector("button[aria-label='Close panel']")
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    openEditorSettings();
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: /Autohide/ }));

    expect(
      window.localStorage.getItem(
        "kizkatt:graphic-editor:settings:autohide-toolbar"
      )
    ).toBe("true");
    expect(screen.getByLabelText("Kizkatt tools")).toHaveClass(
      "kizkatt-toolbar--autohide"
    );
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    openEditorSettings();
    fireEvent.click(
      screen.getByRole("menuitemcheckbox", { name: /Unstick panels/ })
    );

    expect(toolbarPanel).not.toHaveClass("is-pinned");
    expect(screen.getByLabelText("Kizkatt tools")).toHaveClass(
      "kizkatt-toolbar--autohide"
    );
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    const dragHandle = toolbarPanel?.querySelector("[data-panel-drag-handle]");
    fireEvent.doubleClick(dragHandle as Element);

    expect(
      window.localStorage.getItem(
        "kizkatt:graphic-editor:panel:toolbar:orientation"
      )
    ).toBe("vertical");
    expect(screen.getByLabelText("Kizkatt tools")).toHaveClass(
      "kizkatt-toolbar--vertical"
    );

    openEditorSettings();
    expect(
      screen.queryByRole("menuitemcheckbox", { name: /Vertical toolbar/ })
    ).not.toBeInTheDocument();
  });

  it("closes, reopens, rotates, and resizes capable panels", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const stylePanel = screen
      .getByLabelText("Styling")
      .closest(".kizkatt-floating-panel") as HTMLElement;
    const resizeHandle = stylePanel.querySelector(
      "[data-panel-resize-handle]"
    );

    expect(resizeHandle).not.toBeNull();
    expect(stylePanel).toHaveStyle({ minHeight: "195px", minWidth: "280px" });
    expect(stylePanel.querySelectorAll("[data-feature-group]")).toHaveLength(
      4
    );
    expect(stylePanel.style.getPropertyValue("--kizkatt-panel-max-cols")).toBe(
      "2"
    );
    const panelTitle = stylePanel.querySelector(
      "[data-panel-title-drag-handle]"
    );

    expect(panelTitle).toHaveTextContent("Styling");
    fireEvent.mouseDown(panelTitle as Element, {
      button: 0,
      clientX: 100,
      clientY: 80
    });
    fireEvent.mouseMove(stylePanel, { clientX: 180, clientY: 140 });
    fireEvent.mouseUp(stylePanel, { clientX: 180, clientY: 140 });
    expect(
      window.localStorage.getItem("kizkatt:graphic-editor:panel:style-panel")
    ).toBe(JSON.stringify({ x: 80, y: 60 }));

    fireEvent.mouseDown(resizeHandle as Element, {
      button: 0,
      clientX: 10,
      clientY: 10
    });
    fireEvent.mouseMove(stylePanel, { clientX: 210, clientY: 160 });
    fireEvent.mouseUp(stylePanel, { clientX: 210, clientY: 160 });

    expect(stylePanel).toHaveStyle({ height: "345px", width: "480px" });
    expect(
      window.localStorage.getItem(
        "kizkatt:graphic-editor:panel:style-panel:size:vertical"
      )
    ).toBe(JSON.stringify({ height: 345, width: 480 }));

    const dragHandle = stylePanel.querySelector("[data-panel-drag-handle]");
    fireEvent.doubleClick(dragHandle as Element);

    expect(screen.getByLabelText("Styling")).toHaveClass(
      "kizkatt-style-panel--horizontal"
    );
    expect(
      stylePanel.querySelectorAll(".kizkatt-feature-group-icon")
    ).toHaveLength(4);
    expect(stylePanel).toHaveClass("has-hidden-labels");
    expect(stylePanel.style.getPropertyValue("--kizkatt-panel-max-rows")).toBe(
      "2"
    );
    const horizontalColorLists = Array.from(
      stylePanel.querySelectorAll(".kizkatt-quick-color-list")
    );

    expect(horizontalColorLists).toHaveLength(2);
    expect(
      horizontalColorLists.every((list) => list.children.length >= 9)
    ).toBe(true);
    expect(
      screen.getByRole("button", { name: "Background custom #653b00" })
    ).not.toHaveClass("is-active");
    expect(
      screen.getByRole("button", { name: "Stroke custom #f08c00" })
    ).not.toHaveClass("is-active");
    expect(
      stylePanel.querySelector("[data-panel-resize-handle]")
    ).toBeInTheDocument();

    const horizontalResizeHandle = stylePanel.querySelector(
      "[data-panel-resize-handle]"
    );
    fireEvent.mouseDown(horizontalResizeHandle as Element, {
      button: 0,
      clientX: 10,
      clientY: 10
    });
    fireEvent.mouseMove(stylePanel, { clientX: 110, clientY: 180 });
    fireEvent.mouseUp(stylePanel, { clientX: 110, clientY: 180 });

    expect(stylePanel.style.height).toBe("");
    expect(
      window.localStorage.getItem(
        "kizkatt:graphic-editor:panel:style-panel:size:horizontal"
      )
    ).not.toBeNull();

    fireEvent.click(
      stylePanel.querySelector("button[aria-label='Close panel']") as Element
    );
    expect(screen.queryByLabelText("Styling")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Text" }));
    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    expect(screen.getByLabelText("Styling")).toBeInTheDocument();
  });

  it("returns from the hand tool on an empty click but keeps it after panning", () => {
    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    const handButton = screen.getByRole("button", { name: "Hand" });
    const selectButton = screen.getByRole("button", { name: "Select" });

    fireEvent.click(handButton);
    firePointerEvent(canvas, "pointerdown", { clientX: 100, clientY: 140 });
    firePointerEvent(canvas, "pointerup", { clientX: 100, clientY: 140 });

    expect(selectButton).toHaveClass("is-active");

    fireEvent.click(handButton);
    firePointerEvent(canvas, "pointerdown", { clientX: 100, clientY: 140 });
    firePointerEvent(canvas, "pointermove", { clientX: 140, clientY: 180 });
    firePointerEvent(canvas, "pointerup", { clientX: 140, clientY: 180 });

    expect(handButton).toHaveClass("is-active");
    expect(canvas.querySelector(":scope > g")).toHaveAttribute(
      "transform",
      "translate(40 40) scale(1)"
    );

    fireEvent.wheel(canvas, { deltaX: 10, deltaY: 20 });
    expect(canvas.querySelector(":scope > g")).toHaveAttribute(
      "transform",
      "translate(30 20) scale(1)"
    );

    firePointerEvent(canvas, "pointerdown", { clientX: 200, clientY: 220 });
    firePointerEvent(canvas, "pointermove", { clientX: 202, clientY: 222 });
    firePointerEvent(canvas, "pointerup", { clientX: 202, clientY: 222 });

    expect(selectButton).toHaveClass("is-active");
    expect(canvas.querySelector(":scope > g")).toHaveAttribute(
      "transform",
      "translate(30 20) scale(1)"
    );
  });

  it("keeps only one toolbar submenu open at a time", () => {
    render(<KizkattGraphicEditor />);

    const openSubmenu = (buttonName: string) => {
      const button = screen.getByRole("button", { name: buttonName });

      vi.useFakeTimers();
      fireEvent.pointerDown(button);
      act(() => {
        vi.advanceTimersByTime(800);
      });
      fireEvent.pointerUp(button);
      vi.useRealTimers();
    };

    openSubmenu("Rectangle");
    expect(screen.getByRole("menuitem", { name: "Diamond" }))
      .toBeInTheDocument();

    openSubmenu("Draw");
    expect(screen.queryByRole("menuitem", { name: "Diamond" })).not
      .toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Polyline" }))
      .toBeEnabled();
    expect(screen.getByRole("menuitem", { name: "Line" })).toBeInTheDocument();

    openEditorSettings();
    expect(screen.queryByRole("menuitem", { name: "Line" })).not
      .toBeInTheDocument();
    expect(screen.getByRole("menuitemcheckbox", { name: /Stick panels/ }))
      .toBeInTheDocument();
  });

  it("closes toolbar submenus when clicking outside the toolbar", () => {
    render(<KizkattGraphicEditor />);

    const rectangleButton = screen.getByRole("button", { name: "Rectangle" });

    vi.useFakeTimers();
    fireEvent.pointerDown(rectangleButton);
    act(() => {
      vi.advanceTimersByTime(800);
    });
    fireEvent.pointerUp(rectangleButton);
    vi.useRealTimers();

    expect(screen.getByRole("menuitem", { name: "Diamond" }))
      .toBeInTheDocument();

    fireEvent.pointerDown(
      screen.getByRole("application", { name: "Drawing canvas" })
    );

    expect(screen.queryByRole("menuitem", { name: "Diamond" })).not
      .toBeInTheDocument();
  });

  it("opens grouped toolbar menus from the corner indicator", () => {
    render(<KizkattGraphicEditor />);

    const rectangleButton = screen.getByRole("button", { name: "Rectangle" });
    const indicator = rectangleButton.querySelector(
      ".kizkatt-submenu-indicator"
    );

    expect(indicator).not.toBeNull();
    fireEvent.click(indicator as Element);

    expect(screen.getByRole("menuitem", { name: "Diamond" }))
      .toBeInTheDocument();
    expect(rectangleButton).not.toHaveClass("is-active");
    expect(screen.getByRole("button", { name: "Select" })).toHaveClass(
      "is-active"
    );
  });

  it("opens grouped toolbar menus from a double click on the button", () => {
    render(<KizkattGraphicEditor />);

    const rectangleButton = screen.getByRole("button", { name: "Rectangle" });

    fireEvent.doubleClick(rectangleButton);

    expect(screen.getByRole("menuitem", { name: "Diamond" }))
      .toBeInTheDocument();
    expect(rectangleButton).not.toHaveClass("is-active");
    expect(screen.getByRole("button", { name: "Select" })).toHaveClass(
      "is-active"
    );
  });

  it("closes the current tool style panel when switching to text", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    expect(screen.getByLabelText("Styling")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Text" }));

    expect(screen.getByRole("button", { name: "Text" })).toHaveClass(
      "is-active"
    );
    expect(screen.queryByLabelText("Styling")).not.toBeInTheDocument();
  });

  it("closes the current tool style panel when switching to eraser", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    expect(screen.getByLabelText("Styling")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Eraser" }));

    expect(screen.getByRole("button", { name: "Eraser" })).toHaveClass(
      "is-active"
    );
    expect(screen.queryByLabelText("Styling")).not.toBeInTheDocument();
  });

  it("closes style-panel popovers when opening a toolbar submenu", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    expect(screen.getByLabelText("Styling")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Background custom #653b00" })
    );

    expect(screen.getByRole("dialog", { name: "Background colors" }))
      .toBeInTheDocument();

    openEditorSettings();

    expect(screen.queryByRole("dialog", { name: "Background colors" })).not
      .toBeInTheDocument();
    expect(screen.getByLabelText("Styling")).toBeInTheDocument();
    expect(screen.getByRole("menuitemcheckbox", { name: /Stick panels/ }))
      .toBeInTheDocument();
  });

  it("keeps an individually stuck panel visible", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    const stylePanel = screen
      .getByLabelText("Styling")
      .closest(".kizkatt-floating-panel") as HTMLElement;
    const stickButton = stylePanel.querySelector(
      "button[aria-label='Stick panel']"
    );

    fireEvent.click(stickButton as Element);
    expect(stylePanel).toHaveClass("is-pinned");

    const rectangleButton = screen.getByRole("button", { name: "Rectangle" });
    vi.useFakeTimers();
    fireEvent.pointerDown(rectangleButton);
    act(() => {
      vi.advanceTimersByTime(800);
    });
    fireEvent.pointerUp(rectangleButton);
    vi.useRealTimers();

    expect(screen.getByRole("menuitem", { name: "Diamond" }))
      .toBeInTheDocument();
    expect(screen.getByLabelText("Styling")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Eraser" }));
    expect(screen.getByLabelText("Styling")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.queryByLabelText("Styling")).not.toBeInTheDocument();
  });

  it("keeps pinned object geometry visible after the selection is cleared", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    const objectPanel = document.querySelector(
      ".kizkatt-floating-panel--object-panel"
    ) as HTMLElement;
    const stickButton = objectPanel.querySelector(
      "button[aria-label='Stick panel']"
    );

    fireEvent.click(stickButton as Element);
    firePointerEvent(canvas, "pointerdown", { clientX: 400, clientY: 400 });
    firePointerEvent(canvas, "pointerup", { clientX: 400, clientY: 400 });

    expect(document.querySelector(".kizkatt-floating-panel--object-panel"))
      .toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(document.querySelector(".kizkatt-floating-panel--object-panel"))
      .not.toBeInTheDocument();
  });

  it("controls toolbar autohide from editor settings", () => {
    render(<KizkattGraphicEditor />);

    openEditorSettings();
    fireEvent.click(screen.getByRole("menuitemcheckbox", {
      name: "Enable Autohide"
    }));

    expect(
      window.localStorage.getItem(
        "kizkatt:graphic-editor:settings:autohide-toolbar"
      )
    ).toBe("true");
    expect(screen.getByLabelText("Kizkatt tools")).toHaveClass(
      "kizkatt-toolbar--autohide"
    );
  });

  it("exposes UI scale, grid controls, and preview mode from editor settings", () => {
    render(<KizkattGraphicEditor />);

    const board = screen.getByLabelText("Kizkatt diagram canvas");
    const canvas = screen.getByRole("application", { name: "Drawing canvas" });

    openEditorSettings();

    expect(board.style.getPropertyValue("--kizkatt-ui-scale")).toBe("1");
    fireEvent.change(screen.getByLabelText(/UI scale/), {
      target: { value: "0.85" }
    });
    expect(board.style.getPropertyValue("--kizkatt-ui-scale")).toBe("0.85");
    expect(window.localStorage.getItem("kizkatt:graphic-engine:ui-scale"))
      .toBe("0.85");

    openGridSettings();
    expect(
      screen.getByRole("button", {
        name: "Grid color rgba(244, 164, 190, 0.18)"
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Grid color rgba(132, 190, 255, 0.18)"
      })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: /Toggle grid/ }));
    expect(canvas.querySelector(".kizkatt-grid")).not.toBeInTheDocument();

    openDisplaySettings();
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Preview" }));

    expect(screen.queryByRole("button", { name: "Rectangle" })).not
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview" }))
      .toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    expect(screen.getByRole("button", { name: "Rectangle" })).toBeInTheDocument();
  });

  it("saves and loads a Kizkatt scene from the main menu", async () => {
    const writtenContents: Uint8Array[] = [];
    const showSaveFilePicker = vi.fn().mockResolvedValue({
      createWritable: vi.fn().mockResolvedValue({
        close: vi.fn().mockResolvedValue(undefined),
        write: vi.fn().mockImplementation(async (contents: Uint8Array) => {
          writtenContents.push(contents);
        })
      }),
      name: "drawing.kk"
    });
    vi.stubGlobal("showSaveFilePicker", showSaveFilePicker);

    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    expect(canvas.querySelectorAll("[data-element-id]")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(writtenContents).toHaveLength(1));
    const savedSceneJson = await extractKizkattSceneArchive(
      writtenContents[0]
    );
    expect(JSON.parse(savedSceneJson)).toMatchObject({
      kk: { scene: { Objects: { Object_000001: { type: "rectangle" } } } }
    });

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(writtenContents).toHaveLength(2));
    expect(showSaveFilePicker).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(screen.getByRole("button", { name: "New" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Create without saving" })
    );

    expect(canvas.querySelectorAll("[data-element-id]")).toHaveLength(0);

    const loadedWrite = vi.fn().mockResolvedValue(undefined);
    const sceneFile = {
      arrayBuffer: vi.fn().mockResolvedValue(writtenContents[0].slice().buffer),
      name: "drawing.kk",
      slice: vi.fn((start = 0, end = writtenContents[0].byteLength) => ({
        arrayBuffer: vi.fn().mockResolvedValue(
          writtenContents[0].slice(start, end).buffer
        )
      })),
      text: vi.fn()
    } as unknown as File;
    const showOpenFilePicker = vi.fn().mockResolvedValue([
      {
        createWritable: vi.fn().mockResolvedValue({
          close: vi.fn().mockResolvedValue(undefined),
          write: loadedWrite
        }),
        getFile: vi.fn().mockResolvedValue(sceneFile),
        name: sceneFile.name
      }
    ]);
    vi.stubGlobal("showOpenFilePicker", showOpenFilePicker);

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Load" }));

    await waitFor(() => {
      expect(canvas.querySelectorAll("[data-element-id]")).toHaveLength(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(loadedWrite).toHaveBeenCalledOnce());
    expect(showSaveFilePicker).toHaveBeenCalledTimes(1);
    expect(loadedWrite.mock.calls[0][0]).toBeInstanceOf(Uint8Array);
  });

  it("can save an uncompressed .kk scene from Save as", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const showSaveFilePicker = vi.fn().mockResolvedValue({
      createWritable: vi.fn().mockResolvedValue({
        close: vi.fn().mockResolvedValue(undefined),
        write
      }),
      name: "something.kk"
    });
    vi.stubGlobal("showSaveFilePicker", showSaveFilePicker);

    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Save as..." }));

    const archiveCheckbox = screen.getByRole("checkbox", {
      name: "Archive .kk file"
    });
    expect(archiveCheckbox).toBeChecked();
    fireEvent.click(archiveCheckbox);
    fireEvent.click(
      screen.getByRole("button", { name: /Kizkatt scene \(\.kk\)/ })
    );

    await waitFor(() => expect(write).toHaveBeenCalledTimes(1));
    expect(write).toHaveBeenCalledWith(expect.stringContaining('"kk"'));

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(write).toHaveBeenCalledTimes(2));
    expect(showSaveFilePicker).toHaveBeenCalledOnce();
    expect(write.mock.calls[1][0]).toEqual(expect.stringContaining('"kk"'));
  });

  it("keeps the Save as format and file handle for later saves", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const showSaveFilePicker = vi.fn().mockResolvedValue({
      createWritable: vi.fn().mockResolvedValue({
        close: vi.fn().mockResolvedValue(undefined),
        write
      }),
      name: "drawing.svg"
    });
    vi.stubGlobal("showSaveFilePicker", showSaveFilePicker);

    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Save as..." }));
    fireEvent.click(
      screen.getByRole("button", { name: /SVG image \(\.svg\)/ })
    );

    await waitFor(() => expect(write).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(write).toHaveBeenCalledTimes(2));
    expect(showSaveFilePicker).toHaveBeenCalledOnce();
    expect(write.mock.calls[0][0]).toEqual(expect.stringContaining("<svg"));
    expect(write.mock.calls[1][0]).toEqual(expect.stringContaining("<svg"));
  });

  it("warns before replacing a non-empty scene", () => {
    const showOpenFilePicker = vi.fn();
    vi.stubGlobal("showOpenFilePicker", showOpenFilePicker);

    render(<KizkattGraphicEditor />);
    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Load" }));

    expect(screen.getByRole("dialog", { name: "Save the current scene?" }))
      .toBeInTheDocument();
    expect(showOpenFilePicker).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("imports a Kizkatt scene and exports only the current selection", async () => {
    const writtenContents: Uint8Array[] = [];
    const showSaveFilePicker = vi.fn().mockResolvedValue({
      createWritable: vi.fn().mockResolvedValue({
        close: vi.fn().mockResolvedValue(undefined),
        write: vi.fn().mockImplementation(async (contents: Uint8Array) => {
          writtenContents.push(contents);
        })
      }),
      name: "selection.kk"
    });
    vi.stubGlobal("showSaveFilePicker", showSaveFilePicker);

    render(<KizkattGraphicEditor />);
    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    fireEvent.click(
      screen.getByRole("button", { name: /Kizkatt scene \(\.kk\)/ })
    );

    await waitFor(() => expect(writtenContents).toHaveLength(1));
    const exportedSceneJson = await extractKizkattSceneArchive(
      writtenContents[0]
    );
    expect(Object.keys(JSON.parse(exportedSceneJson).kk.scene.Objects))
      .toHaveLength(1);

    const importedFile = {
      arrayBuffer: vi.fn().mockResolvedValue(writtenContents[0].slice().buffer),
      name: "import.kk",
      slice: vi.fn((start = 0, end = writtenContents[0].byteLength) => ({
        arrayBuffer: vi.fn().mockResolvedValue(
          writtenContents[0].slice(start, end).buffer
        )
      })),
      text: vi.fn()
    } as unknown as File;
    vi.stubGlobal(
      "showOpenFilePicker",
      vi.fn().mockResolvedValue([
        { getFile: vi.fn().mockResolvedValue(importedFile), name: importedFile.name }
      ])
    );

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    fireEvent.click(
      screen.getByRole("button", { name: /Kizkatt scene \(\.kk\)/ })
    );

    await waitFor(() => {
      expect(canvas.querySelectorAll("[data-element-id]")).toHaveLength(2);
    });
  });

  it("autosaves canvas changes and restores them on page load", async () => {
    const { unmount } = render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    await waitFor(() => {
      expect(
        window.localStorage.getItem("kizkatt:graphic-engine:canvas-state")
      ).toContain('"elements"');
    });
    expect(canvas.querySelectorAll("[data-element-id]")).toHaveLength(1);

    const rectangle = canvas.querySelector("[data-element-id] rect");
    const getStoredRectanglePosition = () => {
      const storedState = JSON.parse(
        window.localStorage.getItem("kizkatt:graphic-engine:canvas-state") ??
          "{}"
      );

      return {
        x: storedState.elements?.[0]?.x,
        y: storedState.elements?.[0]?.y
      };
    };

    firePointerEvent(rectangle as Element, "pointerdown", {
      clientX: 80,
      clientY: 80
    });
    firePointerEvent(canvas, "pointermove", { clientX: 100, clientY: 110 });

    expect(getStoredRectanglePosition()).toEqual({ x: 40, y: 50 });

    firePointerEvent(canvas, "pointerup", { clientX: 100, clientY: 110 });

    await waitFor(() => {
      expect(getStoredRectanglePosition()).toEqual({ x: 60, y: 80 });
    });

    unmount();
    render(<KizkattGraphicEditor />);

    expect(
      screen
        .getByRole("application", { name: "Drawing canvas" })
        .querySelectorAll("[data-element-id]")
    ).toHaveLength(1);
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

    openEditorSettings();
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
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

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
    expect(screen.getByRole("dialog", { name: "Background colors" }))
      .toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Color picker" }))
      .toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "backgroundColor palette #fbdfb8" })
    ).toHaveClass("is-active");
    expect(
      screen.getAllByRole("button", { name: /backgroundColor shade/ })[11]
    ).toHaveAttribute("aria-label", "backgroundColor shade #fbdfb8");
  });

  it("switches untouched default drawing colors with the theme", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Light theme" }));
    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    const elementRect = canvas.querySelector("[data-element-id] rect");

    expect(elementRect).toHaveAttribute("fill", "#fbdfb8");
    expect(elementRect).toHaveAttribute("stroke", "#f08c00");
  });

  it("closes the main menu when clicking on the canvas", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    expect(screen.getByRole("navigation", { name: "Canvas menu" }))
      .toBeInTheDocument();

    firePointerEvent(
      screen.getByRole("application", { name: "Drawing canvas" }),
      "pointerdown"
    );

    expect(screen.queryByRole("navigation", { name: "Canvas menu" })).not
      .toBeInTheDocument();
  });

  it("shows the style panel for drawing tools without covering the main menu", () => {
    render(<KizkattGraphicEditor />);

    expect(screen.queryByLabelText("Styling")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    expect(screen.getByLabelText("Styling")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    expect(screen.queryByLabelText("Styling")).not.toBeInTheDocument();
  });

  it("keeps copied toolbar icons under the original source names", () => {
    expect(Icons.SelectionIcon).toBeTruthy();
    expect(Icons.RectangleIcon).toBeTruthy();
    expect(Icons.DiamondIcon).toBeTruthy();
    expect(Icons.EllipseIcon).toBeTruthy();
    expect(Icons.ArrowIcon).toBeTruthy();
    expect(Icons.LineIcon).toBeTruthy();
    expect(Icons.NodeEditIcon).toBeTruthy();
    expect(Icons.FreedrawIcon).toBeTruthy();
    expect(Icons.TextIcon).toBeTruthy();
    expect(Icons.ImageIcon).toBeTruthy();
    expect(Icons.EraserIcon).toBeTruthy();
    expect(Icons.StrokeStyleSolidIcon).toBeTruthy();
    expect(Icons.StrokeStyleDashedIcon).toBeTruthy();
    expect(Icons.StrokeStyleDashDotIcon).toBeTruthy();
    expect(Icons.StrokeStyleDottedIcon).toBeTruthy();
    expect(Icons.StrokeStyleStitchedIcon).toBeTruthy();
    expect(Icons.StrokeStyleWavyIcon).toBeTruthy();
    expect(Icons.StrokeStyleZigzagIcon).toBeTruthy();
    expect(Icons.ChevronDownIcon).toBeTruthy();
    expect(Icons.EdgeSharpIcon).toBeTruthy();
    expect(Icons.EdgeRoundIcon).toBeTruthy();
    expect(Icons.GlobeIcon).toBeTruthy();
    expect(Icons.HamburgerMenuIcon).toBeTruthy();
    expect(Icons.OpenIcon).toBeTruthy();
    expect(Icons.ExportIcon).toBeTruthy();
    expect(Icons.ResetIcon).toBeTruthy();
    expect(Icons.SettingsIcon).toBeTruthy();
    expect(Icons.PinIcon).toBeTruthy();
    expect(Icons.EyeIcon).toBeTruthy();
    expect(Icons.LayoutHorizontalIcon).toBeTruthy();
    expect(Icons.LayoutVerticalIcon).toBeTruthy();
    expect(Icons.LanguageIcon).toBeTruthy();
    expect(Icons.SunIcon).toBeTruthy();
    expect(Icons.MoonIcon).toBeTruthy();
    expect(Icons.UndoIcon).toBeTruthy();
    expect(Icons.RedoIcon).toBeTruthy();
    expect(Icons.handIcon).toBeTruthy();
  });

});
