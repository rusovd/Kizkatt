import { useCallback, useMemo, useState } from "react";
import type { GradientFill } from "kizkatt-graphic-engine";

import {
  createCustomGradientPreset,
  DEFAULT_GRADIENT_PRESETS,
  getUniqueGradientPresetName,
  type GradientPreset
} from "../model/gradientPresets";
import {
  clearStoredGradientPresetId,
  getStoredCustomGradientPresets,
  getStoredGradientPresetId,
  storeCustomGradientPresets,
  storeGradientPresetId
} from "../platform/storage";

export function useGradientPresetLibrary(storage = window.localStorage) {
  const [customPresets, setCustomPresets] = useState<GradientPreset[]>(() =>
    getStoredCustomGradientPresets(storage)
  );
  const presets = useMemo(
    () => [...DEFAULT_GRADIENT_PRESETS, ...customPresets],
    [customPresets]
  );

  const rememberPreset = useCallback(
    (presetId: string) => storeGradientPresetId(presetId, storage),
    [storage]
  );
  const getRememberedPreset = useCallback(() => {
    const presetId = getStoredGradientPresetId(storage);

    return presets.find((preset) => preset.id === presetId);
  }, [presets, storage]);

  const savePreset = useCallback(
    (gradient: GradientFill) => {
      const name = getUniqueGradientPresetName(
        gradient.name,
        presets.map((preset) => preset.name)
      );
      const preset = createCustomGradientPreset({ ...gradient, name });
      const nextPresets = [...customPresets, preset];

      setCustomPresets(nextPresets);
      storeCustomGradientPresets(nextPresets, storage);
      rememberPreset(preset.id);

      return preset;
    },
    [customPresets, presets, rememberPreset, storage]
  );

  const deletePreset = useCallback(
    (preset: GradientPreset) => {
      if (!preset.custom) {
        return false;
      }

      const nextPresets = customPresets.filter(
        (candidate) => candidate.id !== preset.id
      );

      if (nextPresets.length === customPresets.length) {
        return false;
      }

      setCustomPresets(nextPresets);
      storeCustomGradientPresets(nextPresets, storage);

      if (getStoredGradientPresetId(storage) === preset.id) {
        clearStoredGradientPresetId(storage);
      }

      return true;
    },
    [customPresets, storage]
  );

  return {
    customPresets,
    deletePreset,
    getRememberedPreset,
    presets,
    rememberPreset,
    savePreset
  };
}
