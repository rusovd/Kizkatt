import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ColorPicker } from "../../components/ColorPicker";
import type { ColorPickerMode } from "../../components/ColorPicker";

import {
  COLOR_PALETTES,
  COLOR_PANEL_COLUMN_COUNT,
  DARK_THEME_BACKGROUND_COLORS,
  DARK_THEME_STROKE_COLORS,
  EMPTY_COLLECTION_LENGTH,
  FIRST_ARRAY_INDEX,
  LIGHT_THEME_BACKGROUND_COLORS,
  LIGHT_THEME_STROKE_COLORS,
  TRANSPARENT_COLOR
} from "../../config/constants";
import { STYLING_PANEL_MIN_SIZE } from "../../config/defaultSettings";
import {
  canElementUseBackground,
  isHexColor,
  mixHexColor
} from "kizkatt-graphic-engine";
import { useI18n } from "../../i18n";
import {
  CloseIcon,
  EyedropperIcon,
  PaletteIcon,
  StrokeStyleSolidIcon
} from "../icons";
import { Panel } from "../../components/Panel";
import { useGraphicEditorSettings } from "../settings/GraphicEditorSettings";
import { FeatureGroup } from "../../components/FeatureGroup";
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

type StylingPanelProps = {
  activeTool: Tool;
  colorColumnCount?: number;
  onStyleChange: (
    patch: Partial<StyleState>,
    options?: { transient?: boolean }
  ) => void;
  selectedElements: KizkattElement[];
  style: StyleState;
  theme: KizkattTheme;
};

const BASE_QUICK_SWATCH_COUNT = DARK_THEME_STROKE_COLORS.length + 1;
const COMPACT_QUICK_SWATCH_COUNT = BASE_QUICK_SWATCH_COUNT;
const EXPANDED_QUICK_SWATCH_COUNT = BASE_QUICK_SWATCH_COUNT + 2;
const QUICK_SWATCH_SIZE = 20;
const QUICK_SWATCH_GAP = 5;
const ADAPTIVE_SHADE_INDICES = [0, 5, 11, 17, 23] as const;
const REDUNDANT_NEUTRAL_PALETTE_IDS = new Set(["black", "white"]);
const EMPTY_HEX_DRAFT = "";
const BLACK_HEX_COLOR = "#000000";
const WHITE_HEX_COLOR = "#ffffff";
const DEFAULT_POPOVER_PALETTE_ID = "violet";
const DEFAULT_POPOVER_PALETTE_INDEX = 0;
const DARK_BACKGROUND_SHADE_INDEX = 4;
const LIGHT_BACKGROUND_SHADE_INDEX = 20;
const STROKE_COLOR_INDEX = {
  blue: 3,
  gray: 0,
  green: 2,
  red: 1,
  violet: 5,
  yellow: 4
} as const;
const DARK_SHADE_MIXES = [
  0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42, 0.34, 0.26, 0.18, 0.1, 0
];
const LIGHT_SHADE_MIXES = [
  0.08, 0.16, 0.24, 0.32, 0.4, 0.48, 0.56, 0.64, 0.72, 0.8, 0.88, 0.96
];
const DEFAULT_POPOVER_PALETTE =
  COLOR_PALETTES.find((palette) => palette.id === DEFAULT_POPOVER_PALETTE_ID) ??
  COLOR_PALETTES[DEFAULT_POPOVER_PALETTE_INDEX];
const DARK_THEME_STROKE_SOURCE_BY_PALETTE_ID: Record<string, string> = {
  blue: DARK_THEME_STROKE_COLORS[STROKE_COLOR_INDEX.blue],
  gray: DARK_THEME_STROKE_COLORS[STROKE_COLOR_INDEX.gray],
  green: DARK_THEME_STROKE_COLORS[STROKE_COLOR_INDEX.green],
  red: DARK_THEME_STROKE_COLORS[STROKE_COLOR_INDEX.red],
  violet: DARK_THEME_STROKE_COLORS[STROKE_COLOR_INDEX.violet],
  yellow: DARK_THEME_STROKE_COLORS[STROKE_COLOR_INDEX.yellow]
};
const STYLING_PANEL_FLOATING_PANEL_SOURCE = "style-panel";
const COLOR_PICKER_MODE_STORAGE_KEY =
  "kizkatt:graphic-editor:styling:color-picker-mode";

