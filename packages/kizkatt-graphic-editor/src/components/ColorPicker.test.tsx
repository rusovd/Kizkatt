import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ColorPicker } from "./ColorPicker";

describe("ColorPicker", () => {
  it("edits one color through HEX, RGB/A, and CMYK representations", () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();

    render(
      <ColorPicker
        value="#f08c00"
        onChange={onChange}
        onCommit={onCommit}
      />
    );

    expect(screen.getByRole("button", { name: "HEX" }))
      .toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("textbox", { name: "HEX" }))
      .toHaveValue("f08c00");

    fireEvent.click(screen.getByRole("button", { name: "RGB/A" }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "R" }), {
      target: { value: "10" }
    });
    expect(onChange).toHaveBeenLastCalledWith("#0a8c00");

    fireEvent.change(screen.getByRole("spinbutton", { name: "A" }), {
      target: { value: "0.5" }
    });
    expect(onChange).toHaveBeenLastCalledWith("#0a8c0080");
    fireEvent.blur(screen.getByRole("spinbutton", { name: "A" }));
    expect(onCommit).toHaveBeenLastCalledWith("#0a8c0080");

    fireEvent.click(screen.getByRole("button", { name: "CMYK" }));
    expect(screen.getByRole("spinbutton", { name: "C" }))
      .toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "K" }))
      .toBeInTheDocument();
  });
});
