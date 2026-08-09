import { describe, it } from "vitest";
import {
  DEFAULT_CANVAS_BACKGROUND,
  DEFAULT_GRID_COLOR,
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
    expect(screen.queryByRole("button", { name: "Library" })).not
      .toBeInTheDocument();
  });

  it("starts with the Kizkatt default canvas background", () => {
    render(<KizkattGraphicEditor />);

    expect(screen.getByRole("application", { name: "Drawing canvas" }))
      .toHaveStyle({ backgroundColor: DEFAULT_CANVAS_BACKGROUND });
  });

  it("restores and stores the canvas background in the Kizkatt namespace", () => {
    storeCanvasBackgroundColor("#121212");

    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    expect(canvas).toHaveStyle({ backgroundColor: "#121212" });

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: "Canvas background #211a16"
      })
    );

    expect(
      window.localStorage.getItem("kizkatt:graphic-engine:canvas-background")
    ).toBe("#211a16");
  });

  it("restores and stores the grid color in the Kizkatt namespace", () => {
    const blueGridColor = "rgba(132, 190, 255, 0.18)";

    storeGridColor(blueGridColor);

    render(<KizkattGraphicEditor />);

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    expect(canvas.style.getPropertyValue("--kizkatt-canvas-grid")).toBe(
      blueGridColor
    );

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: `Grid color ${DEFAULT_GRID_COLOR}`
      })
    );

    expect(
      window.localStorage.getItem("kizkatt:graphic-engine:grid-color")
    ).toBe(DEFAULT_GRID_COLOR);
  });

  it("ignores legacy canvas background storage and applies the default color", () => {
    window.localStorage.setItem("kizkatt:canvas-background", "#121212");

    render(<KizkattGraphicEditor />);

    expect(screen.getByRole("application", { name: "Drawing canvas" }))
      .toHaveStyle({ backgroundColor: DEFAULT_CANVAS_BACKGROUND });
  });

  it("renders the Kizkatt main menu actions, theme picker, and canvas backgrounds", () => {
    render(<KizkattGraphicEditor />);
    const board = screen.getByLabelText("Kizkatt diagram canvas");

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));

    expect(screen.getByRole("button", { name: /Open/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Theme" })).toBeInTheDocument();
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
    fireEvent.click(screen.getByRole("button", { name: "Light theme" }));
    expect(
      screen.getByRole("button", { name: "Canvas background #f5faff" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Pick canvas background" })
    ).toBeInTheDocument();
    expect(board.style.getPropertyValue("--kizkatt-ui-scale")).toBe("1");
    fireEvent.change(screen.getByLabelText(/UI scale/), {
      target: { value: "0.85" }
    });
    expect(board.style.getPropertyValue("--kizkatt-ui-scale")).toBe("0.85");
    expect(window.localStorage.getItem("kizkatt:graphic-engine:ui-scale"))
      .toBe("0.85");
    expect(
      screen.getByRole("button", {
        name: "Grid color rgba(210, 72, 115, 0.34)"
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Grid color rgba(37, 126, 220, 0.34)"
      })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Find on canvas/ })).not
      .toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Help" })).not
      .toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Library" })).not
      .toBeInTheDocument();
    expect(screen.queryByLabelText("Element style")).not.toBeInTheDocument();
  });

  it("exposes localized tooltips on editor controls", () => {
    render(<KizkattGraphicEditor />);

    expect(screen.getByRole("button", { name: "Select" })).toHaveAttribute(
      "title",
      "Select, move, resize, and rotate objects"
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

    expect(screen.getByRole("button", { name: /Open/ })).toHaveAttribute(
      "title",
      "Open a drawing file"
    );
    expect(
      screen.getByRole("button", { name: "Canvas background #161719" })
    ).toHaveAttribute("title", "Set canvas background to #161719");

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    expect(screen.getByRole("button", { name: "Fill solid" }))
      .toHaveAttribute("title", "Use solid fill");
    expect(screen.getByRole("button", { name: "Send to back" }))
      .toHaveAttribute("title", "Move selected objects to the back");
  });

  it("stores dragged panel positions and docks button controls to the top", () => {
    render(<KizkattGraphicEditor />);

    const rectangleButton = screen.getByRole("button", { name: "Rectangle" });
    const toolbarPanel = rectangleButton.closest(".kizkatt-floating-panel");

    expect(toolbarPanel).not.toBeNull();

    fireEvent.mouseDown(toolbarPanel as Element, {
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

  it("opens grouped toolbar tools and stores toolbar settings", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    expect(screen.queryByRole("menuitem", { name: "Diamond" })).not
      .toBeInTheDocument();

    chooseGroupedTool("Rectangle", "Diamond");

    expect(screen.getByRole("button", { name: "Diamond" })).toHaveClass(
      "is-active"
    );

    chooseGroupedTool("Arrow", "Line");

    expect(screen.getByRole("button", { name: "Line" })).toHaveClass(
      "is-active"
    );

    fireEvent.click(screen.getByRole("button", { name: "Toolbar settings" }));
    fireEvent.click(
      screen.getByRole("menuitemcheckbox", { name: /Stick panels/ })
    );

    expect(
      window.localStorage.getItem(
        "kizkatt:graphic-editor:settings:drag-enabled"
      )
    ).toBe("false");
    expect(
      screen.getByRole("button", { name: "Toolbar settings" })
        .closest(".kizkatt-floating-panel")
    ).toHaveClass("is-drag-disabled");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Toolbar settings" }));
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

    fireEvent.click(screen.getByRole("button", { name: "Toolbar settings" }));
    fireEvent.click(
      screen.getByRole("menuitemcheckbox", { name: /Vertical toolbar/ })
    );

    expect(
      window.localStorage.getItem(
        "kizkatt:graphic-editor:settings:toolbar-orientation"
      )
    ).toBe("vertical");
    expect(screen.getByLabelText("Kizkatt tools")).toHaveClass(
      "kizkatt-toolbar--vertical"
    );
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
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

    openSubmenu("Arrow");
    expect(screen.queryByRole("menuitem", { name: "Diamond" })).not
      .toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Line" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Toolbar settings" }));
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

  it("closes the current tool style panel when switching to text", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    expect(screen.getByLabelText("Element style")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Text" }));

    expect(screen.getByRole("button", { name: "Text" })).toHaveClass(
      "is-active"
    );
    expect(screen.queryByLabelText("Element style")).not.toBeInTheDocument();
  });

  it("closes the current tool style panel when switching to eraser", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    expect(screen.getByLabelText("Element style")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Eraser" }));

    expect(screen.getByRole("button", { name: "Eraser" })).toHaveClass(
      "is-active"
    );
    expect(screen.queryByLabelText("Element style")).not.toBeInTheDocument();
  });

  it("closes style-panel popovers when opening a toolbar submenu", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    expect(screen.getByLabelText("Element style")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Background custom #653b00" })
    );

    expect(screen.getByRole("dialog", { name: "Background colors" }))
      .toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Toolbar settings" }));

    expect(screen.queryByRole("dialog", { name: "Background colors" })).not
      .toBeInTheDocument();
    expect(screen.queryByLabelText("Element style")).not.toBeInTheDocument();
    expect(screen.getByRole("menuitemcheckbox", { name: /Stick panels/ }))
      .toBeInTheDocument();
  });

  it("duplicates toolbar autohide in the main menu", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(screen.getByRole("button", { name: /Autohide toolbar/ }));

    expect(
      window.localStorage.getItem(
        "kizkatt:graphic-editor:settings:autohide-toolbar"
      )
    ).toBe("true");
    expect(screen.getByLabelText("Kizkatt tools")).toHaveClass(
      "kizkatt-toolbar--autohide"
    );
  });

  it("quick saves and quick loads the canvas from the main menu", () => {
    render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    expect(canvas.querySelectorAll("[data-element-id]")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Export" }));

    expect(
      window.localStorage.getItem("kizkatt:graphic-engine:quick-save")
    ).toContain('"elements"');

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(canvas.querySelectorAll("[data-element-id]")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    fireEvent.click(screen.getByRole("button", { name: /Open/ }));

    expect(canvas.querySelectorAll("[data-element-id]")).toHaveLength(1);
  });

  it("autosaves canvas changes and restores them on page load", () => {
    const { unmount } = render(<KizkattGraphicEditor />);

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));

    const canvas = screen.getByRole("application", { name: "Drawing canvas" });
    firePointerEvent(canvas, "pointerdown", { clientX: 40, clientY: 50 });
    firePointerEvent(canvas, "pointermove", { clientX: 160, clientY: 120 });
    firePointerEvent(canvas, "pointerup");

    expect(
      window.localStorage.getItem("kizkatt:graphic-engine:canvas-state")
    ).toContain('"elements"');
    expect(canvas.querySelectorAll("[data-element-id]")).toHaveLength(1);

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

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
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
    expect(
      screen.getByLabelText("Background native color picker")
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "backgroundColor palette #fbdfb8" })
    ).toHaveClass("is-active");
    expect(
      screen.getAllByRole("button", { name: /backgroundColor shade/ })[7]
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

    expect(screen.queryByLabelText("Element style")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Rectangle" }));
    expect(screen.getByLabelText("Element style")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Main menu" }));
    expect(screen.queryByLabelText("Element style")).not.toBeInTheDocument();
  });

  it("keeps copied toolbar icons under the original source names", () => {
    expect(Icons.LockedIcon).toBeTruthy();
    expect(Icons.SelectionIcon).toBeTruthy();
    expect(Icons.RectangleIcon).toBeTruthy();
    expect(Icons.DiamondIcon).toBeTruthy();
    expect(Icons.EllipseIcon).toBeTruthy();
    expect(Icons.ArrowIcon).toBeTruthy();
    expect(Icons.LineIcon).toBeTruthy();
    expect(Icons.FreedrawIcon).toBeTruthy();
    expect(Icons.TextIcon).toBeTruthy();
    expect(Icons.ImageIcon).toBeTruthy();
    expect(Icons.EraserIcon).toBeTruthy();
    expect(Icons.StrokeStyleSolidIcon).toBeTruthy();
    expect(Icons.StrokeStyleDashedIcon).toBeTruthy();
    expect(Icons.StrokeStyleDottedIcon).toBeTruthy();
    expect(Icons.EdgeSharpIcon).toBeTruthy();
    expect(Icons.EdgeRoundIcon).toBeTruthy();
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
