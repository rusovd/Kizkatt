import { useCallback, useEffect, useRef } from "react";

import type { CanvasState, KizkattElement } from "kizkatt-graphic-engine";

const CANVAS_AUTOSAVE_DELAY_MS = 250;

export function useCanvasAutosave({
  save,
  state,
  suspended
}: {
  save: (state: CanvasState) => void;
  state: CanvasState;
  suspended: boolean;
}) {
  const lastStoredElementsRef = useRef<KizkattElement[] | null>(null);
  const pendingStateRef = useRef<CanvasState | null>(null);
  const timerRef = useRef<number | null>(null);

  const flush = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const pendingState = pendingStateRef.current;

    if (!pendingState) {
      return;
    }

    pendingStateRef.current = null;
    save(pendingState);
    lastStoredElementsRef.current = pendingState.elements;
  }, [save]);

  useEffect(() => {
    if (suspended) {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      pendingStateRef.current = null;
      return;
    }

    if (lastStoredElementsRef.current === state.elements) {
      return;
    }

    pendingStateRef.current = state;

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(flush, CANVAS_AUTOSAVE_DELAY_MS);
  }, [flush, state, suspended]);

  useEffect(() => {
    window.addEventListener("pagehide", flush);

    return () => {
      window.removeEventListener("pagehide", flush);
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      pendingStateRef.current = null;
    };
  }, [flush]);
}
