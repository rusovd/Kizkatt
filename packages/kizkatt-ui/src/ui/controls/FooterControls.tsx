import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { ReactNode } from "react";

import {
  CANVAS_BACKGROUNDS_BY_THEME,
  GRID_CALIBRATION_REFERENCE_MM,
  GRID_MM_SCALE_STEP,
  GRID_COLORS_BY_THEME,
  DPI_OPTIONS,
  MAX_GRID_MM_SCALE,
  MAX_UI_SCALE,
  MIN_GRID_MM_SCALE,
  MIN_UI_SCALE,
  PERCENT_MAX_VALUE,
  UI_SCALE_STEP,
  ZOOM_IN_SYMBOL,
  ZOOM_OUT_SYMBOL
} from "../../config/constants";
import {
  getCalibratedMillimetersWorldSize,
  getDefaultGridSettings
} from "kizkatt-graphic-engine";
import type {
  Dpi,
  EditorDisplayMode,
  GridSettings,
  GridUnit,
  KizkattTheme
} from "../../model/types";
import { SUPPORTED_LOCALES, useI18n, type Locale } from "../../i18n";
import {
  ChevronRightIcon,
  EyeIcon,
  EyedropperIcon,
  GridIcon,
  InfoIcon,
  LanguageIcon,
  PaletteIcon,
  PinIcon,
  RedoIcon,
  SettingsIcon,
  SnapIcon,
  UndoIcon,
  WireframeIcon
} from "../icons";
import {
  closeOtherFloatingPanels,
  setActiveFloatingPanel,
  useCloseOtherFloatingPanels
} from "../overlays/floatingPanels";
import { Panel } from "../../components/Panel";
import { NumberInput } from "../../components/NumberInput";
import { useGraphicEditorSettings } from "../settings/GraphicEditorSettings";

const FOOTER_SETTINGS_PANEL_SOURCE = "footer-settings";

type FooterControlsProps = {
  activeDisplayMode: EditorDisplayMode | null;
  canvasBackgroundColor: string;
  canRedo: boolean;
  canUndo: boolean;
  canUseGrid: boolean;
  customCanvasBackgroundColor: string;
  dpi: Dpi;
  gridColor: string;
  gridSettings: GridSettings;
  infoMode: boolean;
  onCanvasBackgroundChange: (color: string) => void;
  onGridColorChange: (color: string) => void;
  onGridSettingsChange: (settings: GridSettings) => void;
  onDpiChange: (dpi: Dpi) => void;
  onPickCanvasBackground: () => void;
  onRedo: () => void;
  onToggleGrid: () => void;
  onToggleSnapToGrid: () => void;
  onToggleDisplayMode: (mode: EditorDisplayMode) => void;
  onToggleInfoMode: () => void;
  onUiScaleChange: (scale: number) => void;
  onUndo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  showGrid: boolean;
  snapToGrid: boolean;
  theme: KizkattTheme;
  uiScale: number;
  zoom: number;
};

function stopPanelDrag(event: ReactPointerEvent<HTMLElement>) {
  event.stopPropagation();
}

function SettingsCheckButton({
  checked,
  children,
  closeOnClick = true,
  disabled,
  icon,
  onClick,
  onRequestClose,
  title
}: {
  checked: boolean;
  children: string;
  closeOnClick?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  onClick: () => void;
  onRequestClose: () => void;
  title: string;
}) {
  const runAction = () => {
    onClick();
    if (closeOnClick) {
      onRequestClose();
    }
  };

  return (
    <button
      type="button"
      data-no-panel-drag
      role="menuitemcheckbox"
      aria-checked={checked}
      disabled={disabled}
      title={title}
      onPointerDown={stopPanelDrag}
      onClick={runAction}
    >
      <span className="kizkatt-settings-item-label">
        {icon}
        <span>{children}</span>
      </span>
      <span className="kizkatt-context-check" aria-hidden="true">
        {checked ? "✓" : ""}
      </span>
    </button>
  );
}

