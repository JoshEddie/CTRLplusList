'use client';

import { Button } from '@/app/ui/components/button';
import { FormShell } from '@/app/ui/components/FormShell';
import type { ProductData } from '@/lib/product-fetch/types';
import type { ItemStoreTable, ItemTable, ListTable } from '@/lib/types';
import { useMemo, useRef, useState } from 'react';
import DeleteItemButton from '../DeleteItemButton';
import { Deck } from './deck/Deck';
import './deck/deck.css';
import { FocusEditor } from './deck/FocusEditor';
import { FOCUS_LABELS, type FocusField } from './deck/focus';
import { Preview } from './deck/Preview';
import { ListsQtySheet } from './deck/sheets/ListsQtySheet';
import { StoresSheet } from './deck/sheets/StoresSheet';
import { FetchFailure, type FailureKind } from './deck/FetchFailure';
import { Triage } from './deck/Triage';
import { useItemActions } from './deck/useItemActions';
import { useItemSubmit } from './deck/useItemSubmit';
import { prunePhotos } from './deck/utils';
import {
  blankItem,
  seedFromFetch,
  seedFromItem,
  type ItemViewModel,
} from './deck/viewModel';
import { FetchingStep } from './FetchingStep';
import { UrlEntryStep } from './UrlEntryStep';

type Screen = 'start' | 'fetching' | 'deck' | 'preview' | 'triage' | 'failure';

// Same-link "Try again" is allowed for the first two failures, then withdrawn
// (D10) — each retry is a real fetch, and the cap keeps a frustrated user from
// grinding into the route's rate limit.
const RETRY_CAP = 2;
type Sheet = 'stores' | 'lists';

type EditItem = ItemTable & {
  stores: ItemStoreTable[];
  lists: ListTable[];
  image_candidates?: string[];
};

function shellTitle(
  screen: Screen,
  sheet: Sheet | null,
  focus: FocusField | null,
  isEditing: boolean
): string {
  if (focus) return FOCUS_LABELS[focus];
  if (sheet === 'stores') return 'Store links';
  if (sheet === 'lists') return 'Lists & quantity';
  if (screen === 'triage') return 'Review';
  if (screen === 'preview') return isEditing ? 'Edit item' : 'Add an item';
  return 'Add an item';
}

const ItemFormContainer = ({
  lists,
  item,
  returnTo,
  onClose,
  onSuccess,
}: {
  lists: ListTable[];
  item?: EditItem;
  returnTo?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}) => {
  const isEditing = !!item;
  const [viewModel, setViewModel] = useState<ItemViewModel>(() =>
    item ? seedFromItem(item) : blankItem()
  );
  const [screen, setScreen] = useState<Screen>(isEditing ? 'preview' : 'start');
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [focus, setFocus] = useState<FocusField | null>(null);
  const [pastedUrl, setPastedUrl] = useState('');
  const [urlStepError, setUrlStepError] = useState('');
  const [failureKind, setFailureKind] = useState<FailureKind>('failed');
  const [failCount, setFailCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const actions = useItemActions(setViewModel);
  const { submit, isPending } = useItemSubmit(
    viewModel,
    isEditing,
    returnTo,
    onSuccess
  );
  const listOptions = useMemo(
    () => lists.map((l) => ({ value: l.id.toString(), label: l.name })),
    [lists]
  );

  const abortFetch = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  const returnToUrl = () => {
    abortFetch();
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

  const buildByHand = () => {
    setViewModel(blankItem(pastedUrl));
    setScreen('preview');
  };

  const body = () => {
    if (focus) {
      return (
        <FocusEditor
          field={focus}
          item={viewModel}
          actions={actions}
          productUrl={pastedUrl}
          onDone={() => setFocus(null)}
        />
      );
    }
    if (sheet) {
      return (
        <div className="deck-sheet deck-body">
          <div className="deck-sheet-body">
            {sheet === 'stores' ? (
              <StoresSheet item={viewModel} actions={actions} />
            ) : (
              <ListsQtySheet
                item={viewModel}
                actions={actions}
                listOptions={listOptions}
              />
            )}
          </div>
          <Button variant="primary" onClick={() => setSheet(null)}>
            Done
          </Button>
        </div>
      );
    }
    switch (screen) {
      case 'start':
        return (
          <UrlEntryStep
            initialUrl={pastedUrl}
            initialError={urlStepError}
            onFetch={startFetch}
            onManual={() => {
              setViewModel(blankItem());
              setScreen('preview');
            }}
          />
        );
      case 'fetching':
        return (
          <FetchingStep
            url={pastedUrl}
            onChangeUrl={returnToUrl}
            onCancel={returnToUrl}
          />
        );
      case 'deck':
        return (
          <Deck
            item={viewModel}
            setItem={setViewModel}
            productUrl={pastedUrl}
            storeName={viewModel.stores[0]?.name ?? ''}
            onExit={returnToUrl}
            onComplete={() => setScreen('preview')}
          />
        );
      case 'triage':
        return (
          <Triage
            item={viewModel}
            onBack={() => setScreen('preview')}
            onFocus={setFocus}
            onOpenStores={() => setSheet('stores')}
          />
        );
      case 'failure':
        return (
          <FetchFailure
            kind={failureKind}
            canRetrySame={failCount <= RETRY_CAP}
            onRetrySame={() => startFetch(pastedUrl)}
            onTryDifferent={returnToUrl}
            onManual={buildByHand}
          />
        );
      case 'preview':
      default:
        return (
          <Preview
            item={viewModel}
            actions={actions}
            isEditing={isEditing}
            isPending={isPending}
            onSubmit={submit}
            onOpenTriage={() => setScreen('triage')}
            onOpenStores={() => setSheet('stores')}
            onOpenLists={() => setSheet('lists')}
            onAddNote={() => setFocus('note')}
            deleteSlot={
              item ? (
                <DeleteItemButton
                  id={item.id}
                  returnTo={returnTo}
                  onDeleted={onClose}
                  archived={item.archived_at != null}
                />
              ) : undefined
            }
          />
        );
    }
  };

  return (
    <FormShell
      // The preview hub lays the card beside the action rows on a wide shell;
      // the rest of the flow is single-column at the default width. Keyed on the
      // screen (not the overlay) so opening a sheet/focus over preview doesn't
      // resize the modal.
      variant={screen === 'preview' ? 'wide' : 'default'}
      title={shellTitle(screen, sheet, focus, isEditing)}
      closeHref={onClose ? undefined : (returnTo ?? '/items')}
      onClose={onClose}
    >
      {body()}
    </FormShell>
  );
};

export default ItemFormContainer;
