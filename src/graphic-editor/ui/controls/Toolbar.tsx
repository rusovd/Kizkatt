import { useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";

import type { Tool } from "../../model/types";
import {
  ArrowIcon,
  DiamondIcon,
  EllipseIcon,
  EraserIcon,
  FreedrawIcon,
  ImageIcon,
  LineIcon,
  LockedIcon,
  RectangleIcon,
  SelectionIcon,
  SettingsIcon,
  TextIcon,
  handIcon
} from "../icons";
import { DraggablePanel } from "../positioning/DraggablePanel";
import { useGraphicEditorSettings } from "../settings/GraphicEditorSettings";

type ToolbarEntry = {
  icon: ReactNode;
  id: Tool;
  label: string;
  shortcut?: string;
};

type ToolGroup = {
  defaultTool: Tool;
  options: ToolbarEntry[];
};

const TOOL_ENTRIES: Record<Tool, ToolbarEntry> = {
  arrow: { id: "arrow", label: "Arrow", icon: ArrowIcon, shortcut: "5" },
  diamond: { id: "diamond", label: "Diamond", icon: DiamondIcon, shortcut: "3" },
  draw: { id: "draw", label: "Draw", icon: FreedrawIcon, shortcut: "7" },
  ellipse: { id: "ellipse", label: "Ellipse", icon: EllipseIcon, shortcut: "4" },
  eraser: { id: "eraser", label: "Eraser", icon: EraserIcon, shortcut: "0" },
  hand: { id: "hand", label: "Hand", icon: handIcon },
  image: { id: "image", label: "Image", icon: ImageIcon, shortcut: "9" },
  line: { id: "line", label: "Line", icon: LineIcon, shortcut: "6" },
  lock: { id: "lock", label: "Lock", icon: LockedIcon },
  rectangle: {
    id: "rectangle",
    label: "Rectangle",
    icon: RectangleIcon,
    shortcut: "2"
  },
  select: { id: "select", label: "Select", icon: SelectionIcon, shortcut: "1" },
  text: { id: "text", label: "Text", icon: TextIcon, shortcut: "8" }
};

const SHAPE_GROUP: ToolGroup = {
  defaultTool: "rectangle",
  options: [
    TOOL_ENTRIES.rectangle,
    TOOL_ENTRIES.diamond,
    TOOL_ENTRIES.ellipse
  ]
};

const LINE_GROUP: ToolGroup = {
  defaultTool: "arrow",
  options: [TOOL_ENTRIES.arrow, TOOL_ENTRIES.line]
};

const SINGLE_TOOLS: Tool[] = [
  "lock",
  "hand",
  "select",
  "draw",
  "text",
  "image",
  "eraser"
];

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
  onActivateTool
}: {
  active: boolean;
  entry: ToolbarEntry;
  onActivateTool: (tool: Tool) => void;
}) {
  return (
    <button
      type="button"
      className={active ? "is-active" : undefined}
      aria-label={entry.label}
      title={entry.label}
      onClick={() => onActivateTool(entry.id)}
    >
      <span aria-hidden="true">{entry.icon}</span>
      {entry.shortcut && <small>{entry.shortcut}</small>}
    </button>
  );
}

