import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState
} from "react";
import type { ColorPickerMode } from "kizkatt-graphic-editor";

import { DEFAULT_GRAPHIC_EDITOR_SETTINGS } from "../../config/defaultSettings";

type GraphicEditorSettings = {
  autohideToolbar: boolean;
  allVisiblePanelsPinned: boolean;
  colorMode: ColorPickerMode;
  gradientFreeDeformation: boolean;
  isPanelPinned: (id: string) => boolean;
  overlayContrast: boolean;
  registerVisiblePanel: (id: string, pinnable: boolean) => () => void;
  setAutohideToolbar: (value: boolean) => void;
  setColorMode: (value: ColorPickerMode) => void;
  setGradientFreeDeformation: (value: boolean) => void;
  setOverlayContrast: (value: boolean) => void;
  setPanelPinned: (id: string, pinned: boolean) => void;
  setTextureFreeDeformation: (value: boolean) => void;
  textureFreeDeformation: boolean;
  toggleVisiblePanelsPinned: () => void;
};

const AUTOHIDE_TOOLBAR_STORAGE_KEY =
  "kizkatt:graphic-editor:settings:autohide-toolbar";
const COLOR_MODE_STORAGE_KEY =
  "kizkatt:graphic-editor:settings:color-mode";
const GRADIENT_FREE_DEFORMATION_STORAGE_KEY =
  "kizkatt:graphic-editor:settings:gradient-free-deformation";
const OVERLAY_CONTRAST_STORAGE_KEY =
  "kizkatt:graphic-editor:settings:overlay-contrast";
const PINNED_PANELS_STORAGE_KEY =
  "kizkatt:graphic-editor:settings:pinned-panels";
const TEXTURE_FREE_DEFORMATION_STORAGE_KEY =
  "kizkatt:graphic-editor:settings:texture-free-deformation";

const GraphicEditorSettingsContext =
  createContext<GraphicEditorSettings | null>(null);

function readStoredBoolean(key: string, fallback: boolean) {
  const storedValue = window.localStorage.getItem(key);

  if (storedValue === "true") {
    return true;
  }

  if (storedValue === "false") {
    return false;
  }

  return fallback;
}

function storeBoolean(key: string, value: boolean) {
  window.localStorage.setItem(key, String(value));
}

function readStoredColorMode(): ColorPickerMode {
  const storedValue = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);

  return storedValue === "hex" ||
    storedValue === "rgba" ||
    storedValue === "cmyk"
    ? storedValue
    : DEFAULT_GRAPHIC_EDITOR_SETTINGS.colorMode;
}

function readStoredPanelIds() {
  const storedValue = window.localStorage.getItem(PINNED_PANELS_STORAGE_KEY);

  if (!storedValue) {
    return new Set<string>();
  }

  try {
    const panelIds = JSON.parse(storedValue);

    return new Set(
      Array.isArray(panelIds)
        ? panelIds.filter((id): id is string => typeof id === "string")
        : []
    );
  } catch {
    return new Set<string>();
  }
}

function storePanelIds(panelIds: Set<string>) {
  window.localStorage.setItem(
    PINNED_PANELS_STORAGE_KEY,
    JSON.stringify([...panelIds])
  );
}

