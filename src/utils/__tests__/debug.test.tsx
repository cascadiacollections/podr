import { h, render } from 'preact';
import { useState } from 'preact/hooks';
import { act } from 'preact/test-utils';
import { debugFlags } from '../debug';
import { changedProps, describeRender, installRenderLogger } from '../renderLogger';

describe('debugFlags', () => {
  it('is empty by default', () => {
    expect(debugFlags('', null).size).toBe(0);
  });

  it('merges the URL param and localStorage', () => {
    expect([...debugFlags('?debug=renders', 'Signals ')].sort()).toEqual(['renders', 'signals']);
  });

  it('expands "all"', () => {
    expect(debugFlags('?debug=all', null).has('signals')).toBe(true);
  });
});

describe('describeRender', () => {
  it('reports an own update when the props object is unchanged', () => {
    const props = { a: 1 };
    expect(describeRender(props, props)).toMatch(/own update/);
  });

  it('reports shallow-equal props as a memo candidate', () => {
    expect(describeRender({ a: 1 }, { a: 1 })).toMatch(/memo candidate/);
  });

  it('lists added, removed, and changed props', () => {
    expect(changedProps({ a: 1, b: 2 }, { a: 1, b: 3, c: 4 })).toEqual(['b', 'c']);
    expect(describeRender({ a: 1 }, {})).toBe('props changed: a');
  });
});

describe('installRenderLogger', () => {
  it('logs re-renders but not the first mount', () => {
    const log = jest.fn();
    installRenderLogger(log);

    let bump: () => void = () => undefined;
    function Child({ label }: { label: string }) {
      return <span>{label}</span>;
    }
    function Parent() {
      const [n, setN] = useState(0);
      bump = () => setN(n + 1);
      return <Child label={`n=${n}`} />;
    }

    const root = document.createElement('div');
    act(() => render(<Parent />, root));
    expect(log).not.toHaveBeenCalled();

    act(() => bump());
    const lines = log.mock.calls.map((call) => String(call[0]));
    expect(lines.find((line) => line.includes('Parent'))).toContain('own update');
    expect(lines.find((line) => line.includes('Child'))).toContain('props changed: label');

    render(null, root);
  });
});
