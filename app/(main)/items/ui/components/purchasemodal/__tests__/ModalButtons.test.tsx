/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * The `.button-group` / `.tooltip` wrappers carry no role or accessible name;
 * asserting the single-vs-paired group class and the rendered tooltip text
 * requires classed `container.querySelector`.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ModalButtons from '../ModalButtons';

describe('ModalButtons', () => {
  it('PrimaryOnly_RendersSingleGroup-NoSecondary-ClickFiresPrimary', async () => {
    const user = userEvent.setup();
    const onPrimary = vi.fn();
    const { container } = render(
      <ModalButtons
        primary_button_text="Confirm Purchase"
        primary_button_onclick={onPrimary}
      />
    );
    expect(container.querySelector('.button-group')).toHaveClass('single');
    expect(
      screen.queryByRole('button', { name: 'Back' })
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm Purchase' }));
    expect(onPrimary).toHaveBeenCalledTimes(1);
  });

  it('PrimaryAndSecondary_RendersBoth-GroupNotSingle-ClickFiresSecondary', async () => {
    const user = userEvent.setup();
    const onSecondary = vi.fn();
    const { container } = render(
      <ModalButtons
        primary_button_text="Confirm Purchase"
        primary_button_onclick={vi.fn()}
        secondary_button_text="Back"
        secondary_button_onclick={onSecondary}
      />
    );
    expect(container.querySelector('.button-group')).not.toHaveClass('single');
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });

  it('EmptyPrimaryText_OmitsPrimaryButton', () => {
    render(
      <ModalButtons
        primary_button_text=""
        primary_button_onclick={vi.fn()}
        secondary_button_text="Back"
        secondary_button_onclick={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('BothDisabledWithTooltip_RendersTooltipText-ButtonsDisabled', () => {
    const { container } = render(
      <ModalButtons
        primary_button_text="Confirm Purchase"
        primary_button_onclick={vi.fn()}
        primary_button_disabled
        primary_button_disabled_with_tooltip="Please enter a name to continue"
        secondary_button_text="Back"
        secondary_button_onclick={vi.fn()}
        secondary_button_disabled
        secondary_button_disabled_with_tooltip="Secondary unavailable"
      />
    );
    expect(
      screen.getByRole('button', { name: 'Confirm Purchase' })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
    const tooltips = Array.from(container.querySelectorAll('.tooltip')).map(
      (t) => t.textContent
    );
    expect(tooltips).toContain('Please enter a name to continue');
    expect(tooltips).toContain('Secondary unavailable');
  });
});
