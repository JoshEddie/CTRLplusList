import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ItemPhoto from '../ItemPhoto';
import { mintItemPlaceholder } from '@/lib/data/item.placeholder.actions';

vi.mock('@/lib/data/item.placeholder.actions', () => ({
  mintItemPlaceholder: vi.fn(),
}));

const MINTED_URI = 'data:image/svg+xml;base64,bWludGVk';

beforeEach(() => {
  vi.mocked(mintItemPlaceholder).mockReset();
  vi.mocked(mintItemPlaceholder).mockResolvedValue({
    success: true,
    message: 'Placeholder minted',
    url: MINTED_URI,
  });
});

describe('ItemPhoto', () => {
  it('UrlPresent_RendersLazyImgWithSrcAndAlt', () => {
    render(
      <ItemPhoto itemId="i1" name="Tea kettle" url="https://img.test/kettle.jpg" />
    );
    const img = screen.getByRole('img', { name: 'Tea kettle' });
    expect(img).toHaveAttribute('src', 'https://img.test/kettle.jpg');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveClass('item-image');
  });

  it('UrlPresent_NeverCallsMint', () => {
    render(
      <ItemPhoto itemId="i1" name="Tea kettle" url="https://img.test/kettle.jpg" />
    );
    expect(mintItemPlaceholder).not.toHaveBeenCalled();
  });

  it('UrlEmpty_CallsMintOnceAndSwapsInReturnedArt', async () => {
    render(<ItemPhoto itemId="i1" name="Tea kettle" url="" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByRole('img', { name: 'Tea kettle' })).toHaveAttribute(
        'src',
        MINTED_URI
      )
    );
    expect(mintItemPlaceholder).toHaveBeenCalledTimes(1);
    expect(mintItemPlaceholder).toHaveBeenCalledWith('i1');
  });

  it('MintRejected_KeepsEmptyContainer', async () => {
    vi.mocked(mintItemPlaceholder).mockResolvedValue({
      success: false,
      message: 'Unauthorized',
      error: 'Unauthorized',
    });
    render(<ItemPhoto itemId="i1" name="Tea kettle" url="" />);

    await waitFor(() => expect(mintItemPlaceholder).toHaveBeenCalled());
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('ItemIdEmpty_DoesNotCallMint', () => {
    render(<ItemPhoto itemId="" name="Tea kettle" url="" />);
    expect(mintItemPlaceholder).not.toHaveBeenCalled();
  });
});
