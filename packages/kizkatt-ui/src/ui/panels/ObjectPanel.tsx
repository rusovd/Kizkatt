import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import {
  DEFAULT_SELECTED_SLOPPINESS,
  DEFAULT_STROKE_STYLE,
  DEFAULT_STROKE_WIDTH,
  getCalibratedMillimetersWorldSize,
  type StyleState
} from "kizkatt-graphic-engine";
import type { ObjectPanelProps } from "../../contracts/editorView";
import { Button } from "../../components/Button";
import { NumberInput } from "../../components/NumberInput";
import { Select } from "../../components/Select";

import {
  OBJECT_PANEL_MIN_SIZE,
  OBJECT_PANEL_UI_SETTINGS
} from "../../config/defaultSettings";
import { useI18n } from "../../i18n";
import {
  AspectLockIcon,
  AspectUnlockIcon,
  BringForwardIcon,
  BringToFrontIcon,
  CloseIcon,
  DiameterIcon,
  DimensionHeightIcon,
  DimensionWidthIcon,
  EdgeRoundIcon,
  EdgeSharpIcon,
  DuplicateIcon,
  GlobeIcon,
  MirrorHorizontalIcon,
  MirrorVerticalIcon,
  NodeAddPointIcon,
  NodeCurveSegmentIcon,
  NodeDeletePointIcon,
  NodeMergePointsIcon,
  NodeSplitPointIcon,
  NodeStraightSegmentIcon,
  PenNibIcon,
  RotationAngleIcon,
  SendBackwardIcon,
  SendToBackIcon,
  TrashIcon,
  ZoomToAllIcon,
  ZoomToPageHeightIcon,
  ZoomToPageIcon,
  ZoomToPageWidthIcon,
  ZoomToSelectedIcon
} from "../icons";
import { Panel } from "../../components/Panel";
import { FeatureGroup } from "../../components/FeatureGroup";
import { LineSettingsPopover } from "./LineSettingsPopover";

const HORIZONTAL_MIRROR_AXIS = "horizontal";
const VERTICAL_MIRROR_AXIS = "vertical";

const EDGE_ICONS = {
  round: EdgeRoundIcon,
  sharp: EdgeSharpIcon
} as const;

const STROKE_STYLE_LABEL_KEYS = {
  dashed: "strokeStyleDashed",
  dashDot: "strokeStyleDashDot",
  dotted: "strokeStyleDotted",
  handDrawn: "sloppinessArtist",
  solid: "strokeStyleSolid",
  stitched: "strokeStyleStitched",
  zigzag: "strokeStyleZigzag"
} as const;
type StrokeStyleSelectValue = keyof typeof STROKE_STYLE_LABEL_KEYS;

const LAYER_ACTIONS = [
  { action: "back", labelKey: "sendToBack", icon: SendToBackIcon },
  { action: "backward", labelKey: "sendBackward", icon: SendBackwardIcon },
  { action: "forward", labelKey: "bringForward", icon: BringForwardIcon },
  { action: "front", labelKey: "bringToFront", icon: BringToFrontIcon }
] as const;

const ELEMENT_ACTIONS = [
  { action: "duplicate", labelKey: "duplicate", icon: DuplicateIcon },
  { action: "delete", labelKey: "delete", icon: TrashIcon }
] as const;

const VIEWPORT_ZOOM_ACTIONS = [
  {
    action: "selected",
    labelKey: "zoomToSelected",
    icon: ZoomToSelectedIcon
  },
  { action: "all", labelKey: "zoomToAll", icon: ZoomToAllIcon },
  { action: "page", labelKey: "zoomToPage", icon: ZoomToPageIcon },
  {
    action: "pageWidth",
    labelKey: "zoomToPageWidth",
    icon: ZoomToPageWidthIcon
  },
  {
    action: "pageHeight",
    labelKey: "zoomToPageHeight",
    icon: ZoomToPageHeightIcon
  }
] as const;

