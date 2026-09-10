import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import type { CSSProperties, InputHTMLAttributes } from "react";
import { createPortal } from "react-dom";

import { Slider } from "../Slider";

export type NumberInputValueType = "decimal" | "integer" | "text";

export type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "aria-label" | "onChange" | "type"
> & {
  decimalPlaces?: number;
  label: string;
  onSliderChangeEnd?: () => void;
  onSliderValueChange?: (value: string) => void;
  showSpinButtons?: boolean;
  onValueChange: (value: string) => void;
  showSliderPopover?: boolean;
  sliderWidth?: number;
  valueType?: NumberInputValueType;
};

const DEFAULT_SLIDER_WIDTH = 120;
const SLIDER_POPOVER_CHROME_WIDTH = 22;
const SLIDER_POPOVER_VIEWPORT_GAP = 8;

function toFiniteNumber(value: string | number | undefined) {
  if (value === undefined || value === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function limitFractionDigits(value: string, decimalPlaces: number) {
  const separatorIndex = Math.max(value.indexOf("."), value.indexOf(","));
  if (separatorIndex < 0) return value;

  return `${value.slice(0, separatorIndex + 1)}${value
    .slice(separatorIndex + 1)
    .slice(0, decimalPlaces)}`;
}

function normalizeDraft(
  value: string,
  valueType: NonNullable<NumberInputProps["valueType"]>,
  decimalPlaces: number
) {
  if (valueType === "text" || value === "" || value === "-") return value;
  if (valueType === "integer") return value.split(/[.,]/, 1)[0];

  return limitFractionDigits(value, decimalPlaces);
}


export function NumberInput({
  className,
  decimalPlaces = 3,
  disabled,
  inputMode,
  label,
  max,
  min,
  onFocus,
  onKeyDown,
  onSliderChangeEnd,
  onSliderValueChange,
  onValueChange,
  showSliderPopover = false,
  showSpinButtons = false,
  sliderWidth = DEFAULT_SLIDER_WIDTH,
  step,
  value,
  valueType = "decimal",
  ...props
}: NumberInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ left: 0, top: 0 });
  const numericMin = toFiniteNumber(min);
  const numericMax = toFiniteNumber(max);
  const normalizedDecimalPlaces = Math.max(
    0,
    Math.min(20, Math.trunc(decimalPlaces))
  );
  const normalizedSliderWidth = Math.max(40, Math.round(sliderWidth));
  const canShowSlider =
    showSliderPopover &&
    valueType !== "text" &&
    !disabled &&
    numericMin !== null &&
    numericMax !== null &&
    numericMax > numericMin;

  const updatePopoverPosition = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;

    const bounds = input.getBoundingClientRect();
    const width = normalizedSliderWidth + SLIDER_POPOVER_CHROME_WIDTH;
    const centeredLeft = bounds.left + bounds.width / 2 - width / 2;
    const maxLeft = Math.max(
      SLIDER_POPOVER_VIEWPORT_GAP,
      window.innerWidth - width - SLIDER_POPOVER_VIEWPORT_GAP
    );

    setPopoverPosition({
      left: Math.min(
        Math.max(centeredLeft, SLIDER_POPOVER_VIEWPORT_GAP),
        maxLeft
      ),
      top: bounds.bottom + 5
    });
  }, [normalizedSliderWidth]);

  useLayoutEffect(() => {
    if (!popoverOpen) return;

    updatePopoverPosition();
    window.addEventListener("resize", updatePopoverPosition);
    window.addEventListener("scroll", updatePopoverPosition, true);

    return () => {
      window.removeEventListener("resize", updatePopoverPosition);
      window.removeEventListener("scroll", updatePopoverPosition, true);
    };
  }, [popoverOpen, updatePopoverPosition]);

  useEffect(() => {
    if (!popoverOpen) return;

    const closeOutside = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return;
      if (inputRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      setPopoverOpen(false);
    };
    const onDocumentPointerDown = (event: PointerEvent) => closeOutside(event.target);
    const onDocumentFocusIn = (event: FocusEvent) => closeOutside(event.target);
    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPopoverOpen(false);
    };

    document.addEventListener("pointerdown", onDocumentPointerDown, true);
    document.addEventListener("focusin", onDocumentFocusIn, true);
    document.addEventListener("keydown", onDocumentKeyDown, true);

    return () => {
      document.removeEventListener("pointerdown", onDocumentPointerDown, true);
      document.removeEventListener("focusin", onDocumentFocusIn, true);
      document.removeEventListener("keydown", onDocumentKeyDown, true);
    };
  }, [popoverOpen]);

  const parsedValue = toFiniteNumber(
    typeof value === "string"
      ? value.replace(",", ".")
      : typeof value === "number"
        ? value
        : undefined
  );
  const sliderValue =
    numericMin !== null && numericMax !== null
      ? Math.min(numericMax, Math.max(numericMin, parsedValue ?? numericMin))
      : 0;
  const popoverStyle = {
    ...popoverPosition,
    "--kizkatt-number-input-slider-width": `${normalizedSliderWidth}px`
  } as CSSProperties;

  return (
    <>
      <input
        {...props}
        ref={inputRef}
        aria-label={label}
        className={[
          className,
          !showSpinButtons && valueType !== "text"
            ? "kizkatt-number-input--hide-spin-buttons"
            : undefined
        ].filter(Boolean).join(" ") || undefined}
        disabled={disabled}
        inputMode={
          valueType === "text"
            ? "text"
            : inputMode ?? (valueType === "integer" ? "numeric" : "decimal")
        }
        max={valueType === "text" ? undefined : max}
        min={valueType === "text" ? undefined : min}
        step={
          valueType === "text"
            ? undefined
            : step ??
              (valueType === "integer" ? 1 : 10 ** -normalizedDecimalPlaces)
        }
        type={valueType === "text" ? "text" : "number"}
        value={value}
        onChange={(event) =>
          onValueChange(
            normalizeDraft(
              event.target.value,
              valueType,
              normalizedDecimalPlaces
            )
          )
        }
        onFocus={(event) => {
          if (canShowSlider) setPopoverOpen(true);
          onFocus?.(event);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setPopoverOpen(false);
          onKeyDown?.(event);
        }}
      />
      {canShowSlider && popoverOpen && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            className="kizkatt-number-input-slider-popover"
            role="presentation"
            style={popoverStyle}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Slider
              label={`${label} slider`}
              max={numericMax ?? undefined}
              min={numericMin ?? undefined}
              step={step}
              value={sliderValue}
              onBlur={onSliderChangeEnd}
              onKeyUp={onSliderChangeEnd}
              onPointerUp={onSliderChangeEnd}
              onValueChange={(nextValue) =>
                (onSliderValueChange ?? onValueChange)(String(nextValue))}
            />
          </div>,
          inputRef.current?.closest(".kizkatt-board") ?? document.body
        )}
    </>
  );
}
