import type { InputHTMLAttributes } from "react";

export type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "aria-label" | "onChange" | "type"
> & {
  label: string;
  onValueChange: (value: string) => void;
  type?: "number" | "text";
};


export function NumberInput({
  inputMode = "decimal",
  label,
  onValueChange,
  type = "number",
  ...props
}: NumberInputProps) {
  return (
    <input
      {...props}
      aria-label={label}
      inputMode={inputMode}
      type={type}
      onChange={(event) => onValueChange(event.target.value)}
    />
  );
}
