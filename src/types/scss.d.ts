// Stylesheets are compiled by webpack (sass-loader with pure-JS Dart Sass), not by
// a Heft task. This lets side-effect imports such as `import './app.scss'` type-check
// under TypeScript's `noUncheckedSideEffectImports` without a generated .d.ts.
declare module '*.scss';
