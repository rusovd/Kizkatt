import { useI18n } from "../../i18n";

export function SceneLoadConfirmationDialog({
  action,
  onCancel,
  onDiscard,
  onSave
}: {
  action: "load" | "new";
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  const { strings } = useI18n();
  const isNewScene = action === "new";

  return (
    <div className="kizkatt-dialog-backdrop" role="presentation">
      <section
        aria-describedby="kizkatt-load-confirmation-description"
        aria-labelledby="kizkatt-load-confirmation-title"
        aria-modal="true"
        className="kizkatt-confirmation-dialog"
        role="dialog"
      >
        <h2 id="kizkatt-load-confirmation-title">
          {strings.sceneFiles.confirmLoadTitle}
        </h2>
        <p id="kizkatt-load-confirmation-description">
          {isNewScene
            ? strings.sceneFiles.confirmNewDescription
            : strings.sceneFiles.confirmLoadDescription}
        </p>
        <div className="kizkatt-confirmation-dialog-actions">
          <button type="button" onClick={onCancel}>
            {strings.sceneFiles.cancel}
          </button>
          <button type="button" onClick={onDiscard}>
            {isNewScene
              ? strings.sceneFiles.newWithoutSaving
              : strings.sceneFiles.loadWithoutSaving}
          </button>
          <button className="is-primary" type="button" onClick={onSave}>
            {isNewScene
              ? strings.sceneFiles.saveAndNew
              : strings.sceneFiles.saveAndLoad}
          </button>
        </div>
      </section>
    </div>
  );
}
