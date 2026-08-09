import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { ReactNode } from "react";

import {
  GRID_CALIBRATION_REFERENCE_CM,
  GRID_CM_SCALE_STEP,
  GRID_COLORS_BY_THEME,
  MAX_GRID_CM_SCALE,
  MAX_UI_SCALE,
  MIN_GRID_CM_SCALE,
  MIN_UI_SCALE,
  PERCENT_MAX_VALUE,
  UI_SCALE_STEP,
  ZOOM_IN_SYMBOL,
  ZOOM_OUT_SYMBOL
} from "../../config/constants";
import {
  getCalibratedCentimetersWorldSize,
  getDefaultGridSettings
} from "../../geometry";
import type { GridSettings, GridUnit, KizkattTheme } from "../../model/types";
import { useI18n } from "../../i18n";
import {
  ChevronRightIcon,
  EyeIcon,
  GridIcon,
  LayoutHorizontalIcon,
  LayoutVerticalIcon,
  PinIcon,
  RedoIcon,
  SettingsIcon,
  SnapIcon,
  UndoIcon,
  ViewModeIcon,
  ZenIcon
} from "../icons";
import {
  closeOtherFloatingPanels,
  setActiveFloatingPanel,
  useCloseOtherFloatingPanels
} from "../overlays/floatingPanels";
import { DraggablePanel } from "../positioning/DraggablePanel";
import { useGraphicEditorSettings } from "../settings/GraphicEditorSettings";

const FOOTER_SETTINGS_PANEL_SOURCE = "footer-settings";

