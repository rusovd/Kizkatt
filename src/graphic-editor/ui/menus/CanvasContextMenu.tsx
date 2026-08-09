import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  formatKeyboardShortcut,
  getStoredContextMenuDefaults,
  storeContextMenuDefaults
} from "kizkatt-graphic-engine";
import type {
  ContextMenuCopyDefault,
  ContextMenuDefaults,
  ContextMenuPasteDefault,
  ContextMenuSelectionDefault,
  ContextMenuSnappingDefault
} from "kizkatt-graphic-engine";

import type { ContextMenuState, SelectionAreaMode } from "../../model/types";
import { useI18n } from "../../i18n";
import {
  ArrowIcon,
  ChevronRightIcon,
  CodeIcon,
  CopyIcon,
  GroupIcon,
  ImageIcon,
  PasteIcon,
  SelectAllIcon,
  SelectionContainIcon,
  SelectionIcon,
  SnapIcon,
  UngroupIcon,
} from "../icons";

type CanvasContextMenuProps = {
  arrowBinding: boolean;
  canBreakApart: boolean;
  canCopySelection: boolean;
  canGroup: boolean;
  canUngroup: boolean;
  contextMenu: ContextMenuState | null;
  onCloseAndRun: (action: () => void | Promise<void>) => void;
  onBreakApart: () => void;
  onCopy: () => void;
  onCopyPng: () => Promise<void>;
  onCopySvg: () => Promise<void>;
  onGroup: () => void;
  onPaste: () => void | Promise<void>;
  onPasteSvgCode: () => void | Promise<void>;
  onSelectAll: () => void;
  onUngroup: () => void;
  selectionAreaMode: SelectionAreaMode;
  setArrowBinding: (updater: (value: boolean) => boolean) => void;
  setSelectionAreaMode: (mode: SelectionAreaMode) => void;
  setSnapToMidpoints: (updater: (value: boolean) => boolean) => void;
  setSnapToObjects: (updater: (value: boolean) => boolean) => void;
  snapToMidpoints: boolean;
  snapToObjects: boolean;
  viewMode: boolean;
};

type MenuRole = "menuitem" | "menuitemcheckbox" | "menuitemradio";
type SubmenuId = "copy" | "paste" | "selection" | "snapping";

type ContextMenuAction<Id extends string> = {
  checked?: boolean;
  disabled?: boolean;
  icon: ReactNode;
  id: Id;
  label: string;
  role?: MenuRole;
  run: () => void | Promise<void>;
  shortcut?: string;
  title: string;
};

function getPreferredAction<Id extends string>(
  actions: Array<ContextMenuAction<Id>>,
  preferredId: Id
) {
  const preferredAction = actions.find((action) => action.id === preferredId);

  if (preferredAction) {
    return preferredAction;
  }

  const fallbackAction = actions[0];

  if (!fallbackAction) {
    throw new Error("Context menu action group cannot be empty.");
  }

  return fallbackAction;
}

function MenuItemLabel({
  children,
  icon
}: {
  children: ReactNode;
  icon: ReactNode;
}) {
  return (
    <span className="kizkatt-menu-item-label">
      {icon}
      <span>{children}</span>
    </span>
  );
}

function CheckMark({ checked }: { checked?: boolean }) {
  return (
    <span className="kizkatt-context-check" aria-hidden="true">
      {checked ? "✓" : ""}
    </span>
  );
}

function MenuButton({
  checked,
  children,
  disabled,
  icon,
  onClick,
  role = "menuitem",
  shortcut,
  title
}: {
  checked?: boolean;
  children: ReactNode;
  disabled?: boolean;
  icon: ReactNode;
  onClick: () => void;
  role?: MenuRole;
  shortcut?: string;
  title: string;
}) {
  const ariaChecked =
    role === "menuitemcheckbox" || role === "menuitemradio"
      ? checked
      : undefined;
  const showTrailing = role !== "menuitem" || Boolean(shortcut);

  return (
    <button
      type="button"
      role={role}
      aria-checked={ariaChecked}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      <MenuItemLabel icon={icon}>{children}</MenuItemLabel>
      {showTrailing && (
        <span className="kizkatt-context-menu-trailing">
          {role === "menuitem" ? null : <CheckMark checked={checked} />}
          {shortcut && <kbd>{shortcut}</kbd>}
        </span>
      )}
    </button>
  );
}

