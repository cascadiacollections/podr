import { act, render } from '@testing-library/preact';
import { h } from 'preact';
import { useEffect } from 'preact/hooks';
import {
  EMPTY_ARRAY,
  stableCollectionSignal,
  useImmutableCollection,
  useStableCollectionState
} from '../useImmutableCollection';

describe('stableCollectionSignal', () => {
  it('returns EMPTY_ARRAY for empty initial value', () => {
    const [sig] = stableCollectionSignal();
    expect(sig.value).toBe(EMPTY_ARRAY);
    const [sig2] = stableCollectionSignal([]);
    expect(sig2.value).toBe(EMPTY_ARRAY);
  });
  it('freezes non-empty arrays and preserves referential stability for EMPTY_ARRAY', () => {
    const arr = [1, 2, 3];
    const [sig] = stableCollectionSignal(arr);
    expect(sig.value).not.toBe(arr);
    expect(Object.isFrozen(sig.value)).toBe(true);
    const [sig2, setSig2] = stableCollectionSignal<number>();
    setSig2([]);
    expect(sig2.value).toBe(EMPTY_ARRAY);
    setSig2([1]);
    expect(sig2.value).toEqual([1]);
    expect(Object.isFrozen(sig2.value)).toBe(true);
    setSig2([]);
    expect(sig2.value).toBe(EMPTY_ARRAY);
  });
  it('supports functional updates', () => {
    const [sig, setSig] = stableCollectionSignal([1]);
    setSig((prev) => prev.concat(2));
    expect(sig.value).toEqual([1, 2]);
    expect(Object.isFrozen(sig.value)).toBe(true);
  });
});

describe('useStableCollectionState', () => {
  // Generic test helper for stateful hooks
  function StateTestComponent<T>({ initial, onState }: { initial: readonly T[] | null | undefined, onState: (state: readonly T[], setState: (v: readonly T[] | ((prev: readonly T[]) => readonly T[])) => void) => void }) {
    const [state, setState] = useStableCollectionState<T>(initial);
    useEffect(() => {
      onState(state, setState);
    }, [state, setState, onState]);
    return null;
  }

  it('returns EMPTY_ARRAY for empty initial value', () => {
    let observed: readonly number[];
    render(<StateTestComponent<number> initial={undefined} onState={(s) => (observed = s)} />);
    expect(observed!).toBe(EMPTY_ARRAY);
    render(<StateTestComponent<number> initial={[]} onState={(s) => (observed = s)} />);
    expect(observed!).toBe(EMPTY_ARRAY);
  });

  it('returns EMPTY_ARRAY for null initial value', () => {
    let observed: readonly number[];
    render(<StateTestComponent<number> initial={null} onState={(s) => (observed = s)} />);
    expect(observed!).toBe(EMPTY_ARRAY);
  });

  it('freezes non-empty arrays and preserves referential stability for EMPTY_ARRAY', () => {
    // Note: rerender is required after act to ensure the test variable is updated (React/Preact test quirk)
    let state: readonly number[], setState: (v: readonly number[] | ((prev: readonly number[]) => readonly number[])) => void;
    const { rerender } = render(<StateTestComponent<number> initial={[1, 2]} onState={(_s, _set) => { state = _s; setState = _set; }} />);
    expect(state!).toEqual([1, 2]);
    expect(Object.isFrozen(state!)).toBe(true);
    act(() => setState([]));
    rerender(<StateTestComponent<number> initial={[]} onState={(_s, _set) => { state = _s; setState = _set; }} />);
    expect(state!).toBe(EMPTY_ARRAY);
    act(() => setState([3]));
    rerender(<StateTestComponent<number> initial={[3]} onState={(_s, _set) => { state = _s; setState = _set; }} />);
    expect(state!).toEqual([3]);
    expect(Object.isFrozen(state!)).toBe(true);
    act(() => setState([]));
    rerender(<StateTestComponent<number> initial={[]} onState={(_s, _set) => { state = _s; setState = _set; }} />);
    expect(state!).toBe(EMPTY_ARRAY);
  });

  it('supports functional updates', () => {
    let state: readonly number[], setState: (v: readonly number[] | ((prev: readonly number[]) => readonly number[])) => void;
    const { rerender } = render(<StateTestComponent<number> initial={[1]} onState={(_s, _set) => { state = _s; setState = _set; }} />);
    act(() => setState((prev) => prev.concat(2)));
    rerender(<StateTestComponent<number> initial={[1,2]} onState={(_s, _set) => { state = _s; setState = _set; }} />);
    expect(state!).toEqual([1, 2]);
    expect(Object.isFrozen(state!)).toBe(true);
  });
});

describe('useImmutableCollection', () => {
  // Generic test helper for immutable hooks
  function ImmutableTestComponent<T>({ input, onResult }: { input: readonly T[] | null | undefined, onResult: (result: readonly T[]) => void }) {
    const result = useImmutableCollection<T>(input);
    useEffect(() => {
      onResult(result);
    }, [result, onResult]);
    return null;
  }

  it('returns EMPTY_ARRAY for empty or undefined input', () => {
    let observed: readonly number[];
    render(<ImmutableTestComponent<number> input={undefined} onResult={(r) => (observed = r)} />);
    expect(observed!).toBe(EMPTY_ARRAY);
    render(<ImmutableTestComponent<number> input={[]} onResult={(r) => (observed = r)} />);
    expect(observed!).toBe(EMPTY_ARRAY);
  });

  it('returns EMPTY_ARRAY for null input', () => {
    let observed: readonly number[];
    render(<ImmutableTestComponent<number> input={null} onResult={(r) => (observed = r)} />);
    expect(observed!).toBe(EMPTY_ARRAY);
  });

  it('freezes non-empty arrays and preserves referential stability for EMPTY_ARRAY', () => {
    let result: readonly number[];
    render(<ImmutableTestComponent<number> input={[1, 2]} onResult={(r) => (result = r)} />);
    expect(result!).toEqual([1, 2]);
    expect(Object.isFrozen(result!)).toBe(true);
    render(<ImmutableTestComponent<number> input={[]} onResult={(r) => (result = r)} />);
    expect(result!).toBe(EMPTY_ARRAY);
  });
});
