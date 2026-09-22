import { useEffect, useId } from "react";

import { useI18n } from "../../i18n";

export function TextureInfoDialog({
  author,
  from,
  onClose
}: {
  author?: string;
  from?: string;
  onClose: () => void;
}) {
  const { strings } = useI18n();
  const titleId = useId();

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="kizkatt-dialog-backdrop" role="presentation">
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="kizkatt-confirmation-dialog kizkatt-texture-info-dialog"
        role="dialog"
      >
        <h2 id={titleId}>{strings.textureLibrary.information}</h2>
        <dl>
          {author && (
            <div>
              <dt>{strings.textureLibrary.author}</dt>
              <dd>{author}</dd>
            </div>
          )}
          {from && (
            <div>
              <dt>{strings.textureLibrary.from}</dt>
              <dd>
                <a href={from} rel="noreferrer" target="_blank">
                  {from}
                </a>
              </dd>
            </div>
          )}
        </dl>
        <div className="kizkatt-confirmation-dialog-actions">
          <button autoFocus type="button" onClick={onClose}>
            {strings.textureLibrary.closeInformation}
          </button>
        </div>
      </section>
    </div>
  );
}
