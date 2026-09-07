import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_GRADIENT_FILL,
  normalizeGradientFill,
  type GradientFill
} from "kizkatt-graphic-engine";

export function useGradientFillDraft({
  onCommit,
  onPreview,
  reopenKey,
  value
}: {
  onCommit: () => void;
  onPreview: (
    gradient: GradientFill,
    options?: { transient?: boolean }
  ) => void;
  reopenKey: string | number;
  value?: GradientFill;
}) {
  const [gradient, setGradient] = useState(() =>
    normalizeGradientFill(value ?? DEFAULT_GRADIENT_FILL)
  );
  const draftRef = useRef(gradient);
  const previewRef = useRef<GradientFill | null>(null);

  useEffect(() => {
    if (value && value === previewRef.current) {
      return;
    }

    const next = normalizeGradientFill(value ?? DEFAULT_GRADIENT_FILL);
    draftRef.current = next;
    previewRef.current = null;
    setGradient(next);
  }, [reopenKey, value]);

  const replace = useCallback(
    (nextValue: GradientFill, options?: { transient?: boolean }) => {
      const next = normalizeGradientFill(nextValue);
      draftRef.current = next;
      previewRef.current = next;
      setGradient(next);
      onPreview(next, { transient: options?.transient ?? true });
    },
    [onPreview]
  );

  const update = useCallback(
    (patch: Partial<GradientFill>, options?: { transient?: boolean }) => {
      replace(
        normalizeGradientFill({
          ...draftRef.current,
          ...patch,
          presetId: patch.presetId
        }),
        options
      );
    },
    [replace]
  );

  const commit = useCallback(() => {
    previewRef.current = null;
    onCommit();
  }, [onCommit]);

  return { commit, gradient, replace, update };
}
