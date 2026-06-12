import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ItemFormContainer from '../ItemFormContainer';

const router = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

vi.mock('../ItemForm', () => ({
  default: (p: {
    user_id: string;
    item?: { id: string };
    prefill?: unknown;
    fetchedBadge?: { store: string; url: string; onChange: () => void };
    showFetchFailedNotice?: boolean;
    onUseLinkInstead?: () => void;
  }) => (
    <div
      data-testid="item-form"
      data-has-item={String(!!p.item)}
      data-prefill={JSON.stringify(p.prefill ?? null)}
      data-badge-store={p.fetchedBadge?.store ?? ''}
      data-badge-url={p.fetchedBadge?.url ?? ''}
      data-notice={String(!!p.showFetchFailedNotice)}
    >
      {p.onUseLinkInstead && (
        <button type="button" onClick={p.onUseLinkInstead}>
          ← Use a link instead
        </button>
      )}
      {p.fetchedBadge && (
        <button type="button" onClick={p.fetchedBadge.onChange}>
          badge-change
        </button>
      )}
    </div>
  ),
}));

const PRODUCT_RESPONSE = {
  ok: true,
  product: {
    title: 'Acme Widget',
    description: 'A fine widget',
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
  return render(
    <ItemFormContainer user_id="u1" lists={[] as never} onClose={vi.fn()} />
  );
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
  describe('PhaseEntry', () => {
    it('CreateMode_OpensUrlEntry-NoFormFields', () => {
      renderCreate();
      expect(
        screen.getByText('Paste a product link to auto-fill details')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Fetch Details' })
      ).toBeInTheDocument();
      expect(screen.queryByTestId('item-form')).not.toBeInTheDocument();
    });

    it('EditMode_OpensFormDirectly-NoUrlEntry-NoUseLinkAffordance', () => {
      render(
        <ItemFormContainer
          user_id="u1"
          lists={[] as never}
          item={{ id: 'i1', stores: [], lists: [] } as never}
          onClose={vi.fn()}
        />
      );
      expect(screen.getByTestId('item-form')).toHaveAttribute(
        'data-has-item',
        'true'
      );
      expect(
        screen.queryByText('Paste a product link to auto-fill details')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: '← Use a link instead' })
      ).not.toBeInTheDocument();
    });
  });

  describe('ManualToggle', () => {
    it('ClickManual_RendersFormWithUseLinkEscape-NoPrefill', async () => {
      const user = userEvent.setup();
      renderCreate();
      await user.click(
        screen.getByRole('button', { name: 'Fill in details manually →' })
      );
      const form = screen.getByTestId('item-form');
      expect(form).toHaveAttribute('data-prefill', 'null');
      expect(form).toHaveAttribute('data-notice', 'false');
      expect(
        screen.getByRole('button', { name: '← Use a link instead' })
      ).toBeInTheDocument();
    });

    it('ClickUseLinkInstead_ReturnsToUrlEntry', async () => {
      const user = userEvent.setup();
      renderCreate();
      await user.click(
        screen.getByRole('button', { name: 'Fill in details manually →' })
      );
      await user.click(
        screen.getByRole('button', { name: '← Use a link instead' })
      );
      expect(
        screen.getByText('Paste a product link to auto-fill details')
      ).toBeInTheDocument();
      expect(screen.queryByTestId('item-form')).not.toBeInTheDocument();
    });
  });

  describe('UrlValidation', () => {
    it('InvalidUrl_ShowsFieldError-NoRequest', async () => {
      const user = userEvent.setup();
      renderCreate();
      await user.type(screen.getByLabelText(/Product link/), 'not a url');
      await user.click(screen.getByRole('button', { name: 'Fetch Details' }));
      expect(
        screen.getByText('Please enter a valid product link (http or https)')
      ).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('Fetching', () => {
    it('FetchInFlight_ShowsSpinner-CyclingMsg-MomentLine-UrlStrip', async () => {
      fetchMock.mockReturnValue(new Promise(() => {}));
      renderCreate();
      await fetchUrl();
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Fetching item details…')).toBeInTheDocument();
      expect(screen.getByText('This may take a moment.')).toBeInTheDocument();
      expect(
        screen.getByText('https://www.amazon.com/dp/B0TEST')
      ).toBeInTheDocument();
    });

    it('ClickCancel_AbortsRequest-ReturnsToUrlEntryWithUrlRetained', async () => {
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

    it('ClickChange_AbortsRequest-ReturnsToUrlEntry', async () => {
      let abortSignal: AbortSignal | undefined;
      fetchMock.mockImplementation((_url, init: RequestInit) => {
        abortSignal = init.signal ?? undefined;
        return new Promise(() => {});
      });
      renderCreate();
      const user = await fetchUrl();
      await user.click(screen.getByRole('button', { name: 'change' }));
      expect(abortSignal?.aborted).toBe(true);
      expect(
        screen.getByText('Paste a product link to auto-fill details')
      ).toBeInTheDocument();
    });
  });

  describe('FetchSuccess', () => {
    it('ProductResolved_PrefillsFormAndBadge-StoreRowCarriesProvenance', async () => {
      fetchMock.mockResolvedValue(jsonOk(PRODUCT_RESPONSE));
      renderCreate();
      await fetchUrl();
      const form = await screen.findByTestId('item-form');
      const prefill = JSON.parse(form.getAttribute('data-prefill')!);
      expect(prefill.name).toBe('Acme Widget');
      // Fetched descriptions are never prefilled (wrong/noisy content — #157).
      expect(prefill.description).toBeUndefined();
      expect(prefill.image_url).toBe('https://example.com/w.jpg');
      expect(prefill.stores).toHaveLength(1);
      expect(prefill.stores[0]).toMatchObject({
        name: 'Amazon',
        link: 'https://www.amazon.com/dp/B0TEST',
        price: '24.50',
        canonical_url: 'https://example.com/widget',
        currency: 'USD',
      });
      expect(typeof prefill.stores[0].price_fetched_at).toBe('string');
      expect(form).toHaveAttribute('data-badge-store', 'Amazon');
      expect(form).toHaveAttribute(
        'data-badge-url',
        'https://www.amazon.com/dp/B0TEST'
      );
      expect(form).toHaveAttribute('data-notice', 'false');
      expect(
        screen.queryByRole('button', { name: '← Use a link instead' })
      ).not.toBeInTheDocument();
    });

    it('PricelessProduct_PrefillsWithoutPriceOrFetchedAt', async () => {
      fetchMock.mockResolvedValue(
        jsonOk({
          ok: true,
          product: { title: 'Acme Widget', store: 'Amazon' },
        })
      );
      renderCreate();
      await fetchUrl();
      const form = await screen.findByTestId('item-form');
      const prefill = JSON.parse(form.getAttribute('data-prefill')!);
      expect(prefill.stores[0].price).toBe('');
      expect(prefill.stores[0].price_fetched_at).toBeNull();
    });

    it('BadgeChange_ReturnsToUrlEntry', async () => {
      fetchMock.mockResolvedValue(jsonOk(PRODUCT_RESPONSE));
      renderCreate();
      const user = await fetchUrl();
      await screen.findByTestId('item-form');
      await user.click(screen.getByRole('button', { name: 'badge-change' }));
      expect(
        screen.getByText('Paste a product link to auto-fill details')
      ).toBeInTheDocument();
    });
  });

  describe('RateLimited', () => {
    it('Status429_StaysOnUrlEntryWithSlowDownError-UrlRetained-NoForm', async () => {
      fetchMock.mockResolvedValue(
        new Response(JSON.stringify({ error: 'rate_limited' }), {
          status: 429,
        })
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
      expect(screen.queryByTestId('item-form')).not.toBeInTheDocument();
    });
  });

  describe('FetchFailure', () => {
    it('TimeoutResult_RendersFormWithNotice-LinkPrefilled-UseLinkEscape', async () => {
      fetchMock.mockResolvedValue(jsonOk({ ok: false, error: 'timeout' }));
      renderCreate();
      await fetchUrl();
      const form = await screen.findByTestId('item-form');
      expect(form).toHaveAttribute('data-notice', 'true');
      const prefill = JSON.parse(form.getAttribute('data-prefill')!);
      expect(prefill.stores[0]).toEqual({
        name: '',
        link: 'https://www.amazon.com/dp/B0TEST',
        price: '',
      });
      expect(
        screen.getByRole('button', { name: '← Use a link instead' })
      ).toBeInTheDocument();
    });

    it('NetworkError_RendersFormWithNotice', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'));
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      renderCreate();
      await fetchUrl();
      const form = await screen.findByTestId('item-form');
      expect(form).toHaveAttribute('data-notice', 'true');
      await waitFor(() => expect(consoleError).toHaveBeenCalled());
    });
  });
});
