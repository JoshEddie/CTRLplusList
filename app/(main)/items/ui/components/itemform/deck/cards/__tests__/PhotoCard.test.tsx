import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeItem, mockActions } from '../../__tests__/test-helpers';
import { PhotoCard } from '../PhotoCard';

function setup(over = {}) {
  render(
    <PhotoCard
      item={makeItem(over)}
      actions={mockActions()}
      onBack={vi.fn()}
      onContinue={vi.fn()}
    />
  );
}

describe('PhotoCard', () => {
  it('WithPhotos_TitleIsPickTheBestPhoto', () => {
    setup({ photos: ['https://a', 'https://b'] });
    expect(screen.getByText('Pick the best photo')).toBeInTheDocument();
    expect(screen.getByText('Step · The photo')).toBeInTheDocument();
  });

  it('ZeroPhotos_TitleIsAddAPhoto', () => {
    setup({ photos: [] });
    expect(screen.getByText('Add a photo')).toBeInTheDocument();
  });
});
