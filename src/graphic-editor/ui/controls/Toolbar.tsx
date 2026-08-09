import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import type { Tool } from "../../model/types";
import {
  EyeIcon,
  LayoutHorizontalIcon,
  LayoutVerticalIcon,
  PinIcon,
  SettingsIcon
} from "../icons";
import { DraggablePanel } from "../positioning/DraggablePanel";
import { useGraphicEditorSettings } from "../settings/GraphicEditorSettings";
import { TOOL_REGISTRY_BY_ID, type ToolDefinition } from "../../tools/toolRegistry";
import { useI18n } from "../../i18n";
import {
  closeOtherFloatingPanels,
  setActiveFloatingPanel,
  useCloseOtherFloatingPanels
} from "../overlays/floatingPanels";
import {
  LINE_TOOL_GROUP,
  SHAPE_TOOL_GROUP,
  SINGLE_TOOL_ORDER,
  SHOW_TOOLBAR_SHORTCUTS,
  TOOLBAR_SUBMENU_HOLD_MS
} from "./toolbarConstants";
import { ToolbarButton } from "./ToolbarButton";

type ToolbarSubmenuId = "line" | "settings" | "shape";
const TOOLBAR_FLOATING_PANEL_SOURCE = "toolbar";

type ToolGroup = {
  defaultTool: Tool;
  id: Exclude<ToolbarSubmenuId, "settings">;
  options: readonly ToolDefinition[];
};

const SHAPE_GROUP: ToolGroup = {
  defaultTool: "rectangle",
  id: "shape",
  options: SHAPE_TOOL_GROUP.map((tool) => TOOL_REGISTRY_BY_ID[tool])
};

const LINE_GROUP: ToolGroup = {
  defaultTool: "arrow",
  id: "line",
  options: LINE_TOOL_GROUP.map((tool) => TOOL_REGISTRY_BY_ID[tool])
};

function getActiveGroupEntry(group: ToolGroup, activeTool: Tool) {
  return (
    group.options.find((entry) => entry.id === activeTool) ??
    group.options.find((entry) => entry.id === group.defaultTool) ??
    group.options[0]
  );
}

function stopPanelDrag(event: ReactPointerEvent<HTMLElement>) {
  event.stopPropagation();
}

function ToolButton({
  active,
  entry,
  onAnyToolActivate,
  onActivateTool
}: {
  active: boolean;
  entry: ToolDefinition;
  onAnyToolActivate: () => void;
  onActivateTool: (tool: Tool) => void;
}) {
  const { strings } = useI18n();
  const label = strings.toolbar.tools[entry.labelKey];
  const tooltip = strings.toolbar.tooltips[entry.labelKey];

  return (
    <ToolbarButton
      active={active}
      icon={entry.icon}
      label={label}
      tooltip={tooltip}
      showShortcut={SHOW_TOOLBAR_SHORTCUTS}
      shortcut={entry.shortcut}
      onClick={() => {
        onAnyToolActivate();
        onActivateTool(entry.id);
      }}
    />
  );
}

