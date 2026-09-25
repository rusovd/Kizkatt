import { useEffect, useRef } from "react";
import { indentWithTab } from "@codemirror/commands";
import {
  HighlightStyle,
  indentUnit,
  syntaxHighlighting
} from "@codemirror/language";
import { xml } from "@codemirror/lang-xml";
import { EditorView, basicSetup } from "codemirror";
import { keymap } from "@codemirror/view";
import { tags } from "@lezer/highlight";

const kizkattCodeEditorTheme = EditorView.theme({
  "&": {
    height: "100%",
    backgroundColor: "transparent",
    color: "var(--kizkatt-text)"
  },
  "&.cm-focused": {
    outline: "none"
  },
  ".cm-content": {
    minHeight: "100%",
    caretColor: "var(--kizkatt-selection-strong)",
    padding: "8px 0"
  },
  ".cm-cursor, .cm-dropCursor": {
    borderLeftColor: "var(--kizkatt-selection-strong)"
  },
  ".cm-gutters": {
    backgroundColor: "color-mix(in srgb, var(--kizkatt-control-bg) 78%, transparent)",
    borderRight: "1px solid var(--kizkatt-divider)",
    color: "var(--kizkatt-muted-text)"
  },
  ".cm-activeLine, .cm-activeLineGutter": {
    backgroundColor: "color-mix(in srgb, var(--kizkatt-selection) 10%, transparent)"
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in srgb, var(--kizkatt-selection) 38%, transparent)"
  },
  ".cm-scroller": {
    fontFamily: [
      "ui-monospace",
      "SFMono-Regular",
      "Menlo",
      "Monaco",
      "Consolas",
      '"Liberation Mono"',
      "monospace"
    ].join(", "),
    fontSize: "0.72rem",
    lineHeight: "1.5",
    overflow: "auto"
  },
  ".cm-panels": {
    backgroundColor: "var(--kizkatt-control-bg)",
    color: "var(--kizkatt-text)"
  },
  ".cm-panels.cm-panels-bottom": {
    borderTop: "1px solid var(--kizkatt-divider)"
  },
  ".cm-panels button, .cm-panels input": {
    borderColor: "var(--kizkatt-divider)"
  },
  ".cm-tooltip": {
    borderColor: "var(--kizkatt-border)",
    backgroundColor: "var(--kizkatt-control-bg)",
    color: "var(--kizkatt-text)"
  }
});

const kizkattSvgHighlightStyle = HighlightStyle.define([
  { tag: tags.angleBracket, color: "var(--kizkatt-code-punctuation)" },
  { tag: tags.tagName, color: "var(--kizkatt-code-tag)" },
  { tag: tags.attributeName, color: "var(--kizkatt-code-attribute)" },
  { tag: tags.string, color: "var(--kizkatt-code-string)" },
  { tag: tags.number, color: "var(--kizkatt-code-number)" },
  {
    tag: [tags.comment, tags.processingInstruction],
    color: "var(--kizkatt-muted-text)",
    fontStyle: "italic"
  },
  { tag: tags.invalid, color: "var(--kizkatt-code-invalid)" }
]);

export function SvgCodeEditor({
  invalid,
  label,
  onBlur,
  onChange,
  value
}: {
  invalid: boolean;
  label: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  value: string;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onBlurRef = useRef(onBlur);
  const syncingValueRef = useRef(false);

  onChangeRef.current = onChange;
  onBlurRef.current = onBlur;

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) {
      return;
    }

    const view = new EditorView({
      doc: value,
      extensions: [
        basicSetup,
        xml(),
        indentUnit.of("  "),
        keymap.of([indentWithTab]),
        kizkattCodeEditorTheme,
        syntaxHighlighting(kizkattSvgHighlightStyle),
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({
          "aria-label": label,
          "aria-multiline": "true"
        }),
        EditorView.domEventHandlers({
          keydown(event) {
            event.stopPropagation();
            return false;
          }
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !syncingValueRef.current) {
            onChangeRef.current(update.state.doc.toString());
          }
        })
      ],
      parent: mount
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [label]);

  useEffect(() => {
    const view = viewRef.current;

    if (!view || view.state.doc.toString() === value) {
      return;
    }

    syncingValueRef.current = true;
    view.dispatch({
      changes: { from: 0, insert: value, to: view.state.doc.length }
    });
    syncingValueRef.current = false;
  }, [value]);

  useEffect(() => {
    const content = viewRef.current?.contentDOM;

    if (content) {
      content.setAttribute("aria-invalid", String(invalid));
    }
  }, [invalid]);

  return (
    <div
      className={`kizkatt-svg-code-editor${invalid ? " is-invalid" : ""}`}
      ref={mountRef}
      onBlur={(event) => {
        const relatedTarget = event.relatedTarget;

        if (
          !(relatedTarget instanceof Node) ||
          !event.currentTarget.contains(relatedTarget)
        ) {
          onBlurRef.current();
        }
      }}
    />
  );
}
