import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  addGradientStop,
  addGradientStopToFirstSegment,
  getDefaultGradientFill,
  removeGradientStop,
  reverseGradientStops,
  updateGradientStop,
  type GradientFill,
  type GradientSpread,
  type GradientType
} from "kizkatt-graphic-engine";
import {
  ColorPicker,
  formatColorForMode,
  GradientTransformPreview,
  getGradientCssPreview,
  parseColorForMode,
  useGradientFillDraft
} from "kizkatt-graphic-editor";

import { useI18n } from "../../i18n";
import {
  AddGradientStopIcon,
  ChevronDownIcon,
  ConicGradientIcon,
  DefaultGradientIcon,
  DiamondGradientIcon,
  GradientPadIcon,
  GradientReflectIcon,
  GradientRepeatIcon,
  LinearGradientIcon,
  RadialGradientIcon,
  ResetIcon,
  SaveIcon,
  TrashIcon
} from "../icons";
import { DraggablePanel } from "../positioning/DraggablePanel";
import { useGraphicEditorSettings } from "../settings/GraphicEditorSettings";
import { CollapsiblePanelSection } from "./CollapsiblePanelSection";
import { EditableSliderInput } from "./EditableSliderInput";

const PANEL_ID = "gradient-fill";
const COLOR_PICKER_WIDTH = 260;
const COLOR_PICKER_HEIGHT = 310;
const COLOR_PICKER_GAP = 8;
const TYPE_OPTIONS: GradientType[] = ["linear", "radial", "conic", "diamond"];
const SPREAD_OPTIONS: GradientSpread[] = ["pad", "reflect", "repeat"];
const TYPE_ICONS: Record<GradientType, ReactNode> = {
  conic: ConicGradientIcon,
  diamond: DiamondGradientIcon,
  linear: LinearGradientIcon,
  radial: RadialGradientIcon
};
const SPREAD_ICONS: Record<GradientSpread, ReactNode> = {
  pad: GradientPadIcon,
  reflect: GradientReflectIcon,
  repeat: GradientRepeatIcon
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getStopPickerColor(color: string, opacity: number) {
  const opaqueColor = /^#[\da-f]{6}/i.exec(color)?.[0] ?? "#000000";
  const alpha = Math.round(clamp(opacity, 0, 100) * 2.55)
    .toString(16)
    .padStart(2, "0");

  return alpha === "ff" ? opaqueColor : `${opaqueColor}${alpha}`;
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
  onOpenLibrary: (anchor: HTMLButtonElement) => void;
  onSavePreset: (gradient: GradientFill) => void;
  reopenKey: number;
}) {
  const { strings } = useI18n();
  const {
    colorMode,
    gradientFreeDeformation,
    overlayContrast,
    setColorMode,
    setGradientFreeDeformation,
    setOverlayContrast
  } = useGraphicEditorSettings();
  const labels = strings.gradientFill;
  const stopTrackRef = useRef<HTMLDivElement | null>(null);
  const colorButtonRef = useRef<HTMLButtonElement | null>(null);
  const colorPickerRef = useRef<HTMLDivElement | null>(null);
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
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [colorPickerPosition, setColorPickerPosition] = useState({
    left: COLOR_PICKER_GAP,
    top: COLOR_PICKER_GAP
  });
  const [colorDraft, setColorDraft] = useState(() =>
    formatColorForMode(
      getStopPickerColor(
        gradient.stops[0]?.color ?? "#000000",
        gradient.stops[0]?.opacity ?? 100
      ),
      colorMode
    )
  );

  useEffect(() => {
    setColorDraft(
      formatColorForMode(
        getStopPickerColor(
          selectedStop?.color ?? "#000000",
          selectedStop?.opacity ?? 100
        ),
        colorMode
      )
    );
  }, [colorMode, selectedStop?.color, selectedStop?.id, selectedStop?.opacity]);

  useEffect(() => {
    if (!colorPickerOpen) return;

    const updatePosition = () => {
      const anchor = colorButtonRef.current?.getBoundingClientRect();
      if (!anchor) return;
      const pickerWidth =
        colorPickerRef.current?.offsetWidth || COLOR_PICKER_WIDTH;
      const pickerHeight =
        colorPickerRef.current?.offsetHeight || COLOR_PICKER_HEIGHT;
      const preferredLeft = anchor.left - pickerWidth - COLOR_PICKER_GAP;
      const alternateLeft = anchor.right + COLOR_PICKER_GAP;
      const left = preferredLeft >= COLOR_PICKER_GAP
        ? preferredLeft
        : Math.min(
            window.innerWidth - pickerWidth - COLOR_PICKER_GAP,
            alternateLeft
          );
      const top = Math.min(
        window.innerHeight - pickerHeight - COLOR_PICKER_GAP,
        Math.max(COLOR_PICKER_GAP, anchor.top)
      );

      setColorPickerPosition({
        left: Math.max(COLOR_PICKER_GAP, left),
        top: Math.max(COLOR_PICKER_GAP, top)
      });
    };
    const closeOnOutsidePointer = (event: globalThis.PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !colorButtonRef.current?.contains(target) &&
        !colorPickerRef.current?.contains(target)
      ) {
        setColorPickerOpen(false);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("pointerdown", closeOnOutsidePointer, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("pointerdown", closeOnOutsidePointer, true);
    };
  }, [colorPickerOpen]);

  const updateSelectedStopColor = (color: string) => {
    if (!selectedStop) return;
    const match = /^(#[\da-f]{6})([\da-f]{2})?$/i.exec(color);

    if (!match?.[1]) return;
    replace(updateGradientStop(gradient, selectedStop.id, {
      color: match[1],
      ...(match[2]
        ? { opacity: Number.parseInt(match[2], 16) / 2.55 }
        : {})
    }));
  };
  const addStopAtClientX = (clientX: number) => {
    const bounds = stopTrackRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const position = clamp(((clientX - bounds.left) / bounds.width) * 100, 0, 100);
    const result = addGradientStop(gradient, position);
    setSelectedStopId(result.stopId);
    replace(result.gradient);
    commit();
  };
  const addStopToFirstSegment = () => {
    const result = addGradientStopToFirstSegment(gradient);
    setSelectedStopId(result.stopId);
    replace(result.gradient);
    commit();
  };
  const loadTypeDefault = () => {
    const next = {
      ...getDefaultGradientFill(gradient.type),
      name: "Default"
    };
    setSelectedStopId(next.stops[0]?.id ?? "");
    replace(next);
    commit();
  };
  const removeSelectedStop = () => {
    if (!selectedStop || gradient.stops.length <= 2) return;
    const nextStop = gradient.stops.find(
      (stop) => stop.id !== selectedStop.id
    );
    setSelectedStopId(nextStop?.id ?? "");
    replace(removeGradientStop(gradient, selectedStop.id));
    commit();
  };
  return (
    <DraggablePanel
      id={PANEL_ID}
      closable
      defaultOrientation="vertical"
      headerActions={(
        <>
          <button
            type="button"
            aria-label={labels.reverse}
            title={labels.reverse}
            onClick={() => {
              replace(reverseGradientStops(gradient));
              commit();
            }}
          >
            {ResetIcon}
          </button>
          <button
            type="button"
            aria-label={labels.loadDefault}
            title={labels.loadDefault}
            onClick={loadTypeDefault}
          >
            {DefaultGradientIcon}
          </button>
        </>
      )}
      minSize={{ height: 570, width: 700 }}
      onClose={onClose}
      orientationChangeable={false}
      pinnable
      positionStorageId="fill-settings"
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
                  <button
                    type="button"
                    onClick={(event) => onOpenLibrary(event.currentTarget)}
                    aria-label={labels.library}
                  >
                    <i style={{ background: getGradientCssPreview(gradient) }} />
                    {ChevronDownIcon}
                  </button>
                  <input
                    aria-label={labels.name}
                    value={gradient.name}
                    onBlur={commit}
                    onChange={(event) => update({ name: event.target.value })}
                  />
                  <button
                    type="button"
                    className={gradient.presetId ? undefined : "is-active"}
                    disabled={Boolean(gradient.presetId)}
                    onClick={() => onSavePreset(gradient)}
                    aria-label={labels.addPreset}
                    title={labels.addPreset}
                  >
                    {SaveIcon}
                  </button>
                </span>
              </label>

              <div className="kizkatt-preview-overlay-options">
                <label className="kizkatt-preview-overlay-toggle">
                  <input
                    type="checkbox"
                    checked={overlayContrast}
                    onChange={(event) =>
                      setOverlayContrast(event.target.checked)
                    }
                  />
                  <span>{labels.overlayContrast}</span>
                </label>
                <label className="kizkatt-preview-overlay-toggle">
                  <input
                    type="checkbox"
                    checked={gradientFreeDeformation}
                    onChange={(event) =>
                      setGradientFreeDeformation(event.target.checked)
                    }
                  />
                  <span>{labels.freeDeformation}</span>
                </label>
              </div>

              <GradientTransformPreview
                freeDeformation={gradientFreeDeformation}
                gradient={gradient}
                labels={{
                  move: labels.move,
                  resize: labels.resize,
                  rotate: labels.rotate,
                  skew: labels.skew,
                  stop: labels.stop
                }}
                selectedStopId={selectedStopId}
                onChange={replace}
                onChangeEnd={commit}
                onSelectedStopIdChange={setSelectedStopId}
                shadeOverlay={overlayContrast}
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
                    className={stop.id === selectedStopId ? "is-active" : undefined}
                    style={{ left: `${stop.position}%` }}
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
                  >
                    <svg aria-hidden="true" viewBox="0 0 16 18">
                      <line x1="8" y1="0" x2="8" y2="4" />
                      <path
                        d="M2 4 H14 L8 16 Z"
                        fill={stop.color}
                        fillOpacity={stop.opacity / 100}
                      />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            <div className="kizkatt-gradient-settings-column">
              <fieldset>
                <legend>{labels.type}</legend>
                <div className="kizkatt-gradient-type-controls">
                  {TYPE_OPTIONS.map((type) => (
                    <button
                      key={type}
                      type="button"
                      aria-label={labels[type]}
                      aria-pressed={gradient.type === type}
                      title={labels[type]}
                      className={gradient.type === type ? "is-active" : undefined}
                      onClick={() => { update({ type }); commit(); }}
                    >
                      {TYPE_ICONS[type]}
                    </button>
                  ))}
                  <span aria-hidden="true" />
                  {SPREAD_OPTIONS.map((spread) => (
                    <button
                      key={spread}
                      type="button"
                      aria-label={labels[spread]}
                      aria-pressed={gradient.spread === spread}
                      title={labels[spread]}
                      className={
                        gradient.spread === spread ? "is-active" : undefined
                      }
                      onClick={() => {
                        update({ spread });
                        commit();
                      }}
                    >
                      {SPREAD_ICONS[spread]}
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>{labels.flow}</legend>
                <label className="kizkatt-gradient-slider">
                  <span className="kizkatt-gradient-check">
                    <input
                      type="checkbox"
                      checked={gradient.stepsEnabled}
                      aria-label={labels.steps}
                      onChange={(event) => { update({ stepsEnabled: event.target.checked }); commit(); }}
                    />
                    {labels.steps}
                  </span>
                  <input
                    aria-label={labels.steps}
                    type="range"
                    min="2"
                    max="256"
                    disabled={!gradient.stepsEnabled}
                    value={gradient.steps}
                    onChange={(event) => update({ steps: Number(event.target.value) })}
                    onPointerUp={commit}
                  />
                  <output>{gradient.steps}</output>
                </label>
                <label className="kizkatt-gradient-slider"><span>{labels.acceleration}</span><input aria-label={labels.acceleration} type="range" min="-100" max="100" value={gradient.acceleration} onChange={(event) => update({ acceleration: Number(event.target.value) })} onPointerUp={commit} /><output>{gradient.acceleration}</output></label>
                <label className="kizkatt-gradient-check"><input type="checkbox" checked={gradient.smooth} onChange={(event) => { update({ smooth: event.target.checked }); commit(); }} />{labels.smooth}</label>
              </fieldset>

              <fieldset className="kizkatt-gradient-stop-settings">
                <legend>{labels.stop}</legend>
                <div className="kizkatt-gradient-stop-toolbar">
                  <button
                    ref={colorButtonRef}
                    type="button"
                    className="kizkatt-gradient-stop-color-button"
                    aria-label={labels.color}
                    title={labels.color}
                    disabled={!selectedStop}
                    onClick={() => {
                      if (selectedStop) {
                        setColorPickerOpen((open) => !open);
                      }
                    }}
                  >
                    <i style={{ backgroundColor: selectedStop?.color }} />
                  </button>
                  <input
                    className="kizkatt-gradient-stop-color-value"
                    aria-label={`${labels.colorValue} ${colorMode.toUpperCase()}`}
                    disabled={!selectedStop}
                    value={colorDraft}
                    onBlur={() => {
                      const parsed = parseColorForMode(colorDraft, colorMode);
                      if (parsed) updateSelectedStopColor(parsed);
                      commit();
                    }}
                    onChange={(event) => {
                      const nextDraft = event.target.value;
                      setColorDraft(nextDraft);
                      const parsed = parseColorForMode(nextDraft, colorMode);
                      if (parsed) updateSelectedStopColor(parsed);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                    }}
                  />
                  <button
                    type="button"
                    aria-label={labels.addStop}
                    title={labels.addStop}
                    onClick={addStopToFirstSegment}
                  >
                    {AddGradientStopIcon}
                  </button>
                  <button
                    type="button"
                    aria-label={labels.removeStop}
                    title={labels.removeStop}
                    disabled={!selectedStop || gradient.stops.length <= 2}
                    onClick={removeSelectedStop}
                  >
                    {TrashIcon}
                  </button>
                </div>
                {colorPickerOpen && selectedStop &&
                  createPortal(
                    <div
                      ref={colorPickerRef}
                      className="kizkatt-gradient-stop-color-picker"
                      style={colorPickerPosition}
                    >
                      <ColorPicker
                        defaultMode={colorMode}
                        value={getStopPickerColor(
                          selectedStop.color,
                          selectedStop.opacity
                        )}
                        onChange={updateSelectedStopColor}
                        onCommit={(color) => {
                          updateSelectedStopColor(color);
                          commit();
                        }}
                        onModeChange={setColorMode}
                      />
                    </div>,
                    document.querySelector(".kizkatt-board") ?? document.body
                  )}
                <label className="kizkatt-gradient-slider">
                  <span>{labels.opacity}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    aria-label={labels.opacity}
                    disabled={!selectedStop}
                    value={selectedStop ? 100 - selectedStop.opacity : 0}
                    onChange={(event) => {
                      if (!selectedStop) return;
                      replace(updateGradientStop(gradient, selectedStop.id, {
                        opacity: 100 - Number(event.target.value)
                      }));
                    }}
                    onPointerUp={commit}
                  />
                  <output>{selectedStop ? 100 - selectedStop.opacity : 0}</output>
                </label>
                <label className="kizkatt-gradient-slider">
                  <span>{labels.positionX}</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    aria-label={labels.positionX}
                    disabled={!selectedStop}
                    value={selectedStop?.position ?? 0}
                    onChange={(event) => {
                      if (!selectedStop) return;
                      replace(updateGradientStop(gradient, selectedStop.id, {
                        position: Number(event.target.value)
                      }));
                    }}
                    onPointerUp={commit}
                  />
                  <output>{Math.round(selectedStop?.position ?? 0)}</output>
                </label>
              </fieldset>

              <CollapsiblePanelSection title={labels.transformations}>
                <div className="kizkatt-transformation-fields">
                  <label>
                    <span>{labels.positionX}</span>
                    <EditableSliderInput
                      ariaLabel={labels.positionX}
                      min={-200}
                      max={300}
                      unit="%"
                      value={gradient.centerX}
                      onChangeEnd={commit}
                      onValueChange={(centerX) => update({ centerX })}
                    />
                  </label>
                  <label>
                    <span>{labels.positionY}</span>
                    <EditableSliderInput
                      ariaLabel={labels.positionY}
                      min={-200}
                      max={300}
                      unit="%"
                      value={gradient.centerY}
                      onChangeEnd={commit}
                      onValueChange={(centerY) => update({ centerY })}
                    />
                  </label>
                  <label>
                    <span>{labels.width}</span>
                    <EditableSliderInput
                      ariaLabel={labels.width}
                      min={1}
                      max={1000}
                      unit="%"
                      value={gradient.scaleX}
                      onChangeEnd={commit}
                      onValueChange={(scaleX) =>
                        update({
                          scaleX,
                          ...(gradient.scaleLocked
                            ? {
                                scaleY:
                                  gradient.scaleY *
                                  (scaleX / Math.max(1, gradient.scaleX))
                              }
                            : {})
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>{labels.height}</span>
                    <EditableSliderInput
                      ariaLabel={labels.height}
                      min={1}
                      max={1000}
                      unit="%"
                      value={gradient.scaleY}
                      onChangeEnd={commit}
                      onValueChange={(scaleY) =>
                        update({
                          scaleY,
                          ...(gradient.scaleLocked
                            ? {
                                scaleX:
                                  gradient.scaleX *
                                  (scaleY / Math.max(1, gradient.scaleY))
                              }
                            : {})
                        })
                      }
                    />
                  </label>
                  <label>
                    <span>{labels.rotation}</span>
                    <EditableSliderInput
                      ariaLabel={labels.rotation}
                      min={-360}
                      max={360}
                      unit="°"
                      value={gradient.rotation}
                      onChangeEnd={commit}
                      onValueChange={(rotation) => update({ rotation })}
                    />
                  </label>
                  <label>
                    <span>{labels.skew}</span>
                    <EditableSliderInput
                      ariaLabel={labels.skew}
                      min={-85}
                      max={85}
                      unit="°"
                      value={gradient.skew}
                      onChangeEnd={commit}
                      onValueChange={(skew) => update({ skew })}
                    />
                  </label>
                  <label className="is-checkbox is-wide">
                    <input
                      type="checkbox"
                      checked={gradient.scaleLocked}
                      onChange={(event) => {
                        update({ scaleLocked: event.target.checked });
                        commit();
                      }}
                    />
                    <span>{labels.lockScale}</span>
                  </label>
                </div>
              </CollapsiblePanelSection>
            </div>
          </div>
        </section>
      )}
    </DraggablePanel>
  );
}
