import { RedoIcon, UndoIcon } from "../icons";
import { DraggablePanel } from "../positioning/DraggablePanel";
import { useI18n } from "../../i18n";
import {
  PERCENT_MAX_VALUE,
  ZOOM_IN_SYMBOL,
  ZOOM_OUT_SYMBOL
} from "../../config/constants";

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
  const { strings } = useI18n();

  return (
    <>
      <DraggablePanel id="zoom-controls" topDock>
        <div
          className="kizkatt-zoom-controls"
          aria-label={strings.footer.zoomControls}
        >
          <button
            type="button"
            aria-label={strings.footer.zoomOut}
            title={strings.footer.tooltips.zoomOut}
            onClick={onZoomOut}
          >
            {ZOOM_OUT_SYMBOL}
          </button>
          <span>{Math.round(zoom * PERCENT_MAX_VALUE)}%</span>
          <button
            type="button"
            aria-label={strings.footer.zoomIn}
            title={strings.footer.tooltips.zoomIn}
            onClick={onZoomIn}
          >
            {ZOOM_IN_SYMBOL}
          </button>
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
