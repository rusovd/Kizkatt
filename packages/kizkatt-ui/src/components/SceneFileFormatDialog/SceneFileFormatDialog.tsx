import type {
  DocumentFileFormat,
  DocumentFormatDialogAction
} from "../../contracts/editorView";
import { useI18n } from "../../i18n";

export function SceneFileFormatDialog({
  action,
  onCancel,
  onChoose
}: {
  action: DocumentFormatDialogAction;
  onCancel: () => void;
  onChoose: (format: DocumentFileFormat) => void;
}) {
  const { strings } = useI18n();
  const title = action === "saveAs"
    ? strings.sceneFiles.saveAsFormatTitle
    : action === "import"
      ? strings.sceneFiles.importFormatTitle
      : strings.sceneFiles.exportFormatTitle;

  return (
    <div className="kizkatt-dialog-backdrop" role="presentation">
      <section
        aria-labelledby="kizkatt-file-format-dialog-title"
        aria-modal="true"
        className="kizkatt-confirmation-dialog kizkatt-file-format-dialog"
        role="dialog"
      >
        <h2 id="kizkatt-file-format-dialog-title">{title}</h2>
        <div className="kizkatt-file-format-options">
          <button type="button" onClick={() => onChoose("kk")}>
            <strong>KK</strong>
            <span>{strings.sceneFiles.kizkattFormat}</span>
          </button>
          <button type="button" onClick={() => onChoose("svg")}>
            <strong>SVG</strong>
            <span>{strings.sceneFiles.svgFormat}</span>
          </button>
        </div>
        <div className="kizkatt-confirmation-dialog-actions">
          <button type="button" onClick={onCancel}>
            {strings.sceneFiles.cancel}
          </button>
        </div>
      </section>
    </div>
  );
}
