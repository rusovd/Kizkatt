import type { ContextMenuState } from "../../model/types";
import { useI18n } from "../../i18n";

type CanvasContextMenuProps = {
  arrowBinding: boolean;
  canGroup: boolean;
  canUngroup: boolean;
  contextMenu: ContextMenuState | null;
  onCloseAndRun: (action: () => void | Promise<void>) => void;
  onCopyPng: () => Promise<void>;
  onCopySvg: () => Promise<void>;
  onGroup: () => void;
  onPaste: () => void;
  onSelectAll: () => void;
  onUngroup: () => void;
  setArrowBinding: (updater: (value: boolean) => boolean) => void;
  setShowGrid: (updater: (value: boolean) => boolean) => void;
  setSnapToMidpoints: (updater: (value: boolean) => boolean) => void;
  setSnapToObjects: (updater: (value: boolean) => boolean) => void;
  setViewMode: (updater: (value: boolean) => boolean) => void;
  setZenMode: (updater: (value: boolean) => boolean) => void;
  showGrid: boolean;
  snapToMidpoints: boolean;
  snapToObjects: boolean;
  viewMode: boolean;
  zenMode: boolean;
};

export function CanvasContextMenu({
  arrowBinding,
  canGroup,
  canUngroup,
  contextMenu,
  onCloseAndRun,
  onCopyPng,
  onCopySvg,
  onGroup,
  onPaste,
  onSelectAll,
  onUngroup,
  setArrowBinding,
  setShowGrid,
  setSnapToMidpoints,
  setSnapToObjects,
  setViewMode,
  setZenMode,
  showGrid,
  snapToMidpoints,
  snapToObjects,
  viewMode,
  zenMode
}: CanvasContextMenuProps) {
  const { strings } = useI18n();
  const tooltips = strings.contextMenu.tooltips;

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
      <button
        type="button"
        role="menuitem"
        title={tooltips.paste}
        onClick={() => onCloseAndRun(onPaste)}
      >
        <span>{strings.contextMenu.paste}</span>
        <kbd>Ctrl+V</kbd>
      </button>
      <div className="kizkatt-context-divider" />
      <button
        type="button"
        role="menuitem"
        title={tooltips.copyPng}
        onClick={() => onCloseAndRun(onCopyPng)}
      >
        <span>{strings.contextMenu.copyPng}</span>
      </button>
      <button
        type="button"
        role="menuitem"
        title={tooltips.copySvg}
        onClick={() => onCloseAndRun(onCopySvg)}
      >
        <span>{strings.contextMenu.copySvg}</span>
      </button>
      <div className="kizkatt-context-divider" />
      <button
        type="button"
        role="menuitem"
        title={tooltips.selectAll}
        onClick={() => onCloseAndRun(onSelectAll)}
      >
        <span>{strings.contextMenu.selectAll}</span>
        <kbd>Ctrl+A</kbd>
      </button>
      {(canGroup || canUngroup) && (
        <>
          <div className="kizkatt-context-divider" />
          {canGroup && (
            <button
              type="button"
              role="menuitem"
              title={tooltips.group}
              onClick={() => onCloseAndRun(onGroup)}
            >
              <span>{strings.contextMenu.group}</span>
            </button>
          )}
          {canUngroup && (
            <button
              type="button"
              role="menuitem"
              title={tooltips.ungroup}
              onClick={() => onCloseAndRun(onUngroup)}
            >
              <span>{strings.contextMenu.ungroup}</span>
            </button>
          )}
        </>
      )}
      <div className="kizkatt-context-divider" />
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={showGrid}
        title={tooltips.toggleGrid}
        onClick={() => onCloseAndRun(() => setShowGrid((value) => !value))}
      >
        <span>
          {showGrid ? "✓ " : ""}
          {strings.contextMenu.toggleGrid}
        </span>
      </button>
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={snapToObjects}
        title={tooltips.snapToObjects}
        onClick={() => onCloseAndRun(() => setSnapToObjects((value) => !value))}
      >
        <span>
          {snapToObjects ? "✓ " : ""}
          {strings.contextMenu.snapToObjects}
        </span>
      </button>
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={arrowBinding}
        title={tooltips.arrowBinding}
        onClick={() => onCloseAndRun(() => setArrowBinding((value) => !value))}
      >
        <span>
          {arrowBinding ? "✓ " : ""}
          {strings.contextMenu.arrowBinding}
        </span>
      </button>
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={snapToMidpoints}
        title={tooltips.snapToMidpoints}
        onClick={() => onCloseAndRun(() => setSnapToMidpoints((value) => !value))}
      >
        <span>
          {snapToMidpoints ? "✓ " : ""}
          {strings.contextMenu.snapToMidpoints}
        </span>
      </button>
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={zenMode}
        title={tooltips.zenMode}
        onClick={() => onCloseAndRun(() => setZenMode((value) => !value))}
      >
        <span>
          {zenMode ? "✓ " : ""}
          {strings.contextMenu.zenMode}
        </span>
      </button>
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={viewMode}
        title={tooltips.viewMode}
        onClick={() => onCloseAndRun(() => setViewMode((value) => !value))}
      >
        <span>
          {viewMode ? "✓ " : ""}
          {strings.contextMenu.viewMode}
        </span>
      </button>
    </div>
  );
}
