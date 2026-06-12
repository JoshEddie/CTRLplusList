import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FollowPrompt from '../FollowPrompt';

describe('FollowPrompt', () => {
  it('WithName_RendersStatusWithName', () => {
    render(<FollowPrompt name="Bob" />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(
      'Follow Bob to see their new public lists in your feed.'
    );
  });

  it('NullName_FallsBackToThisUser', () => {
    render(<FollowPrompt name={null} />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Follow this user to see their new public lists in your feed.'
    );
  });
});
