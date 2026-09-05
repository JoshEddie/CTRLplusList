import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'react-hot-toast';
import ShareButton from '../ShareButton';
import { makeList } from './test-helpers';

vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    promise: vi.fn((p: Promise<unknown>) => p),
  },
}));

const LIST_URL = 'https://www.ctrlpluslist.com/lists/list-1';

let writeTextMock: ReturnType<typeof vi.fn>;

function setNavigatorShare(fn: ReturnType<typeof vi.fn> | undefined) {
  if (fn) {
    Object.defineProperty(navigator, 'share', {
      value: fn,
      configurable: true,
    });
  } else {
    delete (navigator as { share?: unknown }).share;
  }
}

beforeEach(() => {
  writeTextMock = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: writeTextMock },
    configurable: true,
  });
  setNavigatorShare(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
  setNavigatorShare(undefined);
  delete (navigator as { clipboard?: unknown }).clipboard;
});

describe('ShareButton', () => {
  it('Default_RendersShareListButtonWithIosShareIcon', () => {
    render(<ShareButton list={makeList()} />);
    const button = screen.getByRole('button', { name: 'Share list' });
    expect(button).toHaveClass('btn', 'on-dark');
    expect(button).toHaveTextContent('Share List');
    // eslint-disable-next-line testing-library/no-node-access -- react-icons renders an unlabeled <svg>; querySelector is the only way to assert the icon is present.
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  describe('WithNavigatorShare', () => {
    it('Click_InvokesShareWithTitleAndUrl', async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      setNavigatorShare(shareMock);
      render(<ShareButton list={makeList()} />);
      await userEvent.click(
        screen.getByRole('button', { name: 'Share list' })
      );
      await waitFor(() =>
        expect(shareMock).toHaveBeenCalledWith({
          title: 'Birthday Wishlist',
          url: LIST_URL,
        })
      );
      expect(writeTextMock).not.toHaveBeenCalled();
    });

    it('ShareAbortError_SwallowedWithoutErrorToast', async () => {
      const abort = Object.assign(new Error('user cancelled'), {
        name: 'AbortError',
      });
      const shareMock = vi.fn().mockRejectedValue(abort);
      setNavigatorShare(shareMock);
      render(<ShareButton list={makeList()} />);
      await userEvent.click(
        screen.getByRole('button', { name: 'Share list' })
      );
      await waitFor(() => expect(shareMock).toHaveBeenCalled());
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('ShareOtherError_TogglesFailedToShareToast', async () => {
      const shareMock = vi.fn().mockRejectedValue(new Error('boom'));
      setNavigatorShare(shareMock);
      render(<ShareButton list={makeList()} />);
      await userEvent.click(
        screen.getByRole('button', { name: 'Share list' })
      );
      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith('Failed to share list')
      );
    });
  });

  describe('WithoutNavigatorShare', () => {
    it('Click_CopiesUrlToClipboardViaToastPromise', async () => {
      render(<ShareButton list={makeList()} />);
      await userEvent.click(
        screen.getByRole('button', { name: 'Share list' })
      );
      await waitFor(() =>
        expect(writeTextMock).toHaveBeenCalledWith(LIST_URL)
      );
      expect(toast.promise).toHaveBeenCalledTimes(1);
      expect(vi.mocked(toast.promise).mock.calls[0][1]).toMatchObject({
        success: 'Copied to clipboard',
      });
    });

    it('ClipboardRejects_SwallowsErrorToConsole', async () => {
      const errorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      writeTextMock.mockRejectedValue(new Error('denied'));
      render(<ShareButton list={makeList()} />);
      await userEvent.click(
        screen.getByRole('button', { name: 'Share list' })
      );
      await waitFor(() =>
        expect(errorSpy).toHaveBeenCalledWith(
          'Failed to copy:',
          expect.any(Error)
        )
      );
    });
  });
});