function readStoredPickerMode(): ColorPickerMode | null {
  const storedMode = window.localStorage.getItem(
    COLOR_PICKER_MODE_STORAGE_KEY
  );

  return storedMode === "hex" || storedMode === "rgba" || storedMode === "cmyk"
    ? storedMode
    : null;
}

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

function getQuickColors(target: ColorTarget, theme: KizkattTheme) {
  let colors: readonly string[];

  if (target === "backgroundColor") {
    if (theme === "dark") {
      colors = DARK_THEME_BACKGROUND_COLORS;
    } else {
      colors = LIGHT_THEME_BACKGROUND_COLORS;
    }
  } else {
    colors = theme === "dark"
      ? DARK_THEME_STROKE_COLORS
      : LIGHT_THEME_STROKE_COLORS;
  }

  const opaqueColors = colors.filter((color) => color !== TRANSPARENT_COLOR);

  if (opaqueColors.length < DARK_THEME_STROKE_COLORS.length) {
    opaqueColors.push(
      getPaletteColorForTarget(DEFAULT_POPOVER_PALETTE, target, theme)
    );
  }

  return [TRANSPARENT_COLOR, ...opaqueColors];
}

function getAdaptiveQuickColors(target: ColorTarget, theme: KizkattTheme) {
  const quickColors = getQuickColors(target, theme);
  const adaptiveShades = COLOR_PALETTES.filter(
    (palette) =>
      palette.id !== TRANSPARENT_COLOR &&
      !REDUNDANT_NEUTRAL_PALETTE_IDS.has(palette.id)
  ).flatMap((palette) => {
    const paletteColor = getPaletteColorForTarget(palette, target, theme);
    const shades = buildShadesFromColor(paletteColor);

    return ADAPTIVE_SHADE_INDICES.map(
      (shadeIndex) => shades[shadeIndex] ?? paletteColor
    );
  });

  return Array.from(new Set([...quickColors, ...adaptiveShades]));
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
    activeTool === "line" ||
    activeTool === "polyline"
  );
}

