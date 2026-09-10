import { Fragment } from "react";

import { EditableNumberInput } from "../EditableNumberInput";

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
    </Fragment>
  );
}
