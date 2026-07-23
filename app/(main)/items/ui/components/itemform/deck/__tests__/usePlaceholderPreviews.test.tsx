import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { previewPlaceholders } from '@/lib/data/item.placeholder.actions';
import { usePlaceholderPreviews } from '../usePlaceholderPreviews';
import { makeItem, mockActions } from './test-helpers';

vi.mock('@/lib/data/item.placeholder.actions', () => ({
  previewPlaceholders: vi.fn(),
}));

const uri = (n: number) => `data:image/svg+xml;base64,${'a'.repeat(n)}`;

beforeEach(() => {
  vi.mocked(previewPlaceholders).mockReset();
  vi.mocked(previewPlaceholders).mockImplementation(async (count: number) => ({
    success: true,
    message: 'ok',
    urls: Array.from({ length: count }, (_, i) => uri(i + 1)),
  }));
});

describe('usePlaceholderPreviews', () => {
  it.each([
    [0, 4],
    [1, 3],
    [2, 2],
    [3, 1],
    [7, 1],
  ])('RealPhotoPool_TopsUpToMaxOneFourMinusReal', async (real, want) => {
    const item = makeItem({
      photos: Array.from({ length: real }, (_, i) => `https://img/${i}.jpg`),
    });
    const { result } = renderHook(() =>
      usePlaceholderPreviews(item, mockActions())
    );
    await waitFor(() =>
      expect(result.current.placeholders).toHaveLength(want)
    );
    expect(previewPlaceholders).toHaveBeenCalledWith(want);
  });

  it('ZeroPhotosNoSelectionWithPreselect_AutoSelectsFirstFreshPlaceholder', async () => {
    const actions = mockActions();
    const item = makeItem({ photos: [] });
    renderHook(() => usePlaceholderPreviews(item, actions, true));
    await waitFor(() =>
      expect(actions.selectPlaceholder).toHaveBeenCalledWith(uri(1))
    );
  });

  it('ZeroPhotosWithoutPreselect_DoesNotAutoSelectPlaceholder', async () => {
    // The FocusEditor edit path: an imageless item must never silently gain
    // a placeholder the user didn't pick.
    const actions = mockActions();
    const item = makeItem({ photos: [] });
    const { result } = renderHook(() => usePlaceholderPreviews(item, actions));
    await waitFor(() => expect(result.current.placeholders).toHaveLength(4));
    expect(actions.selectPlaceholder).not.toHaveBeenCalled();
  });

  it('RealPhotosPresent_DoesNotAutoSelectPlaceholder', async () => {
    const actions = mockActions();
    const item = makeItem({ photos: ['https://img/a.jpg'] });
    const { result } = renderHook(() =>
      usePlaceholderPreviews(item, actions, true)
    );
    await waitFor(() => expect(result.current.placeholders).toHaveLength(3));
    expect(actions.selectPlaceholder).not.toHaveBeenCalled();
  });

  it('SavedPlaceholderInPool_DoesNotCountAsRealPhoto', async () => {
    const item = makeItem({
      photos: ['https://img/a.jpg', uri(30)],
    });
    const { result } = renderHook(() =>
      usePlaceholderPreviews(item, mockActions())
    );
    await waitFor(() =>
      expect(result.current.placeholders).toHaveLength(3)
    );
  });

  it('SelectedPlaceholder_SurvivesRemountAsFirstThumb', async () => {
    const selected = uri(40);
    const item = makeItem({ photos: [], placeholder: selected });
    const { result } = renderHook(() =>
      usePlaceholderPreviews(item, mockActions())
    );
    await waitFor(() =>
      expect(result.current.placeholders).toHaveLength(4)
    );
    expect(result.current.placeholders[0]).toBe(selected);
    expect(previewPlaceholders).toHaveBeenCalledWith(3);
  });

  it('Reroll_ReplacesSelectedThumbInPlaceAndSelectsFreshArt', async () => {
    const selected = uri(40);
    const fresh = uri(50);
    const actions = mockActions();
    const item = makeItem({ photos: ['https://img/a.jpg'], placeholder: selected });
    const { result } = renderHook(() =>
      usePlaceholderPreviews(item, actions)
    );
    await waitFor(() =>
      expect(result.current.placeholders).toHaveLength(3)
    );
    const before = result.current.placeholders;

    vi.mocked(previewPlaceholders).mockResolvedValue({
      success: true,
      message: 'ok',
      urls: [fresh],
    });
    await act(async () => result.current.reroll());

    expect(result.current.placeholders[0]).toBe(fresh);
    expect(result.current.placeholders.slice(1)).toEqual(before.slice(1));
    expect(actions.selectPlaceholder).toHaveBeenCalledWith(fresh);
  });

  it('StrictModeDoubleEffect_FetchesOnlyOnce', async () => {
    const item = makeItem();
    const { result } = renderHook(
      () => usePlaceholderPreviews(item, mockActions()),
      { wrapper: StrictMode }
    );
    await waitFor(() => expect(result.current.placeholders).toHaveLength(3));
    expect(previewPlaceholders).toHaveBeenCalledTimes(1);
  });

  it('SelectionAlreadyFillsTheQuota_DoesNotFetch', async () => {
    const item = makeItem({
      photos: ['https://img/a.jpg', 'https://img/b.jpg', 'https://img/c.jpg'],
      placeholder: uri(40),
    });
    const { result } = renderHook(() =>
      usePlaceholderPreviews(item, mockActions())
    );
    expect(result.current.placeholders).toEqual([uri(40)]);
    expect(previewPlaceholders).not.toHaveBeenCalled();
  });

  it('PreviewRequestFails_LeavesStripWithoutPlaceholders', async () => {
    vi.mocked(previewPlaceholders).mockResolvedValue({
      success: false,
      message: 'Unauthorized',
      error: 'Unauthorized',
    });
    const item = makeItem();
    const { result } = renderHook(() =>
      usePlaceholderPreviews(item, mockActions())
    );
    await waitFor(() => expect(previewPlaceholders).toHaveBeenCalled());
    expect(result.current.placeholders).toEqual([]);
  });

  it('RerollResponseWithoutUrls_KeepsSelectionAndThumbs', async () => {
    const selected = uri(40);
    const actions = mockActions();
    const item = makeItem({ photos: [], placeholder: selected });
    const { result } = renderHook(() => usePlaceholderPreviews(item, actions));
    await waitFor(() => expect(result.current.placeholders).toHaveLength(4));
    const before = result.current.placeholders;

    vi.mocked(previewPlaceholders).mockResolvedValue({
      success: false,
      message: 'Unauthorized',
      error: 'Unauthorized',
    });
    await act(async () => result.current.reroll());

    expect(result.current.placeholders).toEqual(before);
    expect(actions.selectPlaceholder).not.toHaveBeenCalled();
  });

  it('RerollWithNoSelection_DoesNotFetch', async () => {
    const item = makeItem();
    const { result } = renderHook(() =>
      usePlaceholderPreviews(item, mockActions())
    );
    await waitFor(() => expect(previewPlaceholders).toHaveBeenCalledTimes(1));
    await act(async () => result.current.reroll());
    expect(previewPlaceholders).toHaveBeenCalledTimes(1);
  });
});
