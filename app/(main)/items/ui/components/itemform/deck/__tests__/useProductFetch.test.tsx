import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useProductFetch } from '../useProductFetch';

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

function setup() {
  const setViewModel = vi.fn();
  const setScreen = vi.fn();
  const { result } = renderHook(() => useProductFetch(setViewModel, setScreen));
  return { result, setViewModel, setScreen };
}

async function fail(
  result: ReturnType<typeof setup>['result'],
  url: string,
  times: number
) {
  for (let i = 0; i < times; i++) {
    await act(() => result.current.startFetch(url));
  }
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('useProductFetch', () => {
  it('SuccessfulFetch_SeedsViewModelAndEntersDeck', async () => {
    fetchMock.mockResolvedValue(jsonOk(PRODUCT_RESPONSE));
    const { result, setViewModel, setScreen } = setup();
    await act(() =>
      result.current.startFetch('https://www.amazon.com/dp/B0TEST')
    );

    expect(setScreen.mock.calls.map(([s]) => s)).toEqual([
      'fetching',
      'deck',
    ]);
    expect(setViewModel).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Acme Widget',
        photos: ['https://example.com/w.jpg'],
        store: expect.objectContaining({
          name: 'Amazon',
          link: 'https://www.amazon.com/dp/B0TEST',
          price: '24.50',
        }),
      })
    );
    expect(result.current.pastedUrl).toBe(
      'https://www.amazon.com/dp/B0TEST'
    );
  });

  it('Status429_BouncesToStartWithSlowDownError', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 })
    );
    const { result, setScreen } = setup();
    await act(() => result.current.startFetch('https://a.test/p'));

    expect(result.current.urlStepError).toBe(
      "You've hit the fetch limit — try again in about a minute."
    );
    expect(setScreen).toHaveBeenLastCalledWith('start');
    expect(setScreen).not.toHaveBeenCalledWith('failure');
  });

  it('RateLimitedBodyWithOkStatus_AlsoBouncesToStart', async () => {
    fetchMock.mockResolvedValue(jsonOk({ error: 'rate_limited' }));
    const { result, setScreen } = setup();
    await act(() => result.current.startFetch('https://a.test/p'));

    expect(result.current.urlStepError).toContain('fetch limit');
    expect(setScreen).toHaveBeenLastCalledWith('start');
  });

  it('TimeoutResult_RoutesFailureAsTimeoutKind', async () => {
    fetchMock.mockResolvedValue(jsonOk({ ok: false, error: 'timeout' }));
    const { result, setScreen } = setup();
    await act(() => result.current.startFetch('https://a.test/p'));

    expect(result.current.failureKind).toBe('timeout');
    expect(setScreen).toHaveBeenLastCalledWith('failure');
  });

  it('FetchFailedResult_RoutesFailureAsFailedKind', async () => {
    fetchMock.mockResolvedValue(jsonOk({ ok: false, error: 'fetch_failed' }));
    const { result, setScreen } = setup();
    await act(() => result.current.startFetch('https://a.test/p'));

    expect(result.current.failureKind).toBe('failed');
    expect(setScreen).toHaveBeenLastCalledWith('failure');
  });

  it('NetworkError_RoutesFailureAsFailedKindAndLogs', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const { result, setScreen } = setup();
    await act(() => result.current.startFetch('https://a.test/p'));

    expect(result.current.failureKind).toBe('failed');
    expect(setScreen).toHaveBeenLastCalledWith('failure');
    expect(consoleError).toHaveBeenCalled();
  });

  it('TwoSameLinkFailures_RetryStillOffered', async () => {
    fetchMock.mockResolvedValue(jsonOk({ ok: false, error: 'timeout' }));
    const { result } = setup();
    await fail(result, 'https://a.test/p', 2);
    expect(result.current.canRetrySame).toBe(true);
  });

  it('ThirdSameLinkFailure_WithdrawsRetry', async () => {
    fetchMock.mockResolvedValue(jsonOk({ ok: false, error: 'timeout' }));
    const { result } = setup();
    await fail(result, 'https://a.test/p', 3);
    expect(result.current.canRetrySame).toBe(false);
  });

  it('DifferentLinkAfterFailures_ResetsRetryAccounting', async () => {
    fetchMock.mockResolvedValue(jsonOk({ ok: false, error: 'fetch_failed' }));
    const { result } = setup();
    await fail(result, 'https://a.test/p', 3);
    await fail(result, 'https://b.test/p', 1);
    expect(result.current.canRetrySame).toBe(true);
  });

  it('SameLinkSuccess_SpendsEarlierFailures', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonOk({ ok: false, error: 'timeout' }))
      .mockResolvedValueOnce(jsonOk(PRODUCT_RESPONSE))
      .mockResolvedValue(jsonOk({ ok: false, error: 'timeout' }));
    const { result } = setup();
    await fail(result, 'https://a.test/p', 2);
    // Failure #1 was spent by the success; two fresh failures stay under cap.
    await fail(result, 'https://a.test/p', 2);
    expect(result.current.canRetrySame).toBe(true);
  });

  it('ReturnToUrlMidFetch_AbortsRequestAndReturnsToStartWithoutFailure', async () => {
    // A real aborted fetch rejects with AbortError; that rejection must be
    // swallowed silently, never routed to the failure screen or logged.
    let abortSignal: AbortSignal | undefined;
    fetchMock.mockImplementation(
      (_url, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          abortSignal = init.signal ?? undefined;
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          );
        })
    );
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const { result, setScreen } = setup();
    let startPromise: Promise<void> | undefined;
    act(() => {
      startPromise = result.current.startFetch('https://a.test/p');
    });
    act(() => result.current.returnToUrl());
    await act(() => startPromise);

    expect(abortSignal?.aborted).toBe(true);
    expect(setScreen).toHaveBeenLastCalledWith('start');
    expect(setScreen).not.toHaveBeenCalledWith('failure');
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('ReturnToUrlWithNoFetchInFlight_ReturnsToStart', () => {
    const { result, setScreen } = setup();
    act(() => result.current.returnToUrl());
    expect(setScreen).toHaveBeenCalledWith('start');
  });
});
