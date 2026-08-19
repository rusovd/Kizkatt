import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import type { Tool } from "../../model/types";
import { DraggablePanel } from "../positioning/DraggablePanel";
import { PanelDragHandle } from "../positioning/PanelDragHandle";
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

type ToolbarSubmenuId = "line" | "shape";
const TOOLBAR_FLOATING_PANEL_SOURCE = "toolbar";

type ToolGroup = {
  defaultTool: Tool;
  id: ToolbarSubmenuId;
  options: readonly ToolDefinition[];
};

const SHAPE_GROUP: ToolGroup = {
  defaultTool: "rectangle",
  id: "shape",
  options: SHAPE_TOOL_GROUP.map((tool) => TOOL_REGISTRY_BY_ID[tool])
};

const LINE_GROUP: ToolGroup = {
  defaultTool: "draw",
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
        onDoubleClick={() => {
          clearHoldTimer();
          openedByHoldRef.current = true;
          onOpenSubmenuChange(open ? null : group.id);
        }}
        onPointerDown={(event) => {
          clearHoldTimer();
          openedByHoldRef.current = false;
          holdTimerRef.current = window.setTimeout(() => {
            openedByHoldRef.current = true;
            onOpenSubmenuChange(group.id);
          }, TOOLBAR_SUBMENU_HOLD_MS);
        }}
        onPointerCancel={clearHoldTimer}
        onPointerLeave={clearHoldTimer}
        onPointerMove={clearHoldTimer}
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
        <PanelDragHandle
          placement={toolbarOrientation === "vertical" ? "top" : "left"}
          title={strings.settings.tooltips.panelDragHandle}
        />
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
      </div>
    </DraggablePanel>
  );
}
