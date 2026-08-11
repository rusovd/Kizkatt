import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  DEFAULT_STROKE_STYLE,
  DEFAULT_STROKE_WIDTH,
  getCalibratedMillimetersWorldSize,
  type ObjectPanelProps,
  type StyleState
} from "kizkatt-graphic-engine";

import { OBJECT_PANEL_UI_SETTINGS } from "../../config/defaultSettings";
import { useI18n } from "../../i18n";
import { useGraphicEditorSettings } from "../settings/GraphicEditorSettings";
import {
  AspectLockIcon,
  AspectUnlockIcon,
  DimensionHeightIcon,
  DimensionWidthIcon,
  EdgeRoundIcon,
  EdgeSharpIcon,
  MirrorHorizontalIcon,
  MirrorVerticalIcon,
  PenNibIcon,
  RotationAngleIcon,
  StrokeStyleDashedIcon,
  StrokeStyleDottedIcon,
  StrokeStyleSolidIcon
} from "../icons";
import { DraggablePanel } from "../positioning/DraggablePanel";
import { PanelDragHandle } from "../positioning/PanelDragHandle";

const HORIZONTAL_MIRROR_AXIS = "horizontal";
const VERTICAL_MIRROR_AXIS = "vertical";

const EDGE_ICONS = {
  round: EdgeRoundIcon,
  sharp: EdgeSharpIcon
} as const;

const STROKE_STYLE_ICONS = {
  dashed: StrokeStyleDashedIcon,
  dotted: StrokeStyleDottedIcon,
  solid: StrokeStyleSolidIcon
} as const;