export function StylingPanel({
  activeTool,
  colorColumnCount = COLOR_PANEL_COLUMN_COUNT,
  onStyleChange,
  selectedElements,
  style,
  theme
}: StylingPanelProps) {
  const { strings } = useI18n();
  const { colorMode, isPanelPinned } = useGraphicEditorSettings();
  const tooltips = strings.stylePanel.tooltips;
  const [colorPopover, setColorPopover] = useState<ColorPopoverState | null>(
    null
  );
  const [customPaletteColors, setCustomPaletteColors] = useState<
    Record<ColorTarget, string[]>
  >({ backgroundColor: [], strokeColor: [] });
  const [activeFloatingPanel, setActiveFloatingPanelSource] = useState<
    string | null
  >(null);
  const hasLocalPickerModeRef = useRef(readStoredPickerMode() !== null);
  const [pickerMode, setPickerMode] = useState<ColorPickerMode>(
    () => readStoredPickerMode() ?? colorMode
  );
  const closeColorPopover = () => setColorPopover(null);

  useEffect(() => {
    if (!hasLocalPickerModeRef.current) {
      setPickerMode(colorMode);
    }
  }, [colorMode]);

  useActiveFloatingPanel(setActiveFloatingPanelSource);
  useCloseOtherFloatingPanels(
    STYLING_PANEL_FLOATING_PANEL_SOURCE,
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

  const commitCustomColor = (target: ColorTarget, color: string) => {
    const normalizedColor = color.toLowerCase();
    const defaultPaletteColors = COLOR_PALETTES.map((palette) =>
      getPaletteColorForTarget(palette, target, theme)
    );

    applyCustomColor(target, normalizedColor);
    setCustomPaletteColors((currentColors) => ({
      ...currentColors,
      [target]:
        currentColors[target].includes(normalizedColor) ||
        defaultPaletteColors.includes(normalizedColor)
          ? currentColors[target]
          : [...currentColors[target], normalizedColor]
    }));
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
    closeOtherFloatingPanels(STYLING_PANEL_FLOATING_PANEL_SOURCE);

    setColorPopover({
      paletteId: palette?.id,
      shadeBaseColor:
        (paletteColor && isHexColor(paletteColor)
          ? paletteColor
          : isHexColor(color)
            ? color
            : DEFAULT_POPOVER_PALETTE.color),
      target
    });
  };

  const pickColorFromScreen = async (target: ColorTarget) => {
    const EyeDropper = (window as Window & { EyeDropper?: EyeDropperConstructor })
      .EyeDropper;

    if (!EyeDropper) {
      return;
    }

    const result = await new EyeDropper().open();
    commitCustomColor(target, result.sRGBHex);
  };
  const backgroundControlDisabled = isBackgroundControlDisabled(
    activeTool,
    selectedElements
  );

  if (
    activeFloatingPanel === "toolbar" &&
    !isPanelPinned(STYLING_PANEL_FLOATING_PANEL_SOURCE)
  ) {
    return null;
  }

  return (
    <Panel
      id="style-panel"
      closable
      defaultOrientation="vertical"
      hideLabels={{ horizontal: true }}
      horizontalActionsLayout="row"
      maxCols={2}
      maxRows={2}
      minSize={STYLING_PANEL_MIN_SIZE}
      pinnable
      reopenKey={`${activeTool}:${selectedElements
        .map((element) => element.id)
        .join(":")}`}
      resizable
      resizeAxes={{ horizontal: "vertical", vertical: "both" }}
      title={strings.stylePanel.colors}
    >
      {({ actions, chrome, orientation }) => (
        <aside
          className={[
            "kizkatt-style-panel",
            `kizkatt-style-panel--${orientation}`,
            orientation === "horizontal"
              ? "kizkatt-style-panel--compact-columns"
              : null
          ].filter(Boolean).join(" ")}
          aria-label={strings.stylePanel.colors}
        >
          {chrome}
          <FeatureGroup
            className="kizkatt-style-feature--background"
            icon={PaletteIcon}
            label={strings.stylePanel.background}
          >
            <ColorSwatches
              key={`background-${orientation}`}
              activeColor={style.backgroundColor}
              colors={getAdaptiveQuickColors("backgroundColor", theme)}
              disabled={backgroundControlDisabled}
              flow={orientation === "horizontal" ? "vertical" : "horizontal"}
              label={strings.stylePanel.background}
              minimumColorCount={
                orientation === "horizontal"
                  ? COMPACT_QUICK_SWATCH_COUNT
                  : EXPANDED_QUICK_SWATCH_COUNT
              }
              onColorSelect={(color) => {
                applyColor("backgroundColor", color);
                setColorPopover(null);
              }}
              onCustomColorOpen={(color) =>
                openColorPopover("backgroundColor", color)
              }
            />
          </FeatureGroup>
          <FeatureGroup
            className="kizkatt-style-feature--stroke"
            icon={StrokeStyleSolidIcon}
            label={strings.stylePanel.stroke}
          >
            <ColorSwatches
              key={`stroke-${orientation}`}
              activeColor={style.strokeColor}
              colors={getAdaptiveQuickColors("strokeColor", theme)}
              flow={orientation === "horizontal" ? "vertical" : "horizontal"}
              label={strings.stylePanel.stroke}
              minimumColorCount={
                orientation === "horizontal"
                  ? COMPACT_QUICK_SWATCH_COUNT
                  : EXPANDED_QUICK_SWATCH_COUNT
              }
              onColorSelect={(color) => {
                applyColor("strokeColor", color);
                setColorPopover(null);
              }}
              onCustomColorOpen={(color) =>
                openColorPopover("strokeColor", color)
              }
            />
          </FeatureGroup>
          {colorPopover &&
            !(
              colorPopover.target === "backgroundColor" &&
              backgroundControlDisabled
            ) && (
              <ColorPopover
                activeColor={style[colorPopover.target]}
                activePaletteId={colorPopover.paletteId}
                colorColumnCount={colorColumnCount}
                customColors={customPaletteColors[colorPopover.target]}
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
                onClose={() => setColorPopover(null)}
                onPickerColorChange={applyCustomColor}
                onPickerColorCommit={commitCustomColor}
                onPickerModeChange={(mode) => {
                  hasLocalPickerModeRef.current = true;
                  setPickerMode(mode);
                  window.localStorage.setItem(
                    COLOR_PICKER_MODE_STORAGE_KEY,
                    mode
                  );
                }}
                onPickColorFromScreen={pickColorFromScreen}
                pickerMode={pickerMode}
              />
            )}
          {actions}
        </aside>
      )}
    </Panel>
  );
}

function ColorSwatches({
  activeColor,
  colors,
  disabled = false,
  flow,
  label,
  minimumColorCount,
  onColorSelect,
  onCustomColorOpen
}: {
  activeColor: string;
  colors: readonly string[];
  disabled?: boolean;
  flow: "horizontal" | "vertical";
  label: string;
  minimumColorCount: number;
  onColorSelect: (color: string) => void;
  onCustomColorOpen: (color: string) => void;
}) {
  const { strings } = useI18n();
  const tooltips = strings.stylePanel.tooltips;
  const quickColors = colors;
  const colorListRef = useRef<HTMLDivElement | null>(null);
  const [visibleColorCount, setVisibleColorCount] = useState(minimumColorCount);
  const visibleColors = quickColors.slice(
    FIRST_ARRAY_INDEX,
    visibleColorCount
  );
  const customColor = activeColor;
  const customAriaLabel = quickColors.includes(customColor)
    ? `${label} custom ${customColor}`
    : `${label} ${customColor}`;

  useEffect(() => {
    const colorList = colorListRef.current;

    if (!colorList) {
      return;
    }

    const updateVisibleColorCount = () => {
      const availableSpace = flow === "vertical"
        ? colorList.clientHeight
        : colorList.clientWidth;
      const fittingColorCount = availableSpace > 0
        ? Math.floor(
            (availableSpace + QUICK_SWATCH_GAP) /
              (QUICK_SWATCH_SIZE + QUICK_SWATCH_GAP)
          )
        : minimumColorCount;

      setVisibleColorCount(
        Math.min(
          quickColors.length,
          Math.max(minimumColorCount, fittingColorCount)
        )
      );
    };

    updateVisibleColorCount();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateVisibleColorCount);

      return () => {
        window.removeEventListener("resize", updateVisibleColorCount);
      };
    }

    const resizeObserver = new ResizeObserver(updateVisibleColorCount);
    resizeObserver.observe(colorList);

    return () => resizeObserver.disconnect();
  }, [flow, minimumColorCount, quickColors.length]);

  return (
    <div className="kizkatt-swatches kizkatt-quick-swatches">
      <div ref={colorListRef} className="kizkatt-quick-color-list">
        {visibleColors.map((color, index) => {
          const sourceIndex = quickColors.indexOf(color);

          return (
            <button
              key={`${color}-${index}`}
              type="button"
              aria-label={
                sourceIndex < BASE_QUICK_SWATCH_COUNT
                  ? `${label} ${color}`
                  : `${label} ${color} shade ${sourceIndex}`
              }
              title={`${
                label === strings.stylePanel.stroke
                  ? tooltips.strokeColor
                  : tooltips.backgroundColor
              } ${color}`}
              disabled={disabled}
              className={getSwatchClassName({
                active: false,
                color
              })}
              style={{
                backgroundColor:
                  color === TRANSPARENT_COLOR ? undefined : color
              }}
              onClick={() => {
                if (!disabled) {
                  onColorSelect(color);
                }
              }}
            />
          );
        })}
      </div>
      <div className="kizkatt-special-color-swatches">
        <button
          type="button"
          aria-label={customAriaLabel}
          title={`${tooltips.customColor} ${label}`}
          disabled={disabled}
          className={getSwatchClassName({
            active: false,
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
      </div>
    </div>
  );
}

function ColorPopover({
  activeColor,
  activePaletteId,
  colorColumnCount,
  customColors,
  onClose,
  onColorSelect,
  onPaletteColorSelect,
  onPickerColorChange,
  onPickerColorCommit,
  onPickerModeChange,
  onPickColorFromScreen,
  pickerMode,
  shadeBaseColor,
  target,
  theme
}: {
  activeColor: string;
  activePaletteId?: string;
  colorColumnCount: number;
  customColors: readonly string[];
  onClose: () => void;
  onColorSelect: (target: ColorTarget, color: string) => void;
  onPaletteColorSelect: (
    target: ColorTarget,
    color: string,
    paletteId?: string
  ) => void;
  onPickerColorChange: (target: ColorTarget, color: string) => void;
  onPickerColorCommit: (target: ColorTarget, color: string) => void;
  onPickerModeChange: (mode: ColorPickerMode) => void;
  onPickColorFromScreen: (target: ColorTarget) => void;
  pickerMode: ColorPickerMode;
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
  const [draftShadeBaseColor, setDraftShadeBaseColor] = useState(
    resolvedShadeBaseColor
  );
  const activeShades = buildShadesFromColor(draftShadeBaseColor);

  useEffect(() => {
    setDraftShadeBaseColor(resolvedShadeBaseColor);
  }, [resolvedShadeBaseColor]);

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
      <div className="kizkatt-panel-chrome kizkatt-panel-chrome--vertical kizkatt-color-popover-header">
        <strong className="kizkatt-panel-title">
          {strings.stylePanel.colors}
        </strong>
        <span className="kizkatt-panel-actions kizkatt-panel-actions--vertical">
          <button
            type="button"
            aria-label={strings.stylePanel.closeColors}
            title={strings.stylePanel.closeColors}
            onClick={onClose}
          >
            {CloseIcon}
          </button>
        </span>
      </div>
      <div className="kizkatt-color-popover-palettes">
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
                  color === TRANSPARENT_COLOR
                    ? TRANSPARENT_COLOR
                    : EMPTY_HEX_DRAFT,
                  selectedPalette?.id === palette.id ? "is-active" : ""
                ].join(" ")}
                style={{
                  backgroundColor:
                    color === TRANSPARENT_COLOR ? undefined : color
                }}
                onClick={() => {
                  onPaletteColorSelect(target, color, palette.id);
                }}
                onDoubleClick={() => {
                  onPaletteColorSelect(target, color, palette.id);
                  onClose();
                }}
              />
            );
          })}
          {customColors.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`${target} custom palette ${color}`}
              title={`${tooltips.paletteColor} ${color}`}
              className={
                !selectedPalette && draftShadeBaseColor === color
                  ? "is-active"
                  : undefined
              }
              style={{ backgroundColor: color }}
              onClick={() => onPaletteColorSelect(target, color)}
              onDoubleClick={() => {
                onPaletteColorSelect(target, color);
                onClose();
              }}
            />
          ))}
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
              onDoubleClick={() => {
                onColorSelect(target, color);
                onClose();
              }}
            />
          ))}
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
      <ColorPicker
        defaultMode={pickerMode}
        value={isHexColor(activeColor) ? activeColor : draftShadeBaseColor}
        onChange={(color) => onPickerColorChange(target, color)}
        onCommit={(color) => onPickerColorCommit(target, color)}
        onModeChange={onPickerModeChange}
      />
    </div>
  );
}
