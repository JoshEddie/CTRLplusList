import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ItemFormContainer from '../ItemFormContainer';

const router = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

// Stub the server actions so importing the container doesn't pull in the
// neon-http db client (no DATABASE_URL in the unit env).
vi.mock('@/lib/data/item.actions', () => ({
  createItem: vi.fn().mockResolvedValue({ success: true, message: 'ok' }),
  updateItem: vi.fn().mockResolvedValue({ success: true, message: 'ok' }),
  archiveItem: vi.fn().mockResolvedValue({ success: true, message: 'ok' }),
  deleteItem: vi.fn().mockResolvedValue({ success: true, message: 'ok' }),
}));

const PRODUCT_RESPONSE = {
  ok: true,
  product: {
    title: 'Acme Widget',
    imageUrl: 'https://example.com/w.jpg',
    price: '24.50',
    currency: 'USD',
    canonicalUrl: 'https://example.com/widget',
    store: 'Amazon',
  },
};

function jsonOk(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

let fetchMock: ReturnType<typeof vi.fn>;

function renderCreate() {
  return render(<ItemFormContainer lists={[]} onClose={vi.fn()} />);
}

async function fetchUrl(url = 'https://www.amazon.com/dp/B0TEST') {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Product link/), url);
  await user.click(screen.getByRole('button', { name: 'Fetch Details' }));
  return user;
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('ItemFormContainer', () => {
  describe('Entry', () => {
    it('CreateMode_OpensUrlEntry', () => {
      renderCreate();
      expect(screen.getByText(/Paste a product link/)).toBeInTheDocument();
    });

    it('EditMode_OpensPreviewSeededWithSaveChanges', () => {
      render(
        <ItemFormContainer
          lists={[]}
          item={
            {
              id: 'i1',
              name: 'Gift',
              quantity_limit: 1,
              stores: [],
              lists: [],
            } as never
          }
          returnTo="/items"
        />
      );
      expect(
        screen.getByRole('button', { name: 'Save changes' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Gift' })
      ).toBeInTheDocument();
    });

    it('EditWithoutReturnTo_RendersPreview', () => {
      render(
        <ItemFormContainer
          lists={[]}
          item={
            {
              id: 'i1',
              name: 'Gift',
              quantity_limit: 1,
              stores: [],
              lists: [],
            } as never
          }
        />
      );
      expect(
        screen.getByRole('button', { name: 'Save changes' })
      ).toBeInTheDocument();
    });
  });

  describe('Manual', () => {
    it('ClickManual_OpensBlankPreview', async () => {
      const user = userEvent.setup();
      renderCreate();
      await user.click(
        screen.getByRole('button', { name: 'Fill in details manually →' })
      );
      expect(screen.getByText('Last look')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Create item' })
      ).toBeInTheDocument();
    });

    it('WithLists_ListsSheetRendersOptions', async () => {
      const user = userEvent.setup();
      render(
        <ItemFormContainer
          lists={[{ id: 'l1', name: 'Birthday' } as never]}
          onClose={vi.fn()}
        />
      );
      await user.click(
        screen.getByRole('button', { name: 'Fill in details manually →' })
      );
      await user.click(screen.getByRole('button', { name: /Lists & quantity/ }));
      expect(
        screen.getByRole('checkbox', { name: 'Birthday' })
      ).toBeInTheDocument();
    });

    it('FullNavigation_VisitsTriageFocusSheetsThenCreates', async () => {
      const { createItem } = await import('@/lib/data/item.actions');
      const user = userEvent.setup();
      renderCreate();
      await user.click(
        screen.getByRole('button', { name: 'Fill in details manually →' })
      );

      // Preview → Triage → Name focus → set name → back to Triage → Preview.
      await user.click(
        screen.getByRole('button', { name: /Need to change something/ })
      );
      expect(screen.getByText('Review anything')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /Item name/ }));
      await user.type(screen.getByLabelText('Item name'), 'Nav Item');
      await user.click(screen.getByRole('button', { name: 'Done' }));
      await user.click(
        screen.getByRole('button', { name: /Back to preview/ })
      );

      // Preview → Stores sheet → fill → Done.
      await user.click(screen.getByRole('button', { name: /Store links/ }));
      await user.type(screen.getByLabelText('Store name'), 'Nav Store');
      await user.type(screen.getByLabelText('Link'), 'https://nav.test/p');
      await user.type(screen.getByLabelText('Price'), '12.00');
      await user.click(screen.getByRole('button', { name: 'Done' }));

      // Preview → Lists & quantity sheet → Done.
      await user.click(screen.getByRole('button', { name: /Lists & quantity/ }));
      await user.click(screen.getByRole('button', { name: 'Done' }));

      // Preview → Add a note focus → Done.
      await user.click(screen.getByRole('button', { name: /Add a note/ }));
      await user.type(screen.getByLabelText('Description'), 'A nav note');
      await user.click(screen.getByRole('button', { name: 'Done' }));

      // Create flows through the action.
      await user.click(screen.getByRole('button', { name: 'Create item' }));
      await waitFor(() => expect(createItem).toHaveBeenCalledOnce());
    });

    it('TriageStoreRow_OpensStoresSheet', async () => {
      const user = userEvent.setup();
      renderCreate();
      await user.click(
        screen.getByRole('button', { name: 'Fill in details manually →' })
      );
      await user.click(
        screen.getByRole('button', { name: /Need to change something/ })
      );
      await user.click(screen.getByRole('button', { name: /Store/ }));
      expect(screen.getByLabelText('Store name')).toBeInTheDocument();
    });
  });

  describe('Fetching', () => {
    it('FetchInFlight_ShowsSpinnerAndUrlStrip', async () => {
      fetchMock.mockReturnValue(new Promise(() => {}));
      renderCreate();
      await fetchUrl();
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(
        screen.getByText('https://www.amazon.com/dp/B0TEST')
      ).toBeInTheDocument();
    });

    it('ClickCancel_AbortsRequest-ReturnsToUrlEntry', async () => {
      let abortSignal: AbortSignal | undefined;
      fetchMock.mockImplementation((_url, init: RequestInit) => {
        abortSignal = init.signal ?? undefined;
        return new Promise(() => {});
      });
      renderCreate();
      const user = await fetchUrl();
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(abortSignal?.aborted).toBe(true);
      expect(screen.getByLabelText(/Product link/)).toHaveValue(
        'https://www.amazon.com/dp/B0TEST'
      );
    });
  });

  describe('FetchSuccess', () => {
    it('ProductResolved_EntersDeckWithAutoFilledEyebrow', async () => {
      fetchMock.mockResolvedValue(jsonOk(PRODUCT_RESPONSE));
      renderCreate();
      await fetchUrl();
      expect(
        await screen.findByText('Auto-filled from Amazon')
      ).toBeInTheDocument();
      expect(screen.getByText("Here's what we pulled.")).toBeInTheDocument();
    });

    it('NoStoreName_DeckOmitsEyebrow', async () => {
      fetchMock.mockResolvedValue(
        jsonOk({ ok: true, product: { title: 'No Store Widget' } })
      );
      renderCreate();
      await fetchUrl();
      expect(await screen.findByText("Here's what we pulled.")).toBeInTheDocument();
      expect(screen.queryByText(/Auto-filled from/)).not.toBeInTheDocument();
    });

    it('DeckCompleted_LandsOnPreview', async () => {
      fetchMock.mockResolvedValue(jsonOk(PRODUCT_RESPONSE));
      renderCreate();
      const user = await fetchUrl();
      await screen.findByText("Here's what we pulled.");
      // Acme Widget (good title, price, single image): steps = intro, note.
      await user.click(screen.getByRole('button', { name: "Let's go" }));
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      expect(screen.getByText('Last look')).toBeInTheDocument();
    });

    it('AbortDuringPhotoPrune_DoesNotEnterDeck', async () => {
      // Hold the image probes open so we can cancel mid-prune, then resolve.
      const probes: { onload: (() => void) | null; naturalWidth: number; naturalHeight: number }[] = [];
      class HoldImage {
        naturalWidth = 0;
        naturalHeight = 0;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_v: string) {
          probes.push(this);
        }
      }
      vi.stubGlobal('Image', HoldImage);
      fetchMock.mockResolvedValue(
        jsonOk({
          ok: true,
          product: {
            title: 'Multi Image',
            imageUrls: ['https://a/1', 'https://a/2'],
            store: 'Amazon',
          },
        })
      );
      renderCreate();
      const user = await fetchUrl();
      await waitFor(() => expect(probes.length).toBe(2));

      // Cancel while the prune is still pending.
      await user.click(screen.getByRole('button', { name: 'Cancel' }));
      // Now let the probes resolve — the aborted guard must skip the deck.
      await act(async () => {
        probes.forEach((p) => {
          p.naturalWidth = 400;
          p.naturalHeight = 400;
          p.onload?.();
        });
      });

      expect(screen.getByText(/Paste a product link/)).toBeInTheDocument();
      expect(screen.queryByText("Here's what we pulled.")).not.toBeInTheDocument();
      vi.unstubAllGlobals();
    });

    it('DeckExit_ReturnsToUrlEntry', async () => {
      fetchMock.mockResolvedValue(jsonOk(PRODUCT_RESPONSE));
      renderCreate();
      const user = await fetchUrl();
      await screen.findByText("Here's what we pulled.");
      await user.click(screen.getByRole('button', { name: 'Change link' }));
      expect(screen.getByText(/Paste a product link/)).toBeInTheDocument();
    });
  });

  describe('RateLimited', () => {
    it('Status429_StaysOnUrlEntryWithSlowDownError', async () => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 })
      );
      renderCreate();
      await fetchUrl();
      expect(
        await screen.findByText(
          "You've hit the fetch limit — try again in about a minute."
        )
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/Product link/)).toHaveValue(
        'https://www.amazon.com/dp/B0TEST'
      );
    });
  });

  describe('FetchFailure', () => {
    it('TimeoutResult_ShowsTimeoutCopyWithSameLinkRetry', async () => {
      fetchMock.mockResolvedValue(jsonOk({ ok: false, error: 'timeout' }));
      renderCreate();
      await fetchUrl();
      expect(
        await screen.findByText('This is taking longer than expected')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Try again' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Try a different link' })
      ).toBeInTheDocument();
    });

    it('FetchFailedResult_ShowsUncertaintyCopyWithAllActions', async () => {
      fetchMock.mockResolvedValue(jsonOk({ ok: false, error: 'fetch_failed' }));
      renderCreate();
      await fetchUrl();
      expect(
        await screen.findByText("We couldn't load that link")
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Try again' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Try a different link' })
      ).toBeInTheDocument();
    });

    it('NetworkError_ShowsUncertaintyCopy-LogsError', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      renderCreate();
      await fetchUrl();
      expect(
        await screen.findByText("We couldn't load that link")
      ).toBeInTheDocument();
      await waitFor(() => expect(consoleError).toHaveBeenCalled());
    });

    it('TryAgain_RefetchesSameLink', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(jsonOk({ ok: false, error: 'timeout' }))
      );
      renderCreate();
      const user = await fetchUrl();
      await screen.findByText('This is taking longer than expected');
      await user.click(screen.getByRole('button', { name: 'Try again' }));
      await screen.findByText('This is taking longer than expected');
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(JSON.parse(fetchMock.mock.calls[1][1].body).url).toBe(
        'https://www.amazon.com/dp/B0TEST'
      );
    });

    it('ThirdSameLinkFailure_WithdrawsTryAgainAndHardensCopy', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(jsonOk({ ok: false, error: 'fetch_failed' }))
      );
      renderCreate();
      const user = await fetchUrl();
      await screen.findByText("We couldn't load that link");
      await user.click(screen.getByRole('button', { name: 'Try again' }));
      await screen.findByText("We couldn't load that link");
      await user.click(screen.getByRole('button', { name: 'Try again' }));
      expect(
        await screen.findByText('That link keeps failing')
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Try again' })
      ).not.toBeInTheDocument();
    });

    it('DifferentLinkAfterCap_ResetsRetryCount', async () => {
      fetchMock.mockImplementation(() =>
        Promise.resolve(jsonOk({ ok: false, error: 'fetch_failed' }))
      );
      renderCreate();
      const user = await fetchUrl();
      await screen.findByText("We couldn't load that link");
      await user.click(screen.getByRole('button', { name: 'Try again' }));
      await screen.findByText("We couldn't load that link");
      await user.click(screen.getByRole('button', { name: 'Try again' }));
      await screen.findByText('That link keeps failing');

      // Enter a different URL → the cap resets and Try again returns.
      await user.click(
        screen.getByRole('button', { name: 'Try a different link' })
      );
      const input = screen.getByLabelText(/Product link/);
      await user.clear(input);
      await user.type(input, 'https://www.amazon.com/dp/B0OTHER');
      await user.click(screen.getByRole('button', { name: 'Fetch Details' }));
      await screen.findByText("We couldn't load that link");
      expect(
        screen.getByRole('button', { name: 'Try again' })
      ).toBeInTheDocument();
    });

    it('SameLinkSucceedsAfterFailure_ResetsRetryCount', async () => {
      fetchMock
        .mockResolvedValueOnce(jsonOk({ ok: false, error: 'timeout' }))
        .mockResolvedValueOnce(jsonOk(PRODUCT_RESPONSE))
        .mockResolvedValueOnce(jsonOk({ ok: false, error: 'timeout' }))
        .mockResolvedValueOnce(jsonOk({ ok: false, error: 'timeout' }));
      renderCreate();
      const user = await fetchUrl();
      await screen.findByText('This is taking longer than expected');
      await user.click(screen.getByRole('button', { name: 'Try again' }));
      await screen.findByText("Here's what we pulled.");

      // Back to the same link after it succeeded: the earlier failure is spent,
      // so the cap allows two fresh failures before withdrawing Try again.
      await user.click(screen.getByRole('button', { name: 'Change link' }));
      await user.click(screen.getByRole('button', { name: 'Fetch Details' }));
      await screen.findByText('This is taking longer than expected');
      await user.click(screen.getByRole('button', { name: 'Try again' }));
      await screen.findByText('This is taking longer than expected');
      expect(
        screen.getByRole('button', { name: 'Try again' })
      ).toBeInTheDocument();
    });

    it('ManualEntry_OpensBlankPreviewWithUrlSeededInStoreLink', async () => {
      fetchMock.mockResolvedValue(jsonOk({ ok: false, error: 'timeout' }));
      renderCreate();
      const user = await fetchUrl();
      await screen.findByText('This is taking longer than expected');
      await user.click(
        screen.getByRole('button', { name: 'Fill in details manually →' })
      );
      expect(screen.getByText('Last look')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /Store links/ }));
      expect(screen.getByLabelText('Link')).toHaveValue(
        'https://www.amazon.com/dp/B0TEST'
      );
    });
  });
});
