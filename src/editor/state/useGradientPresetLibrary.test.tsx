import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_GRADIENT_FILL } from "kizkatt-graphic-engine";

import { DEFAULT_GRADIENT_PRESETS, type GradientPreset } from "kizkatt-ui";
import { useGradientPresetLibrary } from "./useGradientPresetLibrary";

describe("useGradientPresetLibrary", () => {
  beforeEach(() => window.localStorage.clear());

  it("persists uniquely named presets and removes custom presets", () => {
    const { result } = renderHook(() => useGradientPresetLibrary());
    let preset: GradientPreset | undefined;

    act(() => {
      preset = result.current.savePreset({
        ...DEFAULT_GRADIENT_FILL,
        name: "Sunset"
      });
    });

    expect(preset?.name).toBe("Sunset 001");
    expect(result.current.customPresets).toEqual([preset]);
    expect(window.localStorage.getItem("kizkatt:last-gradient-preset"))
      .toBe(preset?.id);
    expect(result.current.getRememberedPreset()).toEqual(preset);

    act(() => {
      expect(result.current.deletePreset(preset as GradientPreset)).toBe(true);
    });

    expect(result.current.customPresets).toEqual([]);
    expect(window.localStorage.getItem("kizkatt:last-gradient-preset"))
      .toBeNull();
    expect(JSON.parse(
      window.localStorage.getItem("kizkatt:custom-gradient-presets") ?? "[]"
    )).toEqual([]);
  });

  it("does not remove built-in presets", () => {
    const { result } = renderHook(() => useGradientPresetLibrary());

    act(() => {
      expect(result.current.deletePreset(DEFAULT_GRADIENT_PRESETS[0])).toBe(false);
    });

    expect(result.current.presets).toEqual(DEFAULT_GRADIENT_PRESETS);
  });
});