function SettingsSubmenuButton({
  children,
  icon,
  onOpen,
  open,
  title
}: {
  children: string;
  icon: ReactNode;
  onOpen: () => void;
  open: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      data-no-panel-drag
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded={open}
      title={title}
      onPointerDown={stopPanelDrag}
      onClick={onOpen}
      onFocus={onOpen}
      onMouseEnter={onOpen}
    >
      <span className="kizkatt-settings-item-label">
        {icon}
        <span>{children}</span>
      </span>
      <span className="kizkatt-context-submenu-chevron" aria-hidden="true">
        {ChevronRightIcon}
      </span>
    </button>
  );
}

function GridNumberInput({
  ariaLabel,
  id,
  max,
  min,
  onChange,
  step,
  title,
  value
}: {
  ariaLabel: string;
  id: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  step: number;
  title: string;
  value: number;
}) {
  const [draftValue, setDraftValue] = useState(String(value));

  useEffect(() => {
    setDraftValue(String(value));
  }, [value]);

  const commitValue = (nextValue: string) => {
    setDraftValue(nextValue);

    if (nextValue.trim() === "") {
      return;
    }

    const numericValue = Number(nextValue);

    if (Number.isFinite(numericValue)) {
      onChange(numericValue);
    }
  };

  return (
    <NumberInput
      id={id}
      decimalPlaces={step < 1 ? 2 : 0}
      label={ariaLabel}
      min={min}
      max={max}
      showSliderPopover
      step={step}
      title={title}
      value={draftValue}
      onBlur={() => setDraftValue(String(value))}
      onPointerDown={stopPanelDrag}
      onValueChange={commitValue}
      valueType={step < 1 ? "decimal" : "integer"}
    />
  );
}

