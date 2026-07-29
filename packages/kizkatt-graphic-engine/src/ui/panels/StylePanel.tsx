import { useEffect, useState } from "react";

import {
  COLOR_PALETTES,
  DARK_THEME_BACKGROUND_COLORS,
  DARK_THEME_STROKE_COLORS,
  LIGHT_THEME_BACKGROUND_COLORS,
  LIGHT_THEME_STROKE_COLORS
} from "../../config/constants";
import { isHexColor } from "../../geometry";
import {
  BringForwardIcon,
  BringToFrontIcon,
  DuplicateIcon,
  EdgeRoundIcon,
  EdgeSharpIcon,
  EyedropperIcon,
  FillCrossHatchIcon,
  FillHachureIcon,
  FillSolidIcon,
  LinkIcon,
  SendBackwardIcon,
  SendToBackIcon,
  SloppinessArchitectIcon,
  SloppinessArtistIcon,
  SloppinessCartoonistIcon,
  SloppinessDoubleIcon,
  StrokeStyleDashedIcon,
  StrokeStyleDottedIcon,
  StrokeStyleSolidIcon,
  TrashIcon
} from "../icons";
import type {
  ColorPopoverState,
  ColorTarget,
  KizkattTheme,
  StyleState
} from "../../model/types";

type ColorPalette = (typeof COLOR_PALETTES)[number];
type EyeDropperConstructor = new () => {
  open: () => Promise<{ sRGBHex: string }>;
};

type StylePanelProps = {
  onAction: (action: "delete" | "duplicate" | "link") => void;
  onLayerAction: (action: "back" | "backward" | "forward" | "front") => void;
  onStyleChange: (patch: Partial<StyleState>) => void;
  style: StyleState;
  theme: KizkattTheme;
};

const QUICK_SWATCH_COUNT = 5;
const COLOR_PICKER_PALETTE_INDEX = 14;
const DEFAULT_POPOVER_PALETTE =
  COLOR_PALETTES.find((palette) => palette.id === "violet") ??
  COLOR_PALETTES[0];
const STROKE_STYLE_ICONS = {
  dashed: StrokeStyleDashedIcon,
  dotted: StrokeStyleDottedIcon,
  solid: StrokeStyleSolidIcon
} as const;
const FILL_STYLE_ICONS = {
  crossHatch: FillCrossHatchIcon,
  hachure: FillHachureIcon,
  solid: FillSolidIcon
} as const;
const EDGE_STYLE_ICONS = {
  round: EdgeRoundIcon,
  sharp: EdgeSharpIcon
} as const;
const SLOPPINESS_ICONS = {
  architect: SloppinessArchitectIcon,
  artist: SloppinessArtistIcon,
  cartoonist: SloppinessCartoonistIcon,
  double: SloppinessDoubleIcon
} as const;
const LAYER_ACTIONS = [
  { action: "back", ariaLabel: "Send to back", icon: SendToBackIcon },
  { action: "backward", ariaLabel: "Send backward", icon: SendBackwardIcon },
  { action: "forward", ariaLabel: "Bring forward", icon: BringForwardIcon },
  { action: "front", ariaLabel: "Bring to front", icon: BringToFrontIcon }
] as const;
const ELEMENT_ACTIONS = [
  { action: "duplicate", ariaLabel: "Duplicate", icon: DuplicateIcon },
  { action: "delete", ariaLabel: "Delete", icon: TrashIcon },
  { action: "link", ariaLabel: "Link", icon: LinkIcon }
] as const;
const MIN_STROKE_WIDTH = 0;
const MAX_STROKE_WIDTH = 50;
const DEFAULT_FILL_WEIGHT = 1;
const MIN_FILL_WEIGHT = 0.25;
const MAX_FILL_WEIGHT = 6;
const FILL_WEIGHT_STEP = 0.25;
const DEFAULT_SLOPPINESS_GAP = 16;
const MIN_SLOPPINESS_GAP = 0;
const MAX_SLOPPINESS_GAP = 80;
const MIN_OPACITY = 0;
const MAX_OPACITY = 100;
const DARK_THEME_STROKE_SOURCE_BY_PALETTE_ID: Record<string, string> = {
  blue: DARK_THEME_STROKE_COLORS[3],
  gray: DARK_THEME_STROKE_COLORS[0],
  green: DARK_THEME_STROKE_COLORS[2],
  red: DARK_THEME_STROKE_COLORS[1],
  violet: DARK_THEME_STROKE_COLORS[5],
  yellow: DARK_THEME_STROKE_COLORS[4]
};