function ToolGroupButton({
  activeTool,
  group,
  openSubmenu,
  onOpenSubmenuChange,
  onActivateTool
}: {
  activeTool: Tool;
  group: ToolGroup;
  openSubmenu: ToolbarSubmenuId | null;
  onOpenSubmenuChange: (submenuId: ToolbarSubmenuId | null) => void;
  onActivateTool: (tool: Tool) => void;
}) {
  const holdTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);
  const openedByHoldRef = useRef(false);
  const { strings } = useI18n();
  const activeEntry = getActiveGroupEntry(group, activeTool);
  const groupActive = group.options.some((entry) => entry.id === activeTool);
  const activeLabel = strings.toolbar.tools[activeEntry.labelKey];
  const activeTooltip = strings.toolbar.tooltips[activeEntry.labelKey];
  const open = openSubmenu === group.id;

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  return (
    <div className="kizkatt-toolbar-group">
      <button
        type="button"
        data-no-panel-drag
        className={[
          groupActive ? "is-active" : "",
          "has-submenu"
        ].join(" ")}
        aria-label={activeLabel}
        aria-expanded={open}
        title={activeTooltip}
        onClick={(event) => {
          if (openedByHoldRef.current) {
            openedByHoldRef.current = false;
            return;
          }

          if (
            event.target instanceof Element &&
            event.target.closest(".kizkatt-submenu-indicator")
          ) {
            onOpenSubmenuChange(open ? null : group.id);
            return;
          }

          onActivateTool(activeEntry.id);
          onOpenSubmenuChange(null);
        }}
        onPointerDown={(event) => {
          stopPanelDrag(event);
          clearHoldTimer();
          openedByHoldRef.current = false;
          holdTimerRef.current = window.setTimeout(() => {
            openedByHoldRef.current = true;
            onOpenSubmenuChange(group.id);
          }, TOOLBAR_SUBMENU_HOLD_MS);
        }}
        onPointerCancel={clearHoldTimer}
        onPointerLeave={clearHoldTimer}
        onPointerUp={clearHoldTimer}
      >
        <span aria-hidden="true">{activeEntry.icon}</span>
        {SHOW_TOOLBAR_SHORTCUTS && activeEntry.shortcut && (
          <small>{activeEntry.shortcut}</small>
        )}
        <i className="kizkatt-submenu-indicator" aria-hidden="true" />
      </button>
      {open && (
        <div className="kizkatt-toolbar-flyout" role="menu">
          {group.options.map((entry) => (
            <button
              key={entry.id}
              type="button"
              data-no-panel-drag
              role="menuitem"
              className={activeTool === entry.id ? "is-active" : undefined}
              aria-label={strings.toolbar.tools[entry.labelKey]}
              title={strings.toolbar.tooltips[entry.labelKey]}
              onPointerDown={stopPanelDrag}
              onClick={() => {
                onOpenSubmenuChange(null);
                onActivateTool(entry.id);
              }}
            >
              <span aria-hidden="true">{entry.icon}</span>
              {SHOW_TOOLBAR_SHORTCUTS && entry.shortcut && (
                <small>{entry.shortcut}</small>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolbarSettings({
  onOpenSubmenuChange,
  openSubmenu
}: {
  onOpenSubmenuChange: (submenuId: ToolbarSubmenuId | null) => void;
  openSubmenu: ToolbarSubmenuId | null;
}) {
  const {
    autohideToolbar,
    dragEnabled,
    setAutohideToolbar,
    setDragEnabled,
    setToolbarOrientation,
    toolbarOrientation
  } = useGraphicEditorSettings();
  const { strings } = useI18n();
  const open = openSubmenu === "settings";
  const nextToolbarOrientation =
    toolbarOrientation === "horizontal" ? "vertical" : "horizontal";
  const runSettingAction = (action: () => void) => {
    action();
    onOpenSubmenuChange(null);
  };

  return (
    <div className="kizkatt-toolbar-settings">
      <button
        type="button"
        data-no-panel-drag
        className="has-submenu"
        aria-label={strings.settings.toolbarSettings}
        aria-expanded={open}
        title={strings.settings.tooltips.toolbarSettings}
        onPointerDown={stopPanelDrag}
        onClick={() => onOpenSubmenuChange(open ? null : "settings")}
      >
        {SettingsIcon}
        <i className="kizkatt-submenu-indicator" aria-hidden="true" />
      </button>
      {open && (
        <div className="kizkatt-toolbar-settings-menu" role="menu">
          <button
            type="button"
            data-no-panel-drag
            role="menuitemcheckbox"
            aria-checked={!dragEnabled}
            title={strings.settings.tooltips.panelStickiness}
            onPointerDown={stopPanelDrag}
            onClick={() =>
              runSettingAction(() => setDragEnabled(!dragEnabled))
            }
          >
            <span className="kizkatt-settings-item-label">
              {PinIcon}
              <span>
                {dragEnabled
                  ? strings.settings.stickPanels
                  : strings.settings.unstickPanels}
              </span>
            </span>
          </button>
          <button
            type="button"
            data-no-panel-drag
            role="menuitemcheckbox"
            aria-checked={autohideToolbar}
            title={strings.settings.tooltips.autohideToolbar}
            onPointerDown={stopPanelDrag}
            onClick={() =>
              runSettingAction(() => setAutohideToolbar(!autohideToolbar))
            }
          >
            <span className="kizkatt-settings-item-label">
              {EyeIcon}
              <span>
                {autohideToolbar
                  ? strings.settings.disableAutohide
                  : strings.settings.enableAutohide}
              </span>
            </span>
          </button>
          <button
            type="button"
            data-no-panel-drag
            role="menuitemcheckbox"
            aria-checked={toolbarOrientation === "vertical"}
            title={strings.settings.tooltips.toolbarOrientation}
            onPointerDown={stopPanelDrag}
            onClick={() =>
              runSettingAction(() => setToolbarOrientation(nextToolbarOrientation))
            }
          >
            <span className="kizkatt-settings-item-label">
              {toolbarOrientation === "horizontal"
                ? LayoutVerticalIcon
                : LayoutHorizontalIcon}
              <span>
                {toolbarOrientation === "horizontal"
                  ? strings.settings.verticalToolbar
                  : strings.settings.horizontalToolbar}
              </span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

export function Toolbar({
  activeTool,
  onActivateTool
}: {
  activeTool: Tool;
  onActivateTool: (tool: Tool) => void;
}) {
  const { autohideToolbar, toolbarOrientation } = useGraphicEditorSettings();
  const { strings } = useI18n();
  const [openSubmenu, setOpenSubmenu] = useState<ToolbarSubmenuId | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const closeSubmenu = () => setOpenSubmenu(null);
  const openToolbarSubmenu = (submenuId: ToolbarSubmenuId | null) => {
    if (submenuId) {
      closeOtherFloatingPanels(TOOLBAR_FLOATING_PANEL_SOURCE);
    }

    setActiveFloatingPanel(
      submenuId ? TOOLBAR_FLOATING_PANEL_SOURCE : null
    );
    setOpenSubmenu(submenuId);
  };

  useCloseOtherFloatingPanels(TOOLBAR_FLOATING_PANEL_SOURCE, closeSubmenu);

  useEffect(() => {
    setActiveFloatingPanel(
      openSubmenu ? TOOLBAR_FLOATING_PANEL_SOURCE : null
    );
  }, [openSubmenu]);

  useEffect(() => {
    if (!openSubmenu) {
      return;
    }

    const closeSubmenuOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (target instanceof Node && toolbarRef.current?.contains(target)) {
        return;
      }

      closeSubmenu();
    };
    const closeSubmenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSubmenu();
      }
    };

    document.addEventListener(
      "pointerdown",
      closeSubmenuOnOutsidePointerDown,
      true
    );
    document.addEventListener("keydown", closeSubmenuOnEscape);

    return () => {
      document.removeEventListener(
        "pointerdown",
        closeSubmenuOnOutsidePointerDown,
        true
      );
      document.removeEventListener("keydown", closeSubmenuOnEscape);
    };
  }, [openSubmenu]);

  return (
    <DraggablePanel
      id="toolbar"
      className={openSubmenu ? "is-floating-panel-active" : undefined}
      topDock
    >
      <div
        ref={toolbarRef}
        className={[
          "kizkatt-toolbar",
          `kizkatt-toolbar--${toolbarOrientation}`,
          autohideToolbar ? "kizkatt-toolbar--autohide" : ""
        ].join(" ")}
        aria-label={strings.toolbar.ariaLabel}
      >
        {SINGLE_TOOL_ORDER.slice(0, 3).map((tool) => (
          <ToolButton
            key={tool}
            active={activeTool === tool}
            entry={TOOL_REGISTRY_BY_ID[tool]}
            onAnyToolActivate={closeSubmenu}
            onActivateTool={onActivateTool}
          />
        ))}
        <ToolGroupButton
          activeTool={activeTool}
          group={SHAPE_GROUP}
          openSubmenu={openSubmenu}
          onOpenSubmenuChange={openToolbarSubmenu}
          onActivateTool={onActivateTool}
        />
        <ToolGroupButton
          activeTool={activeTool}
          group={LINE_GROUP}
          openSubmenu={openSubmenu}
          onOpenSubmenuChange={openToolbarSubmenu}
          onActivateTool={onActivateTool}
        />
        {SINGLE_TOOL_ORDER.slice(3).map((tool) => (
          <ToolButton
            key={tool}
            active={activeTool === tool}
            entry={TOOL_REGISTRY_BY_ID[tool]}
            onAnyToolActivate={closeSubmenu}
            onActivateTool={onActivateTool}
          />
        ))}
        <div className="kizkatt-toolbar-divider" />
        <ToolbarSettings
          openSubmenu={openSubmenu}
          onOpenSubmenuChange={openToolbarSubmenu}
        />
      </div>
    </DraggablePanel>
  );
}
