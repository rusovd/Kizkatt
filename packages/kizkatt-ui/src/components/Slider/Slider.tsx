import type { InputHTMLAttributes } from "react";

export type SliderProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "aria-label" | "onChange" | "type" | "value"
> & {
  label: string;
  onValueChange: (value: number) => void;
  value: number;
};


export function Slider({ label, onValueChange, value, ...props }: SliderProps) {
  return (
    <input
      {...props}
      aria-label={label}
      type="range"
      value={value}
      onChange={(event) => onValueChange(Number(event.target.value))}
    />
  );
}
