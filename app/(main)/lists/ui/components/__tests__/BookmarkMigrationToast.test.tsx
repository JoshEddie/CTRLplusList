import { fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import BookmarkMigrationToast from '../BookmarkMigrationToast';

const KEY = 'home.bookmark-migration-toast.dismissed';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('BookmarkMigrationToast', () => {
  it('NoFlag_RendersToastWithStatusRoleCopyAndDismiss', () => {
    render(<BookmarkMigrationToast />);
    const toast = screen.getByRole('status');
    expect(toast).toHaveTextContent(
      'Saved lists are now Bookmarks — find them in the new section.'
    );
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
  });

  it('FlagSetTrue_DoesNotRender', () => {
    localStorage.setItem(KEY, 'true');
    render(<BookmarkMigrationToast />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('ClickDismiss_WritesFlagAndUnmounts', () => {
    render(<BookmarkMigrationToast />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(localStorage.getItem(KEY)).toBe('true');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('GetItemThrows_TreatedAsNotDismissed', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    render(<BookmarkMigrationToast />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('SetItemThrows_DismissSwallowsError', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    render(<BookmarkMigrationToast />);
    expect(() =>
      fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    ).not.toThrow();
  });

  it('ServerSnapshot_ReportsDismissed', () => {
    // The pre-hydration / server render path uses the useSyncExternalStore
    // server snapshot (`() => true`), so the toast is hidden — no flash on
    // cold load before client hydration reads localStorage.
    expect(renderToString(<BookmarkMigrationToast />)).toBe('');
  });
});
