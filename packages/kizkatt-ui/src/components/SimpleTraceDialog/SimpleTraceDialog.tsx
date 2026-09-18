import { useEffect, useState } from "react";

import type {
  SimpleTraceImagePreset,
  SimpleTraceResult,
  SimpleTraceSettings
} from "kizkatt-graphic-engine";

import { CloseIcon } from "../../ui/icons";
import { useI18n } from "../../i18n";

type SimpleTraceTab = "adjustments" | "colors" | "settings";

function TraceRange({
  disabled = false,
  label,
  maximum,
  minimum,
  onChange,
  value
}: {
  disabled?: boolean;
  label: string;
  maximum: number;
  minimum: number;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="kizkatt-simple-trace-range">
      <span>{label}</span>
      <input
        disabled={disabled}
        max={maximum}
        min={minimum}
        onChange={(event) => onChange(Number(event.target.value))}
        type="range"
        value={value}
      />
      <output>{value}</output>
    </label>
  );
}

function TraceCheckbox({
  checked,
  children,
  onChange
}: {
  checked: boolean;
  children: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="kizkatt-simple-trace-checkbox">
      <input
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        type="checkbox"
      />
      <span>{children}</span>
    </label>
  );
}

export function SimpleTraceDialog({
  deleteOriginal,
  error,
  imageName,
  imageSource,
  onApply,
  onCancel,
  onDeleteOriginalChange,
  onReset,
  onSettingsChange,
  processing,
  result,
  settings
}: {
  deleteOriginal: boolean;
  error?: string | null;
  imageName: string;
  imageSource: string;
  onApply: () => void;
  onCancel: () => void;
  onDeleteOriginalChange: (value: boolean) => void;
  onReset: () => void;
  onSettingsChange: (settings: SimpleTraceSettings) => void;
  processing: boolean;
  result: SimpleTraceResult | null;
  settings: SimpleTraceSettings;
}) {
  const { strings } = useI18n();
  const [activeTab, setActiveTab] = useState<SimpleTraceTab>("settings");

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onCancel]);

  const updateSettings = (patch: Partial<SimpleTraceSettings>) =>
    onSettingsChange({ ...settings, ...patch });
  const traceStrings = strings.simpleTrace;
  const presetOptions: Array<[SimpleTraceImagePreset, string]> = [
    ["lineArt", traceStrings.lineArt],
    ["logo", traceStrings.logo],
    ["detailedLogo", traceStrings.detailedLogo],
    ["clipart", traceStrings.clipart],
    ["lowQuality", traceStrings.lowQuality],
    ["highQuality", traceStrings.highQuality]
  ];

  return (
    <div className="kizkatt-dialog-backdrop" role="presentation">
      <section
        aria-labelledby="kizkatt-simple-trace-title"
        aria-modal="true"
        className="kizkatt-simple-trace-dialog"
        role="dialog"
      >
        <header>
          <div>
            <h2 id="kizkatt-simple-trace-title">{traceStrings.title}</h2>
            <span>{imageName}</span>
          </div>
          <button
            aria-label={traceStrings.cancel}
            className="kizkatt-simple-trace-close"
            onClick={onCancel}
            type="button"
          >
            {CloseIcon}
          </button>
        </header>

        <div className="kizkatt-simple-trace-body">
          <div className="kizkatt-simple-trace-previews">
            <figure>
              <figcaption>{traceStrings.original}</figcaption>
              <div className="kizkatt-simple-trace-preview">
                <img alt="" src={imageSource} />
              </div>
            </figure>
            <figure>
              <figcaption>{traceStrings.result}</figcaption>
              <div className="kizkatt-simple-trace-preview is-result">
                {result ? (
                  <svg
                    aria-label={traceStrings.result}
                    preserveAspectRatio="xMidYMid meet"
                    role="img"
                    viewBox={`0 0 ${result.width} ${result.height}`}
                    dangerouslySetInnerHTML={{ __html: result.svgContent }}
                  />
                ) : (
                  <span>{processing ? traceStrings.processing : traceStrings.noPreview}</span>
                )}
              </div>
            </figure>
          </div>

          <aside className="kizkatt-simple-trace-controls">
            <nav aria-label={traceStrings.options}>
              {(["settings", "colors", "adjustments"] as const).map((tab) => (
                <button
                  className={activeTab === tab ? "is-active" : undefined}
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  type="button"
                >
                  {traceStrings[tab]}
                </button>
              ))}
            </nav>

            <div className="kizkatt-simple-trace-tab">
              {activeTab === "settings" && (
                <>
                  <label className="kizkatt-simple-trace-select">
                    <span>{traceStrings.imageType}</span>
                    <select
                      onChange={(event) =>
                        updateSettings({
                          imagePreset: event.target.value as SimpleTraceImagePreset
                        })
                      }
                      value={settings.imagePreset}
                    >
                      {presetOptions.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <TraceRange
                    label={traceStrings.detail}
                    maximum={100}
                    minimum={0}
                    onChange={(detail) => updateSettings({ detail })}
                    value={settings.detail}
                  />
                  <TraceRange
                    label={traceStrings.smoothing}
                    maximum={100}
                    minimum={0}
                    onChange={(smoothing) => updateSettings({ smoothing })}
                    value={settings.smoothing}
                  />
                  <TraceRange
                    label={traceStrings.cornerSmoothing}
                    maximum={100}
                    minimum={0}
                    onChange={(cornerSmoothing) =>
                      updateSettings({ cornerSmoothing })
                    }
                    value={settings.cornerSmoothing}
                  />
                  <hr />
                  <TraceCheckbox
                    checked={settings.mergeAdjacent}
                    onChange={(mergeAdjacent) => updateSettings({ mergeAdjacent })}
                  >
                    {traceStrings.mergeAdjacent}
                  </TraceCheckbox>
                  <TraceCheckbox
                    checked={settings.removeOverlap}
                    onChange={(removeOverlap) => updateSettings({ removeOverlap })}
                  >
                    {traceStrings.removeOverlap}
                  </TraceCheckbox>
                  <TraceCheckbox
                    checked={settings.groupByColor}
                    onChange={(groupByColor) => updateSettings({ groupByColor })}
                  >
                    {traceStrings.groupByColor}
                  </TraceCheckbox>
                </>
              )}

              {activeTab === "colors" && (
                <>
                  <TraceRange
                    label={traceStrings.colorsCount}
                    maximum={24}
                    minimum={2}
                    onChange={(colorCount) => updateSettings({ colorCount })}
                    value={settings.colorCount}
                  />
                  <label className="kizkatt-simple-trace-select">
                    <span>{traceStrings.remove}</span>
                    <select
                      onChange={(event) =>
                        updateSettings({
                          backgroundRemoval: event.target.value as SimpleTraceSettings["backgroundRemoval"]
                        })
                      }
                      value={settings.backgroundRemoval}
                    >
                      <option value="none">{traceStrings.removeNothing}</option>
                      <option value="automatic">{traceStrings.automatic}</option>
                      <option value="color">{traceStrings.specify}</option>
                    </select>
                  </label>
                  {settings.backgroundRemoval === "color" && (
                    <label className="kizkatt-simple-trace-color">
                      <span>{traceStrings.backgroundColor}</span>
                      <input
                        onChange={(event) =>
                          updateSettings({ backgroundColor: event.target.value })
                        }
                        type="color"
                        value={settings.backgroundColor}
                      />
                      <code>{settings.backgroundColor}</code>
                    </label>
                  )}
                  <TraceRange
                    disabled={settings.backgroundRemoval === "none"}
                    label={traceStrings.tolerance}
                    maximum={255}
                    minimum={0}
                    onChange={(backgroundTolerance) =>
                      updateSettings({ backgroundTolerance })
                    }
                    value={settings.backgroundTolerance}
                  />
                </>
              )}

              {activeTab === "adjustments" && (
                <div className="kizkatt-simple-trace-adjustments">
                  <p>{traceStrings.adjustmentsHint}</p>
                  <TraceRange
                    label={traceStrings.detail}
                    maximum={100}
                    minimum={0}
                    onChange={(detail) => updateSettings({ detail })}
                    value={settings.detail}
                  />
                  <TraceRange
                    label={traceStrings.smoothing}
                    maximum={100}
                    minimum={0}
                    onChange={(smoothing) => updateSettings({ smoothing })}
                    value={settings.smoothing}
                  />
                </div>
              )}
            </div>
          </aside>
        </div>

        <footer>
          <div className="kizkatt-simple-trace-stats">
            <span>{traceStrings.curves}: {result?.pathCount ?? 0}</span>
            <span>{traceStrings.nodes}: {result?.nodeCount ?? 0}</span>
            <span>{traceStrings.colorsCount}: {result?.colorCount ?? 0}</span>
            {processing && <span>{traceStrings.processing}</span>}
            {error && <span className="is-error">{error}</span>}
          </div>
          <div className="kizkatt-simple-trace-actions">
            <TraceCheckbox
              checked={deleteOriginal}
              onChange={onDeleteOriginalChange}
            >
              {traceStrings.deleteOriginal}
            </TraceCheckbox>
            <button onClick={onReset} type="button">{traceStrings.reset}</button>
            <button onClick={onCancel} type="button">{traceStrings.cancel}</button>
            <button
              className="is-primary"
              disabled={!result || result.nodeCount === 0 || processing || Boolean(error)}
              onClick={onApply}
              type="button"
            >
              {traceStrings.trace}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
