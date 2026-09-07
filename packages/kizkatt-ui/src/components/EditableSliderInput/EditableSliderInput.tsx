import { Fragment } from "react";

import { EditableNumberInput } from "../EditableNumberInput";
import { Slider } from "../Slider";

export function EditableSliderInput({
  ariaLabel,
  max,
  min,
  onChangeEnd,
  onValueChange,
  step = 0.1,
  unit,
  value
}: {
  ariaLabel: string;
  max: number;
  min: number;
  onChangeEnd: () => void;
  onValueChange: (value: number) => void;
  step?: number;
  unit: string;
  value: number;
}) {
  return (
    <Fragment>
      <EditableNumberInput
        ariaLabel={ariaLabel}
        max={max}
        min={min}
        onChangeEnd={onChangeEnd}
        onValueChange={onValueChange}
        step={step}
        value={value}
      />
      <small>{unit}</small>
      <Slider
        className="kizkatt-transformation-slider"
        label={`${ariaLabel} slider`}
        max={max}
        min={min}
        step={step}
        value={value}
        onBlur={onChangeEnd}
        onValueChange={onValueChange}
        onPointerUp={onChangeEnd}
      />
    </Fragment>
  );
}
