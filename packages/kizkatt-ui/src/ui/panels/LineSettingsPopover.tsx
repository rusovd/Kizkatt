import type { ReactNode } from "react";

import {
  DEFAULT_STROKE_STYLE,
  type ArrowheadStyle,
  type StyleState
} from "kizkatt-graphic-engine";

import { OBJECT_PANEL_UI_SETTINGS } from "../../config/defaultSettings";
import { useI18n } from "../../i18n";
import {
  EdgeRoundIcon,
  EdgeSharpIcon,
  SloppinessDoubleIcon
} from "../icons";

type StrokeStyleSelectValue = Exclude<StyleState["strokeStyle"], "wavy"> |
  "handDrawn";

const ARROWHEAD_OPTIONS: readonly ArrowheadStyle[] = [
  "none",
  "triangle",
  "open",
  "circle",
  "square"
];

const EDGE_ICONS = {
  round: EdgeRoundIcon,
  sharp: EdgeSharpIcon
} as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value: number) {
  return `${Number(value.toFixed(0))}`;
}

function parseFiniteNumber(value: string) {
  const nextValue = Number.parseFloat(value);

  return Number.isFinite(nextValue) ? nextValue : null;
}

function getColorInputValue(color: string) {
  return /^#[\da-f]{6}$/i.test(color) ? color : "#000000";
}

