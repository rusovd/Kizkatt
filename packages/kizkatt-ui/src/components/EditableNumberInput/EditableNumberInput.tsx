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
  disabled,
  max,
  min,
  onChangeEnd,
  onValueChange,
  step = 0.1,
  value
}: {
  ariaLabel: string;
  disabled?: boolean;
  max?: number;
  min?: number;
  onChangeEnd: () => void;
  onValueChange: (value: number) => void;
  step?: number;
  value: number;
}) {
  const externalValue = String(Number(value.toFixed(3)));
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
      inputMode="decimal"
      type="text"
      value={draft}
      data-max={max}
      data-min={min}
      data-step={step}
      onBlur={commitDraft}
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
