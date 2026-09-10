import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { NumberInput } from "./NumberInput";

describe("NumberInput", () => {
  it("keeps the slider popover disabled by default", () => {
    render(<NumberInput label="Angle" value="10" onValueChange={vi.fn()} />);

    fireEvent.focus(screen.getByRole("spinbutton", { name: "Angle" }));

    expect(screen.queryByRole("slider", { name: "Angle slider" }))
      .not.toBeInTheDocument();
  });

  it("hides native spin buttons by default and allows opting in", () => {
    const { rerender } = render(
      <NumberInput label="Count" value="1" onValueChange={vi.fn()} />
    );
    const input = screen.getByRole("spinbutton", { name: "Count" });

    expect(input).toHaveClass("kizkatt-number-input--hide-spin-buttons");

    rerender(
      <NumberInput
        label="Count"
        showSpinButtons
        value="1"
        onValueChange={vi.fn()}
      />
    );
    expect(input).not.toHaveClass("kizkatt-number-input--hide-spin-buttons");
  });

  it("enforces integer and decimal value types", () => {
    const onIntegerChange = vi.fn();
    const onDecimalChange = vi.fn();

    const { rerender } = render(
      <NumberInput
        label="Count"
        value="1"
        valueType="integer"
        onValueChange={onIntegerChange}
      />
    );
    fireEvent.change(screen.getByRole("spinbutton", { name: "Count" }), {
      target: { value: "12.8" }
    });
    expect(onIntegerChange).toHaveBeenLastCalledWith("12");

    rerender(
      <NumberInput
        decimalPlaces={2}
        label="Scale"
        value="1"
        valueType="decimal"
        onValueChange={onDecimalChange}
      />
    );
    fireEvent.change(screen.getByRole("spinbutton", { name: "Scale" }), {
      target: { value: "12.345" }
    });
    expect(onDecimalChange).toHaveBeenLastCalledWith("12.34");
  });

  it("supports arbitrary text without numeric bounds or a slider", () => {
    const onValueChange = vi.fn();

    render(
      <NumberInput
        label="Name"
        max={10}
        min={0}
        showSliderPopover
        value="Layer A"
        valueType="text"
        onValueChange={onValueChange}
      />
    );
    const input = screen.getByRole("textbox", { name: "Name" });

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "Layer B / any text" } });

    expect(onValueChange).toHaveBeenLastCalledWith("Layer B / any text");
    expect(input).not.toHaveAttribute("min");
    expect(input).not.toHaveAttribute("max");
    expect(screen.queryByRole("slider")).not.toBeInTheDocument();
  });

  it("opens a bounded slider on focus and edits the same value", () => {
    const onValueChange = vi.fn();
    const onSliderChangeEnd = vi.fn();

    render(
      <NumberInput
        label="Angle"
        max={360}
        min={-360}
        showSliderPopover
        step={1}
        value="10"
        onSliderChangeEnd={onSliderChangeEnd}
        onValueChange={onValueChange}
      />
    );

    const input = screen.getByRole("spinbutton", { name: "Angle" });
    vi.spyOn(input, "getBoundingClientRect").mockReturnValue({
      bottom: 120,
      height: 20,
      left: 200,
      right: 280,
      top: 100,
      width: 80,
      x: 200,
      y: 100,
      toJSON: () => ({})
    });

    fireEvent.focus(input);
    const slider = screen.getByRole("slider", { name: "Angle slider" });
    const popover = slider.parentElement;

    expect(popover).toHaveStyle({ left: "169px", top: "125px" });
    expect(popover?.style.getPropertyValue("--kizkatt-number-input-slider-width"))
      .toBe("120px");

    fireEvent.change(slider, { target: { value: "45" } });
    fireEvent.pointerUp(slider);

    expect(onValueChange).toHaveBeenLastCalledWith("45");
    expect(onSliderChangeEnd).toHaveBeenCalled();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("slider", { name: "Angle slider" }))
      .not.toBeInTheDocument();
  });

  it("allows overriding the popover slider width", () => {
    render(
      <NumberInput
        label="Scale"
        max={100}
        min={0}
        showSliderPopover
        sliderWidth={180}
        value="50"
        onValueChange={vi.fn()}
      />
    );

    fireEvent.focus(screen.getByRole("spinbutton", { name: "Scale" }));
    const popover = screen.getByRole("slider", {
      name: "Scale slider"
    }).parentElement;

    expect(popover?.style.getPropertyValue("--kizkatt-number-input-slider-width"))
      .toBe("180px");
  });
});
