import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createKizkattSceneArchive,
  extractKizkattSceneArchive
} from "kizkatt-graphic-engine";

import { loadSceneFile, saveSceneFile } from "./sceneFiles";

function createMockFile(name: string, contents: string | Uint8Array) {
  const bytes = typeof contents === "string"
    ? new TextEncoder().encode(contents)
    : contents;

  return {
    arrayBuffer: vi.fn().mockResolvedValue(bytes.slice().buffer),
    name,
    slice: vi.fn((start = 0, end = bytes.byteLength) => ({
      arrayBuffer: vi.fn().mockResolvedValue(bytes.slice(start, end).buffer)
    })),
    text: vi.fn().mockResolvedValue(
      typeof contents === "string"
        ? contents
        : new TextDecoder().decode(contents)
    )
  } as unknown as File;
}

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
    const archive = write.mock.calls[0][0] as Uint8Array;
    const archivedContents = await extractKizkattSceneArchive(
      archive
    );

    expect(archivedContents).toBe("scene contents");
    expect(close).toHaveBeenCalled();
    expect(result).toMatchObject({ format: "kk", name: "drawing.kk" });
  });

  it("saves an uncompressed .kk JSON file when archiving is disabled", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, "showSaveFilePicker", {
      configurable: true,
      value: vi.fn().mockResolvedValue({
        createWritable: vi.fn().mockResolvedValue({
          close: vi.fn().mockResolvedValue(undefined),
          write
        }),
        name: "something.kk"
      })
    });

    const result = await saveSceneFile({
      archiveKk: false,
      getContents: () => '{"kk":{}}'
    });

    expect(write).toHaveBeenCalledWith('{"kk":{}}');
    expect(result).toMatchObject({
      archived: false,
      format: "kk",
      name: "something.kk"
    });
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
    const archive = write.mock.calls[0][0] as Uint8Array;
    await expect(
      extractKizkattSceneArchive(archive)
    ).resolves.toBe("updated scene");
    expect(close).toHaveBeenCalled();
  });

  it("loads only the requested format from the remembered Downloads picker", async () => {
    const documentJson = '{"kk":{}}';
    const archive = await createKizkattSceneArchive(documentJson);
    const file = createMockFile("import.kk", archive);
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
      .toHaveProperty("application/vnd.kizkatt+zip");
    expect(showOpenFilePicker.mock.calls[0][0].types[0].accept)
      .toHaveProperty("application/vnd.kizkatt+json");
    expect(result).toMatchObject({
      archived: true,
      contents: documentJson,
      format: "kk",
      name: "import.kk"
    });
  });

  it("keeps loading legacy uncompressed .kk JSON files", async () => {
    const documentJson = '{"kk":{"scene":{}}}';
    const file = createMockFile("legacy.kk", documentJson);
    Object.defineProperty(window, "showOpenFilePicker", {
      configurable: true,
      value: vi.fn().mockResolvedValue([
        { getFile: vi.fn().mockResolvedValue(file), name: file.name }
      ])
    });

    await expect(loadSceneFile({ format: "kk" })).resolves.toMatchObject({
      archived: false,
      contents: documentJson,
      format: "kk"
    });
    expect(file.arrayBuffer).not.toHaveBeenCalled();
    expect(file.text).toHaveBeenCalledOnce();
  });
});
