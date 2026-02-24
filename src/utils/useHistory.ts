import { useCallback, useRef, useState } from 'react';

export interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export interface HistoryAPI<T> {
  /** Live display state — updates immediately during interactions */
  state: T;
  /** Last committed state — what undo/redo navigates */
  committed: T;
  canUndo: boolean;
  canRedo: boolean;
  /** Update display state without creating a history entry */
  stage: (newState: T) => void;
  /** Commit staged (or provided) state to history */
  commit: (newState?: T) => void;
  undo: () => void;
  redo: () => void;
  reset: (initialState: T) => void;
  getHistory: () => { past: T[]; present: T; future: T[] };
}

export function useHistory<T>(initialState: T): HistoryAPI<T> {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  const [staged, setStaged] = useState<T>(initialState);
  // Ref so callbacks always see the latest staged value without being recreated
  const stagedRef = useRef<T>(initialState);

  const stage = useCallback((newState: T) => {
    stagedRef.current = newState;
    setStaged(newState);
  }, []);

  const commit = useCallback((newState?: T) => {
    const toCommit = newState ?? stagedRef.current;
    if (newState !== undefined) {
      stagedRef.current = newState;
      setStaged(newState);
    }
    setHistory((h) => {
      if (JSON.stringify(toCommit) === JSON.stringify(h.present)) return h;
      return {
        past: [...h.past, h.present],
        present: toCommit,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;
      const previous = prev.past[prev.past.length - 1];
      const newPast = prev.past.slice(0, prev.past.length - 1);
      // Sync staged to the restored state
      stagedRef.current = previous;
      setStaged(previous);
      return {
        past: newPast,
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;
      const next = prev.future[0];
      const newFuture = prev.future.slice(1);
      stagedRef.current = next;
      setStaged(next);
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const reset = useCallback((initialState: T) => {
    stagedRef.current = initialState;
    setStaged(initialState);
    setHistory({
      past: [],
      present: initialState,
      future: [],
    });
  }, []);

  const getHistory = useCallback(
    () => ({
      past: history.past,
      present: history.present,
      future: history.future,
    }),
    [history],
  );

  return {
    state: staged,
    committed: history.present,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    stage,
    commit,
    undo,
    redo,
    reset,
    getHistory,
  };
}
