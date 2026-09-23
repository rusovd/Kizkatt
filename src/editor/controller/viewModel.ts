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
  ContextualFillStyle,
  ObjectPanelProps,
  StylingPanelProps,
  TextEditorProps,
  ToolControls,
  WorkspaceControls
} from "kizkatt-ui";
import type {
  KizkattElement,
  KizkattTheme,
  SimpleTraceResult
} from "kizkatt-graphic-engine";


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
  simpleTraceControls: {
    onApply: (result: SimpleTraceResult, deleteOriginal: boolean) => void;
    sourceElement: KizkattElement;
  } | null;
  selectionGeometryControls: ObjectPanelProps | null;
  state: {
    activeDisplayMode: EditorDisplayMode | null;
    fillSettingsRequest: {
      fillStyle: ContextualFillStyle;
      id: number;
    } | null;
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
