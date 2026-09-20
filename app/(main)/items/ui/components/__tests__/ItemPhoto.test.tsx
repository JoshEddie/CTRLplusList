import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ItemPhoto from '../ItemPhoto';
import {
  fallbackItemPlaceholder,
  mintItemPlaceholder,
} from '@/lib/data/item.placeholder.actions';

vi.mock('@/lib/data/item.placeholder.actions', () => ({
  mintItemPlaceholder: vi.fn(),
  fallbackItemPlaceholder: vi.fn(),
}));

const MINTED_URI = 'data:image/svg+xml;base64,bWludGVk';
const FALLBACK_URI = 'data:image/svg+xml;base64,ZmFsbGJhY2s=';

beforeEach(() => {
  vi.mocked(mintItemPlaceholder).mockReset();
  vi.mocked(mintItemPlaceholder).mockResolvedValue({
    success: true,
    message: 'Placeholder minted',
    url: MINTED_URI,
  });
  vi.mocked(fallbackItemPlaceholder).mockReset();
  vi.mocked(fallbackItemPlaceholder).mockResolvedValue({
    success: true,
    message: 'Fallback art generated',
    url: FALLBACK_URI,
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

  describe('DeadSavedUrl', () => {
    it('ImgError_SwapsInFallbackArtWithoutPersisting', async () => {
      render(
        <ItemPhoto itemId="i1" name="Tea kettle" url="https://img.test/dead.jpg" />
      );
      fireEvent.error(screen.getByRole('img', { name: 'Tea kettle' }));

      await waitFor(() =>
        expect(screen.getByRole('img', { name: 'Tea kettle' })).toHaveAttribute(
          'src',
          FALLBACK_URI
        )
      );
      expect(fallbackItemPlaceholder).toHaveBeenCalledTimes(1);
      expect(fallbackItemPlaceholder).toHaveBeenCalledWith('i1');
      expect(mintItemPlaceholder).not.toHaveBeenCalled();
    });

    it('RepeatedErrors_RequestFallbackOnce', async () => {
      render(
        <ItemPhoto itemId="i1" name="Tea kettle" url="https://img.test/dead.jpg" />
      );
      const img = screen.getByRole('img', { name: 'Tea kettle' });
      fireEvent.error(img);
      fireEvent.error(img);

      await waitFor(() =>
        expect(fallbackItemPlaceholder).toHaveBeenCalledTimes(1)
      );
    });

    it('FallbackRejected_KeepsSavedUrl', async () => {
      vi.mocked(fallbackItemPlaceholder).mockResolvedValue({
        success: false,
        message: 'Unauthorized',
        error: 'Unauthorized',
      });
      render(
        <ItemPhoto itemId="i1" name="Tea kettle" url="https://img.test/dead.jpg" />
      );
      fireEvent.error(screen.getByRole('img', { name: 'Tea kettle' }));

      await waitFor(() => expect(fallbackItemPlaceholder).toHaveBeenCalled());
      expect(screen.getByRole('img', { name: 'Tea kettle' })).toHaveAttribute(
        'src',
        'https://img.test/dead.jpg'
      );
    });

    it('MintedArtError_DoesNotRequestFallback', async () => {
      render(<ItemPhoto itemId="i1" name="Tea kettle" url="" />);
      const img = await screen.findByRole('img', { name: 'Tea kettle' });
      fireEvent.error(img);
      expect(fallbackItemPlaceholder).not.toHaveBeenCalled();
    });
  });
});
