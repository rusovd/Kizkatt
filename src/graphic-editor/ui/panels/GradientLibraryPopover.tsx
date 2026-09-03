import { useMemo, useState } from "react";
import type { GradientFill } from "kizkatt-graphic-engine";
import {
  DEFAULT_GRADIENT_PRESETS,
  getGradientCssPreview,
  type GradientPreset
} from "kizkatt-graphic-editor";

import { useI18n } from "../../i18n";
import { DraggablePanel } from "../positioning/DraggablePanel";

export function GradientLibraryPopover({
  activeGradient,
  customPresets,
  onClose,
  onGradientChange,
  reopenKey
}: {
  activeGradient?: GradientFill;
  customPresets: readonly GradientPreset[];
  onClose: () => void;
  onGradientChange: (preset: GradientPreset) => void;
  reopenKey: number;
}) {
  const { strings } = useI18n();
  const [search, setSearch] = useState("");
  const presets = useMemo(
    () => [...DEFAULT_GRADIENT_PRESETS, ...customPresets],
    [customPresets]
  );
  const filtered = presets.filter((preset) =>
    preset.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  );

  return (
    <DraggablePanel
      id="gradient-library"
      closable
      defaultOrientation="vertical"
      minSize={{ height: 420, width: 420 }}
      onClose={onClose}
      orientationChangeable={false}
      pinnable
      reopenKey={reopenKey}
      resizable
      resizeAxes={{ vertical: "vertical" }}
      title={strings.gradientLibrary.title}
    >
      {({ actions, chrome }) => (
        <section className="kizkatt-gradient-library" aria-label={strings.gradientLibrary.title}>
          {chrome}
          <input
            aria-label={strings.gradientLibrary.search}
            placeholder={strings.gradientLibrary.search}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="kizkatt-gradient-library-grid">
            {filtered.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={activeGradient?.presetId === preset.id ? "is-active" : undefined}
                onClick={() => onGradientChange(preset)}
              >
                <i style={{ background: getGradientCssPreview(preset.gradient) }} />
                <span>{preset.name}</span>
              </button>
            ))}
            {filtered.length === 0 && <p>{strings.gradientLibrary.empty}</p>}
          </div>
          {actions}
        </section>
      )}
    </DraggablePanel>
  );
}