function ToolGroupButton({
  activeTool,
  group,
  onActivateTool
}: {
  activeTool: Tool;
  group: ToolGroup;
  onActivateTool: (tool: Tool) => void;
}) {
  const [open, setOpen] = useState(false);
  const activeEntry = getActiveGroupEntry(group, activeTool);
  const groupActive = group.options.some((entry) => entry.id === activeTool);

  const activateOption = (tool: Tool) => {
    setOpen(false);
    onActivateTool(tool);
  };

  return (
    <div className="kizkatt-toolbar-group">
      <button
        type="button"
        data-no-panel-drag
        className={groupActive ? "is-active" : undefined}
        aria-label={activeEntry.label}
        aria-expanded={open}
        title={activeEntry.label}
        onClick={() => {
          onActivateTool(activeEntry.id);
          setOpen((value) => !value);
        }}
        onPointerDown={(event) => {
          stopPanelDrag(event);
        }}
      >
        <span aria-hidden="true">{activeEntry.icon}</span>
        {activeEntry.shortcut && <small>{activeEntry.shortcut}</small>}
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
              aria-label={entry.label}
              title={entry.label}
              onPointerDown={stopPanelDrag}
              onClick={() => activateOption(entry.id)}
            >
              <span aria-hidden="true">{entry.icon}</span>
              {entry.shortcut && <small>{entry.shortcut}</small>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolbarSettings() {
  const {
    autohideToolbar,
    dragEnabled,
    setAutohideToolbar,
    setDragEnabled,
    setToolbarOrientation,
    toolbarOrientation
  } = useGraphicEditorSettings();
  const [open, setOpen] = useState(false);
  const nextToolbarOrientation =
    toolbarOrientation === "horizontal" ? "vertical" : "horizontal";
  const runSettingAction = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <div className="kizkatt-toolbar-settings">
      <button
        type="button"
        data-no-panel-drag
        aria-label="Toolbar settings"
        aria-expanded={open}
        title="Toolbar settings"
        onPointerDown={stopPanelDrag}
        onClick={() => setOpen((value) => !value)}
      >
        {SettingsIcon}
      </button>
      {open && (
        <div className="kizkatt-toolbar-settings-menu" role="menu">
          <button
            type="button"
            data-no-panel-drag
            role="menuitemcheckbox"
            aria-checked={!dragEnabled}
            onPointerDown={stopPanelDrag}
            onClick={() =>
              runSettingAction(() => setDragEnabled(!dragEnabled))
            }
          >
            <span>{dragEnabled ? "Stick panels" : "Unstick panels"}</span>
          </button>
          <button
            type="button"
            data-no-panel-drag
            role="menuitemcheckbox"
            aria-checked={autohideToolbar}
            onPointerDown={stopPanelDrag}
            onClick={() =>
              runSettingAction(() => setAutohideToolbar(!autohideToolbar))
            }
          >
            <span>
              {autohideToolbar ? "Disable Autohide" : "Enable Autohide"}
            </span>
          </button>
          <button
            type="button"
            data-no-panel-drag
            role="menuitemcheckbox"
            aria-checked={toolbarOrientation === "vertical"}
            onPointerDown={stopPanelDrag}
            onClick={() =>
              runSettingAction(() => setToolbarOrientation(nextToolbarOrientation))
            }
          >
            <span>
              {toolbarOrientation === "horizontal"
                ? "Vertical toolbar"
                : "Horizontal toolbar"}
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

  return (
    <DraggablePanel id="toolbar" topDock>
      <div
        className={[
          "kizkatt-toolbar",
          `kizkatt-toolbar--${toolbarOrientation}`,
          autohideToolbar ? "kizkatt-toolbar--autohide" : ""
        ].join(" ")}
        aria-label="Kizkatt tools"
      >
        {SINGLE_TOOLS.slice(0, 3).map((tool) => (
          <ToolButton
            key={tool}
            active={activeTool === tool}
            entry={TOOL_ENTRIES[tool]}
            onActivateTool={onActivateTool}
          />
        ))}
        <ToolGroupButton
          activeTool={activeTool}
          group={SHAPE_GROUP}
          onActivateTool={onActivateTool}
        />
        <ToolGroupButton
          activeTool={activeTool}
          group={LINE_GROUP}
          onActivateTool={onActivateTool}
        />
        {SINGLE_TOOLS.slice(3).map((tool) => (
          <ToolButton
            key={tool}
            active={activeTool === tool}
            entry={TOOL_ENTRIES[tool]}
            onActivateTool={onActivateTool}
          />
        ))}
        <div className="kizkatt-toolbar-divider" />
        <ToolbarSettings />
      </div>
    </DraggablePanel>
  );
}
