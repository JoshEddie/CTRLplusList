import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ListPrivate from '../ListPrivate';

describe('ListPrivate', () => {
  it('LoggedOut_RendersInterstitial-PleaseLoginParagraph', () => {
    render(<ListPrivate loggedIn={false} />);
    expect(
      screen.getByRole('heading', { name: /This list is private/ })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/please login to view it/i)
    ).toBeInTheDocument();
  });

  it('LoggedIn_RendersInterstitial-OmitsPleaseLoginParagraph', () => {
    render(<ListPrivate loggedIn={true} />);
    expect(
      screen.getByRole('heading', { name: /This list is private/ })
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/please login to view it/i)
    ).not.toBeInTheDocument();
  });
});
