/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * The fill is a styled div with no role; its width is the observable output.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ClaimProgress from '../ClaimProgress';

describe('ClaimProgress', () => {
  it('PartialProgress_RendersLabelAndProportionalFill', () => {
    const { container } = render(<ClaimProgress claimed={1} total={4} />);
    expect(
      screen.getByRole('group', { name: '1 of 4 items claimed' })
    ).toHaveTextContent('1 / 4 claimed');
    expect(container.querySelector('.list-hero-progress-fill')).toHaveStyle({
      width: '25%',
    });
  });

  it('ZeroTotal_RendersEmptyFillWithoutDividingByZero', () => {
    const { container } = render(<ClaimProgress claimed={0} total={0} />);
    expect(screen.getByText('0 / 0 claimed')).toBeInTheDocument();
    expect(container.querySelector('.list-hero-progress-fill')).toHaveStyle({
      width: '0%',
    });
  });

  it('ClaimedExceedsTotal_CapsFillAtFull', () => {
    const { container } = render(<ClaimProgress claimed={5} total={4} />);
    expect(container.querySelector('.list-hero-progress-fill')).toHaveStyle({
      width: '100%',
    });
  });
});
