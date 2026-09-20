import type {
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent,
  PointerEvent,
  ReactNode,
  RefObject
} from "react";
import type {
  DocumentControls,
  EditorCommandControls,
  EditorDisplayMode,
  ObjectPanelProps,
  StylingPanelProps,
  TextEditorProps,
  ToolControls,
  WorkspaceControls
} from "kizkatt-ui";
import type { KizkattTheme } from "kizkatt-graphic-engine";


export type KizkattGraphicEditorViewModel = {
  boardBindings: {
    onKeyDownCapture: (event: KeyboardEvent<HTMLElement>) => void;
    onPaste: (event: ClipboardEvent<HTMLElement>) => void;
    onPointerDownCapture: (event: PointerEvent<HTMLElement>) => void;
  };
  canvas: ReactNode;
  commandControls: EditorCommandControls;
  documentControls: DocumentControls;
  imageInputBindings: {
    accept: string;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    ref: RefObject<HTMLInputElement | null>;
  };
  selectionGeometryControls: ObjectPanelProps | null;
  state: {
    activeDisplayMode: EditorDisplayMode | null;
    isLoading: boolean;
    menuOpen: boolean;
    theme: KizkattTheme;
    uiScale: number;
  };
  stylingControls: StylingPanelProps;
  textEditing: TextEditorProps | null;
  toolControls: ToolControls;
  workspaceControls: WorkspaceControls;
};
