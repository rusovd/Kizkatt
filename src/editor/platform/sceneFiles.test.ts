import { afterEach, describe, expect, it, vi } from "vitest";

import { loadSceneFile, saveSceneFile } from "./sceneFiles";

afterEach(() => {
  Reflect.deleteProperty(window, "showOpenFilePicker");
  Reflect.deleteProperty(window, "showSaveFilePicker");
});

describe("scene file access", () => {
  it("saves .kk through a stable Downloads picker", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn().mockResolvedValue(undefined);
    const showSaveFilePicker = vi.fn().mockResolvedValue({
      createWritable: vi.fn().mockResolvedValue({ close, write }),
      name: "drawing.kk"
    });
    Object.defineProperty(window, "showSaveFilePicker", {
      configurable: true,
      value: showSaveFilePicker
    });

    const result = await saveSceneFile({
      getContents: () => "scene contents",
      suggestedBaseName: "drawing.svg"
    });

    expect(showSaveFilePicker).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "kizkatt-scene-save",
        startIn: "downloads",
        suggestedName: "drawing.kk"
      })
    );
    expect(write).toHaveBeenCalledWith("scene contents");
    expect(close).toHaveBeenCalled();
    expect(result).toMatchObject({ format: "kk", name: "drawing.kk" });
  });

  it("saves directly through an existing .kk handle", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn().mockResolvedValue(undefined);
    const handle = {
      createWritable: vi.fn().mockResolvedValue({ close, write }),
      getFile: vi.fn(),
      name: "drawing.kk"
    };
    const showSaveFilePicker = vi.fn();
    Object.defineProperty(window, "showSaveFilePicker", {
      configurable: true,
      value: showSaveFilePicker
    });

    await saveSceneFile({
      getContents: () => "updated scene",
      handle
    });

    expect(showSaveFilePicker).not.toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith("updated scene");
    expect(close).toHaveBeenCalled();
  });

  it("loads only the requested format from the remembered Downloads picker", async () => {
    const file = {
      name: "import.kk",
      text: vi.fn().mockResolvedValue('{"kk":{}}')
    } as unknown as File;
    const showOpenFilePicker = vi.fn().mockResolvedValue([
      { getFile: vi.fn().mockResolvedValue(file), name: file.name }
    ]);
    Object.defineProperty(window, "showOpenFilePicker", {
      configurable: true,
      value: showOpenFilePicker
    });

    const result = await loadSceneFile({ format: "kk" });

    expect(showOpenFilePicker).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "kizkatt-scene-load",
        multiple: false,
        startIn: "downloads"
      })
    );
    expect(showOpenFilePicker.mock.calls[0][0].types).toHaveLength(1);
    expect(showOpenFilePicker.mock.calls[0][0].types[0].accept)
      .toHaveProperty("application/vnd.kizkatt+json");
    expect(result).toMatchObject({
      contents: '{"kk":{}}',
      format: "kk",
      name: "import.kk"
    });
  });
});
