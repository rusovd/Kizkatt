import { useCallback, useState } from "react";

import { HISTORY_LIMIT } from "../config/constants";
import type { CanvasState } from "../model/types";

type CommitStateOptions = {
  baseState?: CanvasState;
  replace?: boolean;
};

type CanvasHistory = {
  future: CanvasState[];
  past: CanvasState[];
  present: CanvasState;
};

const MAX_PAST_STATES = Math.max(0, HISTORY_LIMIT - 1);

export function useCanvasHistory(initialState: CanvasState) {
  const [history, setHistory] = useState<CanvasHistory>(() => ({
    future: [],
    past: [],
    present: initialState
  }));

  const commitState = useCallback(
    (nextState: CanvasState, options: CommitStateOptions = {}) => {
      setHistory((currentHistory) => {
        if (options.replace) {
          return {
            ...currentHistory,
            present: nextState
          };
        }

        const baseState = options.baseState ?? currentHistory.present;
        const past = [...currentHistory.past, baseState];

        return {
          future: [],
          past:
            MAX_PAST_STATES === 0
              ? []
              : past.length > MAX_PAST_STATES
              ? past.slice(-MAX_PAST_STATES)
              : past,
          present: nextState
        };
      });
    },
    []
  );

  const replaceActiveState = useCallback((nextState: CanvasState) => {
    setHistory((currentHistory) => ({
      ...currentHistory,
      present: nextState
    }));
  }, []);

  const undo = useCallback(() => {
    setHistory((currentHistory) => {
      const previousState = currentHistory.past.at(-1);

      if (!previousState) {
        return currentHistory;
      }

      return {
        future: [currentHistory.present, ...currentHistory.future],
        past: currentHistory.past.slice(0, -1),
        present: previousState
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((currentHistory) => {
      const nextState = currentHistory.future[0];

      if (!nextState) {
        return currentHistory;
      }

      return {
        future: currentHistory.future.slice(1),
        past: [...currentHistory.past, currentHistory.present],
        present: nextState
      };
    });
  }, []);

  return {
    canvasState: history.present,
    canRedo: history.future.length > 0,
    canUndo: history.past.length > 0,
    commitState,
    redo,
    replaceActiveState,
    undo
  };
}
