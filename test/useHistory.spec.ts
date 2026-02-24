import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistory } from '../src/utils/useHistory';

describe('useHistory', () => {
  it('initialises with the given state', () => {
    const { result } = renderHook(() => useHistory({ count: 0 }));
    expect(result.current.state).toEqual({ count: 0 });
    expect(result.current.committed).toEqual({ count: 0 });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('stage updates display state immediately without creating a history entry', () => {
    const { result } = renderHook(() => useHistory({ count: 0 }));

    act(() => result.current.stage({ count: 5 }));

    expect(result.current.state).toEqual({ count: 5 });
    expect(result.current.committed).toEqual({ count: 0 }); // unchanged
    expect(result.current.canUndo).toBe(false);             // no entry yet
  });

  it('commit creates a history entry', () => {
    const { result } = renderHook(() => useHistory({ count: 0 }));

    act(() => {
      result.current.stage({ count: 5 });
      result.current.commit();
    });

    expect(result.current.state).toEqual({ count: 5 });
    expect(result.current.committed).toEqual({ count: 5 });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('commit with explicit value stages + commits in one call', () => {
    const { result } = renderHook(() => useHistory({ count: 0 }));

    act(() => result.current.commit({ count: 7 }));

    expect(result.current.state).toEqual({ count: 7 });
    expect(result.current.committed).toEqual({ count: 7 });
    expect(result.current.canUndo).toBe(true);
  });

  it('commit ignores identical state (no duplicate history entry)', () => {
    const { result } = renderHook(() => useHistory({ count: 0 }));

    act(() => result.current.commit({ count: 0 }));

    expect(result.current.canUndo).toBe(false);
  });

  it('undo reverts to previous committed state', () => {
    const { result } = renderHook(() => useHistory({ count: 0 }));

    act(() => result.current.commit({ count: 1 }));
    act(() => result.current.commit({ count: 2 }));
    act(() => result.current.undo());

    expect(result.current.state).toEqual({ count: 1 });
    expect(result.current.committed).toEqual({ count: 1 });
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);
  });

  it('redo re-applies the undone state', () => {
    const { result } = renderHook(() => useHistory({ count: 0 }));

    act(() => result.current.commit({ count: 1 }));
    act(() => result.current.commit({ count: 2 }));
    act(() => result.current.undo());
    act(() => result.current.redo());

    expect(result.current.state).toEqual({ count: 2 });
    expect(result.current.committed).toEqual({ count: 2 });
    expect(result.current.canRedo).toBe(false);
  });

  it('new commit clears the redo stack', () => {
    const { result } = renderHook(() => useHistory({ count: 0 }));

    act(() => result.current.commit({ count: 1 }));
    act(() => result.current.commit({ count: 2 }));
    act(() => result.current.undo());           // future = [{ count: 2 }]
    act(() => result.current.commit({ count: 3 })); // should clear future

    expect(result.current.canRedo).toBe(false);
    expect(result.current.state).toEqual({ count: 3 });
  });

  it('undo does nothing when there is no history', () => {
    const { result } = renderHook(() => useHistory({ count: 0 }));

    act(() => result.current.undo());

    expect(result.current.state).toEqual({ count: 0 });
    expect(result.current.canUndo).toBe(false);
  });

  it('redo does nothing when there is nothing to redo', () => {
    const { result } = renderHook(() => useHistory({ count: 0 }));

    act(() => result.current.redo());

    expect(result.current.state).toEqual({ count: 0 });
    expect(result.current.canRedo).toBe(false);
  });

  it('getHistory returns past, present, future', () => {
    const { result } = renderHook(() => useHistory({ count: 0 }));

    act(() => result.current.commit({ count: 1 }));
    act(() => result.current.commit({ count: 2 }));

    const h = result.current.getHistory();
    expect(h.past).toEqual([{ count: 0 }, { count: 1 }]);
    expect(h.present).toEqual({ count: 2 });
    expect(h.future).toEqual([]);
  });

  it('reset clears history and restores initial state', () => {
    const { result } = renderHook(() => useHistory({ count: 0 }));

    act(() => result.current.commit({ count: 1 }));
    act(() => result.current.commit({ count: 2 }));
    act(() => result.current.reset({ count: 0 }));

    expect(result.current.state).toEqual({ count: 0 });
    expect(result.current.committed).toEqual({ count: 0 });
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});
