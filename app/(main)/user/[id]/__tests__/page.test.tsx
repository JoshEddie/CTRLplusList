import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Page, { metadata } from '../page';

vi.mock('../ProfilePage', () => ({
  default: (props: { params: unknown; searchParams: unknown }) => (
    <div
      data-testid="profile-page"
      data-has-params={String(!!props.params)}
      data-has-search-params={String(!!props.searchParams)}
    />
  ),
}));

const PROPS = {
  params: Promise.resolve({ id: 'u1' }),
  searchParams: Promise.resolve({}),
};

describe('Page', () => {
  it('Render_ForwardsParamsAndSearchParamsToProfilePage', () => {
    render(<Page {...PROPS} />);
    const el = screen.getByTestId('profile-page');
    expect(el).toHaveAttribute('data-has-params', 'true');
    expect(el).toHaveAttribute('data-has-search-params', 'true');
  });

  it('Metadata_TitleIsUserProfile', () => {
    expect(metadata.title).toBe('User profile');
  });
});
