import type { SelectHTMLAttributes } from "react";

export type SelectOption<TValue extends string> = {
  disabled?: boolean;
  label: string;
  value: TValue;
};

export type SelectProps<TValue extends string> = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "aria-label" | "onChange" | "value"
> & {
  label: string;
  onValueChange: (value: TValue) => void;
  options: readonly SelectOption<TValue>[];
  value: TValue;
};


export function Select<TValue extends string>({
  label,
  onValueChange,
  options,
  value,
  ...props
}: SelectProps<TValue>) {
  return (
    <select
      {...props}
      aria-label={label}
      value={value}
      onChange={(event) => onValueChange(event.target.value as TValue)}
    >
      {options.map((option) => (
        <option
          key={option.value}
          disabled={option.disabled}
          value={option.value}
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}
