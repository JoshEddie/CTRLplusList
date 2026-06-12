'use client';

import { FormShell } from '@/app/ui/components/FormShell';
import type { ProductData } from '@/lib/product-fetch/types';
import { ItemStoreTable, ItemTable, ListTable } from '@/lib/types';
import { useRef, useState } from 'react';
import { FetchingStep } from './FetchingStep';
import ItemForm, { type ItemFormPrefill } from './ItemForm';
import { UrlEntryStep } from './UrlEntryStep';

type Phase = 'url' | 'fetching' | 'form';

type FetchOutcome =
  | { kind: 'success'; product: ProductData; fetchedAt: string }
  | { kind: 'failure' }
  | { kind: 'manual' };

function prefillFrom(
  outcome: FetchOutcome,
  pastedUrl: string
): ItemFormPrefill | undefined {
  if (outcome.kind === 'success') {
    const { product, fetchedAt } = outcome;
    // Description is deliberately NOT prefilled: extracted descriptions are
    // marketing copy at best and the wrong block entirely on some sites
    // (Amazon book pages yield Editorial Reviews) — see issue #157.
    return {
      name: product.title,
      image_url: product.imageUrl ?? '',
      stores: [
        {
          name: product.store,
          link: pastedUrl,
          price: product.price ?? '',
          price_fetched_at: product.price ? fetchedAt : null,
          canonical_url: product.canonicalUrl ?? null,
          currency: product.currency ?? null,
        },
      ],
    };
  }
  if (outcome.kind === 'failure' && pastedUrl) {
    return { stores: [{ name: '', link: pastedUrl, price: '' }] };
  }
  return undefined;
}

const ItemFormContainer = ({
  user_id,
  lists,
  item,
  onClose,
  onSuccess,
}: {
  user_id: string;
  lists: ListTable[];
  item?: ItemTable & { stores: ItemStoreTable[]; lists: ListTable[] };
  onClose: () => void;
  onSuccess?: () => void;
}) => {
  const isEditing = !!item;
  const [phase, setPhase] = useState<Phase>(isEditing ? 'form' : 'url');
  const [pastedUrl, setPastedUrl] = useState('');
  const [urlStepError, setUrlStepError] = useState('');
  const [outcome, setOutcome] = useState<FetchOutcome>({ kind: 'manual' });
  const abortRef = useRef<AbortController | null>(null);

  const abortFetch = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  const startFetch = async (url: string) => {
    setPastedUrl(url);
    setUrlStepError('');
    setPhase('fetching');
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
        setPhase('url');
        return;
      }
      if (result.ok) {
        setOutcome({
          kind: 'success',
          product: result.product,
          fetchedAt: new Date().toISOString(),
        });
      } else {
        setOutcome({ kind: 'failure' });
      }
      setPhase('form');
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error('Product fetch failed:', error);
      setOutcome({ kind: 'failure' });
      setPhase('form');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const returnToUrl = () => {
    abortFetch();
    setPhase('url');
  };

  if (phase === 'url') {
    return (
      <FormShell title="New Item" onClose={onClose}>
        <UrlEntryStep
          initialUrl={pastedUrl}
          initialError={urlStepError}
          onFetch={startFetch}
          onManual={() => {
            setOutcome({ kind: 'manual' });
            setPhase('form');
          }}
        />
      </FormShell>
    );
  }

  if (phase === 'fetching') {
    return (
      <FormShell title="New Item" onClose={onClose}>
        <FetchingStep
          url={pastedUrl}
          onChangeUrl={returnToUrl}
          onCancel={returnToUrl}
        />
      </FormShell>
    );
  }

  return (
    <ItemForm
      user_id={user_id}
      lists={lists}
      item={item}
      prefill={isEditing ? undefined : prefillFrom(outcome, pastedUrl)}
      fetchedBadge={
        !isEditing && outcome.kind === 'success'
          ? { store: outcome.product.store, url: pastedUrl, onChange: returnToUrl }
          : undefined
      }
      showFetchFailedNotice={!isEditing && outcome.kind === 'failure'}
      onUseLinkInstead={
        isEditing || outcome.kind === 'success' ? undefined : returnToUrl
      }
      onSuccess={onSuccess}
      onClose={onClose}
    />
  );
};

export default ItemFormContainer;