export function GraphicEditorSettingsProvider({
  children
}: {
  children: ReactNode;
}) {
  const [autohideToolbar, setAutohideToolbarState] = useState(() =>
    readStoredBoolean(
      AUTOHIDE_TOOLBAR_STORAGE_KEY,
      DEFAULT_GRAPHIC_EDITOR_SETTINGS.autohideToolbar
    )
  );
  const [colorMode, setColorModeState] = useState(readStoredColorMode);
  const [gradientFreeDeformation, setGradientFreeDeformationState] = useState(
    () =>
      readStoredBoolean(
        GRADIENT_FREE_DEFORMATION_STORAGE_KEY,
        DEFAULT_GRAPHIC_EDITOR_SETTINGS.gradientFreeDeformation
      )
  );
  const [textureFreeDeformation, setTextureFreeDeformationState] = useState(
    () =>
      readStoredBoolean(
        TEXTURE_FREE_DEFORMATION_STORAGE_KEY,
        DEFAULT_GRAPHIC_EDITOR_SETTINGS.textureFreeDeformation
      )
  );
  const [overlayContrast, setOverlayContrastState] = useState(() =>
    readStoredBoolean(
      OVERLAY_CONTRAST_STORAGE_KEY,
      DEFAULT_GRAPHIC_EDITOR_SETTINGS.overlayContrast
    )
  );
  const [pinnedPanelIds, setPinnedPanelIds] = useState(readStoredPanelIds);
  const [visiblePinnablePanelIds, setVisiblePinnablePanelIds] = useState(
    () => new Set<string>()
  );

  const setPanelPinned = useCallback((id: string, pinned: boolean) => {
    setPinnedPanelIds((currentPanelIds) => {
      const nextPanelIds = new Set(currentPanelIds);

      if (pinned) {
        nextPanelIds.add(id);
      } else {
        nextPanelIds.delete(id);
      }

      storePanelIds(nextPanelIds);
      return nextPanelIds;
    });
  }, []);

  const registerVisiblePanel = useCallback((id: string, pinnable: boolean) => {
    if (!pinnable) {
      return () => undefined;
    }

    setVisiblePinnablePanelIds((currentPanelIds) => {
      const nextPanelIds = new Set(currentPanelIds);
      nextPanelIds.add(id);
      return nextPanelIds;
    });

    return () => {
      setVisiblePinnablePanelIds((currentPanelIds) => {
        const nextPanelIds = new Set(currentPanelIds);
        nextPanelIds.delete(id);
        return nextPanelIds;
      });
    };
  }, []);

  const allVisiblePanelsPinned =
    visiblePinnablePanelIds.size > 0 &&
    [...visiblePinnablePanelIds].every((id) => pinnedPanelIds.has(id));

  const toggleVisiblePanelsPinned = useCallback(() => {
    setPinnedPanelIds((currentPanelIds) => {
      const nextPanelIds = new Set(currentPanelIds);
      const shouldPin =
        visiblePinnablePanelIds.size > 0 &&
        [...visiblePinnablePanelIds].some((id) => !nextPanelIds.has(id));

      visiblePinnablePanelIds.forEach((id) => {
        if (shouldPin) {
          nextPanelIds.add(id);
        } else {
          nextPanelIds.delete(id);
        }
      });

      storePanelIds(nextPanelIds);
      return nextPanelIds;
    });
  }, [visiblePinnablePanelIds]);

  const settings = useMemo<GraphicEditorSettings>(
    () => ({
      autohideToolbar,
      allVisiblePanelsPinned,
      colorMode,
      gradientFreeDeformation,
      isPanelPinned: (id) => pinnedPanelIds.has(id),
      overlayContrast,
      registerVisiblePanel,
      setAutohideToolbar: (value) => {
        setAutohideToolbarState(value);
        storeBoolean(AUTOHIDE_TOOLBAR_STORAGE_KEY, value);
      },
      setColorMode: (value) => {
        setColorModeState(value);
        window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, value);
      },
      setGradientFreeDeformation: (value) => {
        setGradientFreeDeformationState(value);
        storeBoolean(GRADIENT_FREE_DEFORMATION_STORAGE_KEY, value);
      },
      setOverlayContrast: (value) => {
        setOverlayContrastState(value);
        storeBoolean(OVERLAY_CONTRAST_STORAGE_KEY, value);
      },
      setPanelPinned,
      setTextureFreeDeformation: (value) => {
        setTextureFreeDeformationState(value);
        storeBoolean(TEXTURE_FREE_DEFORMATION_STORAGE_KEY, value);
      },
      textureFreeDeformation,
      toggleVisiblePanelsPinned
    }),
    [
      allVisiblePanelsPinned,
      autohideToolbar,
      colorMode,
      gradientFreeDeformation,
      overlayContrast,
      pinnedPanelIds,
      registerVisiblePanel,
      setPanelPinned,
      textureFreeDeformation,
      toggleVisiblePanelsPinned
    ]
  );

  return (
    <GraphicEditorSettingsContext.Provider value={settings}>
      {children}
    </GraphicEditorSettingsContext.Provider>
  );
}

export function useGraphicEditorSettings() {
  const settings = useContext(GraphicEditorSettingsContext);

  if (!settings) {
    throw new Error(
      "useGraphicEditorSettings must be used inside GraphicEditorSettingsProvider."
    );
  }

  return settings;
}