function getPalettePrimaryColor(palette: ColorPalette): string {
  return palette.color;
}

function findPaletteForColor(color: string) {
  return COLOR_PALETTES.find(
    (palette) =>
      palette.color === color ||
      (palette.shades as readonly string[]).includes(color)
  );
}

function findPaletteById(paletteId?: string) {
  return COLOR_PALETTES.find((palette) => palette.id === paletteId);
}

function getDarkThemeStrokeSourceColor(palette: ColorPalette) {
  return DARK_THEME_STROKE_SOURCE_BY_PALETTE_ID[palette.id] ?? palette.color;
}

function hexToRgb(color: string) {
  const hex = color.slice(1);

  return {
    b: Number.parseInt(hex.slice(4, 6), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    r: Number.parseInt(hex.slice(0, 2), 16)
  };
}

function getQuickColors(target: ColorTarget, theme: KizkattTheme) {
  if (target === "backgroundColor") {
    if (theme === "dark") {
      return DARK_THEME_BACKGROUND_COLORS;
    }

    return LIGHT_THEME_BACKGROUND_COLORS;
  }

  if (theme === "dark") {
    return DARK_THEME_STROKE_COLORS;
  }

  return LIGHT_THEME_STROKE_COLORS;
}

function rgbToHex({ b, g, r }: { b: number; g: number; r: number }) {
  return `#${[r, g, b]
    .map((value) =>
      Math.round(value).toString(16).padStart(2, "0")
    )
    .join("")}`;
}

function mixHexColor(color: string, target: string, amount: number) {
  const sourceRgb = hexToRgb(color);
  const targetRgb = hexToRgb(target);

  return rgbToHex({
    b: sourceRgb.b + (targetRgb.b - sourceRgb.b) * amount,
    g: sourceRgb.g + (targetRgb.g - sourceRgb.g) * amount,
    r: sourceRgb.r + (targetRgb.r - sourceRgb.r) * amount
  });
}

function buildShadesFromColor(color: string) {
  if (!isHexColor(color)) {
    return [];
  }

  const darkMixes = [0.82, 0.7, 0.58, 0.46, 0.34, 0.22, 0.1, 0];
  const lightMixes = [0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84];

  return [
    ...darkMixes.map((amount) => mixHexColor(color, "#000000", amount)),
    ...lightMixes.map((amount) => mixHexColor(color, "#ffffff", amount))
  ];
}

function getPaletteColorForTarget(
  palette: ColorPalette,
  target: ColorTarget,
  theme: KizkattTheme
) {
  const baseColor = getPalettePrimaryColor(palette);
  const darkStrokeSourceColor = getDarkThemeStrokeSourceColor(palette);

  if (target === "backgroundColor" && theme === "dark") {
    return buildShadesFromColor(darkStrokeSourceColor)[2] ?? baseColor;
  }

  if (target === "backgroundColor" && theme === "light") {
    return buildShadesFromColor(darkStrokeSourceColor)[13] ?? baseColor;
  }

  if (target === "strokeColor" && theme === "light") {
    return darkStrokeSourceColor;
  }

  return baseColor;
}

function findPaletteForTargetColor(
  color: string,
  target: ColorTarget,
  theme: KizkattTheme
) {
  return COLOR_PALETTES.find((palette) => {
    const paletteColor = getPaletteColorForTarget(palette, target, theme);

    return (
      paletteColor === color ||
      palette.color === color ||
      (palette.shades as readonly string[]).includes(color) ||
      buildShadesFromColor(paletteColor).includes(color)
    );
  }) ?? findPaletteForColor(color);
}

function completeHexDraft(rawValue: string) {
  const value = rawValue
    .replace(/^#/, "")
    .replace(/[^0-9a-f]/gi, "")
    .slice(0, 6)
    .toLowerCase();

  if (value.length === 0) {
    return "";
  }

  return `#${value.repeat(Math.ceil(6 / value.length)).slice(0, 6)}`;
}

function getSwatchClassName({
  active,
  color,
  isCustomSwatch
}: {
  active: boolean;
  color: string;
  isCustomSwatch?: boolean;
}) {
  return [
    color === "transparent" ? "transparent" : "",
    active ? "is-active" : "",
    isCustomSwatch ? "kizkatt-custom-color-swatch" : ""
  ]
    .filter(Boolean)
    .join(" ");
}

function normalizeStrokeWidth(value: string) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return MIN_STROKE_WIDTH;
  }

  return Math.min(
    MAX_STROKE_WIDTH,
    Math.max(MIN_STROKE_WIDTH, numericValue)
  );
}

