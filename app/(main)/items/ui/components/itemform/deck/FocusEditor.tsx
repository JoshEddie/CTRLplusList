'use client';

import { Button } from '@/app/ui/components/button';
import { DeckScreen } from './DeckShell';
import { NoteEditor } from './editors/NoteEditor';
import { PriceEditor } from './editors/PriceEditor';
import { StoreEditor } from './editors/StoreEditor';
import { NameEditor } from './editors/NameEditor';
import { ROW_LABELS, type RowField } from './focus';
import PhotoFocusBody from './PhotoFocusBody';
import type { ItemActions } from './useItemActions';
import { isLinkless } from './utils';
import type { ItemViewModel } from './viewModel';

interface FocusEditorProps {
  field: RowField;
  item: ItemViewModel;
  actions: ItemActions;
  productUrl: string;
  onDone: () => void;
}

// A single field, edited in place, reusing the same editor components as the
// deck (the grouped Store editor for the store row). Edits write into the item
// as the user types, so "Done" only closes — error-tier values are caught
// downstream (the Fill-manually advance rule and Preview's Create/Save gate),
// never by trapping the user here.
export function FocusEditor({
  field,
  item,
  actions,
  productUrl,
  onDone,
}: FocusEditorProps) {
  const store = item.store;
  let body: React.ReactNode;

  if (field === 'photo') {
    body = <PhotoFocusBody item={item} actions={actions} />;
  } else if (field === 'name') {
    body = (
      <NameEditor
        name={item.name}
        description={item.description}
        onNameChange={actions.setName}
        onDescriptionChange={actions.setDescription}
        linkless={isLinkless(item)}
      />
    );
  } else if (field === 'price') {
    body = (
      <PriceEditor
        price={store.price}
        onChange={(value) => actions.setStore('price', value)}
        productUrl={productUrl || store.link}
      />
    );
  } else if (field === 'store') {
    body = (
      <StoreEditor
        name={store.name}
        link={store.link}
        onNameChange={(value) => actions.setStore('name', value)}
        onLinkChange={(value) => actions.setStore('link', value)}
      />
    );
  } else {
    body = (
      <NoteEditor
        description={item.description}
        onChange={actions.setDescription}
      />
    );
  }

  return (
    <DeckScreen
      title={ROW_LABELS[field]}
      foot={
        <Button variant="primary" onClick={onDone} width="full">
          Done
        </Button>
      }
    >
      {body}
    </DeckScreen>
  );
}