function SubmenuMenuItem<Id extends string>({
  children,
  openSubmenu,
  onPrimaryClick,
  primaryAction,
  setOpenSubmenu,
  submenuId
}: {
  children: ReactNode;
  onPrimaryClick: () => void;
  openSubmenu: SubmenuId | null;
  primaryAction: ContextMenuAction<Id>;
  setOpenSubmenu: (submenuId: SubmenuId | null) => void;
  submenuId: SubmenuId;
}) {
  const open = openSubmenu === submenuId;
  const role = primaryAction.role ?? "menuitem";
  const ariaChecked =
    role === "menuitemcheckbox" || role === "menuitemradio"
      ? primaryAction.checked
      : undefined;

  return (
    <div
      className="kizkatt-context-menu-submenu-item"
      role="none"
      onBlur={(event) => {
        const nextFocusTarget = event.relatedTarget;

        if (
          !(nextFocusTarget instanceof Node) ||
          !event.currentTarget.contains(nextFocusTarget)
        ) {
          setOpenSubmenu(null);
        }
      }}
      onFocus={() => setOpenSubmenu(submenuId)}
      onMouseEnter={() => setOpenSubmenu(submenuId)}
    >
      <button
        type="button"
        role={role}
        aria-checked={ariaChecked}
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={primaryAction.disabled}
        title={primaryAction.title}
        onClick={onPrimaryClick}
      >
        <MenuItemLabel icon={primaryAction.icon}>
          {primaryAction.label}
        </MenuItemLabel>
        <span className="kizkatt-context-menu-trailing">
          {role === "menuitem" ? null : (
            <CheckMark checked={primaryAction.checked} />
          )}
          {primaryAction.shortcut && <kbd>{primaryAction.shortcut}</kbd>}
          <span className="kizkatt-context-submenu-chevron" aria-hidden="true">
            {ChevronRightIcon}
          </span>
        </span>
      </button>
      {open && (
        <div className="kizkatt-context-submenu" role="menu">
          {children}
        </div>
      )}
    </div>
  );
}

