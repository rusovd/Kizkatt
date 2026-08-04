import {
  CANVAS_BACKGROUNDS_BY_THEME,
  GRID_COLORS_BY_THEME,
  MAX_UI_SCALE,
  MIN_UI_SCALE,
  PERCENT_MAX_VALUE,
  UI_SCALE_STEP
} from "../../config/constants";
import type { KizkattTheme } from "../../model/types";
import {
  ExportIcon,
  EyedropperIcon,
  HamburgerMenuIcon,
  LanguageIcon,
  MoonIcon,
  OpenIcon,
  ResetIcon,
  SunIcon
} from "../icons";
import { SUPPORTED_LOCALES, useI18n, type Locale } from "../../i18n";
import { DraggablePanel } from "../positioning/DraggablePanel";
import { useGraphicEditorSettings } from "../settings/GraphicEditorSettings";

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
  onUiScaleChange,
  theme,
  uiScale
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
  onUiScaleChange: (scale: number) => void;
  theme: KizkattTheme;
  uiScale: number;
}) {
  const { autohideToolbar, setAutohideToolbar } = useGraphicEditorSettings();
  const { locale, setLocale, strings } = useI18n();
  const canvasBackgrounds = CANVAS_BACKGROUNDS_BY_THEME[theme];
  const gridColors = GRID_COLORS_BY_THEME[theme];
  const runMenuAction = (action: () => void) => {
    action();
    onMenuOpenChange(false);
  };

  return (
    <DraggablePanel id="main-menu" topDock>
      <button
        type="button"
        className="kizkatt-menu-button"
        aria-label={strings.mainMenu.mainMenu}
        aria-expanded={menuOpen}
        title={strings.mainMenu.tooltips.mainMenu}
        onClick={() => onMenuOpenChange(!menuOpen)}
      >
        {HamburgerMenuIcon}
      </button>

      {menuOpen && (
        <nav className="kizkatt-main-menu" aria-label={strings.mainMenu.ariaLabel}>
          <button
            type="button"
            title={strings.mainMenu.tooltips.open}
            onClick={() => runMenuAction(onOpen)}
          >
            <span className="kizkatt-menu-item-label">
              {OpenIcon}
              <span>{strings.mainMenu.open}</span>
            </span>
            <kbd>{strings.mainMenu.shortcuts.open}</kbd>
          </button>
          <button
            type="button"
            title={strings.mainMenu.tooltips.export}
            onClick={() => runMenuAction(onExport)}
          >
            <span className="kizkatt-menu-item-label">
              {ExportIcon}
              <span>{strings.mainMenu.export}</span>
            </span>
          </button>
          <div className="kizkatt-menu-divider" />
          <button
            type="button"
            title={strings.mainMenu.tooltips.reset}
            onClick={() => runMenuAction(onResetCanvas)}
          >
            <span className="kizkatt-menu-item-label">
              {ResetIcon}
              <span>{strings.mainMenu.reset}</span>
            </span>
          </button>
          <div className="kizkatt-menu-divider" />
          <div className="kizkatt-theme-row">
            <span>{strings.mainMenu.theme}</span>
            <div
              className="kizkatt-theme-toggle"
              role="group"
              aria-label={strings.mainMenu.theme}
            >
              <button
                type="button"
                aria-label={strings.theme.light}
                title={strings.mainMenu.tooltips.themeLight}
                className={theme === "light" ? "is-active" : undefined}
                onClick={() => onThemeChange("light")}
              >
                {SunIcon}
              </button>
              <button
                type="button"
                aria-label={strings.theme.dark}
                title={strings.mainMenu.tooltips.themeDark}
                className={theme === "dark" ? "is-active" : undefined}
                onClick={() => onThemeChange("dark")}
              >
                {MoonIcon}
              </button>
            </div>
          </div>
          <div className="kizkatt-menu-divider" />
          <label className="kizkatt-ui-scale-row" htmlFor="kizkatt-ui-scale">
            <span>{strings.mainMenu.uiScale}</span>
            <span>{Math.round(uiScale * PERCENT_MAX_VALUE)}%</span>
          </label>
          <input
            id="kizkatt-ui-scale"
            className="kizkatt-ui-scale-input"
            type="range"
            title={strings.mainMenu.tooltips.uiScale}
            min={MIN_UI_SCALE}
            max={MAX_UI_SCALE}
            step={UI_SCALE_STEP}
            value={uiScale}
            onChange={(event) => onUiScaleChange(Number(event.target.value))}
          />
          <button
            type="button"
            className="kizkatt-menu-check-row"
            aria-pressed={autohideToolbar}
            title={strings.mainMenu.tooltips.autohideToolbar}
            onClick={() => setAutohideToolbar(!autohideToolbar)}
          >
            <span>{strings.mainMenu.autohideToolbar}</span>
            <span>
              {autohideToolbar ? strings.mainMenu.on : strings.mainMenu.off}
            </span>
          </button>
          <div className="kizkatt-menu-divider" />
          <label className="kizkatt-language-row" htmlFor="kizkatt-language">
            <span className="kizkatt-menu-item-label">
              {LanguageIcon}
              <span>{strings.language.label}</span>
            </span>
            <select
              id="kizkatt-language"
              aria-label={strings.language.label}
              title={strings.language.label}
              value={locale}
              onChange={(event) => setLocale(event.target.value as Locale)}
            >
              {SUPPORTED_LOCALES.map((language) => (
                <option key={language.id} value={language.id}>
                  {language.label}
                </option>
              ))}
            </select>
          </label>
          <div className="kizkatt-menu-divider" />
          <p>{strings.mainMenu.canvasBackground}</p>
          <div
            className="kizkatt-swatches"
            role="group"
            aria-label={strings.mainMenu.canvasBackground}
          >
            {canvasBackgrounds.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Canvas background ${color}`}
                title={`${strings.mainMenu.tooltips.canvasBackgroundColor} ${color}`}
                className={canvasBackgroundColor === color ? "is-active" : undefined}
                style={{ backgroundColor: color }}
                onClick={() => onCanvasBackgroundChange(color)}
              />
            ))}
            <button
              type="button"
              aria-label={`Canvas background custom ${customCanvasBackgroundColor}`}
              title={`${strings.mainMenu.tooltips.customCanvasBackground} ${customCanvasBackgroundColor}`}
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
              aria-label={strings.mainMenu.pickCanvasBackground}
              title={strings.mainMenu.tooltips.pickCanvasBackground}
              className="kizkatt-eyedropper-swatch"
              onClick={onPickCanvasBackground}
            >
              {EyedropperIcon}
            </button>
          </div>
          <p>{strings.mainMenu.gridColor}</p>
          <div
            className="kizkatt-swatches"
            role="group"
            aria-label={strings.mainMenu.gridColor}
          >
            {gridColors.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Grid color ${color}`}
                title={`${strings.mainMenu.tooltips.gridColor} ${color}`}
                className={gridColor === color ? "is-active" : undefined}
                style={{ backgroundColor: color }}
                onClick={() => onGridColorChange(color)}
              />
            ))}
          </div>
        </nav>
      )}
    </DraggablePanel>
  );
}
