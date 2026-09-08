import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EmptyListCTA from '../EmptyListCTA';

const spHolder = vi.hoisted(() => ({
  value: new URLSearchParams() as URLSearchParams | null,
}));
vi.mock('next/navigation', () => ({
  useSearchParams: () => spHolder.value,
}));

describe('EmptyListCTA', () => {
  it('Default_LinksIntoEditModeOnTheListRoute', () => {
    spHolder.value = new URLSearchParams();
    render(<EmptyListCTA listId="l1" />);
    expect(
      screen.getByRole('heading', { name: 'No items on this list yet' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Choose Items' })).toHaveAttribute(
      'href',
      '/lists/l1?edit=1'
    );
  });

  it('UnderASpoilerParam_CarriesItIntoEditMode', () => {
    spHolder.value = new URLSearchParams('spoiler=claims');
    render(<EmptyListCTA listId="l1" />);
    expect(screen.getByRole('link', { name: 'Choose Items' })).toHaveAttribute(
      'href',
      '/lists/l1?spoiler=claims&edit=1'
    );
  });
});
