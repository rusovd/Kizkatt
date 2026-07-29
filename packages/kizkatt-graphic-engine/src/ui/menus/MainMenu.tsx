import {
  CANVAS_BACKGROUNDS_BY_THEME,
  GRID_COLORS_BY_THEME
} from "../../config/constants";
import type { KizkattTheme } from "../../model/types";
import {
  ExportIcon,
  EyedropperIcon,
  HamburgerMenuIcon,
  MoonIcon,
  OpenIcon,
  ResetIcon,
  SunIcon
} from "../icons";

export function MainMenu({
  canvasBackgroundColor,
  customCanvasBackgroundColor,
  gridColor,
  menuOpen,
  onCanvasBackgroundChange,
  onExport,
  onGridColorChange,
  onOpen,
  onPickCanvasBackground,
  onMenuOpenChange,
  onResetCanvas,
  onThemeChange,
  theme
}: {
  canvasBackgroundColor: string;
  customCanvasBackgroundColor: string;
  gridColor: string;
  menuOpen: boolean;
  onCanvasBackgroundChange: (color: string) => void;
  onExport: () => void;
  onGridColorChange: (color: string) => void;
  onOpen: () => void;
  onPickCanvasBackground: () => void;
  onMenuOpenChange: (open: boolean) => void;
  onResetCanvas: () => void;
  onThemeChange: (theme: KizkattTheme) => void;
  theme: KizkattTheme;
}) {
  const canvasBackgrounds = CANVAS_BACKGROUNDS_BY_THEME[theme];
  const gridColors = GRID_COLORS_BY_THEME[theme];
  const runMenuAction = (action: () => void) => {
    action();
    onMenuOpenChange(false);
  };

  return (
    <>
      <button
        type="button"
        className="kizkatt-menu-button"
        aria-label="Main menu"
        aria-expanded={menuOpen}
        onClick={() => onMenuOpenChange(!menuOpen)}
      >
        {HamburgerMenuIcon}
      </button>

      {menuOpen && (
        <nav className="kizkatt-main-menu" aria-label="Canvas menu">
          <button type="button" onClick={() => runMenuAction(onOpen)}>
            <span className="kizkatt-menu-item-label">
              {OpenIcon}
              <span>Open</span>
            </span>
            <kbd>Ctrl+O</kbd>
          </button>
          <button type="button" onClick={() => runMenuAction(onExport)}>
            <span className="kizkatt-menu-item-label">
              {ExportIcon}
              <span>Export</span>
            </span>
          </button>
          <div className="kizkatt-menu-divider" />
          <button type="button" onClick={() => runMenuAction(onResetCanvas)}>
            <span className="kizkatt-menu-item-label">
              {ResetIcon}
              <span>Reset</span>
            </span>
          </button>
          <div className="kizkatt-menu-divider" />
          <div className="kizkatt-theme-row">
            <span>Theme</span>
            <div
              className="kizkatt-theme-toggle"
              role="group"
              aria-label="Theme"
            >
              <button
                type="button"
                aria-label="Light theme"
                className={theme === "light" ? "is-active" : undefined}
                onClick={() => onThemeChange("light")}
              >
                {SunIcon}
              </button>
              <button
                type="button"
                aria-label="Dark theme"
                className={theme === "dark" ? "is-active" : undefined}
                onClick={() => onThemeChange("dark")}
              >
                {MoonIcon}
              </button>
            </div>
          </div>
          <div className="kizkatt-menu-divider" />
          <p>Canvas background</p>
          <div className="kizkatt-swatches" role="group" aria-label="Canvas background">
            {canvasBackgrounds.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Canvas background ${color}`}
                className={canvasBackgroundColor === color ? "is-active" : undefined}
                style={{ backgroundColor: color }}
                onClick={() => onCanvasBackgroundChange(color)}
              />
            ))}
            <button
              type="button"
              aria-label={`Canvas background custom ${customCanvasBackgroundColor}`}
              className={[
                "kizkatt-custom-background-swatch",
                canvasBackgroundColor === customCanvasBackgroundColor
                  ? "is-active"
                  : ""
              ].join(" ")}
              style={{ backgroundColor: customCanvasBackgroundColor }}
              onClick={() =>
                onCanvasBackgroundChange(customCanvasBackgroundColor)
              }
            />
            <button
              type="button"
              aria-label="Pick canvas background"
              className="kizkatt-eyedropper-swatch"
              onClick={onPickCanvasBackground}
            >
              {EyedropperIcon}
            </button>
          </div>
          <p>Grid color</p>
          <div className="kizkatt-swatches" role="group" aria-label="Grid color">
            {gridColors.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Grid color ${color}`}
                className={gridColor === color ? "is-active" : undefined}
                style={{ backgroundColor: color }}
                onClick={() => onGridColorChange(color)}
              />
            ))}
          </div>
        </nav>
      )}
    </>
  );
}
