/**
 * Pins the thing surface's own SHALLs: search drives the grid, more can be
 * asked for while more exists, a failed search keeps the last results, and the
 * attribution the art's licence requires is always on.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ThingPicker from '../ThingPicker';

const DOG = { code: '1F415', label: 'dog' };
const ROCKET = { code: '1F680', label: 'rocket' };

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

// jsdom implements no layout, so the page-turn's scroll-to-top is stubbed.
Element.prototype.scrollTo = vi.fn();

const respond = (entries: { code: string; label: string }[], hasMore = false) =>
  fetchMock.mockResolvedValue({
    json: () => Promise.resolve({ entries, hasMore }),
  });

const onPick = vi.fn();

const renderPicker = (current?: string) =>
  render(<ThingPicker current={current} accent="lion" onPick={onPick} />);

const dogTile = () => screen.findByRole('radio', { name: /dog/i });

beforeEach(() => {
  vi.useRealTimers();
  fetchMock.mockReset();
  onPick.mockClear();
});

describe('Search', () => {
  it('Opened_LoadsAFirstPageWithoutTyping', async () => {
    respond([DOG, ROCKET]);
    renderPicker();
    expect(await dogTile()).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /rocket/i })).toBeInTheDocument();
  });

  it('TypedQuery_ReachesTheSearchRoute', async () => {
    respond([ROCKET]);
    renderPicker();
    await userEvent.type(screen.getByRole('searchbox'), 'rocket');
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining('q=rocket')
      )
    );
  });

  it('StaleResponse_NeverClobbersANewerQuery', async () => {
    // The first page's response is held until after a new query has landed;
    // it must be dropped, not painted over the newer results.
    let releaseFirst!: (v: unknown) => void;
    fetchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        releaseFirst = resolve;
      })
    );
    respond([ROCKET]);
    renderPicker();
    // The held response must belong to the mount's own fetch, so wait for it
    // to fire before typing supersedes it.
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    await userEvent.type(screen.getByRole('searchbox'), 'rocket');
    expect(await screen.findByRole('radio', { name: /rocket/i })).toBeInTheDocument();

    releaseFirst({
      json: () => Promise.resolve({ entries: [DOG], hasMore: false }),
    });
    await waitFor(() =>
      expect(screen.queryByRole('radio', { name: /dog/i })).toBeNull()
    );
    expect(screen.getByRole('radio', { name: /rocket/i })).toBeInTheDocument();
  });

  it('ClearControl_EmptiesTheQueryAndReloadsTheFirstPage', async () => {
    respond([DOG]);
    renderPicker();
    await userEvent.type(screen.getByRole('searchbox'), 'dog');
    await userEvent.click(
      await screen.findByRole('button', { name: /clear search/i })
    );
    expect(screen.getByRole('searchbox')).toHaveValue('');
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining('q=&limit=60')
      )
    );
  });

  it('NoMatches_SaysSoInPlaceOfTheGrid', async () => {
    respond([]);
    renderPicker();
    expect(
      await screen.findByText(/nothing matches/i)
    ).toBeInTheDocument();
  });

  it('FailedSearch_KeepsTheLastResultsStanding', async () => {
    respond([DOG]);
    renderPicker();
    expect(await dogTile()).toBeInTheDocument();

    fetchMock.mockRejectedValue(new Error('offline'));
    await userEvent.type(screen.getByRole('searchbox'), 'x');
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(1));
    expect(screen.getByRole('radio', { name: /dog/i })).toBeInTheDocument();
  });
});

describe('Picking', () => {
  it('TileClicked_HandsBackItsCodepoint', async () => {
    respond([DOG]);
    renderPicker();
    await userEvent.click(await dogTile());
    expect(onPick).toHaveBeenCalledExactlyOnceWith('1F415');
  });

  it('CurrentCode_RendersAsTheCheckedTile', async () => {
    respond([DOG, ROCKET]);
    renderPicker('1F680');
    expect(await dogTile()).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: /rocket/i })).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });
});

describe('Pager', () => {
  it('MoreBehindThePage_TurnsToTheNextPagesWindow', async () => {
    respond([DOG], true);
    renderPicker();
    await userEvent.click(await screen.findByRole('button', { name: /more/i }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining('offset=60')
      )
    );
  });

  it('PastTheFirstPage_OffersBackToTheStart', async () => {
    respond([DOG], true);
    renderPicker();
    await userEvent.click(await screen.findByRole('button', { name: /more/i }));
    await userEvent.click(await screen.findByRole('button', { name: /back/i }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining('offset=0')
      )
    );
    expect(screen.queryByRole('button', { name: /back/i })).toBeNull();
  });

  it('TypedQuery_ReturnsToTheFirstPage', async () => {
    respond([DOG], true);
    renderPicker();
    await userEvent.click(await screen.findByRole('button', { name: /more/i }));
    await userEvent.type(screen.getByRole('searchbox'), 'd');
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith(
        expect.stringContaining('q=d&limit=60&offset=0')
      )
    );
  });

  it('NothingMore_OffersNoPager', async () => {
    respond([DOG], false);
    renderPicker();
    await dogTile();
    expect(screen.queryByRole('button', { name: /more/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /back/i })).toBeNull();
  });
});

describe('Attribution', () => {
  it('Rendered_CreditsOpenMojiWithItsLicence', async () => {
    respond([DOG]);
    renderPicker();
    const credit = await screen.findByRole('link', { name: 'OpenMoji' });
    expect(credit).toHaveAttribute('href', 'https://openmoji.org');
    expect(credit.parentElement?.textContent).toContain('CC BY-SA 4.0');
  });
});