type FooterControlsProps = {
  canRedo: boolean;
  canUndo: boolean;
  canUseGrid: boolean;
  gridColor: string;
  gridSettings: GridSettings;
  onGridColorChange: (color: string) => void;
  onGridSettingsChange: (settings: GridSettings) => void;
  onRedo: () => void;
  onToggleGrid: () => void;
  onToggleSnapToGrid: () => void;
  onToggleViewMode: () => void;
  onToggleZenMode: () => void;
  onUiScaleChange: (scale: number) => void;
  onUndo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  showGrid: boolean;
  snapToGrid: boolean;
  theme: KizkattTheme;
  uiScale: number;
  viewMode: boolean;
  zenMode: boolean;
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

function EditorSettingsMenu({
  canUseGrid,
  gridColor,
  gridSettings,
  onGridColorChange,
  onGridSettingsChange,
  onToggleGrid,
  onToggleSnapToGrid,
  onToggleViewMode,
  onToggleZenMode,
  onUiScaleChange,
  onRequestClose,
  showGrid,
  snapToGrid,
  theme,
  uiScale,
  viewMode,
  zenMode
}: Pick<
  FooterControlsProps,
  | "canUseGrid"
  | "gridColor"
  | "gridSettings"
  | "onGridColorChange"
  | "onGridSettingsChange"
  | "onToggleGrid"
  | "onToggleSnapToGrid"
  | "onToggleViewMode"
  | "onToggleZenMode"
  | "onUiScaleChange"
  | "showGrid"
  | "snapToGrid"
  | "theme"
  | "uiScale"
  | "viewMode"
  | "zenMode"
> & {
  onRequestClose: () => void;
}) {
  const [openSubmenu, setOpenSubmenu] = useState<"grid" | "view" | null>(null);
  const {
    autohideToolbar,
    dragEnabled,
    setAutohideToolbar,
    setDragEnabled,
    setToolbarOrientation,
    toolbarOrientation
  } = useGraphicEditorSettings();
  const { strings } = useI18n();
  const gridColors = GRID_COLORS_BY_THEME[theme];
  const majorGridUnit = gridSettings.unit === "cm" ? "cm" : "px";
  const minorGridUnit = gridSettings.unit === "cm" ? "mm" : "px";
  const gridSizeStep = gridSettings.unit === "cm" ? 0.1 : 1;
  const nextToolbarOrientation =
    toolbarOrientation === "horizontal" ? "vertical" : "horizontal";
  const calibrationScalePercent = Math.round(
    gridSettings.cmScale * PERCENT_MAX_VALUE
  );
  const calibrationRulerWidth =
    getCalibratedCentimetersWorldSize(
      GRID_CALIBRATION_REFERENCE_CM,
      gridSettings
    ) / uiScale;
  const calibrationTicks = Array.from(
    { length: GRID_CALIBRATION_REFERENCE_CM + 1 },
    (_, index) => index
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
      cmScale: gridSettings.cmScale
    });
  };
  const openSettingsSubmenu = (submenu: "grid" | "view") => {
    setOpenSubmenu(submenu);
  };

  return (
    <div className="kizkatt-footer-settings-menu" role="menu">
      <SettingsCheckButton
        checked={!dragEnabled}
        icon={PinIcon}
        title={strings.settings.tooltips.panelStickiness}
        onRequestClose={onRequestClose}
        onClick={() => setDragEnabled(!dragEnabled)}
      >
        {dragEnabled
          ? strings.settings.stickPanels
          : strings.settings.unstickPanels}
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
      <SettingsCheckButton
        checked={toolbarOrientation === "vertical"}
        icon={
          toolbarOrientation === "horizontal"
            ? LayoutVerticalIcon
            : LayoutHorizontalIcon
        }
        title={strings.settings.tooltips.toolbarOrientation}
        onRequestClose={onRequestClose}
        onClick={() => setToolbarOrientation(nextToolbarOrientation)}
      >
        {toolbarOrientation === "horizontal"
          ? strings.settings.verticalToolbar
          : strings.settings.horizontalToolbar}
      </SettingsCheckButton>
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
            <div className="kizkatt-grid-settings-row">
              <span>{strings.mainMenu.gridUnits}</span>
              <div
                className="kizkatt-theme-toggle kizkatt-grid-unit-toggle"
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
                  aria-label={strings.mainMenu.gridUnitCm}
                  title={strings.mainMenu.tooltips.gridUnitCm}
                  className={gridSettings.unit === "cm" ? "is-active" : undefined}
                  onPointerDown={stopPanelDrag}
                  onClick={() => setGridUnit("cm")}
                >
                  cm
                </button>
              </div>
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
                <input
                  id="kizkatt-footer-grid-major-size"
                  type="number"
                  min={gridSettings.unit === "cm" ? 0.1 : 1}
                  max={gridSettings.unit === "cm" ? 100 : 10000}
                  step={gridSizeStep}
                  aria-label={`${strings.mainMenu.gridMajorSize} (${majorGridUnit})`}
                  title={strings.mainMenu.tooltips.gridMajorSize}
                  value={gridSettings.majorSize}
                  onPointerDown={stopPanelDrag}
                  onChange={(event) =>
                    updateGridSettings({ majorSize: Number(event.target.value) })
                  }
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
                <input
                  id="kizkatt-footer-grid-minor-size"
                  type="number"
                  min={gridSettings.unit === "cm" ? 0.1 : 1}
                  max={
                    gridSettings.unit === "cm"
                      ? gridSettings.majorSize * 10
                      : gridSettings.majorSize
                  }
                  step={gridSizeStep}
                  aria-label={`${strings.mainMenu.gridMinorSize} (${minorGridUnit})`}
                  title={strings.mainMenu.tooltips.gridMinorSize}
                  value={gridSettings.minorSize}
                  onPointerDown={stopPanelDrag}
                  onChange={(event) =>
                    updateGridSettings({ minorSize: Number(event.target.value) })
                  }
                />
                <span>{minorGridUnit}</span>
              </span>
            </label>
            {gridSettings.unit === "cm" && (
              <>
                <label
                  className="kizkatt-grid-calibration-row"
                  htmlFor="kizkatt-footer-grid-cm-scale"
                >
                  <span>{strings.mainMenu.gridCmCalibration}</span>
                  <span>{calibrationScalePercent}%</span>
                </label>
                <input
                  id="kizkatt-footer-grid-cm-scale"
                  className="kizkatt-grid-calibration-input"
                  type="range"
                  min={MIN_GRID_CM_SCALE}
                  max={MAX_GRID_CM_SCALE}
                  step={GRID_CM_SCALE_STEP}
                  aria-label={strings.mainMenu.gridCmCalibration}
                  title={strings.mainMenu.tooltips.gridCmCalibration}
                  value={gridSettings.cmScale}
                  onPointerDown={stopPanelDrag}
                  onChange={(event) =>
                    updateGridSettings({ cmScale: Number(event.target.value) })
                  }
                />
                <div className="kizkatt-grid-calibration-preview">
                  <div
                    className="kizkatt-grid-calibration-ruler"
                    role="img"
                    aria-label={`${GRID_CALIBRATION_REFERENCE_CM} cm calibration ruler`}
                    title={strings.mainMenu.tooltips.gridCalibrationRuler}
                    style={{ width: `${calibrationRulerWidth}px` }}
                  >
                    {calibrationTicks.map((tick) => (
                      <span
                        key={tick}
                        className="kizkatt-grid-calibration-tick"
                        style={{
                          left: `${
                            (tick / GRID_CALIBRATION_REFERENCE_CM) *
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
          icon={ViewModeIcon}
          open={openSubmenu === "view"}
          title={strings.contextMenu.tooltips.viewMode}
          onOpen={() => openSettingsSubmenu("view")}
        >
          {strings.contextMenu.viewMode}
        </SettingsSubmenuButton>
        {openSubmenu === "view" && (
          <div className="kizkatt-footer-settings-submenu" role="menu">
            <SettingsCheckButton
              checked={viewMode}
              closeOnClick={false}
              icon={ViewModeIcon}
              title={strings.contextMenu.tooltips.viewMode}
              onRequestClose={onRequestClose}
              onClick={onToggleViewMode}
            >
              {strings.contextMenu.viewMode}
            </SettingsCheckButton>
            <SettingsCheckButton
              checked={zenMode}
              closeOnClick={false}
              icon={ZenIcon}
              title={strings.contextMenu.tooltips.zenMode}
              onRequestClose={onRequestClose}
              onClick={onToggleZenMode}
            >
              {strings.contextMenu.zenMode}
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
  canRedo,
  canUndo,
  canUseGrid,
  gridColor,
  gridSettings,
  onGridColorChange,
  onGridSettingsChange,
  onRedo,
  onToggleGrid,
  onToggleSnapToGrid,
  onToggleViewMode,
  onToggleZenMode,
  onUiScaleChange,
  onUndo,
  onZoomIn,
  onZoomOut,
  showGrid,
  snapToGrid,
  theme,
  uiScale,
  viewMode,
  zenMode,
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
    <>
      <DraggablePanel id="zoom-controls" topDock>
        <div
          ref={controlsRef}
          className="kizkatt-zoom-controls"
          aria-label={strings.footer.zoomControls}
        >
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
              canUseGrid={canUseGrid}
              gridColor={gridColor}
              gridSettings={gridSettings}
              onGridColorChange={onGridColorChange}
              onGridSettingsChange={onGridSettingsChange}
              onToggleGrid={onToggleGrid}
              onToggleSnapToGrid={onToggleSnapToGrid}
              onToggleViewMode={onToggleViewMode}
              onToggleZenMode={onToggleZenMode}
              onUiScaleChange={onUiScaleChange}
              onRequestClose={closeSettings}
              showGrid={showGrid}
              snapToGrid={snapToGrid}
              theme={theme}
              uiScale={uiScale}
              viewMode={viewMode}
              zenMode={zenMode}
            />
          )}
        </div>
      </DraggablePanel>

      <DraggablePanel id="history-controls" topDock>
        <div
          className="kizkatt-history-controls"
          aria-label={strings.footer.historyControls}
        >
          <button
            type="button"
            aria-label={strings.footer.undo}
            title={strings.footer.tooltips.undo}
            onClick={onUndo}
            disabled={!canUndo}
          >
            {UndoIcon}
          </button>
          <button
            type="button"
            aria-label={strings.footer.redo}
            title={strings.footer.tooltips.redo}
            onClick={onRedo}
            disabled={!canRedo}
          >
            {RedoIcon}
          </button>
        </div>
      </DraggablePanel>
    </>
  );
}
