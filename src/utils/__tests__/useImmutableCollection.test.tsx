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
  it('returns EMPTY_ARRAY for empty or undefined initial', () => {
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
  function TestComponent({ initial, onState }: any) {
    const [state, setState] = useStableCollectionState(initial);
    useEffect(() => {
      onState(state, setState);
    }, [state]);
    return null;
  }
  it('returns EMPTY_ARRAY for empty or undefined initial', () => {
    let observed: any;
    render(<TestComponent initial={undefined} onState={(s: any) => (observed = s)} />);
    expect(observed).toBe(EMPTY_ARRAY);
    render(<TestComponent initial={[]} onState={(s: any) => (observed = s)} />);
    expect(observed).toBe(EMPTY_ARRAY);
  });
  it('freezes non-empty arrays and preserves referential stability for EMPTY_ARRAY', () => {
    let state: any, setState: any;
    const { rerender } = render(<TestComponent initial={[1, 2]} onState={(_s: any, _set: any) => { state = _s; setState = _set; }} />);
    expect(state).toEqual([1, 2]);
    expect(Object.isFrozen(state)).toBe(true);
    act(() => setState([]));
    rerender(<TestComponent initial={[]} onState={(_s: any, _set: any) => { state = _s; setState = _set; }} />);
    expect(state).toBe(EMPTY_ARRAY);
    act(() => setState([3]));
    rerender(<TestComponent initial={[3]} onState={(_s: any, _set: any) => { state = _s; setState = _set; }} />);
    expect(state).toEqual([3]);
    expect(Object.isFrozen(state)).toBe(true);
    act(() => setState([]));
    rerender(<TestComponent initial={[]} onState={(_s: any, _set: any) => { state = _s; setState = _set; }} />);
    expect(state).toBe(EMPTY_ARRAY);
  });
  it('supports functional updates', () => {
    let state: any, setState: any;
    const { rerender } = render(<TestComponent initial={[1]} onState={(_s: any, _set: any) => { state = _s; setState = _set; }} />);
    act(() => setState((prev: any) => prev.concat(2)));
    rerender(<TestComponent initial={[1,2]} onState={(_s: any, _set: any) => { state = _s; setState = _set; }} />);
    expect(state).toEqual([1, 2]);
    expect(Object.isFrozen(state)).toBe(true);
  });
});

describe('useImmutableCollection', () => {
  function TestComponent({ input, onResult }: any) {
    const result = useImmutableCollection(input);
    useEffect(() => {
      onResult(result);
    }, [result]);
    return null;
  }
  it('returns EMPTY_ARRAY for empty or undefined input', () => {
    let observed: any;
    render(<TestComponent input={undefined} onResult={(r: any) => (observed = r)} />);
    expect(observed).toBe(EMPTY_ARRAY);
    render(<TestComponent input={[]} onResult={(r: any) => (observed = r)} />);
    expect(observed).toBe(EMPTY_ARRAY);
  });
  it('freezes non-empty arrays and preserves referential stability for EMPTY_ARRAY', () => {
    let result: any;
    render(<TestComponent input={[1, 2]} onResult={(r: any) => (result = r)} />);
    expect(result).toEqual([1, 2]);
    expect(Object.isFrozen(result)).toBe(true);
    render(<TestComponent input={[]} onResult={(r: any) => (result = r)} />);
    expect(result).toBe(EMPTY_ARRAY);
  });
});
