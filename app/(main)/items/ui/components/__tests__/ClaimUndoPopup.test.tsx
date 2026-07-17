/* eslint-disable testing-library/no-node-access --
 * The closed state renders nothing at all, so the assertion goes through the
 * container; there is no role or text to query.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ClaimUndoPopup from '../ClaimUndoPopup';

function renderPopup(
  overrides: Partial<React.ComponentProps<typeof ClaimUndoPopup>> = {}
) {
  const props: React.ComponentProps<typeof ClaimUndoPopup> = {
    isOpen: true,
    onClose: vi.fn(),
    onUndo: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<ClaimUndoPopup {...props} />) };
}

const undoButton = () =>
  screen.getByRole('button', { name: 'No — undo claim' });
const keepButton = () =>
  screen.getByRole('button', { name: 'Yes, I purchased it' });

describe('ClaimUndoPopup', () => {
  it('Closed_RendersNothing', () => {
    const { container } = renderPopup({ isOpen: false });
    expect(container.firstChild).toBeNull();
    expect(
      screen.queryByText("You've claimed this")
    ).not.toBeInTheDocument();
  });

  it('Open_RendersTitleMessageAndBothActions', () => {
    renderPopup();
    expect(
      screen.getByRole('heading', { name: "You've claimed this" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/undo to make it available for someone else/)
    ).toBeInTheDocument();
    expect(undoButton()).toBeInTheDocument();
    expect(keepButton()).toBeInTheDocument();
  });

  it('Open_UndoIsGhostLeftAndKeepIsPrimaryRight', () => {
    renderPopup();
    expect(undoButton()).toHaveClass('ghost');
    expect(keepButton()).toHaveClass('primary');
    // DOM order carries the layout: ghost undo left, primary keep right.
    expect(
      undoButton().compareDocumentPosition(keepButton()) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it('UndoClick_InvokesOnUndoThenOnClose', async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    const { props } = renderPopup({
      onUndo: vi.fn(() => calls.push('undo')),
      onClose: vi.fn(() => calls.push('close')),
    });
    await user.click(undoButton());
    expect(calls).toEqual(['undo', 'close']);
    expect(props.onUndo).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('KeepClick_InvokesOnCloseWithoutUndo', async () => {
    const user = userEvent.setup();
    const { props } = renderPopup();
    await user.click(keepButton());
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onUndo).not.toHaveBeenCalled();
  });
});