function IconButton({
  active,
  children,
  onClick,
  title
}: {
  active?: boolean;
  children: ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={active ? "is-active" : undefined}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function FineSettingCheckbox({
  checked,
  label,
  onChange
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="kizkatt-line-settings-checkbox">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

export function LineSettingsPopover({
  canUseArrowheads,
  onClose,
  onContinuousStyleChange,
  onStrokeWidthChange,
  onStrokeStyleChange,
  onStyleChange,
  onStyleChangeEnd,
  strokeStyleOptions,
  strokeWidthValue,
  style,
  unit
}: {
  canUseArrowheads: boolean;
  onClose: () => void;
  onContinuousStyleChange: (patch: Partial<StyleState>) => void;
  onStrokeWidthChange: (value: string) => void;
  onStrokeStyleChange: (value: StrokeStyleSelectValue) => void;
  onStyleChange: (patch: Partial<StyleState>) => void;
  onStyleChangeEnd: () => void;
  strokeStyleOptions: ReadonlyArray<{
    label: string;
    value: StrokeStyleSelectValue;
  }>;
  strokeWidthValue: string;
  style: StyleState;
  unit: string;
}) {
  const { strings } = useI18n();
  const labels = strings.objectPanel.lineSettings;
  const edgeStyle = style.edgeStyle ?? "round";
  const strokeStyleValue: StrokeStyleSelectValue =
    ((style.sloppiness === "artist" || style.sloppiness === "cartoonist") &&
    (style.strokeStyle ?? DEFAULT_STROKE_STYLE) === "solid")
      ? "handDrawn"
      : style.strokeStyle === "wavy"
        ? "zigzag"
        : style.strokeStyle ?? DEFAULT_STROKE_STYLE;
  const arrowheadLabels: Record<ArrowheadStyle, string> = {
    circle: labels.arrowheadCircle,
    none: labels.arrowheadNone,
    open: labels.arrowheadOpen,
    square: labels.arrowheadSquare,
    triangle: labels.arrowheadTriangle
  };
  const updatePercent = (
    property: "arrowheadScale" | "calligraphyStretch",
    value: string,
    min: number,
    max: number
  ) => {
    const parsedValue = parseFiniteNumber(value);

    if (parsedValue === null) {
      return;
    }

    onContinuousStyleChange({
      [property]: clamp(parsedValue, min, max) / 100
    });
  };

  return (
    <div
      className="kizkatt-line-settings-popover"
      data-no-panel-drag
      role="dialog"
      aria-label={labels.title}
    >
      <header>
        <strong>{labels.title}</strong>
        <button
          type="button"
          aria-label={labels.close}
          title={labels.close}
          onClick={onClose}
        >
          ×
        </button>
      </header>

      <section>
        <h3>{labels.general}</h3>
        <label className="kizkatt-line-settings-row">
          <span>{labels.color}</span>
          <span className="kizkatt-line-settings-color-control">
            <input
              aria-label={labels.color}
              type="color"
              value={getColorInputValue(style.strokeColor)}
              onInput={(event) =>
                onContinuousStyleChange({
                  strokeColor: event.currentTarget.value
                })
              }
              onChange={onStyleChangeEnd}
            />
            <output>{style.strokeColor}</output>
          </span>
        </label>
        <label className="kizkatt-line-settings-row">
          <span>{labels.width}</span>
          <span className="kizkatt-line-settings-number-control">
            <input
              aria-label={labels.width}
              type="number"
              step={OBJECT_PANEL_UI_SETTINGS.positionStep}
              value={strokeWidthValue}
              onBlur={onStyleChangeEnd}
              onChange={(event) => onStrokeWidthChange(event.target.value)}
            />
            <small>{unit}</small>
          </span>
        </label>
        <label className="kizkatt-line-settings-row">
          <span>{labels.style}</span>
          <select
            aria-label={labels.style}
            value={strokeStyleValue}
            onChange={(event) =>
              onStrokeStyleChange(event.target.value as StrokeStyleSelectValue)
            }
          >
            {strokeStyleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <div className="kizkatt-line-settings-row">
          <span>{labels.corners}</span>
          <div className="kizkatt-line-settings-corners">
            {OBJECT_PANEL_UI_SETTINGS.edgeOptions.map((option) => (
              <IconButton
                key={option}
                active={edgeStyle === option}
                title={
                  option === "round"
                    ? labels.cornerRound
                    : labels.cornerSharp
                }
                onClick={() => onStyleChange({ edgeStyle: option })}
              >
                {EDGE_ICONS[option]}
              </IconButton>
            ))}
          </div>
        </div>
        <label className="kizkatt-line-settings-row">
          <span className="kizkatt-line-settings-label-with-icon">
            {SloppinessDoubleIcon}
            {labels.lines}
          </span>
          <input
            aria-label={labels.lines}
            type="number"
            min="1"
            max="10"
            step="1"
            value={style.strokeLineCount ?? 1}
            onChange={(event) => {
              const count = Number.parseInt(event.target.value, 10);

              if (Number.isFinite(count)) {
                onStyleChange({
                  strokeLineCount: clamp(count, 1, 10),
                  sloppiness:
                    style.sloppiness === "cartoonist" ? "artist" :
                    style.sloppiness === "double" ? "architect" :
                    style.sloppiness
                });
              }
            }}
          />
        </label>
      </section>

      <section className={!canUseArrowheads ? "is-disabled" : undefined}>
        <h3>{labels.arrowheads}</h3>
        <label className="kizkatt-line-settings-row">
          <span>{labels.start}</span>
          <select
            aria-label={labels.start}
            disabled={!canUseArrowheads}
            value={style.startArrowhead ?? "none"}
            onChange={(event) =>
              onStyleChange({
                startArrowhead: event.target.value as ArrowheadStyle
              })
            }
          >
            {ARROWHEAD_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {arrowheadLabels[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="kizkatt-line-settings-row">
          <span>{labels.end}</span>
          <select
            aria-label={labels.end}
            disabled={!canUseArrowheads}
            value={style.endArrowhead ?? "none"}
            onChange={(event) =>
              onStyleChange({
                endArrowhead: event.target.value as ArrowheadStyle
              })
            }
          >
            {ARROWHEAD_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {arrowheadLabels[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="kizkatt-line-settings-row">
          <span>{labels.scaling}</span>
          <span className="kizkatt-line-settings-number-control">
            <input
              aria-label={labels.scaling}
              type="number"
              min="25"
              max="400"
              step="5"
              disabled={!canUseArrowheads}
              value={formatNumber((style.arrowheadScale ?? 1) * 100)}
              onBlur={onStyleChangeEnd}
              onChange={(event) =>
                updatePercent("arrowheadScale", event.target.value, 25, 400)
              }
            />
            <small>%</small>
          </span>
        </label>
      </section>

      <section>
        <h3>{labels.advanced}</h3>
        <FineSettingCheckbox
          checked={style.calligraphy ?? false}
          label={labels.calligraphy}
          onChange={(calligraphy) => onStyleChange({ calligraphy })}
        />
        <label className="kizkatt-line-settings-row">
          <span>{labels.stretch}</span>
          <span className="kizkatt-line-settings-number-control">
            <input
              aria-label={labels.stretch}
              type="number"
              min="50"
              max="300"
              step="5"
              disabled={!style.calligraphy}
              value={formatNumber((style.calligraphyStretch ?? 1) * 100)}
              onBlur={onStyleChangeEnd}
              onChange={(event) =>
                updatePercent("calligraphyStretch", event.target.value, 50, 300)
              }
            />
            <small>%</small>
          </span>
        </label>
        <FineSettingCheckbox
          checked={style.strokeBehindFill ?? false}
          label={labels.behindFill}
          onChange={(strokeBehindFill) => onStyleChange({ strokeBehindFill })}
        />
        <FineSettingCheckbox
          checked={style.scaleStrokeWithObject ?? false}
          label={labels.scaleWithObject}
          onChange={(scaleStrokeWithObject) =>
            onStyleChange({ scaleStrokeWithObject })
          }
        />
      </section>
    </div>
  );
}
