import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// RTL's auto-cleanup is gated on the test runner exposing `afterEach` as a
// global. We run vitest with `globals: false`, so register the cleanup hook
// explicitly — otherwise rendered DOM leaks across tests and queries like
// `screen.getByRole('link')` find duplicates from prior tests.
afterEach(() => {
  cleanup();
});

// jsdom implements no scrolling, so `Element.scrollTo` is simply absent — any
// component that restores scroll position on its own throws rather than
// no-oping. Stubbed here rather than guarded in the components, whose call is
// correct in a browser.
Element.prototype.scrollTo = () => {};

// jsdom implements no layout, so `ResizeObserver` is absent entirely and any
// component that observes its own box throws on construction. Stubbed here
// rather than guarded in the components, whose use is correct in a browser;
// sizes all read 0 under jsdom, so an observed strip simply never collapses.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
