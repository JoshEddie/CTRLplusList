import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeItem, mockActions } from '../../__tests__/test-helpers';
import { PhotoCard } from '../PhotoCard';

vi.mock('@/lib/data/item.placeholder.actions', async () =>
  (await import('../../__tests__/test-helpers')).placeholderActionsMock()
);

function setup(over = {}) {
  render(
    <PhotoCard
      item={makeItem(over)}
      actions={mockActions()}
      onContinue={vi.fn()}
    />
  );
}

describe('PhotoCard', () => {
  it('WithPhotos_TitleIsPickTheBestPhoto', () => {
    setup({ photos: ['https://a', 'https://b'] });
    expect(screen.getByText('Pick the best photo')).toBeInTheDocument();
  });

  it('ZeroPhotos_TitleIsPickSomeArt', () => {
    setup({ photos: [] });
    expect(screen.getByText('Pick some art')).toBeInTheDocument();
  });
});
