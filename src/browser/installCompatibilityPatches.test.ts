import { afterEach, describe, expect, it, vi } from "vitest";

import { installCompatibilityPatches } from "./installCompatibilityPatches";

const patchFlag = "__kizkattCompatibilityPatchesInstalled";

type KizkattPatchedWindow = Window &
  typeof globalThis & {
    [patchFlag]?: true;
  };

describe("installCompatibilityPatches", () => {
  const nativeAddEventListener = window.addEventListener;

  afterEach(() => {
    delete (window as KizkattPatchedWindow)[patchFlag];
    window.addEventListener = nativeAddEventListener;
    vi.restoreAllMocks();
  });

  it("ignores window unload listeners blocked by the browser permissions policy", () => {
    const nativeAddEventListenerMock = vi.fn();
    window.addEventListener = nativeAddEventListenerMock;

    installCompatibilityPatches();
    window.addEventListener("unload", vi.fn());

    expect(nativeAddEventListenerMock).not.toHaveBeenCalled();
  });

  it("keeps non-unload window events working normally", () => {
    const resizeListener = vi.fn();

    installCompatibilityPatches();
    window.addEventListener("resize", resizeListener);
    window.dispatchEvent(new Event("resize"));

    expect(resizeListener).toHaveBeenCalledTimes(1);
  });

  it("does not wrap event listeners more than once", () => {
    installCompatibilityPatches();
    const firstPatchedAddEventListener = window.addEventListener;

    installCompatibilityPatches();

    expect(window.addEventListener).toBe(firstPatchedAddEventListener);
  });
});
