import { RedoIcon, UndoIcon } from "../icons";
import { DraggablePanel } from "../positioning/DraggablePanel";

export function FooterControls({
  canRedo,
  canUndo,
  onRedo,
  onUndo,
  onZoomIn,
  onZoomOut,
  zoom
}: {
  canRedo: boolean;
  canUndo: boolean;
  onRedo: () => void;
  onUndo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  zoom: number;
}) {
  return (
    <>
      <DraggablePanel id="zoom-controls" topDock>
        <div className="kizkatt-zoom-controls" aria-label="Zoom controls">
          <button type="button" aria-label="Zoom out" onClick={onZoomOut}>
            −
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in" onClick={onZoomIn}>
            +
          </button>
        </div>
      </DraggablePanel>

      <DraggablePanel id="history-controls" topDock>
        <div className="kizkatt-history-controls" aria-label="History controls">
          <button type="button" aria-label="Undo" onClick={onUndo} disabled={!canUndo}>
            {UndoIcon}
          </button>
          <button type="button" aria-label="Redo" onClick={onRedo} disabled={!canRedo}>
            {RedoIcon}
          </button>
        </div>
      </DraggablePanel>
    </>
  );
}
