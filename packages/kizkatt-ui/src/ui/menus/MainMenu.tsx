import { CANVAS_BACKGROUNDS_BY_THEME } from "../../config/constants";
import { formatKeyboardShortcut } from "../../platform/keyboard";
import type { EditorDisplayMode, KizkattTheme } from "../../model/types";
import {
  EyeIcon,
  ExportIcon,
  EyedropperIcon,
  HamburgerMenuIcon,
  LanguageIcon,
  MoonIcon,
  OpenIcon,
  ResetIcon,
  SunIcon,
  WireframeIcon
} from "../icons";
import { SUPPORTED_LOCALES, useI18n, type Locale } from "../../i18n";
import { useGraphicEditorSettings } from "../settings/GraphicEditorSettings";

export function MainMenu({
  activeDisplayMode,
  canvasBackgroundColor,
  customCanvasBackgroundColor,
  lastDisplayMode,
  menuOpen,
  onCanvasBackgroundChange,
  onExport,
  onOpen,
  onPickCanvasBackground,
  onMenuOpenChange,
  onResetCanvas,
  onThemeChange,
  onToggleLastDisplayMode,
  theme
}: {
  activeDisplayMode: EditorDisplayMode | null;
  canvasBackgroundColor: string;
  customCanvasBackgroundColor: string;
  lastDisplayMode: EditorDisplayMode;
  menuOpen: boolean;
  onCanvasBackgroundChange: (color: string) => void;
  onExport: () => void;
  onOpen: () => void;
  onPickCanvasBackground: () => void;
  onMenuOpenChange: (open: boolean) => void;
  onResetCanvas: () => void;
  onThemeChange: (theme: KizkattTheme) => void;
  onToggleLastDisplayMode: () => void;
  theme: KizkattTheme;
}) {
  const { autohideToolbar, setAutohideToolbar } = useGraphicEditorSettings();
  const { locale, setLocale, strings } = useI18n();
  const canvasBackgrounds = CANVAS_BACKGROUNDS_BY_THEME[theme];
  const lastDisplayModeLabel =
    lastDisplayMode === "preview"
      ? strings.settings.previewMode
      : strings.settings.wireframeMode;
  const lastDisplayModeTooltip =
    lastDisplayMode === "preview"
      ? strings.settings.tooltips.previewMode
      : strings.settings.tooltips.wireframeMode;
  const runMenuAction = (action: () => void) => {
    action();
    onMenuOpenChange(false);
  };

  return (
    <div className="kizkatt-main-menu-anchor">
      <button
        type="button"
        className="kizkatt-display-mode-shortcut"
        aria-label={lastDisplayModeLabel}
        aria-pressed={activeDisplayMode === lastDisplayMode}
        title={lastDisplayModeTooltip}
        onClick={onToggleLastDisplayMode}
      >
        {lastDisplayMode === "preview" ? EyeIcon : WireframeIcon}
      </button>
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
            <kbd>{formatKeyboardShortcut("o")}</kbd>
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
        </nav>
      )}
    </div>
  );
}
