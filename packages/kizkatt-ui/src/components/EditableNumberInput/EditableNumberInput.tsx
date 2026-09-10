import { useEffect, useState } from "react";
import { NumberInput } from "../NumberInput";

function parseEditableNumber(value: string) {
  const normalizedValue = value.trim().replace(",", ".");

  if (!normalizedValue) return null;

  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : null;
}

export function EditableNumberInput({
  ariaLabel,
  decimalPlaces = 3,
  disabled,
  max,
  min,
  onChangeEnd,
  onValueChange,
  step = 0.1,
  value
}: {
  ariaLabel: string;
  decimalPlaces?: number;
  disabled?: boolean;
  max?: number;
  min?: number;
  onChangeEnd: () => void;
  onValueChange: (value: number) => void;
  step?: number;
  value: number;
}) {
  const normalizedDecimalPlaces = Math.max(
    0,
    Math.min(20, Math.trunc(decimalPlaces))
  );
  const externalValue = String(Number(value.toFixed(normalizedDecimalPlaces)));
  const [draft, setDraft] = useState(externalValue);

  useEffect(() => {
    setDraft(externalValue);
  }, [externalValue]);

  const applyValue = (valueToApply: number) => {
    const bounded = Math.min(
      max ?? Number.POSITIVE_INFINITY,
      Math.max(min ?? Number.NEGATIVE_INFINITY, valueToApply)
    );
    onValueChange(bounded);
    return bounded;
  };

  const commitDraft = () => {
    const parsed = parseEditableNumber(draft);

    if (parsed === null) {
      setDraft(externalValue);
    } else {
      setDraft(String(applyValue(parsed)));
    }

    onChangeEnd();
  };

  return (
    <NumberInput
      label={ariaLabel}
      disabled={disabled}
      decimalPlaces={normalizedDecimalPlaces}
      inputMode="decimal"
      max={max}
      min={min}
      showSliderPopover={Number.isFinite(min) && Number.isFinite(max)}
      step={step}
      valueType="decimal"
      value={draft}
      onBlur={commitDraft}
      onSliderChangeEnd={onChangeEnd}
      onValueChange={(nextDraft) => {
        const parsed = parseEditableNumber(nextDraft);
        setDraft(nextDraft);
        if (parsed !== null) applyValue(parsed);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
    />
  );
}
