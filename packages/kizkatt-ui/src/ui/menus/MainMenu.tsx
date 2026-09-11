import { formatKeyboardShortcut } from "../../platform/keyboard";
import type { EditorDisplayMode, KizkattTheme } from "../../model/types";
import {
  EyeIcon,
  ExportDocumentIcon,
  ExportIcon,
  HamburgerMenuIcon,
  MoonIcon,
  NewDocumentIcon,
  OpenIcon,
  PrintIcon,
  SaveIcon,
  SunIcon,
  WireframeIcon
} from "../icons";
import { useI18n } from "../../i18n";

export function MainMenu({
  activeDisplayMode,
  canExport,
  lastDisplayMode,
  menuOpen,
  onExport,
  onImport,
  onLoad,
  onNew,
  onMenuOpenChange,
  onPrint,
  onSave,
  onSaveAs,
  onThemeChange,
  onToggleLastDisplayMode,
  theme
}: {
  activeDisplayMode: EditorDisplayMode | null;
  canExport: boolean;
  lastDisplayMode: EditorDisplayMode;
  menuOpen: boolean;
  onExport: () => void;
  onImport: () => void;
  onLoad: () => void;
  onNew: () => void;
  onMenuOpenChange: (open: boolean) => void;
  onPrint: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onThemeChange: (theme: KizkattTheme) => void;
  onToggleLastDisplayMode: () => void;
  theme: KizkattTheme;
}) {
  const { strings } = useI18n();
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
            aria-label={strings.mainMenu.new}
            type="button"
            title={strings.mainMenu.tooltips.new}
            onClick={() => runMenuAction(onNew)}
          >
            <span className="kizkatt-menu-item-label">
              {NewDocumentIcon}
              <span>{strings.mainMenu.new}</span>
            </span>
            <kbd>{formatKeyboardShortcut("n")}</kbd>
          </button>
          <div className="kizkatt-menu-divider" />
          <button
            aria-label={strings.mainMenu.load}
            type="button"
            title={strings.mainMenu.tooltips.load}
            onClick={() => runMenuAction(onLoad)}
          >
            <span className="kizkatt-menu-item-label">
              {OpenIcon}
              <span>{strings.mainMenu.load}</span>
            </span>
            <kbd>{formatKeyboardShortcut("o")}</kbd>
          </button>
          <button
            aria-label={strings.mainMenu.save}
            type="button"
            title={strings.mainMenu.tooltips.save}
            onClick={() => runMenuAction(onSave)}
          >
            <span className="kizkatt-menu-item-label">
              {SaveIcon}
              <span>{strings.mainMenu.save}</span>
            </span>
            <kbd>{formatKeyboardShortcut("s")}</kbd>
          </button>
          <button
            type="button"
            title={strings.mainMenu.tooltips.saveAs}
            onClick={() => runMenuAction(onSaveAs)}
          >
            <span className="kizkatt-menu-item-label">
              {SaveIcon}
              <span>{strings.mainMenu.saveAs}</span>
            </span>
          </button>
          <div className="kizkatt-menu-divider" />
          <button
            type="button"
            title={strings.mainMenu.tooltips.import}
            onClick={() => runMenuAction(onImport)}
          >
            <span className="kizkatt-menu-item-label">
              {ExportIcon}
              <span>{strings.mainMenu.import}</span>
            </span>
          </button>
          <button
            type="button"
            disabled={!canExport}
            title={strings.mainMenu.tooltips.export}
            onClick={() => runMenuAction(onExport)}
          >
            <span className="kizkatt-menu-item-label">
              {ExportDocumentIcon}
              <span>{strings.mainMenu.export}</span>
            </span>
          </button>
          <div className="kizkatt-menu-divider" />
          <button
            type="button"
            title={strings.mainMenu.tooltips.print}
            onClick={() => runMenuAction(onPrint)}
          >
            <span className="kizkatt-menu-item-label">
              {PrintIcon}
              <span>{strings.mainMenu.print}</span>
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
        </nav>
      )}
    </div>
  );
}
