if (process.env.NODE_ENV === 'development') {
  require("preact/debug");
} else {
  require("preact/devtools");
}

import './app.scss';
import { h, render } from 'preact';

import { App } from './ui/App';

const rootEl: HTMLElement | null = document.getElementById('root');

if (typeof window !== 'undefined' && rootEl) {
  render(<App />, rootEl);
}
