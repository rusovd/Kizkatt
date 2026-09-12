import { describe, expect, it } from "vitest";

import {
  decodeSceneFileContents,
  encodeSceneFileContents,
  getSceneFileFormat,
  normalizeSceneFileBaseName
} from "./sceneFile";

describe("scene file codec", () => {
  it("encodes and decodes archived Kizkatt documents", async () => {
    const source = '{"kk":{"scene":{}}}';
    const archive = await encodeSceneFileContents({
      contents: source,
      fileName: "drawing.kk",
      format: "kk"
    });

    expect(archive).toBeInstanceOf(Uint8Array);
    await expect(
      decodeSceneFileContents({ contents: archive, format: "kk" })
    ).resolves.toEqual({ archived: true, contents: source });
  });

  it("keeps uncompressed Kizkatt and SVG documents as text", async () => {
    const source = '{"kk":{}}';

    await expect(
      encodeSceneFileContents({
        archiveKk: false,
        contents: source,
        fileName: "drawing.kk",
        format: "kk"
      })
    ).resolves.toBe(source);
    await expect(
      decodeSceneFileContents({ contents: source, format: "kk" })
    ).resolves.toEqual({ archived: false, contents: source });
    await expect(
      decodeSceneFileContents({
        contents: new TextEncoder().encode("<svg />"),
        format: "svg"
      })
    ).resolves.toEqual({ archived: false, contents: "<svg />" });
  });

  it("owns scene file naming and format detection", () => {
    expect(getSceneFileFormat("Drawing.KK")).toBe("kk");
    expect(getSceneFileFormat("drawing.svg")).toBe("svg");
    expect(getSceneFileFormat("drawing.png")).toBeNull();
    expect(normalizeSceneFileBaseName(" folder/name.svg ")).toBe(
      "folder-name"
    );
  });
});
