import type { ContextMenuState } from "../../model/types";

type CanvasContextMenuProps = {
  arrowBinding: boolean;
  contextMenu: ContextMenuState | null;
  onCloseAndRun: (action: () => void | Promise<void>) => void;
  onCopyPng: () => Promise<void>;
  onCopySvg: () => Promise<void>;
  onPaste: () => void;
  onSelectAll: () => void;
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
  contextMenu,
  onCloseAndRun,
  onCopyPng,
  onCopySvg,
  onPaste,
  onSelectAll,
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
  if (!contextMenu) {
    return null;
  }

  return (
    <div
      className="kizkatt-context-menu"
      role="menu"
      aria-label="Canvas context menu"
      style={{
        left: contextMenu.x,
        top: contextMenu.y
      }}
    >
      <button type="button" role="menuitem" onClick={() => onCloseAndRun(onPaste)}>
        <span>Paste</span>
        <kbd>Ctrl+V</kbd>
      </button>
      <div className="kizkatt-context-divider" />
      <button type="button" role="menuitem" onClick={() => onCloseAndRun(onCopyPng)}>
        <span>Copy to clipboard as PNG</span>
      </button>
      <button type="button" role="menuitem" onClick={() => onCloseAndRun(onCopySvg)}>
        <span>Copy to clipboard as SVG</span>
      </button>
      <div className="kizkatt-context-divider" />
      <button type="button" role="menuitem" onClick={() => onCloseAndRun(onSelectAll)}>
        <span>Select all</span>
        <kbd>Ctrl+A</kbd>
      </button>
      <div className="kizkatt-context-divider" />
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={showGrid}
        onClick={() => onCloseAndRun(() => setShowGrid((value) => !value))}
      >
        <span>{showGrid ? "✓ " : ""}Toggle grid</span>
      </button>
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={snapToObjects}
        onClick={() => onCloseAndRun(() => setSnapToObjects((value) => !value))}
      >
        <span>{snapToObjects ? "✓ " : ""}Snap to objects</span>
      </button>
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={arrowBinding}
        onClick={() => onCloseAndRun(() => setArrowBinding((value) => !value))}
      >
        <span>{arrowBinding ? "✓ " : ""}Arrow binding</span>
      </button>
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={snapToMidpoints}
        onClick={() => onCloseAndRun(() => setSnapToMidpoints((value) => !value))}
      >
        <span>{snapToMidpoints ? "✓ " : ""}Snap to midpoints</span>
      </button>
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={zenMode}
        onClick={() => onCloseAndRun(() => setZenMode((value) => !value))}
      >
        <span>{zenMode ? "✓ " : ""}Zen mode</span>
      </button>
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={viewMode}
        onClick={() => onCloseAndRun(() => setViewMode((value) => !value))}
      >
        <span>{viewMode ? "✓ " : ""}View mode</span>
      </button>
    </div>
  );
}
