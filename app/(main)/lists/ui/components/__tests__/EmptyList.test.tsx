import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EmptyList from '../EmptyList';

describe('EmptyList', () => {
  it('Default_RendersNoListsHeading-CreateListLinkToNew', () => {
    render(<EmptyList />);
    expect(
      screen.getByRole('heading', { name: 'No lists found' })
    ).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Create List/ });
    expect(link).toHaveAttribute('href', '/lists/new');
  });
});
