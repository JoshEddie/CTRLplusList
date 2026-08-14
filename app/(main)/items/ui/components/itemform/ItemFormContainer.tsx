'use client';

import { Button } from '@/app/ui/components/button';
import type { ItemStoreTable, ItemTable, ListTable } from '@/lib/types';
import { useMemo, useState } from 'react';
import DeleteItemButton from '../DeleteItemButton';
import { Deck } from './deck/Deck';
import './deck/deck.css';
import { DeckScreen, DeckShell } from './deck/DeckShell';
import { FocusEditor } from './deck/FocusEditor';
import type { RowField } from './deck/focus';
import { Preview } from './deck/Preview';
import { ListsQtySheet } from './deck/sheets/ListsQtySheet';
import { FetchFailure } from './deck/FetchFailure';
import { FillManually } from './deck/FillManually';
import { Triage } from './deck/Triage';
import { useItemActions } from './deck/useItemActions';
import { useItemSubmit } from './deck/useItemSubmit';
import { useProductFetch } from './deck/useProductFetch';
import ConfirmDialog from '@/app/ui/components/ConfirmDialog';
import { isDirtyDraft, manualAdvanceReady, rowTiers } from './deck/utils';
import {
  blankItem,
  seedFromItem,
  type ItemViewModel,
} from './deck/viewModel';
import { FetchingStep } from './FetchingStep';
import { UrlEntryStep } from './UrlEntryStep';
import type { Screen } from './utils';

type EditItem = ItemTable & {
  store: ItemStoreTable | null;
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
  const [listsSheetOpen, setListsSheetOpen] = useState(false);
  const [focus, setFocus] = useState<RowField | null>(null);
  const [manualVisited, setManualVisited] = useState<ReadonlySet<RowField>>(
    () => new Set()
  );
  const [draftPromptOpen, setDraftPromptOpen] = useState(false);
  // Distinguishes a manual-authored draft from fetch-seeded values: only the
  // former is user-entered work the discard prompt guards.
  const [manualDraftLive, setManualDraftLive] = useState(false);

  const {
    pastedUrl,
    urlStepError,
    failureKind,
    canRetrySame,
    clearUrl,
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

  const enterLinkless = () => {
    clearUrl();
    setViewModel(blankItem());
    setScreen('deck');
  };

  const buildByHand = () => {
    setViewModel(blankItem(pastedUrl));
    setManualVisited(new Set());
    setManualDraftLive(true);
    setScreen('manual');
  };

  // Leaving the manual shell never discards; the wipe is the re-seed in
  // buildByHand. A dirty draft therefore prompts here — the actual discard
  // moment — never on the back action.
  const requestManual = () => {
    if (manualDraftLive && isDirtyDraft(viewModel)) {
      setDraftPromptOpen(true);
      return;
    }
    buildByHand();
  };

  const keepDraft = () => {
    setDraftPromptOpen(false);
    setScreen('manual');
  };

  const startOver = () => {
    setDraftPromptOpen(false);
    buildByHand();
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
    if (listsSheetOpen) {
      return (
        <DeckScreen
          title="Lists & quantity"
          foot={
            <Button
              variant="primary"
              onClick={() => setListsSheetOpen(false)}
              width="full"
            >
              Done
            </Button>
          }
        >
          <ListsQtySheet
            item={viewModel}
            actions={actions}
            listOptions={listOptions}
          />
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
            onLinkless={enterLinkless}
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
            storeName={viewModel.store.name}
            showIntro={pastedUrl !== ''}
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
          />
        );
      case 'manual':
        return (
          <FillManually
            item={viewModel}
            onBack={returnToUrl}
            onFocus={setFocus}
          />
        );
      case 'failure':
        return (
          <FetchFailure
            kind={failureKind}
            canRetrySame={canRetrySame}
            onRetrySame={() => startFetch(pastedUrl)}
            onTryDifferent={returnToUrl}
            onManual={requestManual}
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
            onOpenStore={() => setFocus('store')}
            onOpenLists={() => setListsSheetOpen(true)}
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
        isOpen={draftPromptOpen}
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
