import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import {
  cmykToRgb,
  hsvaToHex,
  hsvToRgb,
  parseHexColor,
  rgbToCmyk,
  rgbToHsv
} from "kizkatt-graphic-engine";
import type {
  CmykColor,
  ColorMode,
  HsvaColor,
  RgbColor
} from "kizkatt-graphic-engine";

export type ColorPickerMode = ColorMode;
export { formatColorForMode, parseColorForMode } from "kizkatt-graphic-engine";

export type ColorPickerProps = {
  className?: string;
  defaultMode?: ColorPickerMode;
  labels?: Partial<{
    alpha: string;
    blue: string;
    cyan: string;
    green: string;
    hue: string;
    lightness: string;
    magenta: string;
    red: string;
    saturation: string;
    yellow: string;
    black: string;
  }>;
  onChange: (color: string) => void;
  onCommit?: (color: string) => void;
  onModeChange?: (mode: ColorPickerMode) => void;
  value: string;
};

const DEFAULT_LABELS = {
  alpha: "A",
  black: "K",
  blue: "B",
  cyan: "C",
  green: "G",
  hue: "Hue",
  lightness: "Value",
  magenta: "M",
  red: "R",
  saturation: "Saturation",
  yellow: "Y"
} as const;
const HEX_INPUT_PATTERN = /[^0-9a-f]/gi;
const RGB_MAX = 255;
const HUE_MAX = 360;
const PERCENT_MAX = 100;
const POINTER_PRIMARY_BUTTONS = 1;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, precision = 0) {
  const factor = 10 ** precision;

  return Math.round(value * factor) / factor;
}

function Field({
  label,
  max,
  min = 0,
  onBlur,
  onChange,
  onKeyDown,
  step = 1,
  value
}: {
  label: string;
  max: number;
  min?: number;
  onBlur: () => void;
  onChange: (value: number) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  step?: number;
  value: number;
}) {
  return (
    <label className="kizkatt-color-picker-field">
      <input
        aria-label={label}
        max={max}
        min={min}
        step={step}
        type="number"
        value={value}
        onBlur={onBlur}
        onChange={(event) => onChange(Number(event.target.value))}
        onKeyDown={onKeyDown}
      />
      <span>{label}</span>
    </label>
  );
}

