import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useState } from "react";

import { DEFAULT_GRAPHIC_EDITOR_SETTINGS } from "../../config/defaultSettings";

type GraphicEditorSettings = {
  autohideToolbar: boolean;
  dragEnabled: boolean;
  toolbarOrientation: ToolbarOrientation;
  setAutohideToolbar: (value: boolean) => void;
  setDragEnabled: (value: boolean) => void;
  setToolbarOrientation: (value: ToolbarOrientation) => void;
};

export type ToolbarOrientation = "horizontal" | "vertical";

const DRAG_ENABLED_STORAGE_KEY =
  "kizkatt:graphic-editor:settings:drag-enabled";
const AUTOHIDE_TOOLBAR_STORAGE_KEY =
  "kizkatt:graphic-editor:settings:autohide-toolbar";
const TOOLBAR_ORIENTATION_STORAGE_KEY =
  "kizkatt:graphic-editor:settings:toolbar-orientation";

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

function readStoredToolbarOrientation(): ToolbarOrientation {
  const storedValue = window.localStorage.getItem(TOOLBAR_ORIENTATION_STORAGE_KEY);

  return storedValue === "vertical"
    ? "vertical"
    : DEFAULT_GRAPHIC_EDITOR_SETTINGS.toolbarOrientation;
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
  const [dragEnabled, setDragEnabledState] = useState(() =>
    readStoredBoolean(
      DRAG_ENABLED_STORAGE_KEY,
      DEFAULT_GRAPHIC_EDITOR_SETTINGS.dragEnabled
    )
  );
  const [toolbarOrientation, setToolbarOrientationState] = useState(
    readStoredToolbarOrientation
  );

  const settings = useMemo<GraphicEditorSettings>(
    () => ({
      autohideToolbar,
      dragEnabled,
      toolbarOrientation,
      setAutohideToolbar: (value) => {
        setAutohideToolbarState(value);
        storeBoolean(AUTOHIDE_TOOLBAR_STORAGE_KEY, value);
      },
      setDragEnabled: (value) => {
        setDragEnabledState(value);
        storeBoolean(DRAG_ENABLED_STORAGE_KEY, value);
      },
      setToolbarOrientation: (value) => {
        setToolbarOrientationState(value);
        window.localStorage.setItem(TOOLBAR_ORIENTATION_STORAGE_KEY, value);
      }
    }),
    [autohideToolbar, dragEnabled, toolbarOrientation]
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
