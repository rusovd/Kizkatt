import { describe, expect, it, vi } from "vitest";

import { DEFAULT_ELEMENT_STYLE_BY_THEME } from "../config/constants";
import { createElement } from "../model/element";
import { createDefaultKizkattSceneSettings } from "./sceneDocument";
import { createSceneExport, importSceneElements } from "./sceneTransfer";

describe("scene transfer", () => {
  it("creates a reusable Kizkatt document export", async () => {
    const element = createElement(
      "rectangle",
      { x: 10, y: 20 },
      DEFAULT_ELEMENT_STYLE_BY_THEME.dark
    );
    const result = await createSceneExport({
      dpi: 150,
      elements: [element],
      format: "kk",
      settings: createDefaultKizkattSceneSettings(),
      svg: null
    });

    expect(result?.document.kk.scene.Objects.Object_000001).toMatchObject({
      id: element.id,
      layer: 1,
      type: "rectangle"
    });
    expect(JSON.parse(result?.contents ?? "{}")).toEqual(result?.document);
  });

  it("imports Kizkatt elements with fresh ids", async () => {
    const element = createElement(
      "ellipse",
      { x: 5, y: 6 },
      DEFAULT_ELEMENT_STYLE_BY_THEME.dark
    );
    const exported = await createSceneExport({
      dpi: 150,
      elements: [element],
      format: "kk",
      settings: createDefaultKizkattSceneSettings(),
      svg: null
    });
    const createElementId = vi.fn(() => "fresh-id");
    const imported = importSceneElements({
      contents: exported?.contents ?? "",
      createElementId,
      existingElements: [],
      fallbackSettings: createDefaultKizkattSceneSettings(),
      fallbackStyle: DEFAULT_ELEMENT_STYLE_BY_THEME.dark,
      format: "kk"
    });

    expect(createElementId).toHaveBeenCalled();
    expect(imported).toHaveLength(1);
    expect(imported?.[0]).toMatchObject({ id: "fresh-id", type: "ellipse" });
  });
});