export function ColorPicker({
  className,
  defaultMode = "hex",
  labels: labelOverrides,
  onChange,
  onCommit,
  onModeChange,
  value
}: ColorPickerProps) {
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const initialColor = parseHexColor(value) ?? { a: 1, h: 0, s: 0, v: 0 };
  const [color, setColor] = useState<HsvaColor>(initialColor);
  const [mode, setMode] = useState<ColorPickerMode>(defaultMode);
  const [hexDraft, setHexDraft] = useState(hsvaToHex(initialColor));
  const colorRef = useRef(color);
  const activePointerRef = useRef<number | null>(null);
  const saturationRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const nextColor = parseHexColor(value);

    if (!nextColor || hsvaToHex(colorRef.current) === hsvaToHex(nextColor)) {
      return;
    }

    colorRef.current = nextColor;
    setColor(nextColor);
    setHexDraft(hsvaToHex(nextColor));
  }, [value]);

  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  const emitColor = (nextColor: HsvaColor, commit = false) => {
    const normalizedColor = {
      a: clamp(nextColor.a, 0, 1),
      h: ((nextColor.h % HUE_MAX) + HUE_MAX) % HUE_MAX,
      s: clamp(nextColor.s, 0, 1),
      v: clamp(nextColor.v, 0, 1)
    };
    const hex = hsvaToHex(normalizedColor);

    colorRef.current = normalizedColor;
    setColor(normalizedColor);
    setHexDraft(hex);
    onChange(hex);

    if (commit) {
      (onCommit ?? onChange)(hex);
    }
  };

  const commitCurrentColor = () => {
    const hex = hsvaToHex(colorRef.current);
    (onCommit ?? onChange)(hex);
  };

  const commitOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      commitCurrentColor();
      event.currentTarget.blur();
    }
  };

  const updateSaturationAndValue = (
    event: PointerEvent<HTMLDivElement>,
    commit = false
  ) => {
    const bounds = saturationRef.current?.getBoundingClientRect();

    if (!bounds || bounds.width === 0 || bounds.height === 0) {
      return;
    }

    emitColor(
      {
        ...colorRef.current,
        s: (event.clientX - bounds.left) / bounds.width,
        v: 1 - (event.clientY - bounds.top) / bounds.height
      },
      commit
    );
  };

  const updateRgbChannel = (channel: keyof RgbColor, value: number) => {
    const currentRgb = hsvToRgb(colorRef.current);
    const nextHsv = rgbToHsv({
      ...currentRgb,
      [channel]: clamp(value, 0, RGB_MAX)
    });

    emitColor({
      ...nextHsv,
      a: colorRef.current.a,
      h: nextHsv.s === 0 ? colorRef.current.h : nextHsv.h
    });
  };

  const updateCmykChannel = (channel: keyof CmykColor, value: number) => {
    const currentCmyk = rgbToCmyk(hsvToRgb(colorRef.current));
    const nextRgb = cmykToRgb({
      ...currentCmyk,
      [channel]: clamp(value / PERCENT_MAX, 0, 1)
    });
    const nextHsv = rgbToHsv(nextRgb);

    emitColor({
      ...nextHsv,
      a: colorRef.current.a,
      h: nextHsv.s === 0 ? colorRef.current.h : nextHsv.h
    });
  };

  const rgb = hsvToRgb(color);
  const cmyk = rgbToCmyk(rgb);
  const renderedHex = hsvaToHex(color);

  return (
    <section
      aria-label="Color picker"
      className={["kizkatt-color-picker", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        ref={saturationRef}
        aria-label={`${labels.saturation} / ${labels.lightness}`}
        className="kizkatt-color-picker-saturation"
        role="slider"
        tabIndex={0}
        style={{ backgroundColor: `hsl(${color.h} 100% 50%)` }}
        onPointerDown={(event) => {
          activePointerRef.current = event.pointerId;
          event.currentTarget.setPointerCapture?.(event.pointerId);
          updateSaturationAndValue(event);
        }}
        onPointerMove={(event) => {
          if (
            activePointerRef.current === event.pointerId &&
            event.buttons === POINTER_PRIMARY_BUTTONS
          ) {
            updateSaturationAndValue(event);
          }
        }}
        onPointerUp={(event) => {
          if (activePointerRef.current !== event.pointerId) {
            return;
          }

          updateSaturationAndValue(event, true);
          activePointerRef.current = null;
          event.currentTarget.releasePointerCapture?.(event.pointerId);
        }}
      >
        <span
          className="kizkatt-color-picker-marker"
          style={{ left: `${color.s * PERCENT_MAX}%`, top: `${(1 - color.v) * PERCENT_MAX}%` }}
        />
      </div>

      <div className="kizkatt-color-picker-hue-row">
        <span
          aria-hidden="true"
          className="kizkatt-color-picker-preview"
          style={{ backgroundColor: renderedHex }}
        />
        <input
          aria-label={labels.hue}
          className="kizkatt-color-picker-hue"
          max={HUE_MAX}
          min={0}
          type="range"
          value={round(color.h)}
          onBlur={commitCurrentColor}
          onChange={(event) =>
            emitColor({ ...colorRef.current, h: Number(event.target.value) })
          }
          onPointerUp={commitCurrentColor}
        />
      </div>

      <div className="kizkatt-color-picker-modes" role="group" aria-label="Color format">
        {(["hex", "rgba", "cmyk"] as const).map((format) => (
          <button
            key={format}
            type="button"
            aria-pressed={mode === format}
            className={mode === format ? "is-active" : undefined}
            onClick={() => {
              setMode(format);
              onModeChange?.(format);
            }}
          >
            {format === "rgba" ? "RGB/A" : format.toUpperCase()}
          </button>
        ))}
      </div>

      {mode === "hex" && (
        <label className="kizkatt-color-picker-hex-field">
          <span>#</span>
          <input
            aria-label="HEX"
            maxLength={9}
            value={hexDraft.replace(/^#/, "")}
            onBlur={() => {
              const parsedColor = parseHexColor(hexDraft);

              if (parsedColor) {
                emitColor(parsedColor, true);
              } else {
                setHexDraft(renderedHex);
              }
            }}
            onChange={(event) => {
              const draft = event.target.value
                .replace(HEX_INPUT_PATTERN, "")
                .slice(0, 8);
              const nextDraft = `#${draft}`;
              setHexDraft(nextDraft);
              const parsedColor = parseHexColor(nextDraft);

              if (parsedColor) {
                emitColor(parsedColor);
              }
            }}
            onKeyDown={commitOnEnter}
          />
        </label>
      )}

      {mode === "rgba" && (
        <div className="kizkatt-color-picker-fields kizkatt-color-picker-fields--rgba">
          <Field label={labels.red} max={RGB_MAX} value={round(rgb.r)} onBlur={commitCurrentColor} onChange={(next) => updateRgbChannel("r", next)} onKeyDown={commitOnEnter} />
          <Field label={labels.green} max={RGB_MAX} value={round(rgb.g)} onBlur={commitCurrentColor} onChange={(next) => updateRgbChannel("g", next)} onKeyDown={commitOnEnter} />
          <Field label={labels.blue} max={RGB_MAX} value={round(rgb.b)} onBlur={commitCurrentColor} onChange={(next) => updateRgbChannel("b", next)} onKeyDown={commitOnEnter} />
          <Field label={labels.alpha} max={1} step={0.01} value={round(color.a, 2)} onBlur={commitCurrentColor} onChange={(next) => emitColor({ ...colorRef.current, a: next })} onKeyDown={commitOnEnter} />
        </div>
      )}

      {mode === "cmyk" && (
        <div className="kizkatt-color-picker-fields kizkatt-color-picker-fields--cmyk">
          <Field label={labels.cyan} max={PERCENT_MAX} value={round(cmyk.c * PERCENT_MAX)} onBlur={commitCurrentColor} onChange={(next) => updateCmykChannel("c", next)} onKeyDown={commitOnEnter} />
          <Field label={labels.magenta} max={PERCENT_MAX} value={round(cmyk.m * PERCENT_MAX)} onBlur={commitCurrentColor} onChange={(next) => updateCmykChannel("m", next)} onKeyDown={commitOnEnter} />
          <Field label={labels.yellow} max={PERCENT_MAX} value={round(cmyk.y * PERCENT_MAX)} onBlur={commitCurrentColor} onChange={(next) => updateCmykChannel("y", next)} onKeyDown={commitOnEnter} />
          <Field label={labels.black} max={PERCENT_MAX} value={round(cmyk.k * PERCENT_MAX)} onBlur={commitCurrentColor} onChange={(next) => updateCmykChannel("k", next)} onKeyDown={commitOnEnter} />
        </div>
      )}
    </section>
  );
}
