import { useEffect, useMemo, useRef, useState } from "react";
import type { GradientFill } from "kizkatt-graphic-engine";
import {
  DEFAULT_GRADIENT_PRESETS,
  getGradientCssPreview,
  type GradientPreset
} from "kizkatt-graphic-editor";

import { useI18n } from "../../i18n";
import { TrashIcon } from "../icons";
import { DraggablePanel } from "../positioning/DraggablePanel";

export function GradientLibraryPopover({
  activeGradient,
  anchorElement,
  customPresets,
  onClose,
  onGradientDelete,
  onGradientChange,
  reopenKey
}: {
  activeGradient?: GradientFill;
  anchorElement: HTMLElement | null;
  customPresets: readonly GradientPreset[];
  onClose: () => void;
  onGradientDelete: (preset: GradientPreset) => void;
  onGradientChange: (preset: GradientPreset) => void;
  reopenKey: number;
}) {
  const { strings } = useI18n();
  const popupRef = useRef<HTMLElement | null>(null);
  const [search, setSearch] = useState("");
  const presets = useMemo(
    () => [...DEFAULT_GRADIENT_PRESETS, ...customPresets],
    [customPresets]
  );
  const filtered = presets.filter((preset) =>
    preset.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  );

  useEffect(() => {
    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (target instanceof Node && !popupRef.current?.contains(target)) {
        onClose();
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointerDown, true);
    return () =>
      document.removeEventListener(
        "pointerdown",
        closeOnOutsidePointerDown,
        true
      );
  }, [onClose]);

  return (
    <DraggablePanel
      anchorElement={anchorElement}
      id="gradient-library"
      defaultOrientation="vertical"
      draggable={false}
      orientationChangeable={false}
      reopenKey={reopenKey}
      showDragHandle={false}
      title={strings.gradientLibrary.title}
    >
      {({ chrome }) => (
        <section
          ref={popupRef}
          className="kizkatt-gradient-library"
          role="dialog"
          aria-label={strings.gradientLibrary.title}
        >
          {chrome}
          <input
            aria-label={strings.gradientLibrary.search}
            placeholder={strings.gradientLibrary.search}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="kizkatt-gradient-library-grid">
            {filtered.map((preset) => (
              <div key={preset.id} className="kizkatt-gradient-preset-item">
                <button
                  type="button"
                  className={`kizkatt-gradient-preset${
                    activeGradient?.presetId === preset.id ? " is-active" : ""
                  }`}
                  onClick={() => onGradientChange(preset)}
                >
                  <i style={{ background: getGradientCssPreview(preset.gradient) }} />
                  <span>{preset.name}</span>
                </button>
                {preset.custom && (
                  <button
                    type="button"
                    className="kizkatt-gradient-preset-delete"
                    aria-label={`${strings.gradientLibrary.remove} ${preset.name}`}
                    title={`${strings.gradientLibrary.remove} ${preset.name}`}
                    onClick={() => onGradientDelete(preset)}
                  >
                    {TrashIcon}
                  </button>
                )}
              </div>
            ))}
            {filtered.length === 0 && <p>{strings.gradientLibrary.empty}</p>}
          </div>
        </section>
      )}
    </DraggablePanel>
  );
}
