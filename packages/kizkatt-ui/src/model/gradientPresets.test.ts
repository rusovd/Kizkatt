import { describe, expect, it } from "vitest";

import { getUniqueGradientPresetName } from "./gradientPresets";

describe("getUniqueGradientPresetName", () => {
  it("keeps a name that is not used", () => {
    expect(getUniqueGradientPresetName("Ocean", ["Sunset"])).toBe("Ocean");
  });

  it("adds a three-digit suffix to a duplicate name", () => {
    expect(getUniqueGradientPresetName("Ocean", ["Ocean"])).toBe("Ocean 001");
  });

  it("increments the highest existing suffix for the same base name", () => {
    expect(
      getUniqueGradientPresetName("Ocean 002", [
        "Ocean",
        "Ocean 001",
        "Ocean 002",
        "Ocean 007",
        "Ocean breeze 008"
      ])
    ).toBe("Ocean 008");
  });

  it("compares duplicate names without case sensitivity", () => {
    expect(getUniqueGradientPresetName("Ocean", ["ocean 003"])).toBe("Ocean");
    expect(
      getUniqueGradientPresetName("Ocean 003", ["ocean 003"])
    ).toBe("Ocean 004");
  });
});
