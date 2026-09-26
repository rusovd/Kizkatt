import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { EditorView } from "codemirror";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider } from "../../i18n";
import { GraphicEditorSettingsProvider } from "../settings/GraphicEditorSettings";
import {
  getScreenSizedSvgTextureSize,
  getNextSvgTextureName,
  SvgTextureFillPanel,
  type SvgTextureOption
} from "./SvgTextureFillPanel";

const originalCode = [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">',
  '  <rect width="10" height="10" fill="#fff"/>',
  "</svg>"
].join("\n");
const editedCode = originalCode.replace("#fff", "#f00");
const texture: SvgTextureOption = {
  code: originalCode,
  id: "svg.abstract-envelope",
  name: "Abstract Envelope",
  source: "abstract-envelope.svg"
};

function renderPanel({
  onChange = vi.fn(),
  onSaveTexture = vi.fn((request) => ({
    ...request,
    id: "svg.custom.saved"
  }))
} = {}) {
  render(
    <I18nProvider>
      <GraphicEditorSettingsProvider>
        <SvgTextureFillPanel
          onChange={onChange}
          onChangeEnd={() => undefined}
          onClose={() => undefined}
          onSaveTexture={onSaveTexture}
          reopenKey={0}
          targetSize={{ height: 90, width: 140 }}
          texture={{ name: texture.name, textureId: texture.id }}
          textures={[texture]}
        />
      </GraphicEditorSettingsProvider>
    </I18nProvider>
  );

  return { onChange, onSaveTexture };
}

describe("SvgTextureFillPanel", () => {
  it("sizes the full SVG texture to one screen axis", () => {
    expect(
      getScreenSizedSvgTextureSize(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"/>',
        { height: 800, width: 1200 }
      )
    ).toEqual({ height: 600, width: 1200 });
    expect(
      getScreenSizedSvgTextureSize(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 20"/>',
        { height: 800, width: 1200 }
      )
    ).toEqual({ height: 800, width: 400 });
    expect(
      getScreenSizedSvgTextureSize(
        [
          '<svg xmlns="http://www.w3.org/2000/svg" width="100%">',
          '<pattern viewBox="0 0 1080 900"/>',
          "</svg>"
        ].join(""),
        { height: 800, width: 1200 }
      )
    ).toEqual({ height: 800, width: 960 });
  });

  it("keeps code as a draft until Apply and resets it", async () => {
    const { onChange } = renderPanel();
    const content = await screen.findByRole("textbox", { name: "SVG code" });
    const view = EditorView.findFromDOM(content);

    act(() => {
      view?.dispatch({
        changes: {
          from: 0,
          insert: editedCode,
          to: view.state.doc.length
        }
      });
    });

    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    await waitFor(() => {
      expect(view?.state.doc.toString()).toBe(originalCode);
    });

    act(() => {
      view?.dispatch({
        changes: {
          from: 0,
          insert: editedCode,
          to: view.state.doc.length
        }
      });
    });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: "Abstract Envelope",
        source: expect.stringContaining("data:image/svg+xml"),
        textureId: texture.id
      })
    );
  });

  it("switches from fitted fill to a screen-sized interactive crop", () => {
    const { onChange } = renderPanel();

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Fit to object size" })
    );

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        fitToObject: false,
        height: expect.any(Number),
        offsetX: 0,
        offsetY: 0,
        rotation: 0,
        width: expect.any(Number)
      })
    );
  });

  it("saves a named copy with an automatic sequence", async () => {
    const { onChange, onSaveTexture } = renderPanel();

    await screen.findByRole("textbox", { name: "SVG code" });
    fireEvent.click(screen.getByRole("button", { name: "Save SVG" }));

    const dialog = screen.getByRole("dialog", { name: "Save SVG fill" });

    expect(within(dialog).getByRole("textbox", { name: "Name" }))
      .toHaveValue("Abstract Envelope_0001");
    fireEvent.click(within(dialog).getByRole("button", { name: "Save SVG" }));

    expect(onSaveTexture).toHaveBeenCalledWith(
      expect.objectContaining({
        code: originalCode,
        name: "Abstract Envelope_0001"
      })
    );
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        name: "Abstract Envelope_0001",
        textureId: "svg.custom.saved"
      })
    );
  });

  it("increments an existing four-digit suffix", () => {
    expect(
      getNextSvgTextureName("Pattern_0001", [
        { name: "Pattern_0001" },
        { name: "Pattern_0002" }
      ])
    ).toBe("Pattern_0003");
  });
});
