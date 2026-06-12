/* eslint-disable testing-library/no-node-access --
 * The close affordance is a bare `<div className="close-button">` with no role
 * or accessible name, and the overlay is portaled to document.body, so classed
 * querySelector against document.body is the only path.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Modal from '../Modal';

const isClientState = vi.hoisted(() => ({ value: true }));
vi.mock('@/app/ui/hooks/useIsClient', () => ({
  useIsClient: () => isClientState.value,
}));

afterEach(() => {
  isClientState.value = true;
});

const overlay = () =>
  document.body.querySelector('.modal-overlay') as HTMLElement;

describe('Modal', () => {
  it('Children_RenderInsideModalBodyWithoutExtraClass', () => {
    render(
      <Modal>
        <p>Body content</p>
      </Modal>
    );
    expect(screen.getByText('Body content')).toBeInTheDocument();
    expect(overlay()).toHaveClass('modal-overlay');
    expect(document.body.querySelector('.modal')).toContainElement(
      screen.getByText('Body content')
    );
  });

  it('Overlay_PortalsToDocumentBody', () => {
    const { container } = render(<Modal>x</Modal>);
    expect(overlay().parentElement).toBe(document.body);
    expect(container).toBeEmptyDOMElement();
  });

  it('BeforeClientMount_RendersNothing', () => {
    isClientState.value = false;
    const { container } = render(<Modal>x</Modal>);
    expect(container).toBeEmptyDOMElement();
    expect(document.body.querySelector('.modal-overlay')).toBeNull();
  });

  it('ClickClose_FiresOnClose', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Modal onClose={onClose}>x</Modal>);
    await user.click(
      document.body.querySelector('.close-button') as HTMLElement
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ClassName_AppendsToOverlay', () => {
    render(<Modal className="claim-modal">x</Modal>);
    expect(overlay()).toHaveClass('claim-modal');
  });
});
