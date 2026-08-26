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
  isPanelPinned: (id: string) => boolean;
  registerVisiblePanel: (id: string, pinnable: boolean) => () => void;
  setAutohideToolbar: (value: boolean) => void;
  setColorMode: (value: ColorPickerMode) => void;
  setPanelPinned: (id: string, pinned: boolean) => void;
  toggleVisiblePanelsPinned: () => void;
};

const AUTOHIDE_TOOLBAR_STORAGE_KEY =
  "kizkatt:graphic-editor:settings:autohide-toolbar";
const COLOR_MODE_STORAGE_KEY =
  "kizkatt:graphic-editor:settings:color-mode";
const PINNED_PANELS_STORAGE_KEY =
  "kizkatt:graphic-editor:settings:pinned-panels";

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
      isPanelPinned: (id) => pinnedPanelIds.has(id),
      registerVisiblePanel,
      setAutohideToolbar: (value) => {
        setAutohideToolbarState(value);
        storeBoolean(AUTOHIDE_TOOLBAR_STORAGE_KEY, value);
      },
      setColorMode: (value) => {
        setColorModeState(value);
        window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, value);
      },
      setPanelPinned,
      toggleVisiblePanelsPinned
    }),
    [
      allVisiblePanelsPinned,
      autohideToolbar,
      colorMode,
      pinnedPanelIds,
      registerVisiblePanel,
      setPanelPinned,
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
