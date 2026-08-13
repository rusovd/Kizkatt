import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

import {
  COLOR_PALETTES,
  COLOR_PANEL_COLUMN_COUNT,
  DARK_THEME_BACKGROUND_COLORS,
  DARK_THEME_STROKE_COLORS,
  DEFAULT_FILL_STYLE,
  DEFAULT_FILL_WEIGHT,
  DEFAULT_OPACITY,
  DEFAULT_SELECTED_SLOPPINESS,
  DEFAULT_SLOPPINESS_GAP,
  DEFAULT_STROKE_STYLE,
  DEFAULT_STROKE_WIDTH,
  EMPTY_COLLECTION_LENGTH,
  FIRST_ARRAY_INDEX,
  LIGHT_THEME_BACKGROUND_COLORS,
  LIGHT_THEME_STROKE_COLORS,
  TRANSPARENT_COLOR
} from "../../config/constants";
import { isHexColor } from "../../geometry";
import { canElementUseBackground } from "../../model/element";
import { useI18n } from "../../i18n";
import {
  BringForwardIcon,
  BringToFrontIcon,
  ClosedPathIcon,
  DuplicateIcon,
  EdgeRoundIcon,
  EdgeSharpIcon,
  EyedropperIcon,
  FillCrossHatchIcon,
  FillHachureIcon,
  FillSolidIcon,
  LinkIcon,
  PaletteIcon,
  SendBackwardIcon,
  SendToBackIcon,
  SloppinessArchitectIcon,
  SloppinessArtistIcon,
  SloppinessCartoonistIcon,
  SloppinessDoubleIcon,
  StrokeStyleDashedIcon,
  StrokeStyleDashDotIcon,
  StrokeStyleDottedIcon,
  StrokeStyleSolidIcon,
  StrokeStyleStitchedIcon,
  StrokeStyleWavyIcon,
  StrokeStyleZigzagIcon,
  TrashIcon
} from "../icons";
import { DraggablePanel } from "../positioning/DraggablePanel";
import { PanelDragHandle } from "../positioning/PanelDragHandle";
import {
  closeOtherFloatingPanels,
  useActiveFloatingPanel,
  useCloseOtherFloatingPanels
} from "../overlays/floatingPanels";
import type {
  ColorPopoverState,
  ColorTarget,
  KizkattElement,
  KizkattTheme,
  StyleState,
  Tool
} from "../../model/types";

type ColorPalette = (typeof COLOR_PALETTES)[number];
type EyeDropperConstructor = new () => {
  open: () => Promise<{ sRGBHex: string }>;
};

type StylePanelProps = {
  activeTool: Tool;
  canToggleClosedPath: boolean;
  closedPath: boolean;
  colorColumnCount?: number;
  onAction: (action: "delete" | "duplicate" | "link") => void;
  onClosedPathChange: (closed: boolean) => void;
  onLayerAction: (action: "back" | "backward" | "forward" | "front") => void;
  onStyleChange: (
    patch: Partial<StyleState>,
    options?: { transient?: boolean }
  ) => void;
  onStyleChangeEnd: () => void;
  selectedElements: KizkattElement[];
  style: StyleState;
  theme: KizkattTheme;
};

const QUICK_SWATCH_COUNT = 5;
const QUICK_CUSTOM_FALLBACK_OFFSET = 1;
const COLOR_CHANNEL_RADIX = 16;
const HEX_BYTE_LENGTH = 2;
const HEX_FULL_LENGTH = 6;
const HEX_PREFIX = "#";
const HEX_PREFIX_PATTERN = /^#/;
const HEX_COLOR_CHARACTER_PATTERN = /[^0-9a-f]/gi;
const EMPTY_HEX_DRAFT = "";
const BLACK_HEX_COLOR = "#000000";
const WHITE_HEX_COLOR = "#ffffff";
const DEFAULT_POPOVER_PALETTE_ID = "violet";
const DEFAULT_POPOVER_PALETTE_INDEX = 0;
const DARK_BACKGROUND_SHADE_INDEX = 2;
const LIGHT_BACKGROUND_SHADE_INDEX = 13;
const STROKE_COLOR_INDEX = {
  blue: 3,
  gray: 0,
  green: 2,
  red: 1,
  violet: 5,
  yellow: 4
} as const;
const RGB_CHANNEL = {
  blueEnd: 6,
  blueStart: 4,
  greenEnd: 4,
  greenStart: 2,
  redEnd: 2,
  redStart: 0
} as const;
const DARK_SHADE_MIXES = [0.82, 0.7, 0.58, 0.46, 0.34, 0.22, 0.1, 0];
const LIGHT_SHADE_MIXES = [0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84];
const DEFAULT_POPOVER_PALETTE =
  COLOR_PALETTES.find((palette) => palette.id === DEFAULT_POPOVER_PALETTE_ID) ??
  COLOR_PALETTES[DEFAULT_POPOVER_PALETTE_INDEX];
