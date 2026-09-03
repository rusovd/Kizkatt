import { useRef, useState } from "react";
import {
  addGradientStop,
  removeGradientStop,
  reverseGradientStops,
  updateGradientStop,
  type GradientFill,
  type GradientSpread,
  type GradientType
} from "kizkatt-graphic-engine";
import {
  getGradientCssPreview,
  useGradientFillDraft
} from "kizkatt-graphic-editor";

import { useI18n } from "../../i18n";
import { ChevronDownIcon, ResetIcon, TrashIcon } from "../icons";
import { DraggablePanel } from "../positioning/DraggablePanel";

const PANEL_ID = "gradient-fill";
const TYPE_OPTIONS: GradientType[] = ["linear", "radial", "conic", "diamond"];
const SPREAD_OPTIONS: GradientSpread[] = ["pad", "reflect", "repeat"];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function NumericField({
  label,
  max,
  min,
  onChange,
  onCommit,
  suffix,
  value
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  onCommit: () => void;
  suffix?: string;
  value: number;
}) {
  return (
    <label className="kizkatt-gradient-number">
      <span>{label}</span>
      <input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        value={Number(value.toFixed(2))}
        onBlur={onCommit}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          if (Number.isFinite(parsed)) onChange(clamp(parsed, min, max));
        }}
      />
      {suffix && <small>{suffix}</small>}
    </label>
  );
}