export function CanvasContextMenu({
  arrowBinding,
  canBreakApart,
  canCopySelection,
  canGroup,
  canUngroup,
  contextMenu,
  onCloseAndRun,
  onBreakApart,
  onCopy,
  onCopyPng,
  onCopySvg,
  onGroup,
  onPaste,
  onPasteSvgCode,
  onSelectAll,
  onUngroup,
  selectionAreaMode,
  setArrowBinding,
  setSelectionAreaMode,
  setSnapToMidpoints,
  setSnapToObjects,
  snapToMidpoints,
  snapToObjects,
  viewMode
}: CanvasContextMenuProps) {
  const [openSubmenu, setOpenSubmenu] = useState<SubmenuId | null>(null);
  const [menuDefaults, setMenuDefaults] = useState(
    getStoredContextMenuDefaults
  );
  const { strings } = useI18n();
  const tooltips = strings.contextMenu.tooltips;

  const setMenuDefault = <Key extends keyof ContextMenuDefaults>(
    key: Key,
    value: ContextMenuDefaults[Key]
  ) => {
    setMenuDefaults((previousDefaults) => {
      const nextDefaults: ContextMenuDefaults = {
        ...previousDefaults,
        [key]: value
      };

      storeContextMenuDefaults(nextDefaults);
      return nextDefaults;
    });
  };

  useEffect(() => {
    setOpenSubmenu(null);
  }, [contextMenu?.x, contextMenu?.y]);

  const copyShortcut = formatKeyboardShortcut("c");
  const pasteShortcut = formatKeyboardShortcut("v");
  const selectAllShortcut = formatKeyboardShortcut("a");

  const pasteActions: Array<ContextMenuAction<ContextMenuPasteDefault>> = [
    {
      icon: PasteIcon,
      id: "clipboard",
      label: strings.contextMenu.paste,
      run: onPaste,
      shortcut: pasteShortcut,
      title: tooltips.paste
    },
    {
      icon: CodeIcon,
      id: "svgCode",
      label: strings.contextMenu.pasteSvgCode,
      run: onPasteSvgCode,
      title: tooltips.pasteSvgCode
    }
  ];
  const copyActions: Array<ContextMenuAction<ContextMenuCopyDefault>> = [
    {
      disabled: !canCopySelection,
      icon: CopyIcon,
      id: "selection",
      label: strings.contextMenu.copy,
      run: onCopy,
      shortcut: copyShortcut,
      title: tooltips.copy
    },
    {
      disabled: !canCopySelection,
      icon: ImageIcon,
      id: "png",
      label: strings.contextMenu.copyPng,
      run: onCopyPng,
      title: tooltips.copyPng
    },
    {
      disabled: !canCopySelection,
      icon: CodeIcon,
      id: "svg",
      label: strings.contextMenu.copySvg,
      run: onCopySvg,
      title: tooltips.copySvg
    }
  ];
  const selectionActions: Array<ContextMenuAction<ContextMenuSelectionDefault>> = [
    {
      checked: selectionAreaMode === "intersect",
      icon: SelectionIcon,
      id: "intersect",
      label: strings.contextMenu.selectTouching,
      role: "menuitemradio",
      run: () => setSelectionAreaMode("intersect"),
      title: tooltips.selectTouching
    },
    {
      checked: selectionAreaMode === "contain",
      icon: SelectionContainIcon,
      id: "contain",
      label: strings.contextMenu.selectEnclosed,
      role: "menuitemradio",
      run: () => setSelectionAreaMode("contain"),
      title: tooltips.selectEnclosed
    }
  ];
  const snappingActions: Array<ContextMenuAction<ContextMenuSnappingDefault>> = [
    {
      checked: snapToObjects,
      icon: SelectionContainIcon,
      id: "snapToObjects",
      label: strings.contextMenu.snapToObjects,
      role: "menuitemcheckbox",
      run: () => setSnapToObjects((value) => !value),
      title: tooltips.snapToObjects
    },
    {
      checked: arrowBinding,
      icon: ArrowIcon,
      id: "arrowBinding",
      label: strings.contextMenu.arrowBinding,
      role: "menuitemcheckbox",
      run: () => setArrowBinding((value) => !value),
      title: tooltips.arrowBinding
    },
    {
      checked: snapToMidpoints,
      icon: SnapIcon,
      id: "snapToMidpoints",
      label: strings.contextMenu.snapToMidpoints,
      role: "menuitemcheckbox",
      run: () => setSnapToMidpoints((value) => !value),
      title: tooltips.snapToMidpoints
    }
  ];
  const pastePrimaryAction = getPreferredAction(
    pasteActions,
    menuDefaults.paste
  );
  const copyPrimaryAction = getPreferredAction(copyActions, menuDefaults.copy);
  const selectionPrimaryAction = getPreferredAction(
    selectionActions,
    menuDefaults.selection
  );
  const snappingPrimaryAction = getPreferredAction(
    snappingActions,
    menuDefaults.snapping
  );

  if (!contextMenu) {
    return null;
  }

  return (
    <div
      className="kizkatt-context-menu"
      role="menu"
      aria-label={strings.contextMenu.ariaLabel}
      style={{
        left: contextMenu.x,
        top: contextMenu.y
      }}
    >
      {!viewMode && (
        <>
          <SubmenuMenuItem
            openSubmenu={openSubmenu}
            primaryAction={pastePrimaryAction}
            setOpenSubmenu={setOpenSubmenu}
            submenuId="paste"
            onPrimaryClick={() => onCloseAndRun(pastePrimaryAction.run)}
          >
            {pasteActions.map((action) => (
              <MenuButton
                icon={action.icon}
                key={action.id}
                shortcut={action.shortcut}
                title={action.title}
                onClick={() => {
                  setMenuDefault("paste", action.id);
                  onCloseAndRun(action.run);
                }}
              >
                {action.label}
              </MenuButton>
            ))}
          </SubmenuMenuItem>
          <div className="kizkatt-context-divider" />
        </>
      )}
      <SubmenuMenuItem
        openSubmenu={openSubmenu}
        primaryAction={copyPrimaryAction}
        setOpenSubmenu={setOpenSubmenu}
        submenuId="copy"
        onPrimaryClick={() => onCloseAndRun(copyPrimaryAction.run)}
      >
        {copyActions.map((action) => (
          <MenuButton
            disabled={action.disabled}
            icon={action.icon}
            key={action.id}
            shortcut={action.shortcut}
            title={action.title}
            onClick={() => {
              setMenuDefault("copy", action.id);
              onCloseAndRun(action.run);
            }}
          >
            {action.label}
          </MenuButton>
        ))}
      </SubmenuMenuItem>
      <div className="kizkatt-context-divider" />
      <MenuButton
        icon={SelectAllIcon}
        title={tooltips.selectAll}
        shortcut={selectAllShortcut}
        onClick={() => onCloseAndRun(onSelectAll)}
      >
        {strings.contextMenu.selectAll}
      </MenuButton>
      <SubmenuMenuItem
        openSubmenu={openSubmenu}
        primaryAction={selectionPrimaryAction}
        setOpenSubmenu={setOpenSubmenu}
        submenuId="selection"
        onPrimaryClick={() => onCloseAndRun(selectionPrimaryAction.run)}
      >
        {selectionActions.map((action) => (
          <MenuButton
            checked={action.checked}
            icon={action.icon}
            key={action.id}
            role={action.role}
            title={action.title}
            onClick={() => {
              setMenuDefault("selection", action.id);
              onCloseAndRun(action.run);
            }}
          >
            {action.label}
          </MenuButton>
        ))}
      </SubmenuMenuItem>
      {!viewMode && (canGroup || canUngroup || canBreakApart) && (
        <>
          <div className="kizkatt-context-divider" />
          {canBreakApart && (
            <MenuButton
              icon={UngroupIcon}
              title={tooltips.breakApart}
              onClick={() => onCloseAndRun(onBreakApart)}
            >
              {strings.contextMenu.breakApart}
            </MenuButton>
          )}
          {canGroup && (
            <MenuButton
              icon={GroupIcon}
              title={tooltips.group}
              onClick={() => onCloseAndRun(onGroup)}
            >
              {strings.contextMenu.group}
            </MenuButton>
          )}
          {canUngroup && (
            <MenuButton
              icon={UngroupIcon}
              title={tooltips.ungroup}
              onClick={() => onCloseAndRun(onUngroup)}
            >
              {strings.contextMenu.ungroup}
            </MenuButton>
          )}
        </>
      )}
      <div className="kizkatt-context-divider" />
      <SubmenuMenuItem
        openSubmenu={openSubmenu}
        primaryAction={snappingPrimaryAction}
        setOpenSubmenu={setOpenSubmenu}
        submenuId="snapping"
        onPrimaryClick={() => onCloseAndRun(snappingPrimaryAction.run)}
      >
        {snappingActions.map((action) => (
          <MenuButton
            checked={action.checked}
            icon={action.icon}
            key={action.id}
            role={action.role}
            title={action.title}
            onClick={() => {
              setMenuDefault("snapping", action.id);
              onCloseAndRun(action.run);
            }}
          >
            {action.label}
          </MenuButton>
        ))}
      </SubmenuMenuItem>
    </div>
  );
}
