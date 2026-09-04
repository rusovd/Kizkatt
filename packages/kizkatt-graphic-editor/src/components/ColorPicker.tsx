import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

export type ColorPickerMode = "hex" | "rgba" | "cmyk";

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

type RgbColor = {
  b: number;
  g: number;
  r: number;
};

type HsvaColor = {
  a: number;
  h: number;
  s: number;
  v: number;
};

type CmykColor = {
  c: number;
  k: number;
  m: number;
  y: number;
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
const HEX_COLOR_PATTERN = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i;
const HEX_INPUT_PATTERN = /[^0-9a-f]/gi;
const HEX_RADIX = 16;
const HEX_CHANNEL_LENGTH = 2;
const RGB_MAX = 255;
const HUE_MAX = 360;
const PERCENT_MAX = 100;
const FULL_ALPHA = 1;
const POINTER_PRIMARY_BUTTONS = 1;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, precision = 0) {
  const factor = 10 ** precision;

  return Math.round(value * factor) / factor;
}

function parseHexColor(value: string): HsvaColor | null {
  const match = HEX_COLOR_PATTERN.exec(value);

  if (!match?.[1]) {
    return null;
  }

  const rgb = {
    r: Number.parseInt(match[1].slice(0, 2), HEX_RADIX),
    g: Number.parseInt(match[1].slice(2, 4), HEX_RADIX),
    b: Number.parseInt(match[1].slice(4, 6), HEX_RADIX)
  };
  const alpha = match[2]
    ? Number.parseInt(match[2], HEX_RADIX) / RGB_MAX
    : FULL_ALPHA;

  return { ...rgbToHsv(rgb), a: alpha };
}

function toHexChannel(value: number) {
  return Math.round(clamp(value, 0, RGB_MAX))
    .toString(HEX_RADIX)
    .padStart(HEX_CHANNEL_LENGTH, "0");
}

function hsvaToHex(color: HsvaColor) {
  const rgb = hsvToRgb(color);
  const alpha = toHexChannel(color.a * RGB_MAX);
  const opaqueHex = `#${toHexChannel(rgb.r)}${toHexChannel(rgb.g)}${toHexChannel(rgb.b)}`;

  return alpha === "ff" ? opaqueHex : `${opaqueHex}${alpha}`;
}

function rgbToHsv({ b, g, r }: RgbColor): Omit<HsvaColor, "a"> {
  const normalizedR = r / RGB_MAX;
  const normalizedG = g / RGB_MAX;
  const normalizedB = b / RGB_MAX;
  const maximum = Math.max(normalizedR, normalizedG, normalizedB);
  const minimum = Math.min(normalizedR, normalizedG, normalizedB);
  const delta = maximum - minimum;
  let hue = 0;

  if (delta > 0) {
    if (maximum === normalizedR) {
      hue = 60 * (((normalizedG - normalizedB) / delta) % 6);
    } else if (maximum === normalizedG) {
      hue = 60 * ((normalizedB - normalizedR) / delta + 2);
    } else {
      hue = 60 * ((normalizedR - normalizedG) / delta + 4);
    }
  }

  if (hue < 0) {
    hue += HUE_MAX;
  }

  return {
    h: hue,
    s: maximum === 0 ? 0 : delta / maximum,
    v: maximum
  };
}

function hsvToRgb({ h, s, v }: Pick<HsvaColor, "h" | "s" | "v">): RgbColor {
  const chroma = v * s;
  const section = ((h % HUE_MAX) + HUE_MAX) % HUE_MAX / 60;
  const secondary = chroma * (1 - Math.abs((section % 2) - 1));
  const match = v - chroma;
  let channels: [number, number, number];

  if (section < 1) {
    channels = [chroma, secondary, 0];
  } else if (section < 2) {
    channels = [secondary, chroma, 0];
  } else if (section < 3) {
    channels = [0, chroma, secondary];
  } else if (section < 4) {
    channels = [0, secondary, chroma];
  } else if (section < 5) {
    channels = [secondary, 0, chroma];
  } else {
    channels = [chroma, 0, secondary];
  }

  return {
    r: (channels[0] + match) * RGB_MAX,
    g: (channels[1] + match) * RGB_MAX,
    b: (channels[2] + match) * RGB_MAX
  };
}

function rgbToCmyk({ b, g, r }: RgbColor): CmykColor {
  const normalizedR = r / RGB_MAX;
  const normalizedG = g / RGB_MAX;
  const normalizedB = b / RGB_MAX;
  const black = 1 - Math.max(normalizedR, normalizedG, normalizedB);

  if (black >= 1) {
    return { c: 0, m: 0, y: 0, k: 1 };
  }

  return {
    c: (1 - normalizedR - black) / (1 - black),
    m: (1 - normalizedG - black) / (1 - black),
    y: (1 - normalizedB - black) / (1 - black),
    k: black
  };
}

function cmykToRgb({ c, k, m, y }: CmykColor): RgbColor {
  return {
    r: RGB_MAX * (1 - c) * (1 - k),
    g: RGB_MAX * (1 - m) * (1 - k),
    b: RGB_MAX * (1 - y) * (1 - k)
  };
}

function parseFunctionalColorChannels(value: string) {
  const openParenthesis = value.indexOf("(");
  const closeParenthesis = value.lastIndexOf(")");
  const body =
    openParenthesis >= 0 && closeParenthesis > openParenthesis
      ? value.slice(openParenthesis + 1, closeParenthesis)
      : value;

  return body
    .trim()
    .split(/[\s,\/]+/)
    .filter(Boolean);
}

function parsePercentageChannel(value: string) {
  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) return null;

  return clamp(value.includes("%") || parsed > 1 ? parsed / 100 : parsed, 0, 1);
}

export function formatColorForMode(value: string, mode: ColorPickerMode) {
  const color = parseHexColor(value) ?? { a: 1, h: 0, s: 0, v: 0 };
  const rgb = hsvToRgb(color);

  if (mode === "rgba") {
    return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${round(color.a, 2)})`;
  }

  if (mode === "cmyk") {
    const cmyk = rgbToCmyk(rgb);
    return `cmyk(${Math.round(cmyk.c * 100)}%, ${Math.round(cmyk.m * 100)}%, ${Math.round(cmyk.y * 100)}%, ${Math.round(cmyk.k * 100)}%)`;
  }

  return hsvaToHex(color);
}

export function parseColorForMode(
  value: string,
  mode: ColorPickerMode
): string | null {
  if (mode === "hex") {
    const color = parseHexColor(value);
    return color ? hsvaToHex(color) : null;
  }

  const channels = parseFunctionalColorChannels(value);

  if (mode === "rgba") {
    if (channels.length < 3) return null;
    const rgb = channels.slice(0, 3).map(Number);
    const alphaChannel = channels[3];
    const alpha = alphaChannel === undefined
      ? 1
      : alphaChannel.includes("%")
        ? Number.parseFloat(alphaChannel) / 100
        : Number(alphaChannel);

    if (rgb.some((channel) => !Number.isFinite(channel)) || !Number.isFinite(alpha)) {
      return null;
    }

    return hsvaToHex({
      ...rgbToHsv({ b: rgb[2], g: rgb[1], r: rgb[0] }),
      a: clamp(alpha, 0, 1)
    });
  }

  if (channels.length < 4) return null;
  const [c, m, y, k] = channels.slice(0, 4).map(parsePercentageChannel);

  if (c === null || m === null || y === null || k === null) return null;
  const rgb = cmykToRgb({ c, k, m, y });

  return hsvaToHex({ ...rgbToHsv(rgb), a: 1 });
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
