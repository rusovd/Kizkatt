const ignoredWindowEvents = new Set(["unload"]);
const patchFlag = "__kizkattCompatibilityPatchesInstalled";

type KizkattPatchedWindow = Window &
  typeof globalThis & {
    [patchFlag]?: true;
  };

export function installCompatibilityPatches() {
  const patchedWindow = window as KizkattPatchedWindow;

  if (patchedWindow[patchFlag]) {
    return;
  }

  const nativeAddEventListener = window.addEventListener.bind(window);

  const patchedAddEventListener = ((
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ) => {
    if (ignoredWindowEvents.has(String(type))) {
      return;
    }

    nativeAddEventListener(type, listener, options);
  }) as typeof window.addEventListener;

  window.addEventListener = patchedAddEventListener;

  patchedWindow[patchFlag] = true;
}