function normalizeFillWeight(value: string) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return MIN_FILL_WEIGHT;
  }

  return Math.min(MAX_FILL_WEIGHT, Math.max(MIN_FILL_WEIGHT, numericValue));
}

function normalizeSloppinessGap(value: string) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return MIN_SLOPPINESS_GAP;
  }

  return Math.min(
    MAX_SLOPPINESS_GAP,
    Math.max(MIN_SLOPPINESS_GAP, numericValue)
  );
}

function normalizeOpacity(value: string) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return MIN_OPACITY;
  }

  return Math.min(MAX_OPACITY, Math.max(MIN_OPACITY, numericValue));
}

export function StylePanel({
  onAction,
  onLayerAction,
  onStyleChange,
  style,
  theme
}: StylePanelProps) {
  const [colorPopover, setColorPopover] = useState<ColorPopoverState | null>(
    null
  );

  const applyColor = (
    target: ColorTarget,
    color: string
  ) => {
    onStyleChange({ [target]: color });
  };

  const setCustomShadeBaseColor = (target: ColorTarget, color: string) => {
    setColorPopover((currentPopover) =>
      currentPopover?.target === target
        ? {
            shadeBaseColor: isHexColor(color)
              ? color
              : currentPopover.shadeBaseColor,
            target
          }
        : currentPopover
    );
  };

  const applyCustomColor = (target: ColorTarget, color: string) => {
    applyColor(target, color);
    setCustomShadeBaseColor(target, color);
  };

  const openColorPopover = (target: ColorTarget, color = style[target]) => {
    const palette = findPaletteForTargetColor(color, target, theme);
    const paletteColor = palette
      ? getPaletteColorForTarget(palette, target, theme)
      : undefined;

    applyColor(target, color);

    setColorPopover({
      paletteId:
        palette?.id ??
        colorPopover?.paletteId ??
        DEFAULT_POPOVER_PALETTE.id,
      shadeBaseColor:
        paletteColor ??
        (isHexColor(color) ? color : DEFAULT_POPOVER_PALETTE.color),
      target
    });
  };

  const updateHexColor = (target: ColorTarget, rawValue: string) => {
    const normalizedValue = completeHexDraft(rawValue);

    if (isHexColor(normalizedValue)) {
      applyCustomColor(target, normalizedValue);
    }
  };

  const pickColorFromScreen = async (target: ColorTarget) => {
    const EyeDropper = (window as Window & { EyeDropper?: EyeDropperConstructor })
      .EyeDropper;

    if (!EyeDropper) {
      return;
    }

    const result = await new EyeDropper().open();
    applyCustomColor(target, result.sRGBHex);
  };
  const updateStrokeWidth = (value: string) => {
    onStyleChange({ strokeWidth: normalizeStrokeWidth(value) });
  };
  const updateFillWeight = (value: string) => {
    onStyleChange({ fillWeight: normalizeFillWeight(value) });
  };
  const updateSloppinessGap = (value: string) => {
    onStyleChange({ sloppinessGap: normalizeSloppinessGap(value) });
  };
  const updateOpacity = (value: string) => {
    onStyleChange({ opacity: normalizeOpacity(value) });
  };

  return (
    <aside className="kizkatt-style-panel" aria-label="Element style">
      <label>Background</label>
      <ColorSwatches
        activeColor={style.backgroundColor}
        colors={getQuickColors("backgroundColor", theme)}
        label="Background"
        onColorSelect={(color) => {
          applyColor("backgroundColor", color);
          setColorPopover(null);
        }}
        onCustomColorOpen={(color) => openColorPopover("backgroundColor", color)}
      />
      <label>Stroke</label>
      <ColorSwatches
        activeColor={style.strokeColor}
        colors={getQuickColors("strokeColor", theme)}
        label="Stroke"
        onColorSelect={(color) => {
          applyColor("strokeColor", color);
          setColorPopover(null);
        }}
        onCustomColorOpen={(color) => openColorPopover("strokeColor", color)}
      />
      {colorPopover && (
        <ColorPopover
          activeColor={style[colorPopover.target]}
          activePaletteId={colorPopover.paletteId}
          shadeBaseColor={colorPopover.shadeBaseColor}
          target={colorPopover.target}
          theme={theme}
          onColorSelect={(target, color) => {
            applyColor(target, color);
          }}
          onPaletteColorSelect={(target, color, paletteId) => {
            applyColor(target, color);
            setColorPopover({ paletteId, shadeBaseColor: color, target });
          }}
          onCustomColorSelect={applyCustomColor}
          onHexColorChange={updateHexColor}
          onPickColorFromScreen={pickColorFromScreen}
        />
      )}
      <label>Fill</label>
      <div className="kizkatt-fill-control">
        <div className="kizkatt-segmented kizkatt-icon-segmented">
          {(["solid", "hachure", "crossHatch"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`Fill ${value}`}
              className={(style.fillStyle ?? "solid") === value ? "is-active" : undefined}
              onClick={() => onStyleChange({ fillStyle: value })}
            >
              {FILL_STYLE_ICONS[value]}
            </button>
          ))}
        </div>
        <input
          aria-label="Fill weight"
          type="number"
          min={MIN_FILL_WEIGHT}
          max={MAX_FILL_WEIGHT}
          step={FILL_WEIGHT_STEP}
          value={style.fillWeight ?? DEFAULT_FILL_WEIGHT}
          onChange={(event) => updateFillWeight(event.target.value)}
        />
      </div>
      <label htmlFor="stroke-width">Stroke width</label>
      <div className="kizkatt-numeric-slider-control">
        <input
          id="stroke-width"
          type="range"
          min={MIN_STROKE_WIDTH}
          max={MAX_STROKE_WIDTH}
          value={style.strokeWidth}
          onChange={(event) => updateStrokeWidth(event.target.value)}
        />
        <input
          aria-label="Stroke width value"
          type="number"
          min={MIN_STROKE_WIDTH}
          max={MAX_STROKE_WIDTH}
          value={style.strokeWidth}
          onChange={(event) => updateStrokeWidth(event.target.value)}
        />
      </div>
      <label>Stroke style</label>
      <div className="kizkatt-segmented kizkatt-icon-segmented">
        {(["solid", "dashed", "dotted"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-label={value}
            className={style.strokeStyle === value ? "is-active" : undefined}
            onClick={() => onStyleChange({ strokeStyle: value })}
          >
            {STROKE_STYLE_ICONS[value]}
          </button>
        ))}
      </div>
      <label>Sloppiness</label>
      <div className="kizkatt-sloppiness-control">
        <div className="kizkatt-segmented kizkatt-four-segmented kizkatt-icon-segmented">
          {(["architect", "artist", "cartoonist", "double"] as const).map(
            (value) => (
              <button
                key={value}
                type="button"
                aria-label={`Sloppiness ${value}`}
                className={(style.sloppiness ?? "artist") === value ? "is-active" : undefined}
                onClick={() => onStyleChange({ sloppiness: value })}
              >
                {SLOPPINESS_ICONS[value]}
              </button>
            )
          )}
        </div>
        <input
          aria-label="Sloppiness gap"
          type="number"
          min={MIN_SLOPPINESS_GAP}
          max={MAX_SLOPPINESS_GAP}
          value={style.sloppinessGap ?? DEFAULT_SLOPPINESS_GAP}
          onChange={(event) => updateSloppinessGap(event.target.value)}
        />
      </div>
      <label>Edges</label>
      <div className="kizkatt-segmented kizkatt-two-segmented kizkatt-edge-segmented">
        {(["sharp", "round"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`Edges ${value}`}
            className={style.edgeStyle === value ? "is-active" : undefined}
            onClick={() => onStyleChange({ edgeStyle: value })}
          >
            {EDGE_STYLE_ICONS[value]}
          </button>
        ))}
      </div>
      <label htmlFor="opacity">Opacity</label>
      <div className="kizkatt-numeric-slider-control">
        <input
          id="opacity"
          type="range"
          min={MIN_OPACITY}
          max={MAX_OPACITY}
          value={style.opacity}
          onChange={(event) => updateOpacity(event.target.value)}
        />
        <input
          aria-label="Opacity value"
          type="number"
          min={MIN_OPACITY}
          max={MAX_OPACITY}
          value={style.opacity}
          onChange={(event) => updateOpacity(event.target.value)}
        />
      </div>
      <label>Layers</label>
      <div className="kizkatt-segmented kizkatt-icon-segmented kizkatt-layer-controls">
        {LAYER_ACTIONS.map(({ action, ariaLabel, icon }) => (
          <button
            key={action}
            type="button"
            aria-label={ariaLabel}
            onClick={() => onLayerAction(action)}
          >
            {icon}
          </button>
        ))}
      </div>
      <label>Actions</label>
      <div className="kizkatt-segmented kizkatt-icon-segmented kizkatt-action-controls">
        {ELEMENT_ACTIONS.map(({ action, ariaLabel, icon }) => (
          <button
            key={action}
            type="button"
            aria-label={ariaLabel}
            onClick={() => onAction(action)}
          >
            {icon}
          </button>
        ))}
      </div>
    </aside>
  );
}