const STROKE_STYLE_LABEL_KEYS = {
  dashed: "strokeStyleDashed",
  dotted: "strokeStyleDotted",
  solid: "strokeStyleSolid"
} as const;

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
  icon,
  label,
  onChange,
  onCommit,
  step,
  suffix,
  title,
  value
}: {
  className?: string;
  icon?: ReactNode;
  label: string;
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
        <input
          aria-label={label}
          type="number"
          step={step}
          value={value}
          onBlur={onCommit}
          onChange={(event) => onChange(event.target.value)}
        />
        {suffix && <small>{suffix}</small>}
      </span>
    </label>
  );
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
  icon: ReactNode;
  label: string;
  onChange: (value: TValue) => void;
  options: ReadonlyArray<{ label: string; value: TValue }>;
  title: string;
  value: TValue;
}) {
  return (
    <label
      className={["kizkatt-object-select-field", className]
        .filter(Boolean)
        .join(" ")}
      title={title}
    >
      <span className="kizkatt-object-field-label">{icon}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as TValue)}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function StrokeWidthField({
  label,
  onChange,
  onCommit,
  onPresetSelect,
  presetLabel,
  presetOptions,
  step,
  title,
  value
}: {
  label: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onPresetSelect: (value: string) => void;
  presetLabel: string;
  presetOptions: ReadonlyArray<{ label: string; value: string }>;
  step: number;
  title: string;
  value: string;
}) {
  return (
    <label
      className="kizkatt-object-field kizkatt-object-field--stroke-width"
      title={title}
    >
      <span className="kizkatt-object-field-label">{PenNibIcon}</span>
      <span className="kizkatt-object-field-control">
        <input
          aria-label={label}
          type="number"
          step={step}
          value={value}
          onBlur={onCommit}
          onChange={(event) => onChange(event.target.value)}
        />
        <select
          aria-label={presetLabel}
          value=""
          title={presetLabel}
          onChange={(event) => {
            onPresetSelect(event.target.value);
            event.target.value = "";
          }}
        >
          <option value="" />
          {presetOptions.map((option) => (
            <option
              key={option.label}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

export function ObjectPanel({
  geometry,
  gridSettings,
  onGeometryChange,
  onGeometryChangeEnd,
  onMirror,
  onStyleChange,
  onStyleChangeEnd,
  style,
  theme
}: ObjectPanelProps) {
  const { strings } = useI18n();
  const { toolbarOrientation } = useGraphicEditorSettings();
  const { fromDisplayUnit, precision, toDisplayUnit, unit } =
    useUnitConverters(gridSettings);
  const [aspectLocked, setAspectLocked] = useState(true);
  const widthRatio =
    geometry.widthPercent /
    Math.max(OBJECT_PANEL_UI_SETTINGS.minScalePercent, geometry.heightPercent);
  const heightRatio =
    geometry.heightPercent /
    Math.max(OBJECT_PANEL_UI_SETTINGS.minScalePercent, geometry.widthPercent);
  const edgeStyle = style.edgeStyle ?? "round";
  const strokeStyle = style.strokeStyle ?? DEFAULT_STROKE_STYLE;
  const strokeWidth = style.strokeWidth ?? DEFAULT_STROKE_WIDTH;
  const strokeStyleOptions = OBJECT_PANEL_UI_SETTINGS.strokeStyleOptions.map((option) => ({
    label: strings.objectPanel[STROKE_STYLE_LABEL_KEYS[option]],
    value: option
  }));
  const strokeWidthPresetOptions = [
    {
      label: strings.objectPanel.strokeWidthPresetNone,
      value: formatNumber(
        OBJECT_PANEL_UI_SETTINGS.minStrokeWidth,
        OBJECT_PANEL_UI_SETTINGS.pixelPrecision
      )
    },
    {
      label: strings.objectPanel.strokeWidthPresetContour,
      value: formatNumber(
        OBJECT_PANEL_UI_SETTINGS.strokeWidthPresetContour,
        OBJECT_PANEL_UI_SETTINGS.pixelPrecision
      )
    },
    ...OBJECT_PANEL_UI_SETTINGS.strokeWidthPresets.map((value) => ({
      label: `${formatNumber(
        value,
        OBJECT_PANEL_UI_SETTINGS.millimeterPrecision
      )} ${unit}`,
      value: formatNumber(value, OBJECT_PANEL_UI_SETTINGS.millimeterPrecision)
    }))
  ];

  const updateOffset = (axis: "offsetX" | "offsetY", value: string) => {
    const parsedValue = parseFiniteNumber(value);

    if (parsedValue === null) {
      return;
    }

    onGeometryChange(
      { [axis]: fromDisplayUnit(parsedValue) },
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
          parsedValue,
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
    <DraggablePanel
      id={OBJECT_PANEL_UI_SETTINGS.id}
      topDock
      className={[
        "kizkatt-object-panel",
        `kizkatt-object-panel--${toolbarOrientation}`,
        `kizkatt-object-panel--${theme}`
      ].join(" ")}
    >
      <PanelDragHandle
        placement={toolbarOrientation === "vertical" ? "top" : "left"}
        title={strings.settings.tooltips.panelDragHandle}
      />
      <div className="kizkatt-object-panel-content">
        <div className="kizkatt-object-panel-stack">
          <ObjectNumberField
            className="kizkatt-object-field--position"
            label={strings.objectPanel.centerX}
            title={strings.objectPanel.tooltips.centerX}
            step={OBJECT_PANEL_UI_SETTINGS.positionStep}
            suffix={unit}
            value={formatNumber(toDisplayUnit(geometry.offsetX), precision)}
            onChange={(value) => updateOffset("offsetX", value)}
            onCommit={onGeometryChangeEnd}
          />
          <ObjectNumberField
            className="kizkatt-object-field--position"
            label={strings.objectPanel.centerY}
            title={strings.objectPanel.tooltips.centerY}
            step={OBJECT_PANEL_UI_SETTINGS.positionStep}
            suffix={unit}
            value={formatNumber(toDisplayUnit(geometry.offsetY), precision)}
            onChange={(value) => updateOffset("offsetY", value)}
            onCommit={onGeometryChangeEnd}
          />
        </div>
        <div className="kizkatt-object-panel-group kizkatt-object-panel-stack">
          <ObjectNumberField
            icon={DimensionWidthIcon}
            label={strings.objectPanel.width}
            title={strings.objectPanel.tooltips.width}
            step={OBJECT_PANEL_UI_SETTINGS.percentStep}
            suffix="%"
            value={formatNumber(
              geometry.widthPercent,
              OBJECT_PANEL_UI_SETTINGS.percentPrecision
            )}
            onChange={(value) => updateScale("widthPercent", value)}
            onCommit={onGeometryChangeEnd}
          />
          <ObjectNumberField
            icon={DimensionHeightIcon}
            label={strings.objectPanel.height}
            title={strings.objectPanel.tooltips.height}
            step={OBJECT_PANEL_UI_SETTINGS.percentStep}
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
        <ObjectNumberField
          className="kizkatt-object-field--angle"
          icon={RotationAngleIcon}
          label={strings.objectPanel.angle}
          title={strings.objectPanel.tooltips.angle}
          step={OBJECT_PANEL_UI_SETTINGS.angleStep}
          suffix={OBJECT_PANEL_UI_SETTINGS.degreeSymbol}
          value={formatNumber(
            geometry.angle,
            OBJECT_PANEL_UI_SETTINGS.anglePrecision
          )}
          onChange={updateAngle}
          onCommit={onGeometryChangeEnd}
        />
        <div className="kizkatt-object-panel-group">
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
        </div>
        <div className="kizkatt-object-panel-group">
          {OBJECT_PANEL_UI_SETTINGS.edgeOptions.map((option) => (
            <IconButton
              key={option}
              active={edgeStyle === option}
              title={strings.objectPanel.tooltips[
                option === "round" ? "edgeRound" : "edgeSharp"
              ]}
              onClick={() => updateStyle({ edgeStyle: option })}
            >
              {EDGE_ICONS[option]}
            </IconButton>
          ))}
        </div>
        <div className="kizkatt-object-panel-group">
          <ObjectSelectField
            className="kizkatt-object-select-field--stroke-style"
            icon={STROKE_STYLE_ICONS[strokeStyle]}
            label={strings.objectPanel.strokeStyle}
            title={strings.objectPanel.tooltips.strokeStyle}
            value={strokeStyle}
            options={strokeStyleOptions}
            onChange={(value) => updateStyle({ strokeStyle: value })}
          />
        </div>
        <StrokeWidthField
          label={strings.objectPanel.strokeWidth}
          title={strings.objectPanel.tooltips.strokeWidth}
          step={OBJECT_PANEL_UI_SETTINGS.positionStep}
          value={formatNumber(
            strokeWidth,
            OBJECT_PANEL_UI_SETTINGS.pixelPrecision
          )}
          presetLabel={strings.objectPanel.strokeWidthPresetSelect}
          presetOptions={strokeWidthPresetOptions}
          onChange={updateStrokeWidth}
          onCommit={onStyleChangeEnd}
          onPresetSelect={(value) => {
            updateStrokeWidth(value);
            onStyleChangeEnd();
          }}
        />
      </div>
    </DraggablePanel>
  );
}
