/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * The close affordance is a bare `<div className="close-button">` with no role
 * or accessible name, so `getByRole`/`getByText` cannot reach it; a classed
 * `container.querySelector` is the only path.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Modal from '../Modal';

describe('Modal', () => {
  it('Children_RenderInsideModalBodyWithoutExtraClass', () => {
    const { container } = render(
      <Modal>
        <p>Body content</p>
      </Modal>
    );
    expect(screen.getByText('Body content')).toBeInTheDocument();
    expect(container.querySelector('.modal-overlay')).toHaveClass(
      'modal-overlay'
    );
    expect(container.querySelector('.modal')).toContainElement(
      screen.getByText('Body content')
    );
  });

  it('ClickClose_FiresOnClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<Modal onClose={onClose}>x</Modal>);
    await user.click(container.querySelector('.close-button') as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ClassName_AppendsToOverlay', () => {
    const { container } = render(<Modal className="claim-modal">x</Modal>);
    expect(container.querySelector('.modal-overlay')).toHaveClass('claim-modal');
  });
});