function ColorSwatches({
  activeColor,
  colors,
  label,
  onColorSelect,
  onCustomColorOpen
}: {
  activeColor: string;
  colors: readonly string[];
  label: "Background" | "Stroke";
  onColorSelect: (color: string) => void;
  onCustomColorOpen: (color: string) => void;
}) {
  const quickColors = colors.slice(0, QUICK_SWATCH_COUNT);
  const fallbackCustomColor =
    quickColors[QUICK_SWATCH_COUNT - 1] ?? quickColors[0];
  const customColor =
    activeColor === "transparent" ? fallbackCustomColor : activeColor;
  const customAriaLabel = quickColors.includes(customColor)
    ? `${label} custom ${customColor}`
    : `${label} ${customColor}`;

  return (
    <div className="kizkatt-swatches kizkatt-quick-swatches">
      {quickColors.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`${label} ${color}`}
          className={getSwatchClassName({
            active: activeColor === color,
            color
          })}
          style={{
            backgroundColor: color === "transparent" ? undefined : color
          }}
          onClick={() => onColorSelect(color)}
        />
      ))}
      <button
        type="button"
        aria-label={customAriaLabel}
        className={getSwatchClassName({
          active: !quickColors.includes(activeColor),
          color: customColor,
          isCustomSwatch: true
        })}
        style={{
          backgroundColor:
            customColor === "transparent" ? undefined : customColor
        }}
        onClick={() => onCustomColorOpen(customColor)}
      />
    </div>
  );
}

