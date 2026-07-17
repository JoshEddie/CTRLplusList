'use client';

import { Button } from '@/app/ui/components/button';
import type { ItemStoreTable, ItemTable, ListTable } from '@/lib/types';
import { useMemo, useState } from 'react';
import DeleteItemButton from '../DeleteItemButton';
import { Deck } from './deck/Deck';
import './deck/deck.css';
import { DeckScreen, DeckShell } from './deck/DeckShell';
import { FocusEditor } from './deck/FocusEditor';
import type { FocusField } from './deck/focus';
import { Preview } from './deck/Preview';
import { ListsQtySheet } from './deck/sheets/ListsQtySheet';
import { StoresSheet } from './deck/sheets/StoresSheet';
import { FetchFailure } from './deck/FetchFailure';
import { FillManually } from './deck/FillManually';
import { Triage } from './deck/Triage';
import { useItemActions } from './deck/useItemActions';
import { useItemSubmit } from './deck/useItemSubmit';
import { useProductFetch } from './deck/useProductFetch';
import ConfirmDialog from '@/app/ui/components/ConfirmDialog';
import {
  isDirtyDraft,
  manualAdvanceReady,
  rowTiers,
  type RowField,
} from './deck/utils';
import {
  blankItem,
  seedFromItem,
  type ItemViewModel,
} from './deck/viewModel';
import { FetchingStep } from './FetchingStep';
import { UrlEntryStep } from './UrlEntryStep';
import type { Screen, Sheet } from './utils';

type EditItem = ItemTable & {
  stores: ItemStoreTable[];
  lists: ListTable[];
  image_candidates?: string[];
};

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
  const [manualVisited, setManualVisited] = useState<ReadonlySet<RowField>>(
    () => new Set()
  );
  const [draftPrompt, setDraftPrompt] = useState<'entry' | 'failure' | null>(
    null
  );
  // Distinguishes a manual-authored draft from fetch-seeded values: only the
  // former is user-entered work the discard prompt guards.
  const [manualDraftLive, setManualDraftLive] = useState(false);

  const {
    pastedUrl,
    urlStepError,
    failureKind,
    canRetrySame,
    startFetch,
    returnToUrl,
  } = useProductFetch((vm) => {
    setManualDraftLive(false);
    setViewModel(vm);
  }, setScreen);
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

  const buildByHand = () => {
    setViewModel(blankItem(pastedUrl));
    setManualVisited(new Set());
    setManualDraftLive(true);
    setScreen('manual');
  };

  // The entry card's manual path deliberately drops an unfetched pasted URL —
  // a link the user abandoned without fetching is never seeded into the item.
  const startBlankManual = () => {
    setViewModel(blankItem());
    setManualVisited(new Set());
    setManualDraftLive(true);
    setScreen('manual');
  };

  // Leaving the manual shell never discards; the wipe is these re-seed
  // handlers. A dirty draft therefore prompts here — the actual discard
  // moment — never on the back action.
  const requestManual = (path: 'entry' | 'failure') => {
    if (manualDraftLive && isDirtyDraft(viewModel)) {
      setDraftPrompt(path);
      return;
    }
    (path === 'entry' ? startBlankManual : buildByHand)();
  };

  const keepDraft = () => {
    setDraftPrompt(null);
    setScreen('manual');
  };

  const startOver = () => {
    (draftPrompt === 'failure' ? buildByHand : startBlankManual)();
  };

  // A row counts as visited once its overlay has opened and closed; evaluating
  // here (overlay close), not on each view-model write, keeps the advance from
  // firing mid-edit.
  const visitManualRow = (field: RowField) => {
    const visited = new Set(manualVisited).add(field);
    setManualVisited(visited);
    if (manualAdvanceReady(rowTiers(viewModel), visited)) {
      setScreen('preview');
    }
  };

  const closeFocus = () => {
    const field = focus;
    setFocus(null);
    if (screen === 'manual' && field) visitManualRow(field);
  };

  const openStores = () => setSheet('stores');

  const closeSheet = () => {
    const wasStores = sheet === 'stores';
    setSheet(null);
    if (screen === 'manual' && wasStores) visitManualRow('store');
  };

  const body = () => {
    if (focus) {
      return (
        <FocusEditor
          field={focus}
          item={viewModel}
          actions={actions}
          productUrl={pastedUrl}
          onDone={closeFocus}
        />
      );
    }
    if (sheet) {
      return (
        <DeckScreen
          title={sheet === 'stores' ? 'Store links' : 'Lists & quantity'}
          foot={
            <Button variant="primary" onClick={closeSheet} width="full">
              Done
            </Button>
          }
        >
          {sheet === 'stores' ? (
            <StoresSheet item={viewModel} actions={actions} />
          ) : (
            <ListsQtySheet
              item={viewModel}
              actions={actions}
              listOptions={listOptions}
            />
          )}
        </DeckScreen>
      );
    }
    switch (screen) {
      case 'start':
        return (
          <UrlEntryStep
            initialUrl={pastedUrl}
            initialError={urlStepError}
            onFetch={startFetch}
            onManual={() => requestManual('entry')}
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
            onOpenStores={openStores}
          />
        );
      case 'manual':
        return (
          <FillManually
            item={viewModel}
            onBack={returnToUrl}
            onFocus={setFocus}
            onOpenStores={openStores}
          />
        );
      case 'failure':
        return (
          <FetchFailure
            kind={failureKind}
            canRetrySame={canRetrySame}
            onRetrySame={() => startFetch(pastedUrl)}
            onTryDifferent={returnToUrl}
            onManual={() => requestManual('failure')}
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
            onOpenStores={openStores}
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
    <DeckShell
      // The preview hub lays the card beside the action rows on a wide shell;
      // the rest of the flow is single-column at the default width. Keyed on the
      // screen (not the overlay) so opening a sheet/focus over preview doesn't
      // resize the modal.
      variant={screen === 'preview' ? 'wide' : 'default'}
      moduleTitle={isEditing ? 'Edit item' : 'Add an item'}
      closeHref={onClose ? undefined : (returnTo ?? '/items')}
      onClose={onClose}
    >
      {body()}
      <ConfirmDialog
        isOpen={draftPrompt !== null}
        onClose={keepDraft}
        onConfirm={startOver}
        title="You have a draft in progress"
        message="Keep filling it in, or start over?"
        confirmText="Start over"
        cancelText="Keep filling"
      />
    </DeckShell>
  );
};

export default ItemFormContainer;
