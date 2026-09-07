import {
  PERCENT_MAX_VALUE,
  TEXT_ELEMENT_DEFAULT_HEIGHT,
  TEXT_ELEMENT_DEFAULT_WIDTH
} from "kizkatt-graphic-engine";

import { useI18n } from "../../i18n";
import type { TextEditorProps } from "../../contracts/editorView";

export function TextEditor({
  element,
  onBlur,
  onChange,
  pan,
  zoom
}: TextEditorProps) {
  const { strings } = useI18n();

  return (
    <textarea
      aria-label={strings.canvas.editText}
      autoFocus
      className="kizkatt-text-editor"
      onBlur={onBlur}
      onChange={(event) => onChange(event.target.value)}
      style={{
        color: element.strokeColor,
        height: Math.max(TEXT_ELEMENT_DEFAULT_HEIGHT, element.height * zoom),
        left: pan.x + element.x * zoom,
        opacity: element.opacity / PERCENT_MAX_VALUE,
        top: pan.y + element.y * zoom,
        width: Math.max(TEXT_ELEMENT_DEFAULT_WIDTH, element.width * zoom)
      }}
      value={element.text}
    />
  );
}
