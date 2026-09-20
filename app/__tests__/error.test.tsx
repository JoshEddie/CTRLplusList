import { describe, expect, it } from 'vitest';
import ErrorView from '../ui/components/ErrorView';
import RootError from '../error';

// The root boundary is a re-export barrel: its whole contract is that the
// framework gets the same error view the `(main)` boundary renders, which
// `app/(main)/__tests__/error.test.tsx` covers behaviorally.
describe('RootError', () => {
  it('Default_IsTheSharedErrorView', () => {
    expect(RootError).toBe(ErrorView);
  });
});
