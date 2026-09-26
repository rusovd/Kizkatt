import { act, render, screen } from "@testing-library/react";
import { EditorView } from "codemirror";
import { describe, expect, it, vi } from "vitest";

import { SvgCodeEditor } from "./SvgCodeEditor";

describe("SvgCodeEditor", () => {
  it("renders XML with editor controls and reports document changes", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SvgCodeEditor
        invalid={false}
        label="SVG code"
        onBlur={() => undefined}
        onChange={onChange}
        value={'<svg viewBox="0 0 10 10">\n  <rect/>\n</svg>'}
      />
    );
    const content = screen.getByRole("textbox", { name: "SVG code" });
    const view = EditorView.findFromDOM(content);

    expect(view).not.toBeNull();
    expect(document.querySelector(".cm-lineNumbers")).toBeInTheDocument();
    expect(content.querySelectorAll(".cm-line")).toHaveLength(3);

    act(() => {
      view?.dispatch({
        changes: {
          from: 0,
          insert: '<svg viewBox="0 0 20 20">',
          to: view.state.doc.line(1).to
        }
      });
    });

    expect(onChange).toHaveBeenLastCalledWith(
      '<svg viewBox="0 0 20 20">\n  <rect/>\n</svg>'
    );

    rerender(
      <SvgCodeEditor
        invalid
        label="SVG code"
        onBlur={() => undefined}
        onChange={onChange}
        value={'<svg viewBox="0 0 30 30">\n  <circle/>\n</svg>'}
      />
    );

    expect(view?.state.doc.toString()).toContain("30 30");
    expect(content).toHaveAttribute("aria-invalid", "true");
  });
});