function EditorSettingsMenu({
  activeDisplayMode,
  canvasBackgroundColor,
  canUseGrid,
  customCanvasBackgroundColor,
  dpi,
  gridColor,
  gridSettings,
  infoMode,
  onCanvasBackgroundChange,
  onGridColorChange,
  onGridSettingsChange,
  onDpiChange,
  onPickCanvasBackground,
  onToggleGrid,
  onToggleSnapToGrid,
  onToggleDisplayMode,
  onToggleInfoMode,
  onUiScaleChange,
  onRequestClose,
  showGrid,
  snapToGrid,
  theme,
  uiScale
}: Pick<
  FooterControlsProps,
  | "activeDisplayMode"
  | "canvasBackgroundColor"
  | "canUseGrid"
  | "customCanvasBackgroundColor"
  | "dpi"
  | "gridColor"
  | "gridSettings"
  | "infoMode"
  | "onCanvasBackgroundChange"
  | "onGridColorChange"
  | "onGridSettingsChange"
  | "onDpiChange"
  | "onPickCanvasBackground"
  | "onToggleGrid"
  | "onToggleSnapToGrid"
  | "onToggleDisplayMode"
  | "onToggleInfoMode"
  | "onUiScaleChange"
  | "showGrid"
  | "snapToGrid"
  | "theme"
  | "uiScale"
> & {
  onRequestClose: () => void;
}) {
  const [openSubmenu, setOpenSubmenu] =
    useState<"display" | "grid" | null>(null);
  const {
    allVisiblePanelsPinned,
    autohideToolbar,
    colorMode,
    setAutohideToolbar,
    setColorMode,
    toggleVisiblePanelsPinned
  } = useGraphicEditorSettings();
  const { locale, setLocale, strings } = useI18n();
  const canvasBackgrounds = CANVAS_BACKGROUNDS_BY_THEME[theme];
  const gridColors = GRID_COLORS_BY_THEME[theme];
  const majorGridUnit = gridSettings.unit === "mm" ? "mm" : "px";
  const minorGridUnit = gridSettings.unit === "mm" ? "mm" : "px";
  const gridSizeStep = gridSettings.unit === "mm" ? 0.1 : 1;
  const calibrationScalePercent = Math.round(
    gridSettings.metricScale * PERCENT_MAX_VALUE
  );
  const calibrationRulerWidth =
    getCalibratedMillimetersWorldSize(
      GRID_CALIBRATION_REFERENCE_MM,
      gridSettings
    ) / uiScale;
  const calibrationTicks = Array.from(
    { length: GRID_CALIBRATION_REFERENCE_MM / 10 + 1 },
    (_, index) => index * 10
  );
  const updateGridSettings = (patch: Partial<GridSettings>) => {
    onGridSettingsChange({
      ...gridSettings,
      ...patch
    });
  };
  const setGridUnit = (unit: GridUnit) => {
    onGridSettingsChange({
      ...getDefaultGridSettings(unit),
      metricScale: gridSettings.metricScale
    });
  };
  const openSettingsSubmenu = (submenu: "display" | "grid") => {
    setOpenSubmenu(submenu);
  };

  return (
    <div className="kizkatt-footer-settings-menu" role="menu">
      <SettingsCheckButton
        checked={allVisiblePanelsPinned}
        icon={PinIcon}
        title={strings.settings.tooltips.panelStickiness}
        onRequestClose={onRequestClose}
        onClick={toggleVisiblePanelsPinned}
      >
        {allVisiblePanelsPinned
          ? strings.settings.unstickPanels
          : strings.settings.stickPanels}
      </SettingsCheckButton>
      <SettingsCheckButton
        checked={autohideToolbar}
        icon={EyeIcon}
        title={strings.settings.tooltips.autohideToolbar}
        onRequestClose={onRequestClose}
        onClick={() => setAutohideToolbar(!autohideToolbar)}
      >
        {autohideToolbar
          ? strings.settings.disableAutohide
          : strings.settings.enableAutohide}
      </SettingsCheckButton>
      <div className="kizkatt-menu-divider" />
      <label
        className="kizkatt-language-row"
        htmlFor="kizkatt-footer-language"
      >
        <span className="kizkatt-settings-item-label">
          {LanguageIcon}
          <span>{strings.language.label}</span>
        </span>
        <select
          id="kizkatt-footer-language"
          aria-label={strings.language.label}
          title={strings.language.label}
          value={locale}
          onPointerDown={stopPanelDrag}
          onChange={(event) => setLocale(event.target.value as Locale)}
        >
          {SUPPORTED_LOCALES.map((language) => (
            <option key={language.id} value={language.id}>
              {language.label}
            </option>
          ))}
        </select>
      </label>
      <div className="kizkatt-canvas-background-settings-row">
        <span
          aria-hidden="true"
          className="kizkatt-canvas-background-icon"
          title={strings.mainMenu.canvasBackground}
        >
          {PaletteIcon}
        </span>
        <div
          className="kizkatt-swatches kizkatt-canvas-background-swatches"
          role="group"
          aria-label={strings.mainMenu.canvasBackground}
        >
          {canvasBackgrounds.map((color) => (
            <button
              key={color}
              type="button"
              data-no-panel-drag
              aria-label={`Canvas background ${color}`}
              title={`${strings.mainMenu.tooltips.canvasBackgroundColor} ${color}`}
              className={
                canvasBackgroundColor === color ? "is-active" : undefined
              }
              style={{ backgroundColor: color }}
              onPointerDown={stopPanelDrag}
              onClick={() => onCanvasBackgroundChange(color)}
            />
          ))}
          <button
            type="button"
            data-no-panel-drag
            aria-label={`Canvas background custom ${customCanvasBackgroundColor}`}
            title={`${strings.mainMenu.tooltips.customCanvasBackground} ${customCanvasBackgroundColor}`}
            className={[
              "kizkatt-custom-background-swatch",
              canvasBackgroundColor === customCanvasBackgroundColor
                ? "is-active"
                : ""
            ].join(" ")}
            style={{ backgroundColor: customCanvasBackgroundColor }}
            onPointerDown={stopPanelDrag}
            onClick={() =>
              onCanvasBackgroundChange(customCanvasBackgroundColor)
            }
          />
          <button
            type="button"
            data-no-panel-drag
            aria-label={strings.mainMenu.pickCanvasBackground}
            title={strings.mainMenu.tooltips.pickCanvasBackground}
            className="kizkatt-eyedropper-swatch"
            onPointerDown={stopPanelDrag}
            onClick={onPickCanvasBackground}
          >
            {EyedropperIcon}
          </button>
        </div>
      </div>
      <div className="kizkatt-menu-divider" />
      <div className="kizkatt-color-mode-settings-row">
        <span>{strings.settings.colorMode}</span>
        <div
          className="kizkatt-settings-segmented kizkatt-color-mode-toggle"
          role="group"
          aria-label={strings.settings.colorMode}
          title={strings.settings.tooltips.colorMode}
        >
          {(["hex", "cmyk", "rgba"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              data-no-panel-drag
              aria-label={mode === "rgba" ? "RGB/A" : mode.toUpperCase()}
              className={colorMode === mode ? "is-active" : undefined}
              onPointerDown={stopPanelDrag}
              onClick={() => setColorMode(mode)}
            >
              {mode === "rgba" ? "RGB/A" : mode.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="kizkatt-grid-settings-row">
        <span>{strings.mainMenu.gridUnits}</span>
        <div
          className="kizkatt-settings-segmented kizkatt-grid-unit-toggle"
          role="group"
          aria-label={strings.mainMenu.gridUnits}
        >
          <button
            type="button"
            data-no-panel-drag
            aria-label={strings.mainMenu.gridUnitPx}
            title={strings.mainMenu.tooltips.gridUnitPx}
            className={gridSettings.unit === "px" ? "is-active" : undefined}
            onPointerDown={stopPanelDrag}
            onClick={() => setGridUnit("px")}
          >
            px
          </button>
          <button
            type="button"
            data-no-panel-drag
            aria-label={strings.mainMenu.gridUnitMm}
            title={strings.mainMenu.tooltips.gridUnitMm}
            className={gridSettings.unit === "mm" ? "is-active" : undefined}
            onPointerDown={stopPanelDrag}
            onClick={() => setGridUnit("mm")}
          >
            mm
          </button>
        </div>
      </div>
      <label
        className="kizkatt-dpi-settings-row"
        htmlFor="kizkatt-footer-dpi"
        title={strings.settings.tooltips.dpi}
      >
        <span>{strings.settings.dpi}</span>
        <select
          id="kizkatt-footer-dpi"
          aria-label={strings.settings.dpi}
          value={dpi}
          onPointerDown={stopPanelDrag}
          onChange={(event) => onDpiChange(Number(event.target.value) as Dpi)}
        >
          {DPI_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
      <div className="kizkatt-menu-divider" />
      <div className="kizkatt-settings-submenu-row">
        <SettingsSubmenuButton
          icon={GridIcon}
          open={openSubmenu === "grid"}
          title={strings.settings.tooltips.gridSettings}
          onOpen={() => openSettingsSubmenu("grid")}
        >
          {strings.settings.grid}
        </SettingsSubmenuButton>
        {openSubmenu === "grid" && (
          <div className="kizkatt-footer-settings-submenu" role="menu">
            <SettingsCheckButton
              checked={canUseGrid && showGrid}
              closeOnClick={false}
              disabled={!canUseGrid}
              icon={GridIcon}
              title={strings.contextMenu.tooltips.toggleGrid}
              onRequestClose={onRequestClose}
              onClick={onToggleGrid}
            >
              {strings.contextMenu.toggleGrid}
            </SettingsCheckButton>
            <SettingsCheckButton
              checked={canUseGrid && snapToGrid}
              closeOnClick={false}
              disabled={!canUseGrid}
              icon={SnapIcon}
              title={strings.contextMenu.tooltips.snapToGrid}
              onRequestClose={onRequestClose}
              onClick={onToggleSnapToGrid}
            >
              {strings.contextMenu.snapToGrid}
            </SettingsCheckButton>
            <div className="kizkatt-menu-divider" />
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
                  data-no-panel-drag
                  aria-label={`Grid color ${color}`}
                  title={`${strings.mainMenu.tooltips.gridColor} ${color}`}
                  className={gridColor === color ? "is-active" : undefined}
                  style={{ backgroundColor: color }}
                  onPointerDown={stopPanelDrag}
                  onClick={() => onGridColorChange(color)}
                />
              ))}
            </div>
            <label
              className="kizkatt-grid-checkbox-row"
              htmlFor="kizkatt-footer-grid-show-major"
              title={strings.mainMenu.tooltips.gridMajorLayer}
            >
              <span>{strings.mainMenu.gridMajorLayer}</span>
              <input
                id="kizkatt-footer-grid-show-major"
                type="checkbox"
                checked={gridSettings.showMajor}
                onPointerDown={stopPanelDrag}
                onChange={(event) =>
                  updateGridSettings({ showMajor: event.target.checked })
                }
              />
            </label>
            <label
              className="kizkatt-grid-checkbox-row"
              htmlFor="kizkatt-footer-grid-show-minor"
              title={strings.mainMenu.tooltips.gridMinorLayer}
            >
              <span>{strings.mainMenu.gridMinorLayer}</span>
              <input
                id="kizkatt-footer-grid-show-minor"
                type="checkbox"
                checked={gridSettings.showMinor}
                onPointerDown={stopPanelDrag}
                onChange={(event) =>
                  updateGridSettings({ showMinor: event.target.checked })
                }
              />
            </label>
            <label
              className="kizkatt-grid-size-row"
              htmlFor="kizkatt-footer-grid-major-size"
            >
              <span>{strings.mainMenu.gridMajorSize}</span>
              <span className="kizkatt-grid-size-input-wrap">
                <GridNumberInput
                  id="kizkatt-footer-grid-major-size"
                  min={gridSettings.unit === "mm" ? 0.1 : 1}
                  max={gridSettings.unit === "mm" ? 1000 : 10000}
                  step={gridSizeStep}
                  ariaLabel={`${strings.mainMenu.gridMajorSize} (${majorGridUnit})`}
                  title={strings.mainMenu.tooltips.gridMajorSize}
                  value={gridSettings.majorSize}
                  onChange={(value) => updateGridSettings({ majorSize: value })}
                />
                <span>{majorGridUnit}</span>
              </span>
            </label>
            <label
              className="kizkatt-grid-size-row"
              htmlFor="kizkatt-footer-grid-minor-size"
            >
              <span>{strings.mainMenu.gridMinorSize}</span>
              <span className="kizkatt-grid-size-input-wrap">
                <GridNumberInput
                  id="kizkatt-footer-grid-minor-size"
                  min={gridSettings.unit === "mm" ? 0.1 : 1}
                  max={
                    gridSettings.unit === "mm"
                      ? gridSettings.majorSize
                      : gridSettings.majorSize
                  }
                  step={gridSizeStep}
                  ariaLabel={`${strings.mainMenu.gridMinorSize} (${minorGridUnit})`}
                  title={strings.mainMenu.tooltips.gridMinorSize}
                  value={gridSettings.minorSize}
                  onChange={(value) => updateGridSettings({ minorSize: value })}
                />
                <span>{minorGridUnit}</span>
              </span>
            </label>
            {gridSettings.unit === "mm" && (
              <>
                <label
                  className="kizkatt-grid-calibration-row"
                  htmlFor="kizkatt-footer-grid-mm-scale"
                >
                  <span>{strings.mainMenu.gridMmCalibration}</span>
                  <span>{calibrationScalePercent}%</span>
                </label>
                <input
                  id="kizkatt-footer-grid-mm-scale"
                  className="kizkatt-grid-calibration-input"
                  type="range"
                  min={MIN_GRID_MM_SCALE}
                  max={MAX_GRID_MM_SCALE}
                  step={GRID_MM_SCALE_STEP}
                  aria-label={strings.mainMenu.gridMmCalibration}
                  title={strings.mainMenu.tooltips.gridMmCalibration}
                  value={gridSettings.metricScale}
                  onPointerDown={stopPanelDrag}
                  onChange={(event) =>
                    updateGridSettings({
                      metricScale: Number(event.target.value)
                    })
                  }
                />
                <div className="kizkatt-grid-calibration-preview">
                  <div
                    className="kizkatt-grid-calibration-ruler"
                    role="img"
                    aria-label={`${GRID_CALIBRATION_REFERENCE_MM} mm calibration ruler`}
                    title={strings.mainMenu.tooltips.gridCalibrationRuler}
                    style={{ width: `${calibrationRulerWidth}px` }}
                  >
                    {calibrationTicks.map((tick) => (
                      <span
                        key={tick}
                        className="kizkatt-grid-calibration-tick"
                        style={{
                          left: `${
                            (tick / GRID_CALIBRATION_REFERENCE_MM) *
                            PERCENT_MAX_VALUE
                          }%`
                        }}
                      >
                        <span>{tick}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      <div className="kizkatt-settings-submenu-row">
        <SettingsSubmenuButton
          icon={EyeIcon}
          open={openSubmenu === "display"}
          title={strings.settings.tooltips.displayMode}
          onOpen={() => openSettingsSubmenu("display")}
        >
          {strings.settings.displayMode}
        </SettingsSubmenuButton>
        {openSubmenu === "display" && (
          <div className="kizkatt-footer-settings-submenu" role="menu">
            <SettingsCheckButton
              checked={activeDisplayMode === "preview"}
              closeOnClick={false}
              icon={EyeIcon}
              title={strings.settings.tooltips.previewMode}
              onRequestClose={onRequestClose}
              onClick={() => onToggleDisplayMode("preview")}
            >
              {strings.settings.previewMode}
            </SettingsCheckButton>
            <SettingsCheckButton
              checked={activeDisplayMode === "wireframe"}
              closeOnClick={false}
              icon={WireframeIcon}
              title={strings.settings.tooltips.wireframeMode}
              onRequestClose={onRequestClose}
              onClick={() => onToggleDisplayMode("wireframe")}
            >
              {strings.settings.wireframeMode}
            </SettingsCheckButton>
            <div className="kizkatt-menu-divider" />
            <SettingsCheckButton
              checked={infoMode}
              closeOnClick={false}
              icon={InfoIcon}
              title={strings.settings.tooltips.infoMode}
              onRequestClose={onRequestClose}
              onClick={onToggleInfoMode}
            >
              {strings.settings.infoMode}
            </SettingsCheckButton>
          </div>
        )}
      </div>
      <div className="kizkatt-menu-divider" />
      <label className="kizkatt-ui-scale-row" htmlFor="kizkatt-footer-ui-scale">
        <span>{strings.mainMenu.uiScale}</span>
        <span>{Math.round(uiScale * PERCENT_MAX_VALUE)}%</span>
      </label>
      <input
        id="kizkatt-footer-ui-scale"
        className="kizkatt-ui-scale-input"
        type="range"
        title={strings.mainMenu.tooltips.uiScale}
        min={MIN_UI_SCALE}
        max={MAX_UI_SCALE}
        step={UI_SCALE_STEP}
        value={uiScale}
        onPointerDown={stopPanelDrag}
        onChange={(event) => onUiScaleChange(Number(event.target.value))}
      />
    </div>
  );
}

export function FooterControls({
  activeDisplayMode,
  canvasBackgroundColor,
  canRedo,
  canUndo,
  canUseGrid,
  customCanvasBackgroundColor,
  dpi,
  gridColor,
  gridSettings,
  infoMode,
  onCanvasBackgroundChange,
  onGridColorChange,
  onGridSettingsChange,
  onDpiChange,
  onPickCanvasBackground,
  onRedo,
  onToggleGrid,
  onToggleSnapToGrid,
  onToggleDisplayMode,
  onToggleInfoMode,
  onUiScaleChange,
  onUndo,
  onZoomIn,
  onZoomOut,
  showGrid,
  snapToGrid,
  theme,
  uiScale,
  zoom
}: FooterControlsProps) {
  const { strings } = useI18n();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const controlsRef = useRef<HTMLDivElement | null>(null);

  const closeSettings = () => setSettingsOpen(false);
  const toggleSettings = () => {
    const nextOpen = !settingsOpen;

    if (nextOpen) {
      closeOtherFloatingPanels(FOOTER_SETTINGS_PANEL_SOURCE);
    }

    setActiveFloatingPanel(nextOpen ? FOOTER_SETTINGS_PANEL_SOURCE : null);
    setSettingsOpen(nextOpen);
  };

  useCloseOtherFloatingPanels(FOOTER_SETTINGS_PANEL_SOURCE, closeSettings);

  useEffect(() => {
    setActiveFloatingPanel(
      settingsOpen ? FOOTER_SETTINGS_PANEL_SOURCE : null
    );
  }, [settingsOpen]);

  useEffect(() => {
    if (!settingsOpen) {
      return;
    }

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (target instanceof Node && controlsRef.current?.contains(target)) {
        return;
      }

      closeSettings();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSettings();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointerDown, true);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener(
        "pointerdown",
        closeOnOutsidePointerDown,
        true
      );
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [settingsOpen]);

  return (
    <Panel
      variant="toolbar"
      id="footer-controls"
      defaultOrientation="horizontal"
      topDock
    >
      {({ actions, chrome, orientation }) => (
        <div
          ref={controlsRef}
          className={`kizkatt-footer-controls kizkatt-footer-controls--${orientation}`}
          aria-label={`${strings.footer.historyControls}. ${strings.footer.zoomControls}`}
        >
          {chrome}
        <button
          type="button"
          className="kizkatt-footer-history-button"
          data-no-panel-drag
          aria-label={strings.footer.undo}
          title={strings.footer.tooltips.undo}
          onPointerDown={stopPanelDrag}
          onClick={onUndo}
          disabled={!canUndo}
        >
          {UndoIcon}
        </button>
        <button
          type="button"
          className="kizkatt-footer-history-button"
          data-no-panel-drag
          aria-label={strings.footer.redo}
          title={strings.footer.tooltips.redo}
          onPointerDown={stopPanelDrag}
          onClick={onRedo}
          disabled={!canRedo}
        >
          {RedoIcon}
        </button>
        <span className="kizkatt-zoom-divider" aria-hidden="true" />
        <button
          type="button"
          data-no-panel-drag
          aria-label={strings.settings.editorSettings}
          aria-expanded={settingsOpen}
          title={strings.settings.tooltips.editorSettings}
          onPointerDown={stopPanelDrag}
          onClick={toggleSettings}
        >
          {SettingsIcon}
        </button>
        <span className="kizkatt-zoom-divider" aria-hidden="true" />
        <button
          type="button"
          data-no-panel-drag
          aria-label={strings.footer.zoomOut}
          title={strings.footer.tooltips.zoomOut}
          onPointerDown={stopPanelDrag}
          onClick={onZoomOut}
        >
          {ZOOM_OUT_SYMBOL}
        </button>
        <span>{Math.round(zoom * PERCENT_MAX_VALUE)}%</span>
        <button
          type="button"
          data-no-panel-drag
          aria-label={strings.footer.zoomIn}
          title={strings.footer.tooltips.zoomIn}
          onPointerDown={stopPanelDrag}
          onClick={onZoomIn}
        >
          {ZOOM_IN_SYMBOL}
        </button>
        {settingsOpen && (
          <EditorSettingsMenu
            activeDisplayMode={activeDisplayMode}
            canvasBackgroundColor={canvasBackgroundColor}
            canUseGrid={canUseGrid}
            customCanvasBackgroundColor={customCanvasBackgroundColor}
            dpi={dpi}
            gridColor={gridColor}
            gridSettings={gridSettings}
            infoMode={infoMode}
            onCanvasBackgroundChange={onCanvasBackgroundChange}
            onGridColorChange={onGridColorChange}
            onGridSettingsChange={onGridSettingsChange}
            onDpiChange={onDpiChange}
            onPickCanvasBackground={onPickCanvasBackground}
            onToggleGrid={onToggleGrid}
            onToggleSnapToGrid={onToggleSnapToGrid}
            onToggleDisplayMode={onToggleDisplayMode}
            onToggleInfoMode={onToggleInfoMode}
            onUiScaleChange={onUiScaleChange}
            onRequestClose={closeSettings}
            showGrid={showGrid}
            snapToGrid={snapToGrid}
            theme={theme}
            uiScale={uiScale}
          />
        )}
          {actions}
        </div>
      )}
    </Panel>
  );
}
