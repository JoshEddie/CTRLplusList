/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * The overlay and shell containers carry no role or accessible name (they are
 * structural chrome), so overlay-self-target dismissal can only be asserted by
 * dispatching directly on the overlay via container.querySelector +
 * fireEvent.click — the same pattern FormShell.test.tsx uses.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DeckScreen, DeckShell } from '../DeckShell';

const routerMock = { back: vi.fn(), push: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

function setup(over: Partial<{ variant: 'default' | 'wide' }> = {}) {
  const onClose = vi.fn();
  const { container } = render(
    <DeckShell moduleTitle="Add an item" onClose={onClose} {...over}>
      <DeckScreen
        title="Screen title"
        subtitle="Screen sub"
        foot={<span>Foot</span>}
      >
        <p>Well content</p>
      </DeckScreen>
    </DeckShell>
  );
  return { onClose, container };
}

describe('DeckShell', () => {
  it('OverlaySelfClick_Dismisses', () => {
    const { onClose, container } = setup();
    fireEvent.click(container.querySelector('.deck-screen-overlay')!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('DescendantClick_DoesNotDismiss', async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    await user.click(screen.getByText('Well content'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('CloseButton_Dismisses', async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('WideVariant_AddsWideClassToShellBox', () => {
    const { container } = setup({ variant: 'wide' });
    expect(container.querySelector('.deck-screen')!.className).toContain(
      'modal-shell-wide'
    );
  });

  it('ModuleTitle_RendersAsConstantChrome', () => {
    setup();
    expect(screen.getByText('Add an item')).toBeInTheDocument();
  });

  it('ScrolledWell_ShowsBothBoundaryShadows', () => {
    const { container } = setup();
    const well = container.querySelector('.deck-screen-well')!;
    Object.defineProperty(well, 'scrollTop', { value: 50 });
    Object.defineProperty(well, 'scrollHeight', { value: 400 });
    Object.defineProperty(well, 'clientHeight', { value: 200 });
    fireEvent.scroll(well);
    expect(container.querySelector('.deck-screen-hd')).toHaveClass(
      'deck-screen-hd-shadow'
    );
    expect(container.querySelector('.deck-screen-ft')).toHaveClass(
      'deck-screen-ft-shadow'
    );
  });

  it('WellAtTop_ShowsOnlyBottomShadow', () => {
    const { container } = setup();
    const well = container.querySelector('.deck-screen-well')!;
    Object.defineProperty(well, 'scrollTop', { value: 0 });
    Object.defineProperty(well, 'scrollHeight', { value: 400 });
    Object.defineProperty(well, 'clientHeight', { value: 200 });
    fireEvent.scroll(well);
    expect(container.querySelector('.deck-screen-hd')).not.toHaveClass(
      'deck-screen-hd-shadow'
    );
    expect(container.querySelector('.deck-screen-ft')).toHaveClass(
      'deck-screen-ft-shadow'
    );
  });

  it('NonScrollingWell_ShowsNoShadows', () => {
    const { container } = setup();
    const well = container.querySelector('.deck-screen-well')!;
    fireEvent.scroll(well);
    expect(container.querySelector('.deck-screen-hd')).not.toHaveClass(
      'deck-screen-hd-shadow'
    );
    expect(container.querySelector('.deck-screen-ft')).not.toHaveClass(
      'deck-screen-ft-shadow'
    );
  });

  it('ScreenSlots_RenderTitleSubtitleWellAndFoot', () => {
    setup();
    expect(
      screen.getByRole('heading', { name: 'Screen title' })
    ).toBeInTheDocument();
    expect(screen.getByText('Screen sub')).toBeInTheDocument();
    expect(screen.getByText('Well content')).toBeInTheDocument();
    expect(screen.getByText('Foot')).toBeInTheDocument();
  });
});