const FILL_STYLE_OPTIONS = ["solid", "hachure", "crossHatch"] as const;
const STROKE_STYLE_OPTIONS = [
  "solid",
  "dashed",
  "stitched",
  "dotted",
  "dashDot",
  "wavy",
  "zigzag"
] as const;
const SLOPPINESS_OPTIONS = [
  "architect",
  "artist",
  "cartoonist",
  "double"
] as const;
const EDGE_STYLE_OPTIONS = ["sharp", "round"] as const;
const SHARP_EDGE_OPTION = EDGE_STYLE_OPTIONS[0];
const STROKE_STYLE_ICONS = {
  dashed: StrokeStyleDashedIcon,
  dashDot: StrokeStyleDashDotIcon,
  dotted: StrokeStyleDottedIcon,
  solid: StrokeStyleSolidIcon,
  stitched: StrokeStyleStitchedIcon,
  wavy: StrokeStyleWavyIcon,
  zigzag: StrokeStyleZigzagIcon
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
const FILL_STYLE_LABEL_KEYS = {
  crossHatch: "fillCrossHatch",
  hachure: "fillHachure",
  solid: "fillSolid"
} as const;
const STROKE_STYLE_LABEL_KEYS = {
  dashed: "strokeStyleDashed",
  dashDot: "strokeStyleDashDot",
  dotted: "strokeStyleDotted",
  solid: "strokeStyleSolid",
  stitched: "strokeStyleStitched",
  wavy: "strokeStyleWavy",
  zigzag: "strokeStyleZigzag"
} as const;
const SLOPPINESS_LABEL_KEYS = {
  architect: "sloppinessArchitect",
  artist: "sloppinessArtist",
  cartoonist: "sloppinessCartoonist",
  double: "sloppinessDouble"
} as const;
const LAYER_ACTIONS = [
  { action: "back", labelKey: "sendToBack", icon: SendToBackIcon },
  { action: "backward", labelKey: "sendBackward", icon: SendBackwardIcon },
  { action: "forward", labelKey: "bringForward", icon: BringForwardIcon },
  { action: "front", labelKey: "bringToFront", icon: BringToFrontIcon }
] as const;
const ELEMENT_ACTIONS = [
  { action: "duplicate", labelKey: "duplicate", icon: DuplicateIcon },
  { action: "delete", labelKey: "delete", icon: TrashIcon },
  { action: "link", labelKey: "link", icon: LinkIcon }
] as const;
const MIN_STROKE_WIDTH = 0;
const MAX_STROKE_WIDTH = 50;
const MIN_FILL_WEIGHT = 0.25;
const MAX_FILL_WEIGHT = 6;
const FILL_WEIGHT_STEP = 0.25;
const MIN_SLOPPINESS_GAP = 0;
const MAX_SLOPPINESS_GAP = 80;
const MIN_OPACITY = 0;
const MAX_OPACITY = DEFAULT_OPACITY;
const DARK_THEME_STROKE_SOURCE_BY_PALETTE_ID: Record<string, string> = {
  blue: DARK_THEME_STROKE_COLORS[STROKE_COLOR_INDEX.blue],
  gray: DARK_THEME_STROKE_COLORS[STROKE_COLOR_INDEX.gray],
  green: DARK_THEME_STROKE_COLORS[STROKE_COLOR_INDEX.green],
  red: DARK_THEME_STROKE_COLORS[STROKE_COLOR_INDEX.red],
  violet: DARK_THEME_STROKE_COLORS[STROKE_COLOR_INDEX.violet],
  yellow: DARK_THEME_STROKE_COLORS[STROKE_COLOR_INDEX.yellow]
};
const STYLE_PANEL_FLOATING_PANEL_SOURCE = "style-panel";

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
  const hex = color.slice(HEX_PREFIX.length);

  return {
    b: Number.parseInt(
      hex.slice(RGB_CHANNEL.blueStart, RGB_CHANNEL.blueEnd),
      COLOR_CHANNEL_RADIX
    ),
    g: Number.parseInt(
      hex.slice(RGB_CHANNEL.greenStart, RGB_CHANNEL.greenEnd),
      COLOR_CHANNEL_RADIX
    ),
    r: Number.parseInt(
      hex.slice(RGB_CHANNEL.redStart, RGB_CHANNEL.redEnd),
      COLOR_CHANNEL_RADIX
    )
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
      Math.round(value)
        .toString(COLOR_CHANNEL_RADIX)
        .padStart(HEX_BYTE_LENGTH, "0")
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

  return [
    ...DARK_SHADE_MIXES.map((amount) =>
      mixHexColor(color, BLACK_HEX_COLOR, amount)
    ),
    ...LIGHT_SHADE_MIXES.map((amount) =>
      mixHexColor(color, WHITE_HEX_COLOR, amount)
    )
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
    return (
      buildShadesFromColor(darkStrokeSourceColor)[DARK_BACKGROUND_SHADE_INDEX] ??
      baseColor
    );
  }

  if (target === "backgroundColor" && theme === "light") {
    return (
      buildShadesFromColor(darkStrokeSourceColor)[LIGHT_BACKGROUND_SHADE_INDEX] ??
      baseColor
    );
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
    .replace(HEX_PREFIX_PATTERN, EMPTY_HEX_DRAFT)
    .replace(HEX_COLOR_CHARACTER_PATTERN, EMPTY_HEX_DRAFT)
    .slice(0, HEX_FULL_LENGTH)
    .toLowerCase();

  if (value.length === EMPTY_COLLECTION_LENGTH) {
    return EMPTY_HEX_DRAFT;
  }

  return `${HEX_PREFIX}${value
    .repeat(Math.ceil(HEX_FULL_LENGTH / value.length))
    .slice(FIRST_ARRAY_INDEX, HEX_FULL_LENGTH)}`;
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
    color === TRANSPARENT_COLOR ? TRANSPARENT_COLOR : EMPTY_HEX_DRAFT,
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

function isBackgroundControlDisabled(
  activeTool: Tool,
  selectedElements: readonly KizkattElement[]
) {
  if (selectedElements.length > EMPTY_COLLECTION_LENGTH) {
    return selectedElements.some((element) => !canElementUseBackground(element));
  }

  return (
    activeTool === "arrow" ||
    activeTool === "draw" ||
    activeTool === "image" ||
    activeTool === "line"
  );
}

export function StylePanel({
  activeTool,
  canToggleClosedPath,
  closedPath,
  colorColumnCount = COLOR_PANEL_COLUMN_COUNT,
  onAction,
  onClosedPathChange,
  onLayerAction,
  onStyleChange,
  onStyleChangeEnd,
  selectedElements,
  style,
  theme
}: StylePanelProps) {
  const { strings } = useI18n();
  const tooltips = strings.stylePanel.tooltips;
  const [colorPopover, setColorPopover] = useState<ColorPopoverState | null>(
    null
  );
  const [activeFloatingPanel, setActiveFloatingPanelSource] = useState<
    string | null
  >(null);
  const continuousStyleChangeActiveRef = useRef(false);
  const closeColorPopover = () => setColorPopover(null);

  const beginContinuousStyleChange = () => {
    continuousStyleChangeActiveRef.current = true;
  };

  const endContinuousStyleChange = () => {
    if (!continuousStyleChangeActiveRef.current) {
      return;
    }

    continuousStyleChangeActiveRef.current = false;
    onStyleChangeEnd();
  };

  const applyContinuousStyleChange = (patch: Partial<StyleState>) => {
    onStyleChange(
      patch,
      continuousStyleChangeActiveRef.current
        ? { transient: true }
        : undefined
    );
  };

  useActiveFloatingPanel(setActiveFloatingPanelSource);
  useCloseOtherFloatingPanels(
    STYLE_PANEL_FLOATING_PANEL_SOURCE,
    closeColorPopover
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
    if (target === "backgroundColor" && backgroundControlDisabled) {
      return;
    }

    const palette = findPaletteForTargetColor(color, target, theme);
    const paletteColor = palette
      ? getPaletteColorForTarget(palette, target, theme)
      : undefined;

    applyColor(target, color);
    closeOtherFloatingPanels(STYLE_PANEL_FLOATING_PANEL_SOURCE);

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
  const updateStrokeWidthContinuously = (value: string) => {
    applyContinuousStyleChange({ strokeWidth: normalizeStrokeWidth(value) });
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
  const updateOpacityContinuously = (value: string) => {
    applyContinuousStyleChange({ opacity: normalizeOpacity(value) });
  };
  const backgroundControlDisabled = isBackgroundControlDisabled(
    activeTool,
    selectedElements
  );

  if (activeFloatingPanel === "toolbar") {
    return null;
  }

  return (
    <DraggablePanel id="style-panel">
      <aside
        className="kizkatt-style-panel"
        aria-label={strings.stylePanel.elementStyle}
      >
        <PanelDragHandle
          placement="top"
          title={strings.settings.tooltips.panelDragHandle}
        />
        <label>{strings.stylePanel.background}</label>
        <ColorSwatches
          activeColor={style.backgroundColor}
          colors={getQuickColors("backgroundColor", theme)}
          disabled={backgroundControlDisabled}
          label={strings.stylePanel.background}
          onNativeColorSelect={(color) =>
            applyCustomColor("backgroundColor", color)
          }
          onColorSelect={(color) => {
            applyColor("backgroundColor", color);
            setColorPopover(null);
          }}
          onCustomColorOpen={(color) =>
            openColorPopover("backgroundColor", color)
          }
        />
        <label>{strings.stylePanel.stroke}</label>
        <ColorSwatches
          activeColor={style.strokeColor}
          colors={getQuickColors("strokeColor", theme)}
          label={strings.stylePanel.stroke}
          onNativeColorSelect={(color) => applyCustomColor("strokeColor", color)}
          onColorSelect={(color) => {
            applyColor("strokeColor", color);
            setColorPopover(null);
          }}
          onCustomColorOpen={(color) => openColorPopover("strokeColor", color)}
        />
        {colorPopover &&
          !(
            colorPopover.target === "backgroundColor" &&
            backgroundControlDisabled
          ) && (
            <ColorPopover
              activeColor={style[colorPopover.target]}
              activePaletteId={colorPopover.paletteId}
              colorColumnCount={colorColumnCount}
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
              onHexColorChange={updateHexColor}
              onPickColorFromScreen={pickColorFromScreen}
            />
          )}
      <label>{strings.stylePanel.fill}</label>
      <div
        className={[
          "kizkatt-fill-control",
          canToggleClosedPath ? "kizkatt-fill-control--with-path" : ""
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="kizkatt-segmented kizkatt-icon-segmented">
          {FILL_STYLE_OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              aria-label={strings.stylePanel[FILL_STYLE_LABEL_KEYS[value]]}
              title={tooltips[FILL_STYLE_LABEL_KEYS[value]]}
              className={
                (style.fillStyle ?? DEFAULT_FILL_STYLE) === value
                  ? "is-active"
                  : undefined
              }
              onClick={() => onStyleChange({ fillStyle: value })}
            >
              {FILL_STYLE_ICONS[value]}
            </button>
          ))}
        </div>
        {canToggleClosedPath && (
          <button
            type="button"
            className={closedPath ? "is-active" : undefined}
            aria-label={strings.stylePanel.closePath}
            title={tooltips.closePath}
            onClick={() => onClosedPathChange(!closedPath)}
          >
            {ClosedPathIcon}
          </button>
        )}
        <input
          aria-label={strings.stylePanel.fillWeight}
          title={tooltips.fillWeight}
          type="number"
          min={MIN_FILL_WEIGHT}
          max={MAX_FILL_WEIGHT}
          step={FILL_WEIGHT_STEP}
          value={style.fillWeight ?? DEFAULT_FILL_WEIGHT}
          onChange={(event) => updateFillWeight(event.target.value)}
        />
      </div>
      <label htmlFor="stroke-width">{strings.stylePanel.strokeWidth}</label>
      <div className="kizkatt-numeric-slider-control">
        <input
          id="stroke-width"
          type="range"
          title={tooltips.strokeWidth}
          min={MIN_STROKE_WIDTH}
          max={MAX_STROKE_WIDTH}
          value={style.strokeWidth ?? DEFAULT_STROKE_WIDTH}
          onBlur={endContinuousStyleChange}
          onChange={(event) => updateStrokeWidthContinuously(event.target.value)}
          onKeyDown={beginContinuousStyleChange}
          onKeyUp={endContinuousStyleChange}
          onPointerCancel={endContinuousStyleChange}
          onPointerDown={beginContinuousStyleChange}
          onPointerUp={endContinuousStyleChange}
        />
        <input
          aria-label={strings.stylePanel.strokeWidthValue}
          title={tooltips.strokeWidthValue}
          type="number"
          min={MIN_STROKE_WIDTH}
          max={MAX_STROKE_WIDTH}
          value={style.strokeWidth ?? DEFAULT_STROKE_WIDTH}
          onChange={(event) => updateStrokeWidth(event.target.value)}
        />
      </div>
      <label>{strings.stylePanel.strokeStyle}</label>
      <div className="kizkatt-segmented kizkatt-stroke-style-segmented kizkatt-icon-segmented">
        {STROKE_STYLE_OPTIONS.map((value) => (
          <button
            key={value}
            type="button"
            aria-label={strings.stylePanel[STROKE_STYLE_LABEL_KEYS[value]]}
            title={tooltips[STROKE_STYLE_LABEL_KEYS[value]]}
            className={
              (style.strokeStyle ?? DEFAULT_STROKE_STYLE) === value
                ? "is-active"
                : undefined
            }
            onClick={() => onStyleChange({ strokeStyle: value })}
          >
            {STROKE_STYLE_ICONS[value]}
          </button>
        ))}
      </div>
      <label>{strings.stylePanel.sloppiness}</label>
      <div className="kizkatt-sloppiness-control">
        <div className="kizkatt-segmented kizkatt-four-segmented kizkatt-icon-segmented">
          {SLOPPINESS_OPTIONS.map(
            (value) => (
              <button
                key={value}
                type="button"
                aria-label={strings.stylePanel[SLOPPINESS_LABEL_KEYS[value]]}
                title={tooltips[SLOPPINESS_LABEL_KEYS[value]]}
                className={
                  (style.sloppiness ?? DEFAULT_SELECTED_SLOPPINESS) === value
                    ? "is-active"
                    : undefined
                }
                onClick={() => onStyleChange({ sloppiness: value })}
              >
                {SLOPPINESS_ICONS[value]}
              </button>
            )
          )}
        </div>
        <input
          aria-label={strings.stylePanel.sloppinessGap}
          title={tooltips.sloppinessGap}
          type="number"
          min={MIN_SLOPPINESS_GAP}
          max={MAX_SLOPPINESS_GAP}
          value={style.sloppinessGap ?? DEFAULT_SLOPPINESS_GAP}
          onChange={(event) => updateSloppinessGap(event.target.value)}
        />
      </div>
      <label>{strings.stylePanel.edges}</label>
      <div className="kizkatt-segmented kizkatt-two-segmented kizkatt-edge-segmented">
        {EDGE_STYLE_OPTIONS.map((value) => (
          <button
            key={value}
            type="button"
            aria-label={
              value === SHARP_EDGE_OPTION
                ? strings.stylePanel.edgeSharp
                : strings.stylePanel.edgeRound
            }
            title={
              value === SHARP_EDGE_OPTION
                ? tooltips.edgeSharp
                : tooltips.edgeRound
            }
            className={style.edgeStyle === value ? "is-active" : undefined}
            onClick={() => onStyleChange({ edgeStyle: value })}
          >
            {EDGE_STYLE_ICONS[value]}
          </button>
        ))}
      </div>
      <label htmlFor="opacity">{strings.stylePanel.opacity}</label>
      <div className="kizkatt-numeric-slider-control">
        <input
          id="opacity"
          type="range"
          title={tooltips.opacity}
          min={MIN_OPACITY}
          max={MAX_OPACITY}
          value={style.opacity ?? DEFAULT_OPACITY}
          onBlur={endContinuousStyleChange}
          onChange={(event) => updateOpacityContinuously(event.target.value)}
          onKeyDown={beginContinuousStyleChange}
          onKeyUp={endContinuousStyleChange}
          onPointerCancel={endContinuousStyleChange}
          onPointerDown={beginContinuousStyleChange}
          onPointerUp={endContinuousStyleChange}
        />
        <input
          aria-label={strings.stylePanel.opacityValue}
          title={tooltips.opacityValue}
          type="number"
          min={MIN_OPACITY}
          max={MAX_OPACITY}
          value={style.opacity ?? DEFAULT_OPACITY}
          onChange={(event) => updateOpacity(event.target.value)}
        />
      </div>
      <label>{strings.stylePanel.layers}</label>
      <div className="kizkatt-segmented kizkatt-icon-segmented kizkatt-layer-controls">
        {LAYER_ACTIONS.map(({ action, labelKey, icon }) => (
          <button
            key={action}
            type="button"
            aria-label={strings.stylePanel[labelKey]}
            title={tooltips[labelKey]}
            onClick={() => onLayerAction(action)}
          >
            {icon}
          </button>
        ))}
      </div>
      <label>{strings.stylePanel.actions}</label>
      <div className="kizkatt-segmented kizkatt-icon-segmented kizkatt-action-controls">
        {ELEMENT_ACTIONS.map(({ action, labelKey, icon }) => (
          <button
            key={action}
            type="button"
            aria-label={strings.stylePanel[labelKey]}
            title={tooltips[labelKey]}
            onClick={() => onAction(action)}
          >
            {icon}
          </button>
        ))}
      </div>
      </aside>
    </DraggablePanel>
  );
}

function ColorSwatches({
  activeColor,
  colors,
  disabled = false,
  label,
  onColorSelect,
  onCustomColorOpen,
  onNativeColorSelect
}: {
  activeColor: string;
  colors: readonly string[];
  disabled?: boolean;
  label: string;
  onColorSelect: (color: string) => void;
  onCustomColorOpen: (color: string) => void;
  onNativeColorSelect: (color: string) => void;
}) {
  const { strings } = useI18n();
  const tooltips = strings.stylePanel.tooltips;
  const quickColors = colors.slice(0, QUICK_SWATCH_COUNT);
  const fallbackCustomColor =
    quickColors[QUICK_SWATCH_COUNT - QUICK_CUSTOM_FALLBACK_OFFSET] ??
    quickColors[FIRST_ARRAY_INDEX];
  const customColor =
    activeColor === TRANSPARENT_COLOR ? fallbackCustomColor : activeColor;
  const customAriaLabel = quickColors.includes(customColor)
    ? `${label} custom ${customColor}`
    : `${label} ${customColor}`;
  const nativeColor = isHexColor(customColor) ? customColor : BLACK_HEX_COLOR;

  return (
    <div className="kizkatt-swatches kizkatt-quick-swatches">
      {quickColors.map((color) => (
        <button
          key={color}
          type="button"
          aria-label={`${label} ${color}`}
          title={`${
            label === strings.stylePanel.stroke
              ? tooltips.strokeColor
              : tooltips.backgroundColor
          } ${color}`}
          disabled={disabled}
          className={getSwatchClassName({
            active: activeColor === color,
            color
          })}
          style={{
            backgroundColor: color === TRANSPARENT_COLOR ? undefined : color
          }}
          onClick={() => {
            if (!disabled) {
              onColorSelect(color);
            }
          }}
        />
      ))}
      <button
        type="button"
        aria-label={customAriaLabel}
        title={`${tooltips.customColor} ${label}`}
        disabled={disabled}
        className={getSwatchClassName({
          active: !quickColors.includes(activeColor),
          color: customColor,
          isCustomSwatch: true
        })}
        style={{
          backgroundColor:
            customColor === TRANSPARENT_COLOR ? undefined : customColor
        }}
        onClick={() => {
          if (!disabled) {
            onCustomColorOpen(customColor);
          }
        }}
      />
      <label
        className={[
          "kizkatt-palette-swatch",
          disabled ? "is-disabled" : ""
        ]
          .filter(Boolean)
          .join(" ")}
        title={`${label} ${tooltips.nativeColorPicker}`}
      >
        {PaletteIcon}
        <input
          aria-label={`${label} ${strings.stylePanel.nativeColorPicker}`}
          title={`${label} ${tooltips.nativeColorPicker}`}
          disabled={disabled}
          type="color"
          value={nativeColor}
          onChange={(event) => onNativeColorSelect(event.target.value)}
        />
      </label>
    </div>
  );
}

function ColorPopover({
  activeColor,
  activePaletteId,
  colorColumnCount,
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
  colorColumnCount: number;
  onColorSelect: (target: ColorTarget, color: string) => void;
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
  const { strings } = useI18n();
  const tooltips = strings.stylePanel.tooltips;
  const selectedPalette = findPaletteById(activePaletteId);
  const shadePalette =
    selectedPalette ??
    findPaletteForTargetColor(activeColor, target, theme) ??
    DEFAULT_POPOVER_PALETTE;
  const resolvedShadeBaseColor =
    shadeBaseColor ?? getPaletteColorForTarget(shadePalette, target, theme);
  const [hexDraft, setHexDraft] = useState(
    isHexColor(activeColor) ? activeColor.slice(HEX_PREFIX.length) : EMPTY_HEX_DRAFT
  );
  const [draftShadeBaseColor, setDraftShadeBaseColor] = useState(
    resolvedShadeBaseColor
  );
  const activeShades = buildShadesFromColor(draftShadeBaseColor);

  useEffect(() => {
    if (completeHexDraft(hexDraft) === activeColor.toLowerCase()) {
      return;
    }

        setHexDraft(
          isHexColor(activeColor)
            ? activeColor.slice(HEX_PREFIX.length)
            : EMPTY_HEX_DRAFT
        );
  }, [activeColor, hexDraft]);

  useEffect(() => {
    setDraftShadeBaseColor(resolvedShadeBaseColor);
  }, [resolvedShadeBaseColor]);

  const updateHexDraft = (rawValue: string) => {
    const nextValue = rawValue
      .replace(HEX_PREFIX_PATTERN, EMPTY_HEX_DRAFT)
      .replace(HEX_COLOR_CHARACTER_PATTERN, EMPTY_HEX_DRAFT)
      .slice(FIRST_ARRAY_INDEX, HEX_FULL_LENGTH);

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
      aria-label={
        target === "strokeColor"
          ? strings.stylePanel.strokeColors
          : strings.stylePanel.backgroundColors
      }
      style={
        {
          "--kizkatt-color-columns": colorColumnCount
        } as CSSProperties
      }
    >
      <label>{strings.stylePanel.colors}</label>
      <div className="kizkatt-swatches kizkatt-color-grid">
        {COLOR_PALETTES.map((palette) => {
          const color = getPaletteColorForTarget(palette, target, theme);

          return (
            <button
              key={palette.id}
              type="button"
              aria-label={`${target} palette ${color}`}
              title={`${tooltips.paletteColor} ${color}`}
              className={[
                color === TRANSPARENT_COLOR ? TRANSPARENT_COLOR : EMPTY_HEX_DRAFT,
                selectedPalette?.id === palette.id ? "is-active" : ""
              ].join(" ")}
              style={{
                backgroundColor: color === TRANSPARENT_COLOR ? undefined : color
              }}
              onClick={() => {
                onPaletteColorSelect(target, color, palette.id);
              }}
            />
          );
        })}
      </div>
      <label>{strings.stylePanel.shades}</label>
      <div className="kizkatt-swatches kizkatt-color-grid">
        {activeShades.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`${target} shade ${color}`}
            title={`${tooltips.shadeColor} ${color}`}
            className={activeColor === color ? "is-active" : undefined}
            style={{ backgroundColor: color }}
            onClick={() => onColorSelect(target, color)}
          />
        ))}
      </div>
      <label htmlFor="color-hex">{strings.stylePanel.hexCode}</label>
      <div className="kizkatt-hex-input">
        <span>#</span>
        <input
          id="color-hex"
          aria-label={strings.stylePanel.hexColor}
          title={tooltips.hexColor}
          maxLength={HEX_FULL_LENGTH}
          placeholder={strings.stylePanel.transparent}
          value={hexDraft}
          onChange={(event) => updateHexDraft(event.target.value)}
        />
      </div>
      <div className="kizkatt-color-tools">
        <button
          type="button"
          aria-label={`${target} ${strings.stylePanel.eyedropper}`}
          title={tooltips.eyedropper}
          onClick={() => void onPickColorFromScreen(target)}
        >
          {EyedropperIcon}
        </button>
      </div>
    </div>
  );
}
