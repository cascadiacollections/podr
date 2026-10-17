/**
 * Dev-only "why did you render" logger for Preact.
 *
 * `@welldone-software/why-did-you-render` patches React internals and does not
 * work with Preact, so this hooks Preact's render option instead. Each time a
 * component re-renders it logs the component name and why:
 *
 * - `props changed: a, b` - the parent passed new values for these props
 * - `props equal (new object)` - the parent re-rendered and passed shallow-equal
 *   props; the component is a candidate for `memo`
 * - `own update` - same props object, so the render came from the component's
 *   own state, a hook, context, or a signal it reads
 *
 * Only loaded from src/utils/debug.ts behind a NODE_ENV check, so it never
 * reaches a production bundle. See docs/DEBUGGING.md.
 */
import { options, VNode } from 'preact';

type RenderHook = (_vnode: VNode) => void;

/**
 * Preact's internal options are mangled to short names. `__r` runs right
 * before a component's render function and `__c` is the vnode's component
 * instance. Both are stable across Preact 10 and 11 (preact/hooks and
 * preact/debug depend on them).
 */
interface InternalOptions {
  __r?: RenderHook;
}

interface InternalVNode extends VNode {
  __c?: object;
}

type Props = Record<string, unknown>;

/** Names of props whose values differ by `Object.is` (shallow compare). */
export function changedProps(prev: Props, next: Props): string[] {
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  const changed: string[] = [];
  keys.forEach((key) => {
    if (!Object.is(prev[key], next[key])) {
      changed.push(key);
    }
  });
  return changed;
}

/** Human-readable reason for a re-render, given the props it last rendered with. */
export function describeRender(prev: Props, next: Props): string {
  if (prev === next) {
    return 'own update (state, hook, context, or signal)';
  }
  const changed = changedProps(prev, next);
  return changed.length > 0 ? `props changed: ${changed.join(', ')}` : 'props equal (new object) - memo candidate';
}

function componentName(type: VNode['type']): string {
  if (typeof type === 'function') {
    const fn = type as { displayName?: string; name?: string };
    return fn.displayName || fn.name || 'Anonymous';
  }
  return String(type);
}

let installed = false;

/**
 * Install the logger. Idempotent; chains any existing render hook (preact/hooks,
 * preact/debug, @preact/signals all register one).
 */
export function installRenderLogger(log: (..._args: unknown[]) => void = console.log): void {
  if (installed) {
    return;
  }
  installed = true;

  const internal = options as typeof options & InternalOptions;
  const previousHook = internal.__r;
  const lastProps = new WeakMap<object, Props>();
  const renderCounts = new WeakMap<object, number>();

  internal.__r = (vnode: VNode) => {
    if (previousHook) {
      previousHook(vnode);
    }

    const component = (vnode as InternalVNode).__c;
    if (!component || typeof vnode.type !== 'function') {
      return;
    }

    const next = vnode.props as Props;
    const prev = lastProps.get(component);
    lastProps.set(component, next);
    const count = (renderCounts.get(component) ?? 0) + 1;
    renderCounts.set(component, count);

    if (prev === undefined) {
      return; // first mount is expected, not interesting
    }

    const reason = describeRender(prev, next);
    log(`%c[render] ${componentName(vnode.type)} #${count}%c ${reason}`, 'color:#8b5cf6;font-weight:bold', 'color:inherit');
  };
}
