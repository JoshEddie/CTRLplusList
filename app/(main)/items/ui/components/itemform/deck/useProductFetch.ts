'use client';

import type { ProductData } from '@/lib/product-fetch/types';
import { useRef, useState } from 'react';
import type { Screen } from '../utils';
import type { FailureKind } from './FetchFailure';
import { prunePhotos } from './utils';
import { seedFromFetch, type ItemViewModel } from './viewModel';

// Same-link "Try again" is allowed for the first two failures, then withdrawn
// (D10) — each retry is a real fetch, and the cap keeps a frustrated user from
// grinding into the route's rate limit.
const RETRY_CAP = 2;

// Owns the product-fetch machine: the pasted URL, the abortable request, the
// rate-limit bounce, and the failure kind + same-link retry accounting. The
// container only routes on the screens this sets.
export function useProductFetch(
  setViewModel: (vm: ItemViewModel) => void,
  setScreen: (screen: Screen) => void
) {
  const [pastedUrl, setPastedUrl] = useState('');
  const [urlStepError, setUrlStepError] = useState('');
  const [failureKind, setFailureKind] = useState<FailureKind>('failed');
  const [failCount, setFailCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // The linkless door must shed any prior fetch state — a stale pastedUrl
  // would resurrect the intro card and a source-page link on a linkless item.
  const clearUrl = () => {
    setPastedUrl('');
    setUrlStepError('');
  };

  const returnToUrl = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setScreen('start');
  };

  const failFetch = (kind: FailureKind, priorFails: number) => {
    setFailureKind(kind);
    setFailCount(priorFails + 1);
    setScreen('failure');
  };

  const startFetch = async (url: string) => {
    const priorFails = url === pastedUrl ? failCount : 0;
    if (url !== pastedUrl) setFailCount(0);
    setPastedUrl(url);
    setUrlStepError('');
    setScreen('fetching');
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch('/api/product-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
      const result = await response.json();
      // Rate limiting is retry-in-a-minute, not a reason to hand-type the
      // item — stay on the URL step with the link intact.
      if (response.status === 429 || result.error === 'rate_limited') {
        setUrlStepError(
          "You've hit the fetch limit — try again in about a minute."
        );
        setScreen('start');
        return;
      }
      if (result.ok) {
        const seeded = seedFromFetch(
          result.product as ProductData,
          url,
          new Date().toISOString()
        );
        // Prune undersized images BEFORE building the deck so the photo count,
        // the step decision, and the selector all agree on the usable set.
        const photos = await prunePhotos(seeded.photos);
        if (controller.signal.aborted) return;
        setViewModel({ ...seeded, photos, photoIndex: 0 });
        setFailCount(0);
        setScreen('deck');
      } else {
        failFetch(result.error === 'timeout' ? 'timeout' : 'failed', priorFails);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error('Product fetch failed:', error);
      failFetch('failed', priorFails);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  return {
    pastedUrl,
    urlStepError,
    failureKind,
    canRetrySame: failCount <= RETRY_CAP,
    clearUrl,
    startFetch,
    returnToUrl,
  };
}
