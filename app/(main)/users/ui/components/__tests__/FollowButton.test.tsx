import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import FollowButton from '../FollowButton';

vi.mock('react-icons/fa', () => ({
  FaCheck: () => <svg data-testid="fa-check" />,
  FaPlus: () => <svg data-testid="fa-plus" />,
}));

describe('FollowButton', () => {
  it('Following_LabelFollowing-CheckIcon-PressedTrue', () => {
    render(
      <FollowButton
        following
        pending={false}
        onClick={vi.fn()}
      />
    );
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Following');
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('fa-check')).toBeInTheDocument();
    expect(screen.queryByTestId('fa-plus')).not.toBeInTheDocument();
  });

  it('NotFollowing_LabelFollow-PlusIcon', () => {
    render(
      <FollowButton following={false} pending={false} onClick={vi.fn()} />
    );
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Follow');
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('fa-plus')).toBeInTheDocument();
  });

  it('Pending_AriaDisabledTrue-AriaLabelMatchesLabel', () => {
    render(<FollowButton following pending onClick={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('aria-label', 'Following');
  });

  it('SecondaryVariant_RendersBtnSecondaryClasses-ForwardsClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <FollowButton
        following={false}
        pending={false}
        variant="secondary"
        onClick={onClick}
      />
    );
    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn', 'secondary');
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