export function GradientFillPanel({
  gradient: gradientValue,
  onChange,
  onChangeEnd,
  onClose,
  onOpenLibrary,
  onSavePreset,
  reopenKey
}: {
  gradient?: GradientFill;
  onChange: (gradient: GradientFill, options?: { transient?: boolean }) => void;
  onChangeEnd: () => void;
  onClose: () => void;
  onOpenLibrary: () => void;
  onSavePreset: (gradient: GradientFill) => void;
  reopenKey: number;
}) {
  const { strings } = useI18n();
  const labels = strings.gradientFill;
  const stopTrackRef = useRef<HTMLDivElement | null>(null);
  const { commit, gradient, replace, update } = useGradientFillDraft({
    onCommit: onChangeEnd,
    onPreview: onChange,
    reopenKey,
    value: gradientValue
  });
  const [selectedStopId, setSelectedStopId] = useState(
    gradient.stops[0]?.id ?? ""
  );
  const selectedStop =
    gradient.stops.find((stop) => stop.id === selectedStopId) ??
    gradient.stops[0];

  const addStopAtClientX = (clientX: number) => {
    const bounds = stopTrackRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const position = clamp(((clientX - bounds.left) / bounds.width) * 100, 0, 100);
    const result = addGradientStop(gradient, position);
    setSelectedStopId(result.stopId);
    replace(result.gradient);
    commit();
  };
  const updateSelectedStop = (
    patch: Parameters<typeof updateGradientStop>[2],
    finalize = false
  ) => {
    if (!selectedStop) return;
    replace(updateGradientStop(gradient, selectedStop.id, patch));
    if (finalize) commit();
  };

  return (
    <DraggablePanel
      id={PANEL_ID}
      closable
      defaultOrientation="vertical"
      minSize={{ height: 600, width: 700 }}
      onClose={onClose}
      orientationChangeable={false}
      pinnable
      reopenKey={reopenKey}
      resizable
      resizeAxes={{ vertical: "horizontal" }}
      title={labels.title}
    >
      {({ chrome }) => (
        <section className="kizkatt-gradient-panel" aria-label={labels.title}>
          {chrome}
          <div className="kizkatt-gradient-layout">
            <div className="kizkatt-gradient-preview-column">
              <label className="kizkatt-gradient-name">
                <span>{labels.name}</span>
                <span>
                  <button type="button" onClick={onOpenLibrary} aria-label={labels.library}>
                    <i style={{ background: getGradientCssPreview(gradient) }} />
                    {ChevronDownIcon}
                  </button>
                  <input
                    aria-label={labels.name}
                    value={gradient.name}
                    onBlur={commit}
                    onChange={(event) => update({ name: event.target.value })}
                  />
                  <button type="button" onClick={() => onSavePreset(gradient)} aria-label={labels.addPreset}>+</button>
                </span>
              </label>

              <div
                className="kizkatt-gradient-preview"
                style={{ background: getGradientCssPreview(gradient) }}
              />
              <div
                ref={stopTrackRef}
                className="kizkatt-gradient-stop-track"
                style={{ background: getGradientCssPreview({ ...gradient, type: "linear", rotation: 0 }) }}
                onDoubleClick={(event) => addStopAtClientX(event.clientX)}
              >
                {gradient.stops.map((stop) => (
                  <button
                    key={stop.id}
                    type="button"
                    aria-label={`${labels.position} ${stop.position}`}
                    className={stop.id === selectedStop?.id ? "is-active" : undefined}
                    style={{ left: `${stop.position}%`, backgroundColor: stop.color, opacity: stop.opacity / 100 }}
                    onClick={() => setSelectedStopId(stop.id)}
                    onPointerDown={(event) => {
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setSelectedStopId(stop.id);
                    }}
                    onPointerMove={(event) => {
                      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                      const bounds = stopTrackRef.current?.getBoundingClientRect();
                      if (!bounds) return;
                      const position = clamp(((event.clientX - bounds.left) / bounds.width) * 100, 0, 100);
                      replace(updateGradientStop(gradient, stop.id, { position }));
                    }}
                    onPointerUp={(event) => {
                      event.currentTarget.releasePointerCapture(event.pointerId);
                      commit();
                    }}
                  />
                ))}
              </div>
              <button type="button" className="kizkatt-gradient-add-stop" onClick={() => addStopAtClientX((stopTrackRef.current?.getBoundingClientRect().left ?? 0) + (stopTrackRef.current?.getBoundingClientRect().width ?? 0) / 2)}>
                {labels.addStop}
              </button>

              {selectedStop && (
                <div className="kizkatt-gradient-stop-editor">
                  <label>
                    <span>{labels.color}</span>
                    <input
                      aria-label={labels.color}
                      type="color"
                      value={selectedStop.color}
                      onBlur={commit}
                      onChange={(event) => updateSelectedStop({ color: event.target.value })}
                    />
                  </label>
                  <NumericField label={labels.opacity} min={0} max={100} suffix="%" value={100 - selectedStop.opacity} onChange={(value) => updateSelectedStop({ opacity: 100 - value })} onCommit={commit} />
                  <NumericField label={labels.position} min={0} max={100} suffix="%" value={selectedStop.position} onChange={(value) => updateSelectedStop({ position: value })} onCommit={commit} />
                  <button
                    type="button"
                    disabled={gradient.stops.length <= 2}
                    aria-label={labels.removeStop}
                    onClick={() => {
                      replace(removeGradientStop(gradient, selectedStop.id));
                      setSelectedStopId(gradient.stops.find((stop) => stop.id !== selectedStop.id)?.id ?? "");
                      commit();
                    }}
                  >
                    {TrashIcon}
                  </button>
                </div>
              )}
            </div>

            <div className="kizkatt-gradient-settings-column">
              <fieldset>
                <legend>{labels.type}</legend>
                <div className="kizkatt-gradient-segments">
                  {TYPE_OPTIONS.map((type) => (
                    <button key={type} type="button" className={gradient.type === type ? "is-active" : undefined} onClick={() => { update({ type }); commit(); }}>
                      {labels[type]}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => { replace(reverseGradientStops(gradient)); commit(); }}>
                  {ResetIcon} {labels.reverse}
                </button>
              </fieldset>

              <fieldset>
                <legend>{labels.arrangement}</legend>
                <div className="kizkatt-gradient-segments">
                  {SPREAD_OPTIONS.map((spread) => (
                    <button key={spread} type="button" className={gradient.spread === spread ? "is-active" : undefined} onClick={() => { update({ spread }); commit(); }}>
                      {labels[spread]}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>{labels.flow}</legend>
                <label className="kizkatt-gradient-check"><input type="checkbox" checked={gradient.stepsEnabled} onChange={(event) => { update({ stepsEnabled: event.target.checked }); commit(); }} />{labels.steps}</label>
                <NumericField label={labels.steps} min={2} max={256} value={gradient.steps} onChange={(steps) => update({ steps })} onCommit={commit} />
                <label className="kizkatt-gradient-slider"><span>{labels.acceleration}</span><input aria-label={labels.acceleration} type="range" min="-100" max="100" value={gradient.acceleration} onChange={(event) => update({ acceleration: Number(event.target.value) })} onPointerUp={commit} /><output>{gradient.acceleration}</output></label>
                <label className="kizkatt-gradient-check"><input type="checkbox" checked={gradient.smooth} onChange={(event) => { update({ smooth: event.target.checked }); commit(); }} />{labels.smooth}</label>
              </fieldset>

              <fieldset className="kizkatt-gradient-transformations">
                <legend>Transformations</legend>
                <NumericField label="X" min={-200} max={300} suffix="%" value={gradient.centerX} onChange={(centerX) => update({ centerX })} onCommit={commit} />
                <NumericField label="Y" min={-200} max={300} suffix="%" value={gradient.centerY} onChange={(centerY) => update({ centerY })} onCommit={commit} />
                <NumericField label="W" min={1} max={1000} suffix="%" value={gradient.scaleX} onChange={(scaleX) => update({ scaleX, ...(gradient.scaleLocked ? { scaleY: scaleX } : {}) })} onCommit={commit} />
                <NumericField label="H" min={1} max={1000} suffix="%" value={gradient.scaleY} onChange={(scaleY) => update({ scaleY, ...(gradient.scaleLocked ? { scaleX: scaleY } : {}) })} onCommit={commit} />
                <label className="kizkatt-gradient-check"><input type="checkbox" checked={gradient.scaleLocked} onChange={(event) => { update({ scaleLocked: event.target.checked }); commit(); }} />Lock scale</label>
                <NumericField label={labels.rotation} min={-360} max={360} suffix="°" value={gradient.rotation} onChange={(rotation) => update({ rotation })} onCommit={commit} />
                <NumericField label={labels.skew} min={-85} max={85} suffix="°" value={gradient.skew} onChange={(skew) => update({ skew })} onCommit={commit} />
              </fieldset>
            </div>
          </div>
        </section>
      )}
    </DraggablePanel>
  );
}
