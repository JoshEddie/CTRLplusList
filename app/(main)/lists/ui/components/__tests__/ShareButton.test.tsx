import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setListVisibility } from '@/app/actions/lists';
import { VISIBILITY } from '@/lib/visibility';
import { toast } from 'react-hot-toast';
import ShareButton from '../ShareButton';
import { makeList } from './test-helpers';

const refreshMock = vi.hoisted(() => vi.fn());

vi.mock('@/app/actions/lists', () => ({ setListVisibility: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}));
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    promise: vi.fn((p: Promise<unknown>) => p),
  },
}));

vi.mock('@/app/(main)/items/ui/components/purchasemodal/Modal', () => ({
  default: ({
    children,
    onClose,
  }: {
    children: React.ReactNode;
    onClose: () => void;
  }) => (
    <div data-testid="modal">
      <button type="button" onClick={onClose}>
        modal-backdrop-close
      </button>
      {children}
    </div>
  ),
}));
vi.mock('@/app/(main)/items/ui/components/purchasemodal/PurchaseFlow', () => ({
  default: ({
    primary_text,
    secondary_text,
    children,
  }: {
    primary_text: string;
    secondary_text: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="purchase-flow">
      <p>{primary_text}</p>
      <p>{secondary_text}</p>
      {children}
    </div>
  ),
}));
vi.mock('@/app/(main)/items/ui/components/purchasemodal/ModalButtons', () => ({
  default: ({
    primary_button_text,
    primary_button_onclick,
    secondary_button_text,
    secondary_button_onclick,
  }: {
    primary_button_text: string;
    primary_button_onclick: () => void;
    secondary_button_text: string;
    secondary_button_onclick: () => void;
  }) => (
    <div>
      <button type="button" onClick={primary_button_onclick}>
        {primary_button_text}
      </button>
      <button type="button" onClick={secondary_button_onclick}>
        {secondary_button_text}
      </button>
    </div>
  ),
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

// shared (link-only) → non-private; private list omits the `shared` flag.
const sharedList = () => makeList({ shared: true });
const privateList = () => makeList({ shared: false });

describe('ShareButton', () => {
  describe('Trigger', () => {
    it('Default_RendersShareListButtonWithIosShareIcon', () => {
      render(<ShareButton list={sharedList()} />);
      const button = screen.getByRole('button', { name: 'Share list' });
      expect(button).toHaveClass('btn', 'on-dark');
      expect(button).toHaveTextContent('Share List');
      // eslint-disable-next-line testing-library/no-node-access -- react-icons renders an unlabeled <svg>; querySelector is the only way to assert the icon is present.
      expect(button.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('NonPrivate', () => {
    describe('WithNavigatorShare', () => {
      it('Click_InvokesShareWithTitleAndUrl', async () => {
        const shareMock = vi.fn().mockResolvedValue(undefined);
        setNavigatorShare(shareMock);
        render(<ShareButton list={sharedList()} />);
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
        render(<ShareButton list={sharedList()} />);
        await userEvent.click(
          screen.getByRole('button', { name: 'Share list' })
        );
        await waitFor(() => expect(shareMock).toHaveBeenCalled());
        expect(toast.error).not.toHaveBeenCalled();
      });

      it('ShareOtherError_TogglesFailedToShareToast', async () => {
        const errorSpy = vi
          .spyOn(console, 'error')
          .mockImplementation(() => {});
        const shareMock = vi.fn().mockRejectedValue(new Error('boom'));
        setNavigatorShare(shareMock);
        render(<ShareButton list={sharedList()} />);
        await userEvent.click(
          screen.getByRole('button', { name: 'Share list' })
        );
        await waitFor(() =>
          expect(toast.error).toHaveBeenCalledWith('Failed to share list')
        );
        expect(errorSpy).toHaveBeenCalled();
      });
    });

    describe('WithoutNavigatorShare', () => {
      it('Click_CopiesUrlToClipboardViaToastPromise', async () => {
        render(<ShareButton list={sharedList()} />);
        await userEvent.click(
          screen.getByRole('button', { name: 'Share list' })
        );
        await waitFor(() => expect(writeTextMock).toHaveBeenCalledWith(LIST_URL));
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
        render(<ShareButton list={sharedList()} />);
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

  describe('Private', () => {
    it('Click_OpensWarningModalWithoutSharing', async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      setNavigatorShare(shareMock);
      render(<ShareButton list={privateList()} />);
      await userEvent.click(screen.getByRole('button', { name: 'Share list' }));
      expect(screen.getByText('This list is hidden.')).toBeInTheDocument();
      expect(shareMock).not.toHaveBeenCalled();
    });

    describe('MakePrivateAndShare', () => {
      it('Success_SetsVisibilityLink-ToastSuccess-RouterRefresh-Shares', async () => {
        vi.mocked(setListVisibility).mockResolvedValue({
          success: true,
          message: '',
        });
        const shareMock = vi.fn().mockResolvedValue(undefined);
        setNavigatorShare(shareMock);
        render(<ShareButton list={privateList()} />);
        await userEvent.click(
          screen.getByRole('button', { name: 'Share list' })
        );
        await userEvent.click(
          screen.getByRole('button', { name: 'Make private & share' })
        );
        expect(setListVisibility).toHaveBeenCalledWith(
          'list-1',
          VISIBILITY.LINK
        );
        await waitFor(() =>
          expect(toast.success).toHaveBeenCalledWith('Sharing enabled')
        );
        expect(refreshMock).toHaveBeenCalledTimes(1);
        await waitFor(() => expect(shareMock).toHaveBeenCalled());
      });

      it('Failure_TogglesFailedToEnableToast-StillShares', async () => {
        vi.mocked(setListVisibility).mockResolvedValue({
          success: false,
          message: '',
        });
        const shareMock = vi.fn().mockResolvedValue(undefined);
        setNavigatorShare(shareMock);
        render(<ShareButton list={privateList()} />);
        await userEvent.click(
          screen.getByRole('button', { name: 'Share list' })
        );
        await userEvent.click(
          screen.getByRole('button', { name: 'Make private & share' })
        );
        await waitFor(() =>
          expect(toast.error).toHaveBeenCalledWith('Failed to enable sharing')
        );
        expect(refreshMock).not.toHaveBeenCalled();
        await waitFor(() => expect(shareMock).toHaveBeenCalled());
      });
    });

    it('Cancel_ClosesWarningModal-NoVisibilityChange', async () => {
      render(<ShareButton list={privateList()} />);
      await userEvent.click(screen.getByRole('button', { name: 'Share list' }));
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByText('This list is hidden.')).not.toBeInTheDocument();
      expect(setListVisibility).not.toHaveBeenCalled();
    });

    it('BackdropDismiss_ClosesWarningModal', async () => {
      render(<ShareButton list={privateList()} />);
      await userEvent.click(screen.getByRole('button', { name: 'Share list' }));
      await userEvent.click(
        screen.getByRole('button', { name: 'modal-backdrop-close' })
      );
      expect(
        screen.queryByText('This list is hidden.')
      ).not.toBeInTheDocument();
    });
  });
});