function ColorPopover({
  activeColor,
  activePaletteId,
  onCustomColorSelect,
  onColorSelect,
  onHexColorChange,
  onPaletteColorSelect,
  onPickColorFromScreen,
  shadeBaseColor,
  target,
  theme
}: {
  activeColor: string;
  activePaletteId?: string;
  onColorSelect: (target: ColorTarget, color: string) => void;
  onCustomColorSelect: (target: ColorTarget, color: string) => void;
  onHexColorChange: (target: ColorTarget, rawValue: string) => void;
  onPaletteColorSelect: (
    target: ColorTarget,
    color: string,
    paletteId: string
  ) => void;
  onPickColorFromScreen: (target: ColorTarget) => void;
  shadeBaseColor?: string;
  target: ColorTarget;
  theme: KizkattTheme;
}) {
  const selectedPalette = findPaletteById(activePaletteId);
  const shadePalette =
    selectedPalette ??
    findPaletteForTargetColor(activeColor, target, theme) ??
    DEFAULT_POPOVER_PALETTE;
  const resolvedShadeBaseColor =
    shadeBaseColor ?? getPaletteColorForTarget(shadePalette, target, theme);
  const [hexDraft, setHexDraft] = useState(
    isHexColor(activeColor) ? activeColor.slice(1) : ""
  );
  const [draftShadeBaseColor, setDraftShadeBaseColor] = useState(
    resolvedShadeBaseColor
  );
  const activeShades = buildShadesFromColor(draftShadeBaseColor);

  useEffect(() => {
    if (completeHexDraft(hexDraft) === activeColor.toLowerCase()) {
      return;
    }

    setHexDraft(isHexColor(activeColor) ? activeColor.slice(1) : "");
  }, [activeColor, hexDraft]);

  useEffect(() => {
    setDraftShadeBaseColor(resolvedShadeBaseColor);
  }, [resolvedShadeBaseColor]);

  const updateHexDraft = (rawValue: string) => {
    const nextValue = rawValue
      .replace(/^#/, "")
      .replace(/[^0-9a-f]/gi, "")
      .slice(0, 6);

    setHexDraft(nextValue);
    const normalizedValue = completeHexDraft(nextValue);

    if (isHexColor(normalizedValue)) {
      setDraftShadeBaseColor(normalizedValue);
    }

    onHexColorChange(target, nextValue);
  };

  return (
    <div
      className="kizkatt-color-popover"
      role="dialog"
      aria-label={target === "strokeColor" ? "Stroke colors" : "Background colors"}
    >
      <label>Colors</label>
      <div className="kizkatt-swatches kizkatt-color-grid">
        {COLOR_PALETTES.map((palette, index) => {
          if (index === COLOR_PICKER_PALETTE_INDEX) {
            const nativeColor = isHexColor(activeColor)
              ? activeColor
              : "#e03131";

            return (
              <label
                key="native-color-picker"
                className="kizkatt-native-color-grid-swatch"
                style={{ backgroundColor: nativeColor }}
              >
                <input
                  aria-label={`${target} native color picker`}
                  type="color"
                  value={nativeColor}
                  onChange={(event) =>
                    onCustomColorSelect(target, event.target.value)
                  }
                />
              </label>
            );
          }

          const color = getPaletteColorForTarget(palette, target, theme);

          return (
            <button
              key={palette.id}
              type="button"
              aria-label={`${target} palette ${color}`}
              className={[
                color === "transparent" ? "transparent" : "",
                selectedPalette?.id === palette.id ? "is-active" : ""
              ].join(" ")}
              style={{
                backgroundColor: color === "transparent" ? undefined : color
              }}
              onClick={() => {
                onPaletteColorSelect(target, color, palette.id);
              }}
            />
          );
        })}
      </div>
      <label>Shades</label>
      <div className="kizkatt-swatches">
        {activeShades.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`${target} shade ${color}`}
            className={activeColor === color ? "is-active" : undefined}
            style={{ backgroundColor: color }}
            onClick={() => onColorSelect(target, color)}
          />
        ))}
      </div>
      <label htmlFor="color-hex">Hex code</label>
      <div className="kizkatt-hex-input">
        <span>#</span>
        <input
          id="color-hex"
          aria-label="Hex color"
          maxLength={6}
          placeholder="transparent"
          value={hexDraft}
          onChange={(event) => updateHexDraft(event.target.value)}
        />
      </div>
      <div className="kizkatt-color-tools">
        <button
          type="button"
          aria-label={`${target} eyedropper`}
          onClick={() => void onPickColorFromScreen(target)}
        >
          {EyedropperIcon}
        </button>
      </div>
    </div>
  );
}
