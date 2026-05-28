/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * A closed native <dialog> is not in the accessibility tree, so `getByRole` /
 * `getByText` cannot reach it or its title/body; the `cancel`/`close` native
 * events must be dispatched on the element directly. Classed
 * `container.querySelector('dialog')` is the only path.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import FollowDisclosureDialog from '../FollowDisclosureDialog';

// jsdom does not implement HTMLDialogElement.showModal; assign mocks that also
// toggle the `open` attribute so the component's open/close effect branches run.
const showModal = vi.fn(function (this: HTMLDialogElement) {
  this.open = true;
});
const close = vi.fn(function (this: HTMLDialogElement) {
  this.open = false;
});
const dialogProto = HTMLDialogElement.prototype as unknown as Record<
  string,
  unknown
>;
const originals = {
  showModal: dialogProto.showModal,
  close: dialogProto.close,
};

beforeEach(() => {
  dialogProto.showModal = showModal;
  dialogProto.close = close;
  showModal.mockClear();
  close.mockClear();
});

afterEach(() => {
  dialogProto.showModal = originals.showModal;
  dialogProto.close = originals.close;
});

function renderDialog(
  props: Partial<React.ComponentProps<typeof FollowDisclosureDialog>> = {}
) {
  return render(
    <FollowDisclosureDialog
      open={props.open ?? false}
      ownerName={props.ownerName ?? 'Bob'}
      onConfirm={props.onConfirm ?? vi.fn()}
      onCancel={props.onCancel ?? vi.fn()}
    />
  );
}

describe('FollowDisclosureDialog', () => {
  it('OpenTrue_CallsShowModal_FocusesConfirm', () => {
    renderDialog({ open: true });
    expect(showModal).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Follow' })).toHaveFocus();
  });

  it('OpenFalse_CallsClose', () => {
    const { rerender } = renderDialog({ open: true });
    rerender(
      <FollowDisclosureDialog
        open={false}
        ownerName="Bob"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(close).toHaveBeenCalled();
  });

  it('Title_ReadsFollowOwnerName_Body_IsDisclosureSentence', () => {
    const { container } = renderDialog({ open: true, ownerName: 'Carol' });
    expect(container.querySelector('.follow-disclosure-title')).toHaveTextContent(
      'Follow Carol?'
    );
    expect(container.querySelector('.follow-disclosure-body')).toHaveTextContent(
      'Following someone shares your name and profile picture with them.'
    );
  });

  it('CancelButton_FiresOnCancel', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderDialog({ open: true, onCancel });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('FollowButton_FiresOnConfirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderDialog({ open: true, onConfirm });
    await user.click(screen.getByRole('button', { name: 'Follow' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('CancelEvent_PreventedAndRoutesToOnCancel', () => {
    const onCancel = vi.fn();
    const { container } = renderDialog({ open: true, onCancel });
    const dialog = container.querySelector('dialog') as HTMLDialogElement;
    const ev = new Event('cancel', { cancelable: true });
    fireEvent(dialog, ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('CloseEventWhileOpen_RoutesToOnCancel', () => {
    const onCancel = vi.fn();
    const { container } = renderDialog({ open: true, onCancel });
    const dialog = container.querySelector('dialog') as HTMLDialogElement;
    fireEvent(dialog, new Event('close'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('CloseEventWhileClosed_DoesNot', () => {
    const onCancel = vi.fn();
    const { container } = renderDialog({ open: false, onCancel });
    const dialog = container.querySelector('dialog') as HTMLDialogElement;
    fireEvent(dialog, new Event('close'));
    expect(onCancel).not.toHaveBeenCalled();
  });
});
