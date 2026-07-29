import { useCallback, useState } from "react";

import { HISTORY_LIMIT } from "../config/constants";
import type { CanvasState } from "../model/types";

export function useCanvasHistory(initialState: CanvasState) {
  const [history, setHistory] = useState<CanvasState[]>([initialState]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const canvasState = history[historyIndex];

  const commitState = useCallback(
    (nextState: CanvasState) => {
      setHistory((previousHistory) => {
        const activeHistory = previousHistory.slice(0, historyIndex + 1);
        return [...activeHistory, nextState].slice(-HISTORY_LIMIT);
      });
      setHistoryIndex((index) => Math.min(index + 1, HISTORY_LIMIT - 1));
    },
    [historyIndex]
  );

  const replaceActiveState = useCallback(
    (nextState: CanvasState) => {
      setHistory((previousHistory) =>
        previousHistory.map((state, index) =>
          index === historyIndex ? nextState : state
        )
      );
    },
    [historyIndex]
  );

  const undo = useCallback(() => {
    setHistoryIndex((index) => Math.max(0, index - 1));
  }, []);

  const redo = useCallback(() => {
    setHistoryIndex((index) => Math.min(history.length - 1, index + 1));
  }, [history.length]);

  return {
    canvasState,
    canRedo: historyIndex < history.length - 1,
    canUndo: historyIndex > 0,
    commitState,
    history,
    historyIndex,
    redo,
    replaceActiveState,
    undo
  };
}
