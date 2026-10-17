# Debugging and Profiling

Podr ships debug tooling in development builds only (`yarn start`, `yarn build`).
`yarn build:ci` (production) drops all of it: the setup in
[`src/utils/debug.ts`](../src/utils/debug.ts) sits behind
`process.env.NODE_ENV !== 'production'`, which webpack replaces with `false`, so
the code and its `require`s never reach the bundle. Production keeps only
`preact/devtools` (about 1 KB) so the DevTools extension can still attach to the
live site.

## Always on in development

[`preact/debug`](https://preactjs.com/guide/v11/debugging) is loaded before any
component. It connects the Preact DevTools extension and warns in the console
about common mistakes: invalid hook calls, undefined components, bad `key`s,
missing `<tbody>`, and so on, with a component stack.

## Opt-in tracing

Turn these on with a URL parameter or `localStorage`, then reload:

```text
http://localhost:9000/?debug=renders
http://localhost:9000/?debug=renders,signals
```

```js
localStorage.podrDebug = 'renders,signals'; // or 'all'
localStorage.removeItem('podrDebug');       // turn off
```

| Flag | What it logs |
|------|--------------|
| `renders` | Every component re-render (not first mounts) and why, as a lightweight Preact take on [why-did-you-render](https://github.com/welldone-software/why-did-you-render), which only works with React. See below. |
| `signals` | [`@preact/signals-debug`](https://github.com/preactjs/signals/tree/main/packages/debug): grouped console output for each signal write, plus the computeds and effects it triggered. |

### Reading the render log

```text
[render] Search #3 props changed: query, onSearch
[render] PodcastCard #2 props equal (new object) - memo candidate
[render] App #7 own update (state, hook, context, or signal)
```

- **props changed** lists the props whose values differ (`Object.is`). A
  function or object prop that changes on every render usually means a missing
  `useCallback`/`useMemo` in the parent.
- **props equal (new object)** means the parent re-rendered and passed the same
  values. Wrapping the component in `memo` would skip this render.
- **own update** means the props object is the same one as last time, so the
  component's own state, a hook, context, or a signal it reads caused the render.

The logger is [`src/utils/renderLogger.ts`](../src/utils/renderLogger.ts). It
chains Preact's internal render hook (`options.__r`), the same hook
`preact/hooks` uses.

## Preact DevTools profiler

Install the Preact DevTools extension for
[Chrome](https://chrome.google.com/webstore/detail/preact-developer-tools/ilcajpmogmhpliinlbcdebhbcanbghmd),
[Firefox](https://addons.mozilla.org/en-US/firefox/addon/preact-devtools/), or
[Edge](https://microsoftedge.microsoft.com/addons/detail/hdkhobcafnfejjieimdkmjaiihkjpmhk).

1. Run `yarn start`, open the app, then open the **Preact** tab in browser devtools.
2. In its **Settings** tab, check **Capture render reasons**. Optionally check
   **Highlight updates** to flash components on the page as they render.
3. In the **Profiler** tab, click record, use the app, and stop recording.
4. Pick a commit in the flame graph. Each component shows its render time, and
   with step 2 on, the sidebar lists why it rendered (changed props, state,
   hooks, or a parent update).

The **Elements** tab shows the component tree with live props, state, and hooks.
