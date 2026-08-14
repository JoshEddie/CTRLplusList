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
vi.mock('@/lib/data/item.placeholder.actions', async () =>
  (await import('../deck/__tests__/test-helpers')).placeholderActionsMock()
);

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

const MANUAL_LINK = { name: 'Fill in details manually →' };

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

// Manual entry is failure-screen-only: reach it by failing a fetch first.
async function openManualViaFailure(url = 'https://www.amazon.com/dp/B0TEST') {
  fetchMock.mockResolvedValue(jsonOk({ ok: false, error: 'timeout' }));
  const user = await fetchUrl(url);
  await user.click(await screen.findByRole('button', MANUAL_LINK));
  return user;
}

// From the URL entry state (link prefilled unless `url` is given), fail a
// fetch and re-enter the Fill-manually shell.
async function reopenManualViaFailure(
  user: ReturnType<typeof userEvent.setup>,
  url?: string
) {
  if (url) {
    const input = screen.getByLabelText(/Product link/);
    await user.clear(input);
    await user.type(input, url);
  }
  await user.click(screen.getByRole('button', { name: 'Fetch Details' }));
  await user.click(await screen.findByRole('button', MANUAL_LINK));
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
    it('CreateMode_OpensUrlEntry-NoManualAffordance', () => {
      renderCreate();
      expect(screen.getByText(/Paste a product link/)).toBeInTheDocument();
      expect(screen.queryByRole('button', MANUAL_LINK)).not.toBeInTheDocument();
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
              store: null,
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
              store: null,
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

  describe('LinklessDoor', () => {
    const DOOR = { name: /No link\?/ };

    // Door deck → Preview: photo (always incomplete), then title (needs a
    // name; the blank-title entry keeps the note inline, so no note step),
    // then price (optional when linkless). No store step exists.
    async function walkDoorDeck(
      user: ReturnType<typeof userEvent.setup>,
      { price }: { price?: string } = {}
    ) {
      await user.click(screen.getByRole('button', DOOR));
      await user.click(screen.getByRole('button', { name: 'Continue' })); // photo
      await user.type(screen.getByLabelText('Item name'), 'Door Item');
      await user.click(screen.getByRole('button', { name: 'Continue' })); // title
      if (price) await user.type(screen.getByLabelText('Price'), price);
      await user.click(screen.getByRole('button', { name: 'Continue' })); // price
    }

    it('DoorClick_OpensDeckDirectly-NoIntroNoFetch', async () => {
      renderCreate();
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', DOOR));
      expect(screen.getByText('Pick some art')).toBeInTheDocument();
      expect(
        screen.queryByText("Here's what we pulled.")
      ).not.toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('DoorAfterFailedFetch_ShedsStaleUrl-NoIntroNoSourceLink', async () => {
      // A failed fetch leaves pastedUrl set; the door must shed it so the
      // linkless deck never shows the intro card or a source-page link.
      fetchMock.mockResolvedValue(jsonOk({ ok: false, error: 'timeout' }));
      renderCreate();
      const user = await fetchUrl();
      await user.click(
        await screen.findByRole('button', { name: 'Try a different link' })
      );
      await user.click(screen.getByRole('button', DOOR));
      expect(screen.getByText('Pick some art')).toBeInTheDocument();
      expect(
        screen.queryByText("Here's what we pulled.")
      ).not.toBeInTheDocument();
      // Walk to the price card and verify no source-page link renders.
      await user.click(screen.getByRole('button', { name: 'Continue' })); // photo
      await user.type(screen.getByLabelText('Item name'), 'Door Item');
      await user.click(screen.getByRole('button', { name: 'Continue' })); // title
      expect(screen.getByText('What does it cost?')).toBeInTheDocument();
      expect(
        screen.queryByRole('link', { name: /open the product page/ })
      ).not.toBeInTheDocument();
    });

    it('DoorDeck_HasNoStoreStepAndEmptyTitleBlocks', async () => {
      renderCreate();
      const user = userEvent.setup();
      await user.click(screen.getByRole('button', DOOR));
      await user.click(screen.getByRole('button', { name: 'Continue' })); // photo
      expect(screen.getByText('Give it a clear name')).toBeInTheDocument();
      // Nothing pre-marked: the blank title blocks the continue.
      expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    });

    it('DoorSaveWithPrice_CreatesPricedStoreShape', async () => {
      const { createItem } = await import('@/lib/data/item.actions');
      renderCreate();
      const user = userEvent.setup();
      await walkDoorDeck(user, { price: '1200' });
      expect(screen.getByText('Last look')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Create item' }));
      await waitFor(() => expect(createItem).toHaveBeenCalledOnce());
      expect(vi.mocked(createItem).mock.calls[0][0]).toMatchObject({
        name: 'Door Item',
        store: { name: '', link: '', price: '12.00' },
      });
    });

    it('DoorSaveWithoutPrice_CreatesBareStoreShape', async () => {
      const { createItem } = await import('@/lib/data/item.actions');
      renderCreate();
      const user = userEvent.setup();
      await walkDoorDeck(user);
      await user.click(screen.getByRole('button', { name: 'Create item' }));
      await waitFor(() => expect(createItem).toHaveBeenCalledOnce());
      expect(vi.mocked(createItem).mock.calls[0][0]).toMatchObject({
        name: 'Door Item',
        store: { name: '', link: '', price: '' },
      });
    });

    it('DoorPreviewAndTriage_HideStoreAffordances', async () => {
      renderCreate();
      const user = userEvent.setup();
      await walkDoorDeck(user);
      expect(
        screen.queryByRole('button', { name: /^Store/ })
      ).not.toBeInTheDocument();
      await user.click(
        screen.getByRole('button', { name: /Need to change something/ })
      );
      expect(screen.getByText('Review anything')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Store/ })
      ).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Price/ })).toBeInTheDocument();
    });
  });

  describe('Manual', () => {
    // Drives the manual item to the advance point: name, price, and store
    // become good, photo stays warn but gets visited. The store link is
    // pre-seeded from the failed fetch's pasted URL.
    async function fillManualItem(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole('button', { name: /Item name/ }));
      await user.type(screen.getByLabelText('Item name'), 'Nav Item');
      await user.click(screen.getByRole('button', { name: 'Done' }));

      await user.click(screen.getByRole('button', { name: /^Price/ }));
      // PriceField is cents-based: "1200" → $12.00.
      await user.type(screen.getByLabelText('Price'), '1200');
      await user.click(screen.getByRole('button', { name: 'Done' }));

      await user.click(screen.getByRole('button', { name: /Photo/ }));
      await user.click(screen.getByRole('button', { name: 'Done' }));

      await user.click(screen.getByRole('button', { name: /Store/ }));
      await user.type(screen.getByLabelText('Store name'), 'Nav Store');
      await user.click(screen.getByRole('button', { name: 'Done' }));
    }

    it('FailureManual_OpensFillManuallyShellNotPreview', async () => {
      renderCreate();
      await openManualViaFailure();
      expect(
        screen.getByRole('heading', { name: 'Add the details' })
      ).toBeInTheDocument();
      expect(screen.getByText('Add an item')).toBeInTheDocument();
      expect(screen.queryByText('Last look')).not.toBeInTheDocument();
    });

    it('ClickUseALinkInstead_ReturnsToUrlEntry', async () => {
      renderCreate();
      const user = await openManualViaFailure();
      await user.click(
        screen.getByRole('button', { name: /Use a link instead/ })
      );
      expect(screen.getByText(/Paste a product link/)).toBeInTheDocument();
    });

    it('UnvisitedWarnRow_HoldsTheShell', async () => {
      renderCreate();
      const user = await openManualViaFailure();
      // Name, price, and store become good; the photo warn row stays unvisited.
      await user.click(screen.getByRole('button', { name: /Item name/ }));
      await user.type(screen.getByLabelText('Item name'), 'Held Item');
      await user.click(screen.getByRole('button', { name: 'Done' }));
      await user.click(screen.getByRole('button', { name: /^Price/ }));
      await user.type(screen.getByLabelText('Price'), '1200');
      await user.click(screen.getByRole('button', { name: 'Done' }));
      await user.click(screen.getByRole('button', { name: /Store/ }));
      await user.type(screen.getByLabelText('Store name'), 'Held Store');
      await user.click(screen.getByRole('button', { name: 'Done' }));

      expect(
        screen.getByRole('heading', { name: 'Add the details' })
      ).toBeInTheDocument();
      expect(screen.queryByText('Last look')).not.toBeInTheDocument();
    });

    it('ErrorRow_HoldsShellEvenWithEveryWarnVisited', async () => {
      renderCreate();
      const user = await openManualViaFailure();
      // Visit the photo warn row but leave name, price, and store at error tier.
      await user.click(screen.getByRole('button', { name: /Photo/ }));
      await user.click(screen.getByRole('button', { name: 'Done' }));

      expect(
        screen.getByRole('heading', { name: 'Add the details' })
      ).toBeInTheDocument();
      expect(screen.queryByText('Last look')).not.toBeInTheDocument();
    });

    it('VisitedWarnRow_StillRendersItsWarnIssue', async () => {
      renderCreate();
      const user = await openManualViaFailure();
      await user.click(screen.getByRole('button', { name: /Photo/ }));
      await user.click(screen.getByRole('button', { name: 'Done' }));
      expect(
        screen.getByRole('button', { name: /Photo/ })
      ).toHaveTextContent('No photo yet — add one.');
    });

    it('NoErrorAndEveryWarnVisited_AdvancesToPreview', async () => {
      renderCreate();
      const user = await openManualViaFailure();
      await fillManualItem(user);
      expect(screen.getByText('Last look')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Create item' })
      ).toBeInTheDocument();
    });

    it('WithLists_ListsSheetRendersOptions', async () => {
      render(
        <ItemFormContainer
          lists={[{ id: 'l1', name: 'Birthday' } as never]}
          onClose={vi.fn()}
        />
      );
      const user = await openManualViaFailure();
      await fillManualItem(user);
      await user.click(screen.getByRole('button', { name: /Lists & quantity/ }));
      expect(
        screen.getByRole('checkbox', { name: 'Birthday' })
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Done' }));
      expect(screen.getByText('Last look')).toBeInTheDocument();
    });

    it('FullNavigation_FillsAdvancesVisitsTriageThenCreates', async () => {
      const { createItem } = await import('@/lib/data/item.actions');
      renderCreate();
      const user = await openManualViaFailure();
      await fillManualItem(user);

      // Preview → Triage → back: the Review shell never auto-advances.
      await user.click(
        screen.getByRole('button', { name: /Need to change something/ })
      );
      expect(screen.getByText('Review anything')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /Photo/ }));
      await user.click(screen.getByRole('button', { name: 'Done' }));
      expect(screen.getByText('Review anything')).toBeInTheDocument();
      await user.click(
        screen.getByRole('button', { name: /Back to preview/ })
      );

      // Preview → Store editor → rename the store → Done.
      await user.click(screen.getByRole('button', { name: /^Store/ }));
      const storeName = screen.getByLabelText('Store name');
      await user.clear(storeName);
      await user.type(storeName, 'Renamed Store');
      await user.click(screen.getByRole('button', { name: 'Done' }));

      // Preview → Add a note focus → Done.
      await user.click(screen.getByRole('button', { name: /Add a note/ }));
      await user.type(screen.getByLabelText('Description'), 'A nav note');
      await user.click(screen.getByRole('button', { name: 'Done' }));

      // Create flows through the action.
      await user.click(screen.getByRole('button', { name: 'Create item' }));
      await waitFor(() => expect(createItem).toHaveBeenCalledOnce());
    });

    it('ManualStoreRow_OpensGroupedStoreEditor', async () => {
      renderCreate();
      const user = await openManualViaFailure();
      await user.click(screen.getByRole('button', { name: /Store/ }));
      expect(screen.getByLabelText('Store name')).toBeInTheDocument();
      expect(screen.getByLabelText('Link')).toBeInTheDocument();
      // Price belongs to its own row; no add/remove-store affordances exist.
      expect(screen.queryByLabelText('Price')).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Add another store' })
      ).not.toBeInTheDocument();
    });

    it('TriageStoreRow_OpensGroupedStoreEditor', async () => {
      renderCreate();
      const user = await openManualViaFailure();
      await fillManualItem(user);
      await user.click(
        screen.getByRole('button', { name: /Need to change something/ })
      );
      await user.click(screen.getByRole('button', { name: /^Store/ }));
      expect(screen.getByLabelText('Store name')).toBeInTheDocument();
    });
  });

  describe('DraftGuard', () => {
    const DIALOG_TITLE = 'You have a draft in progress';

    async function typeName(
      user: ReturnType<typeof userEvent.setup>,
      name: string
    ) {
      await user.click(screen.getByRole('button', { name: /Item name/ }));
      await user.type(screen.getByLabelText('Item name'), name);
      await user.click(screen.getByRole('button', { name: 'Done' }));
    }

    async function backToUrlEntry(user: ReturnType<typeof userEvent.setup>) {
      await user.click(
        screen.getByRole('button', { name: /Use a link instead/ })
      );
    }

    it('PristineDraft_ReentryOpensShellWithoutPrompt', async () => {
      renderCreate();
      const user = await openManualViaFailure();
      await backToUrlEntry(user);
      await reopenManualViaFailure(user);
      expect(screen.queryByText(DIALOG_TITLE)).not.toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Add the details' })
      ).toBeInTheDocument();
    });

    it('DirtyDraft_ReentryPromptsInsteadOfBlanking', async () => {
      renderCreate();
      const user = await openManualViaFailure();
      await typeName(user, 'Guarded Item');
      await backToUrlEntry(user);
      await reopenManualViaFailure(user);
      expect(screen.getByText(DIALOG_TITLE)).toBeInTheDocument();
    });

    it('KeepFilling_RestoresValuesAndVisitState', async () => {
      renderCreate();
      const user = await openManualViaFailure();
      // Visit the photo row, then dirty the draft with a name.
      await user.click(screen.getByRole('button', { name: /Photo/ }));
      await user.click(screen.getByRole('button', { name: 'Done' }));
      await typeName(user, 'Guarded Item');
      await backToUrlEntry(user);
      await reopenManualViaFailure(user);
      await user.click(screen.getByRole('button', { name: 'Keep filling' }));

      // Values intact.
      expect(
        screen.getByRole('button', { name: /Item name/ })
      ).toHaveTextContent('Guarded Item');
      // Visit state intact: completing price and store advances without
      // ever revisiting the photo row.
      await user.click(screen.getByRole('button', { name: /^Price/ }));
      await user.type(screen.getByLabelText('Price'), '1200');
      await user.click(screen.getByRole('button', { name: 'Done' }));
      await user.click(screen.getByRole('button', { name: /Store/ }));
      await user.type(screen.getByLabelText('Store name'), 'Kept Store');
      await user.click(screen.getByRole('button', { name: 'Done' }));
      expect(screen.getByText('Last look')).toBeInTheDocument();
    });

    it('StartOver_BlanksTheDraft', async () => {
      renderCreate();
      const user = await openManualViaFailure();
      await typeName(user, 'Guarded Item');
      await backToUrlEntry(user);
      await reopenManualViaFailure(user);
      await user.click(screen.getByRole('button', { name: 'Start over' }));
      const nameRow = screen.getByRole('button', { name: /Item name/ });
      expect(nameRow).toHaveTextContent('None');
      expect(nameRow).not.toHaveTextContent('Guarded Item');
    });

    it('KeepFillingAfterDifferentLinkFailure_DoesNotMergeNewUrl', async () => {
      renderCreate();
      const user = await openManualViaFailure('https://www.amazon.com/dp/A');
      await typeName(user, 'Guarded Item');
      await backToUrlEntry(user);
      await reopenManualViaFailure(user, 'https://www.amazon.com/dp/B');
      expect(screen.getByText(DIALOG_TITLE)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Keep filling' }));
      await user.click(screen.getByRole('button', { name: /Store/ }));
      expect(screen.getByLabelText('Link')).toHaveValue(
        'https://www.amazon.com/dp/A'
      );
    });

    it('StartOverAfterDifferentLinkFailure_BlanksAndSeedsNewUrl', async () => {
      renderCreate();
      const user = await openManualViaFailure('https://www.amazon.com/dp/A');
      await typeName(user, 'Guarded Item');
      await backToUrlEntry(user);
      await reopenManualViaFailure(user, 'https://www.amazon.com/dp/B');
      await user.click(screen.getByRole('button', { name: 'Start over' }));
      expect(
        screen.getByRole('button', { name: /Item name/ })
      ).toHaveTextContent('None');
      await user.click(screen.getByRole('button', { name: /Store/ }));
      expect(screen.getByLabelText('Link')).toHaveValue(
        'https://www.amazon.com/dp/B'
      );
    });

    it('SuccessfulFetchOverDirtyDraft_ReplacesSilently', async () => {
      renderCreate();
      const user = await openManualViaFailure();
      await typeName(user, 'Guarded Item');
      await backToUrlEntry(user);
      fetchMock.mockResolvedValue(jsonOk(PRODUCT_RESPONSE));
      await user.click(screen.getByRole('button', { name: 'Fetch Details' }));
      expect(
        await screen.findByText("Here's what we pulled.")
      ).toBeInTheDocument();
      expect(screen.queryByText(DIALOG_TITLE)).not.toBeInTheDocument();
    });

    it('FetchSeededValues_DoNotTriggerThePrompt', async () => {
      fetchMock.mockResolvedValue(jsonOk(PRODUCT_RESPONSE));
      renderCreate();
      const user = await fetchUrl();
      await screen.findByText("Here's what we pulled.");
      await user.click(screen.getByRole('button', { name: 'Change link' }));
      fetchMock.mockResolvedValue(jsonOk({ ok: false, error: 'timeout' }));
      await user.click(screen.getByRole('button', { name: 'Fetch Details' }));
      await user.click(await screen.findByRole('button', MANUAL_LINK));
      expect(screen.queryByText(DIALOG_TITLE)).not.toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Add the details' })
      ).toBeInTheDocument();
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
    it('ProductResolved_EntersDeckWithStoreAttribution', async () => {
      fetchMock.mockResolvedValue(jsonOk(PRODUCT_RESPONSE));
      renderCreate();
      await fetchUrl();
      expect(
        await screen.findByText(/Auto-filled from Amazon/)
      ).toBeInTheDocument();
      expect(screen.getByText("Here's what we pulled.")).toBeInTheDocument();
    });

    it('NoStoreName_DeckOmitsAttribution', async () => {
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
      // Acme Widget (good title, price, store, single image): steps = intro,
      // photo (always shown), note.
      await user.click(screen.getByRole('button', { name: "Let's go" }));
      await user.click(screen.getByRole('button', { name: 'Continue' })); // note
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

    it('ManualEntry_OpensFillManuallyWithUrlSeededInStoreLink', async () => {
      fetchMock.mockResolvedValue(jsonOk({ ok: false, error: 'timeout' }));
      renderCreate();
      const user = await fetchUrl();
      await screen.findByText('This is taking longer than expected');
      await user.click(screen.getByRole('button', MANUAL_LINK));
      expect(
        screen.getByRole('heading', { name: 'Add the details' })
      ).toBeInTheDocument();
      expect(screen.queryByText('Last look')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /Store/ }));
      expect(screen.getByLabelText('Link')).toHaveValue(
        'https://www.amazon.com/dp/B0TEST'
      );
    });
  });
});
