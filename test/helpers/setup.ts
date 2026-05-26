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
