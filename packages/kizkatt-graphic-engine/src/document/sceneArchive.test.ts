import { describe, expect, it } from "vitest";
import { strToU8, unzipSync, zipSync } from "fflate";

import {
  createKizkattSceneArchive,
  extractKizkattSceneArchive,
  isKizkattSceneArchive
} from "./sceneArchive";

describe("Kizkatt scene archives", () => {
  it("stores and restores the scene JSON in a ZIP container", async () => {
    const documentJson = JSON.stringify({
      kk: { meta: { formatVersion: 1 }, scene: { Objects: {} } }
    });
    const archive = await createKizkattSceneArchive(
      documentJson,
      "my drawing.kk"
    );

    expect(isKizkattSceneArchive(archive)).toBe(true);
    expect(Object.keys(unzipSync(archive))).toEqual(["my drawing.kk"]);
    await expect(extractKizkattSceneArchive(archive)).resolves.toBe(
      documentJson
    );
  });

  it("does not identify plain JSON as a scene archive", () => {
    expect(isKizkattSceneArchive(new TextEncoder().encode('{"kk":{}}')))
      .toBe(false);
  });

  it("extracts only the scene entry from archives with unrelated files", async () => {
    const archive = zipSync({
      "preview.png": new Uint8Array([1, 2, 3]),
      "scene.kk": strToU8('{"kk":{"scene":{}}}')
    });

    await expect(extractKizkattSceneArchive(archive)).resolves.toBe(
      '{"kk":{"scene":{}}}'
    );
  });
});
