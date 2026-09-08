import {
  GraphicEditorSettingsProvider,
  I18nProvider
} from "kizkatt-ui";

import { KizkattGraphicEditorContent } from "../components/KizkattGraphicEditorContent";

export function KizkattGraphicEditor() {
  return (
    <I18nProvider>
      <GraphicEditorSettingsProvider>
        <KizkattGraphicEditorContent />
      </GraphicEditorSettingsProvider>
    </I18nProvider>
  );
}
