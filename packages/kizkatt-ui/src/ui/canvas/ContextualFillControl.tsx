import type { KeyboardEvent } from "react";

import { getElementTransformedBounds } from "kizkatt-graphic-engine";
import type { ContextualFillControlState } from "../../contracts/editorView";
import { useI18n } from "../../i18n";
import {
  CORNER_ROTATE_HANDLE_OFFSET_MULTIPLIER,
  SELECTION_HANDLE_SIZE,
  SKEW_HANDLE_SIZE_MULTIPLIER
} from "../../rendering/constants";
import { GradientIcon, TextureIcon } from "../icons";

const CONTROL_SIZE = 26;
const CONTROL_GAP = 10;
const CONTROL_ICON_SIZE = 18;
const HALF_DIVISOR = 2;
const SKEW_HANDLE_SIZE =
  SELECTION_HANDLE_SIZE * SKEW_HANDLE_SIZE_MULTIPLIER;
const SKEW_HANDLE_OFFSET =
  SELECTION_HANDLE_SIZE * CORNER_ROTATE_HANDLE_OFFSET_MULTIPLIER;

function activateFromKeyboard(
  event: KeyboardEvent<SVGGElement>,
  onActivate: () => void
) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  onActivate();
}

export function ContextualFillControl({
  control,
  zoom = 1
}: {
  control: ContextualFillControlState;
  zoom?: number;
}) {
  const { strings } = useI18n();
  const screenScale = 1 / Math.max(zoom, Number.EPSILON);
  const bounds = getElementTransformedBounds(control.element);
  const controlOffset =
    SKEW_HANDLE_OFFSET +
    SKEW_HANDLE_SIZE / HALF_DIVISOR +
    CONTROL_GAP +
    CONTROL_SIZE / HALF_DIVISOR;
  const controlCenter = {
    x: bounds.x + bounds.width / HALF_DIVISOR,
    y: bounds.y - controlOffset * screenScale
  };
  const label =
    control.fillStyle === "gradient"
      ? strings.stylePanel.fillGradient
      : strings.stylePanel.fillCrossHatch;
  const icon =
    control.fillStyle === "gradient" ? GradientIcon : TextureIcon;

  return (
    <g
      aria-label={label}
      className="kizkatt-contextual-fill-control"
      data-contextual-fill-control="true"
      data-fill-style={control.fillStyle}
      role="button"
      tabIndex={0}
      transform={`translate(${controlCenter.x} ${controlCenter.y}) scale(${screenScale})`}
      onClick={(event) => {
        event.stopPropagation();
        control.onActivate();
      }}
      onKeyDown={(event) => activateFromKeyboard(event, control.onActivate)}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <title>{label}</title>
      <rect
        x={-CONTROL_SIZE / HALF_DIVISOR}
        y={-CONTROL_SIZE / HALF_DIVISOR}
        width={CONTROL_SIZE}
        height={CONTROL_SIZE}
        rx="6"
      />
      <g
        transform={`translate(${-CONTROL_ICON_SIZE / HALF_DIVISOR} ${
          -CONTROL_ICON_SIZE / HALF_DIVISOR
        }) scale(${CONTROL_ICON_SIZE / 24})`}
      >
        {icon}
      </g>
    </g>
  );
}