const NODE_EDITOR_ACTIONS = [
  {
    action: "addPointBefore",
    labelKey: "nodeAddPointBefore",
    icon: NodeAddPointIcon
  },
  {
    action: "deletePoints",
    labelKey: "nodeDeletePoints",
    icon: NodeDeletePointIcon
  },
  {
    action: "mergePoints",
    labelKey: "nodeMergePoints",
    icon: NodeMergePointsIcon
  },
  {
    action: "splitPoint",
    labelKey: "nodeSplitPoint",
    icon: NodeSplitPointIcon
  },
  {
    action: "segmentToLine",
    labelKey: "nodeSegmentToLine",
    icon: NodeStraightSegmentIcon
  },
  {
    action: "segmentToCurve",
    labelKey: "nodeSegmentToCurve",
    icon: NodeCurveSegmentIcon
  }
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatNumber(value: number, precision: number) {
  const rounded = Number(value.toFixed(precision));

  return Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
}

function parseFiniteNumber(value: string) {
  const nextValue = Number.parseFloat(value);

  return Number.isFinite(nextValue) ? nextValue : null;
}

function getWorldUnitsPerDisplayUnit(
  gridSettings: ObjectPanelProps["gridSettings"]
) {
  return gridSettings.unit === "mm"
    ? getCalibratedMillimetersWorldSize(
        OBJECT_PANEL_UI_SETTINGS.gridMillimeterReference,
        gridSettings
      )
    : OBJECT_PANEL_UI_SETTINGS.fullPercentRatio;
}

function useUnitConverters(gridSettings: ObjectPanelProps["gridSettings"]) {
  return useMemo(() => {
    const worldUnitsPerDisplayUnit = getWorldUnitsPerDisplayUnit(gridSettings);
    const precision =
      gridSettings.unit === "mm"
        ? OBJECT_PANEL_UI_SETTINGS.millimeterPrecision
        : OBJECT_PANEL_UI_SETTINGS.pixelPrecision;

    return {
      fromDisplayUnit: (value: number) => value * worldUnitsPerDisplayUnit,
      toDisplayUnit: (value: number) => value / worldUnitsPerDisplayUnit,
      precision,
      unit: gridSettings.unit
    };
  }, [gridSettings]);
}

function ObjectNumberField({
  className,
  decimalPlaces,
  icon,
  label,
  max,
  min,
  onChange,
  onCommit,
  step,
  suffix,
  title,
  value
}: {
  className?: string;
  decimalPlaces?: number;
  icon?: ReactNode;
  label: string;
  max?: number;
  min?: number;
  onChange: (value: string) => void;
  onCommit: () => void;
  step: number;
  suffix?: string;
  title: string;
  value: string;
}) {
  const renderedLabel =
    icon ??
    (className?.includes("kizkatt-object-field--position")
      ? `${label}${OBJECT_PANEL_UI_SETTINGS.positionLabelSuffix}`
      : label);

  return (
    <label
      className={["kizkatt-object-field", className].filter(Boolean).join(" ")}
      title={title}
    >
      <span className="kizkatt-object-field-label">
        {renderedLabel}
      </span>
      <span className="kizkatt-object-field-control">
        <NumberInput
          decimalPlaces={decimalPlaces}
          label={label}
          max={max}
          min={min}
          showSliderPopover={Number.isFinite(min) && Number.isFinite(max)}
          step={step}
          value={value}
          onBlur={onCommit}
          onSliderChangeEnd={onCommit}
          onValueChange={onChange}
        />
        {suffix && <small>{suffix}</small>}
      </span>
    </label>
  );
}

function IconButton({
  active,
  ariaLabel,
  children,
  disabled,
  onClick,
  title
}: {
  active?: boolean;
  ariaLabel?: string;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <Button
      active={active}
      disabled={disabled}
      label={ariaLabel ?? title}
      title={title}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function ObjectSelectField<TValue extends string>({
  className,
  icon,
  label,
  onChange,
  options,
  title,
  value
}: {
  className?: string;
  icon?: ReactNode;
  label: string;
  onChange: (value: TValue) => void;
  options: ReadonlyArray<{ label: string; value: TValue }>;
  title: string;
  value: TValue;
}) {
  return (
    <label
      className={["kizkatt-object-select-field", className]
        .concat(icon ? "has-icon" : "has-no-icon")
        .filter(Boolean)
        .join(" ")}
      title={title}
    >
      {icon && <span className="kizkatt-object-field-label">{icon}</span>}
      <Select
        label={label}
        options={options}
        value={value}
        onValueChange={onChange}
      />
    </label>
  );
}

function StrokeWidthField({
  decimalPlaces,
  label,
  max,
  min,
  onChange,
  onCommit,
  onPresetSelect,
  onRemove,
  presetLabel,
  presetOptions,
  removeLabel,
  step,
  suffix,
  title,
  value
}: {
  decimalPlaces?: number;
  label: string;
  max: number;
  min: number;
  onChange: (value: string) => void;
  onCommit: () => void;
  onPresetSelect: (value: string) => void;
  onRemove: () => void;
  presetLabel: string;
  presetOptions: ReadonlyArray<{ label: string; value: string }>;
  removeLabel: string;
  step: number;
  suffix: string;
  title: string;
  value: string;
}) {
  return (
    <div
      className="kizkatt-object-field kizkatt-object-field--stroke-width"
      title={title}
    >
      <span className="kizkatt-object-field-control">
        <NumberInput
          decimalPlaces={decimalPlaces}
          label={label}
          max={max}
          min={min}
          showSliderPopover
          step={step}
          value={value}
          onBlur={onCommit}
          onSliderChangeEnd={onCommit}
          onValueChange={onChange}
        />
        <small>{suffix}</small>
        <StrokeWidthPresetSelect
          label={presetLabel}
          options={presetOptions}
          onSelect={onPresetSelect}
        />
        <button
          type="button"
          className="kizkatt-stroke-none-button"
          aria-label={removeLabel}
          title={removeLabel}
          onClick={onRemove}
        >
          {CloseIcon}
        </button>
      </span>
    </div>
  );
}

function StrokeWidthPresetSelect({
  label,
  onSelect,
  options
}: {
  label: string;
  onSelect: (value: string) => void;
  options: ReadonlyArray<{ label: string; value: string }>;
}) {
  return (
    <span className="kizkatt-stroke-width-preset-control">
      <select
        aria-label={label}
        value=""
        title={label}
        onChange={(event) => {
          onSelect(event.target.value);
          event.target.value = "";
        }}
      >
        <option disabled hidden value="" />
        {options.map((option) => (
          <option key={option.label} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span aria-hidden="true" className="kizkatt-stroke-width-preset-chevron">
        {DiameterIcon}
      </span>
    </span>
  );
}

export function ObjectPanel({
  activeTool,
  canUseNodeAction,
  canZoomToAll,
  canZoomToSelected,
  geometry,
  gridSettings,
  onAction,
  onDimensionChange,
  onGeometryChange,
  onGeometryChangeEnd,
  onLayerAction,
  onMirror,
  onNodeAction,
  onStyleChange,
  onStyleChangeEnd,
  onViewportZoomAction,
  selectedElements,
  style,
  theme
}: ObjectPanelProps) {
  const { strings } = useI18n();
  const { fromDisplayUnit, precision, toDisplayUnit, unit } =
    useUnitConverters(gridSettings);
  const [aspectLocked, setAspectLocked] = useState(true);
  const [useCanvasCoordinates, setUseCanvasCoordinates] = useState(true);
  const [lineSettingsOpen, setLineSettingsOpen] = useState(false);
  const lineSettingsRef = useRef<HTMLDivElement | null>(null);
  const canUseArrowheads = selectedElements.every(
    (element) => element.type === "line" || element.type === "arrow"
  );

  useEffect(() => {
    if (!lineSettingsOpen) {
      return;
    }

    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        lineSettingsRef.current?.contains(event.target)
      ) {
        return;
      }

      setLineSettingsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLineSettingsOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointerDown, true);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener(
        "pointerdown",
        closeOnOutsidePointerDown,
        true
      );
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [lineSettingsOpen]);
  const baseCenter = geometry
    ? {
        x: geometry.baseBounds.x + geometry.baseBounds.width / 2,
        y: geometry.baseBounds.y + geometry.baseBounds.height / 2
      }
    : { x: 0, y: 0 };
  const canvasCenter = geometry
    ? {
        x: geometry.bounds.x + geometry.bounds.width / 2,
        y: geometry.bounds.y + geometry.bounds.height / 2
      }
    : { x: 0, y: 0 };
  const widthRatio =
    (geometry?.widthPercent ?? OBJECT_PANEL_UI_SETTINGS.defaultScalePercent) /
    Math.max(
      OBJECT_PANEL_UI_SETTINGS.minScalePercent,
      geometry?.heightPercent ?? OBJECT_PANEL_UI_SETTINGS.defaultScalePercent
    );
  const heightRatio =
    (geometry?.heightPercent ?? OBJECT_PANEL_UI_SETTINGS.defaultScalePercent) /
    Math.max(
      OBJECT_PANEL_UI_SETTINGS.minScalePercent,
      geometry?.widthPercent ?? OBJECT_PANEL_UI_SETTINGS.defaultScalePercent
    );
  const edgeStyle = style.edgeStyle ?? "round";
  const strokeStyle = style.strokeStyle ?? DEFAULT_STROKE_STYLE;
  const strokeWidth = style.strokeWidth ?? DEFAULT_STROKE_WIDTH;
  const sloppiness = style.sloppiness ?? DEFAULT_SELECTED_SLOPPINESS;
  const strokeStyleValue: StrokeStyleSelectValue =
    (sloppiness === "artist" || sloppiness === "cartoonist") &&
    strokeStyle === "solid"
      ? "handDrawn"
      : strokeStyle === "wavy"
        ? "zigzag"
        : strokeStyle;
  const strokeStyleOptionValues: readonly StrokeStyleSelectValue[] = [
    ...OBJECT_PANEL_UI_SETTINGS.strokeStyleOptions,
    "handDrawn"
  ];
  const strokeStyleOptions: ReadonlyArray<{
    label: string;
    value: StrokeStyleSelectValue;
  }> = strokeStyleOptionValues.map((option) => ({
    label: strings.objectPanel[STROKE_STYLE_LABEL_KEYS[option]],
    value: option
  }));
  const updateStrokeStyle = (value: StrokeStyleSelectValue) => {
    updateStyle(
      value === "handDrawn"
        ? { sloppiness: "artist", strokeLineCount: 1, strokeStyle: "solid" }
        : {
            edgeStyle:
              strokeStyle === "wavy" && value === "zigzag"
                ? "round"
                : style.edgeStyle,
            sloppiness: "architect",
            strokeStyle: value
          }
    );
  };
  const strokeWidthPresetOptions = [
    {
      label: strings.objectPanel.strokeWidthPresetContour,
      value: formatNumber(
        toDisplayUnit(OBJECT_PANEL_UI_SETTINGS.strokeWidthPresetContour),
        precision
      )
    },
    ...OBJECT_PANEL_UI_SETTINGS.strokeWidthPresets[unit].map((value) => ({
      label: `${formatNumber(
        value,
        OBJECT_PANEL_UI_SETTINGS.millimeterPrecision
      )} ${unit}`,
      value: `${value}`
    }))
  ];

  const updateOffset = (axis: "offsetX" | "offsetY", value: string) => {
    const parsedValue = parseFiniteNumber(value);

    if (parsedValue === null) {
      return;
    }

    const worldValue = fromDisplayUnit(parsedValue);
    const coordinateAxis = axis === "offsetX" ? "x" : "y";

    onGeometryChange(
      {
        [axis]: useCanvasCoordinates
          ? worldValue - baseCenter[coordinateAxis]
          : worldValue
      },
      { transient: true }
    );
  };
  const updateScale = (
    axis: "widthPercent" | "heightPercent",
    value: string
  ) => {
    const parsedValue = parseFiniteNumber(value);

    if (parsedValue === null) {
      return;
    }

    const nextValue = clamp(
      parsedValue,
      OBJECT_PANEL_UI_SETTINGS.minScalePercent,
      OBJECT_PANEL_UI_SETTINGS.maxScalePercent
    );

    onGeometryChange(
      aspectLocked
        ? axis === "widthPercent"
          ? {
              widthPercent: nextValue,
              heightPercent: nextValue * heightRatio
            }
          : {
              heightPercent: nextValue,
              widthPercent: nextValue * widthRatio
            }
        : { [axis]: nextValue },
      { transient: true }
    );
  };
  const updateDimension = (
    axis: "width" | "height",
    value: string
  ) => {
    const parsedValue = parseFiniteNumber(value);

    if (parsedValue === null) {
      return;
    }

    onDimensionChange(
      axis,
      fromDisplayUnit(parsedValue),
      {
        preserveAspectRatio: aspectLocked,
        transient: true
      }
    );
  };
  const updateAngle = (value: string) => {
    const parsedValue = parseFiniteNumber(value);

    if (parsedValue === null) {
      return;
    }

    onGeometryChange({ angle: parsedValue }, { transient: true });
  };
  const updateStrokeWidth = (value: string) => {
    const parsedValue = parseFiniteNumber(value);

    if (parsedValue === null) {
      return;
    }

    onStyleChange(
      {
        strokeWidth: clamp(
          fromDisplayUnit(parsedValue),
          OBJECT_PANEL_UI_SETTINGS.minStrokeWidth,
          OBJECT_PANEL_UI_SETTINGS.maxStrokeWidth
        )
      },
      { transient: true }
    );
  };
  const updateStyle = (patch: Partial<StyleState>) => {
    onStyleChange(patch);
    onStyleChangeEnd();
  };

  return (
    <Panel
      id={OBJECT_PANEL_UI_SETTINGS.id}
      closable
      defaultOrientation="horizontal"
      horizontalActionsLayout="column"
      minSize={OBJECT_PANEL_MIN_SIZE}
      pinnable
      reopenKey={[
        activeTool,
        ...selectedElements.map((element) => element.id)
      ].join(":")}
      resizable
      title={
        geometry
          ? strings.objectPanel.objectGeometry
          : activeTool === "zoom"
            ? strings.objectPanel.zoom
            : strings.objectPanel.lineDefaults
      }
      topDock
    >
      {({ actions, chrome, orientation }) => (
        <div
          className={[
            "kizkatt-object-panel",
            `kizkatt-object-panel--${orientation}`,
            `kizkatt-object-panel--${theme}`
          ].join(" ")}
        >
          {chrome}
          <div className="kizkatt-object-panel-content">
            {geometry && (
              <>
                <FeatureGroup
                  className="kizkatt-object-feature--position"
                  label={
                    orientation === "vertical"
                      ? strings.objectPanel.position
                      : undefined
                  }
                >
                  <div className="kizkatt-object-panel-stack">
                    <ObjectNumberField
                      className="kizkatt-object-field--position"
                      label={strings.objectPanel.centerX}
                      title={
                        useCanvasCoordinates
                          ? strings.objectPanel.tooltips.centerXGlobal
                          : strings.objectPanel.tooltips.centerX
                      }
                      step={OBJECT_PANEL_UI_SETTINGS.positionStep}
                      suffix={unit}
                      value={formatNumber(
                        toDisplayUnit(
                          useCanvasCoordinates
                            ? canvasCenter.x
                            : geometry.offsetX
                        ),
                        precision
                      )}
                      onChange={(value) => updateOffset("offsetX", value)}
                      onCommit={onGeometryChangeEnd}
                    />
                    <ObjectNumberField
                      className="kizkatt-object-field--position"
                      label={strings.objectPanel.centerY}
                      title={
                        useCanvasCoordinates
                          ? strings.objectPanel.tooltips.centerYGlobal
                          : strings.objectPanel.tooltips.centerY
                      }
                      step={OBJECT_PANEL_UI_SETTINGS.positionStep}
                      suffix={unit}
                      value={formatNumber(
                        toDisplayUnit(
                          useCanvasCoordinates
                            ? canvasCenter.y
                            : geometry.offsetY
                        ),
                        precision
                      )}
                      onChange={(value) => updateOffset("offsetY", value)}
                      onCommit={onGeometryChangeEnd}
                    />
                  </div>
                  <IconButton
                    active={useCanvasCoordinates}
                    title={
                      useCanvasCoordinates
                        ? strings.objectPanel.coordinatesGlobal
                        : strings.objectPanel.coordinatesRelative
                    }
                    onClick={() => setUseCanvasCoordinates((value) => !value)}
                  >
                    {GlobeIcon}
                  </IconButton>
                </FeatureGroup>
                <FeatureGroup
                  className="kizkatt-object-feature--dimensions"
                  label={
                    orientation === "vertical"
                      ? strings.objectPanel.dimensions
                      : undefined
                  }
                >
                  <div className="kizkatt-object-panel-stack">
                    <ObjectNumberField
                      className="kizkatt-object-field--dimension"
                      icon="W:"
                      label={strings.objectPanel.objectWidth}
                      title={strings.objectPanel.tooltips.dimensionsWidth}
                      step={OBJECT_PANEL_UI_SETTINGS.positionStep}
                      suffix={unit}
                      value={formatNumber(
                        toDisplayUnit(geometry.width),
                        precision
                      )}
                      onChange={(value) =>
                        updateDimension("width", value)
                      }
                      onCommit={onGeometryChangeEnd}
                    />
                    <ObjectNumberField
                      className="kizkatt-object-field--dimension"
                      icon="H:"
                      label={strings.objectPanel.objectHeight}
                      title={strings.objectPanel.tooltips.dimensionsHeight}
                      step={OBJECT_PANEL_UI_SETTINGS.positionStep}
                      suffix={unit}
                      value={formatNumber(
                        toDisplayUnit(geometry.height),
                        precision
                      )}
                      onChange={(value) =>
                        updateDimension("height", value)
                      }
                      onCommit={onGeometryChangeEnd}
                    />
                  </div>
                </FeatureGroup>
                <FeatureGroup
                  className="kizkatt-object-feature--scale"
                  label={
                    orientation === "vertical"
                      ? strings.objectPanel.size
                      : undefined
                  }
                >
                  <div className="kizkatt-object-panel-stack">
                    <ObjectNumberField
                      decimalPlaces={OBJECT_PANEL_UI_SETTINGS.percentPrecision}
                      icon={DimensionWidthIcon}
                      label={strings.objectPanel.width}
                      title={strings.objectPanel.tooltips.width}
                      step={OBJECT_PANEL_UI_SETTINGS.percentStep}
                      min={OBJECT_PANEL_UI_SETTINGS.minScalePercent}
                      max={OBJECT_PANEL_UI_SETTINGS.maxScalePercent}
                      suffix="%"
                      value={formatNumber(
                        geometry.widthPercent,
                        OBJECT_PANEL_UI_SETTINGS.percentPrecision
                      )}
                      onChange={(value) => updateScale("widthPercent", value)}
                      onCommit={onGeometryChangeEnd}
                    />
                    <ObjectNumberField
                      decimalPlaces={OBJECT_PANEL_UI_SETTINGS.percentPrecision}
                      icon={DimensionHeightIcon}
                      label={strings.objectPanel.height}
                      title={strings.objectPanel.tooltips.height}
                      step={OBJECT_PANEL_UI_SETTINGS.percentStep}
                      min={OBJECT_PANEL_UI_SETTINGS.minScalePercent}
                      max={OBJECT_PANEL_UI_SETTINGS.maxScalePercent}
                      suffix="%"
                      value={formatNumber(
                        geometry.heightPercent,
                        OBJECT_PANEL_UI_SETTINGS.percentPrecision
                      )}
                      onChange={(value) => updateScale("heightPercent", value)}
                      onCommit={onGeometryChangeEnd}
                    />
                  </div>
                  <IconButton
                    active={aspectLocked}
                    title={
                      aspectLocked
                        ? strings.objectPanel.aspectLocked
                        : strings.objectPanel.aspectUnlocked
                    }
                    onClick={() => setAspectLocked((value) => !value)}
                  >
                    {aspectLocked ? AspectLockIcon : AspectUnlockIcon}
                  </IconButton>
                </FeatureGroup>
                <FeatureGroup
                  className="kizkatt-object-feature--angle"
                  label={
                    orientation === "vertical"
                      ? strings.objectPanel.rotation
                      : undefined
                  }
                >
                  <ObjectNumberField
                    className="kizkatt-object-field--angle"
                    decimalPlaces={OBJECT_PANEL_UI_SETTINGS.anglePrecision}
                    icon={RotationAngleIcon}
                    label={strings.objectPanel.angle}
                    title={strings.objectPanel.tooltips.angle}
                    step={OBJECT_PANEL_UI_SETTINGS.angleStep}
                    min={OBJECT_PANEL_UI_SETTINGS.angleMin}
                    max={OBJECT_PANEL_UI_SETTINGS.angleMax}
                    suffix={OBJECT_PANEL_UI_SETTINGS.degreeSymbol}
                    value={formatNumber(
                      geometry.angle,
                      OBJECT_PANEL_UI_SETTINGS.anglePrecision
                    )}
                    onChange={updateAngle}
                    onCommit={onGeometryChangeEnd}
                  />
                </FeatureGroup>
                <FeatureGroup
                  className="kizkatt-object-feature--mirror"
                  label={
                    orientation === "vertical"
                      ? strings.objectPanel.mirroring
                      : undefined
                  }
                >
                  <IconButton
                    title={strings.objectPanel.tooltips.mirrorHorizontal}
                    onClick={() => onMirror(HORIZONTAL_MIRROR_AXIS)}
                  >
                    {MirrorHorizontalIcon}
                  </IconButton>
                  <IconButton
                    title={strings.objectPanel.tooltips.mirrorVertical}
                    onClick={() => onMirror(VERTICAL_MIRROR_AXIS)}
                  >
                    {MirrorVerticalIcon}
                  </IconButton>
                </FeatureGroup>
              </>
            )}
            {(activeTool !== "zoom" || geometry) && (
              <>
                <FeatureGroup
                  className="kizkatt-object-feature--edges"
                  label={
                    orientation === "vertical"
                      ? strings.objectPanel.edges
                      : undefined
                  }
                >
                  {OBJECT_PANEL_UI_SETTINGS.edgeOptions.map((option) => (
                    <IconButton
                      key={option}
                      active={edgeStyle === option}
                      title={
                        strings.objectPanel.tooltips[
                          option === "round" ? "edgeRound" : "edgeSharp"
                        ]
                      }
                      onClick={() => updateStyle({ edgeStyle: option })}
                    >
                      {EDGE_ICONS[option]}
                    </IconButton>
                  ))}
                </FeatureGroup>
                <FeatureGroup
                  className="kizkatt-object-feature--line"
                  label={
                    orientation === "vertical"
                      ? strings.objectPanel.line
                      : undefined
                  }
                >
                  <div
                    ref={lineSettingsRef}
                    className="kizkatt-object-line-settings"
                  >
                    <IconButton
                      active={lineSettingsOpen}
                      title={strings.objectPanel.lineSettings.open}
                      onClick={() => setLineSettingsOpen((open) => !open)}
                    >
                      {PenNibIcon}
                    </IconButton>
                    <div className="kizkatt-object-panel-stack">
                      <div className="kizkatt-line-style-row">
                        <ObjectSelectField
                          className="kizkatt-object-select-field--stroke-style"
                          label={strings.objectPanel.strokeStyle}
                          title={strings.objectPanel.tooltips.strokeStyle}
                          value={strokeStyleValue}
                          options={strokeStyleOptions}
                          onChange={updateStrokeStyle}
                        />
                      </div>
                      <StrokeWidthField
                        decimalPlaces={precision}
                        label={strings.objectPanel.strokeWidth}
                        min={toDisplayUnit(
                          OBJECT_PANEL_UI_SETTINGS.minStrokeWidth
                        )}
                        max={toDisplayUnit(
                          OBJECT_PANEL_UI_SETTINGS.maxStrokeWidth
                        )}
                        title={strings.objectPanel.tooltips.strokeWidth}
                        step={OBJECT_PANEL_UI_SETTINGS.positionStep}
                        suffix={unit}
                        value={formatNumber(
                          toDisplayUnit(strokeWidth),
                          precision
                        )}
                        onChange={updateStrokeWidth}
                        onCommit={onStyleChangeEnd}
                        onPresetSelect={(value) => {
                          updateStrokeWidth(value);
                          onStyleChangeEnd();
                        }}
                        onRemove={() => {
                          updateStrokeWidth("0");
                          onStyleChangeEnd();
                        }}
                        presetLabel={
                          strings.objectPanel.strokeWidthPresetSelect
                        }
                        presetOptions={strokeWidthPresetOptions}
                        removeLabel={strings.objectPanel.removeStroke}
                      />
                    </div>
                    {lineSettingsOpen && (
                      <LineSettingsPopover
                        canUseArrowheads={canUseArrowheads}
                        strokeStyleOptions={strokeStyleOptions}
                        strokeWidthDecimalPlaces={precision}
                        strokeWidthMax={toDisplayUnit(
                          OBJECT_PANEL_UI_SETTINGS.maxStrokeWidth
                        )}
                        strokeWidthMin={toDisplayUnit(
                          OBJECT_PANEL_UI_SETTINGS.minStrokeWidth
                        )}
                        strokeWidthValue={formatNumber(
                          toDisplayUnit(strokeWidth),
                          precision
                        )}
                        style={style}
                        unit={unit}
                        onClose={() => setLineSettingsOpen(false)}
                        onContinuousStyleChange={(patch) =>
                          onStyleChange(patch, { transient: true })
                        }
                        onStrokeWidthChange={updateStrokeWidth}
                        onStrokeStyleChange={updateStrokeStyle}
                        onStyleChange={updateStyle}
                        onStyleChangeEnd={onStyleChangeEnd}
                      />
                    )}
                  </div>
                </FeatureGroup>
              </>
            )}
            {selectedElements.length > 0 && (
              <>
                <FeatureGroup
                  className="kizkatt-object-feature--layers"
                  label={
                    orientation === "vertical"
                      ? strings.stylePanel.layers
                      : undefined
                  }
                >
                  {LAYER_ACTIONS.map(({ action, labelKey, icon }) => (
                    <IconButton
                      key={action}
                      ariaLabel={strings.stylePanel[labelKey]}
                      title={strings.stylePanel.tooltips[labelKey]}
                      onClick={() => onLayerAction(action)}
                    >
                      {icon}
                    </IconButton>
                  ))}
                </FeatureGroup>
                <FeatureGroup
                  className="kizkatt-object-feature--actions"
                  label={
                    orientation === "vertical"
                      ? strings.stylePanel.actions
                      : undefined
                  }
                >
                  {ELEMENT_ACTIONS.map(({ action, labelKey, icon }) => (
                    <IconButton
                      key={action}
                      ariaLabel={strings.stylePanel[labelKey]}
                      title={strings.stylePanel.tooltips[labelKey]}
                      onClick={() => onAction(action)}
                    >
                      {icon}
                    </IconButton>
                  ))}
                </FeatureGroup>
              </>
            )}
            {activeTool === "nodeEdit" && onNodeAction && (
              <FeatureGroup
                className="kizkatt-object-feature--node-editor"
                label={
                  orientation === "vertical"
                    ? strings.objectPanel.nodeEditor
                    : undefined
                }
              >
                {NODE_EDITOR_ACTIONS.map(({ action, labelKey, icon }) => (
                  <IconButton
                    key={action}
                    ariaLabel={strings.objectPanel[labelKey]}
                    disabled={canUseNodeAction?.(action) === false}
                    title={strings.objectPanel.tooltips[labelKey]}
                    onClick={() => onNodeAction(action)}
                  >
                    {icon}
                  </IconButton>
                ))}
              </FeatureGroup>
            )}
            {activeTool === "zoom" && (
              <FeatureGroup
                className="kizkatt-object-feature--zoom"
                label={
                  orientation === "vertical"
                    ? strings.objectPanel.zoom
                    : undefined
                }
              >
                {VIEWPORT_ZOOM_ACTIONS.map(({ action, labelKey, icon }) => (
                  <IconButton
                    key={action}
                    ariaLabel={strings.objectPanel[labelKey]}
                    disabled={
                      action === "selected"
                        ? !canZoomToSelected
                        : action === "all"
                          ? !canZoomToAll
                          : false
                    }
                    title={strings.objectPanel.tooltips[labelKey]}
                    onClick={() => onViewportZoomAction(action)}
                  >
                    {icon}
                  </IconButton>
                ))}
              </FeatureGroup>
            )}
          </div>
          {actions}
        </div>
      )}
    </Panel>
  );
}
