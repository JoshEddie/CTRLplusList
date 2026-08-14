'use client';

import { Button } from '@/app/ui/components/button';
import { DeckScreen } from './DeckShell';
import { NoteEditor } from './editors/NoteEditor';
import { PhotoEditor } from './editors/PhotoEditor';
import { PriceEditor } from './editors/PriceEditor';
import { StoreEditor } from './editors/StoreEditor';
import { TitleEditor } from './editors/TitleEditor';
import { ROW_LABELS, type RowField } from './focus';
import type { ItemActions } from './useItemActions';
import { isLinkless } from './utils';
import { usePlaceholderPreviews } from './usePlaceholderPreviews';
import type { ItemViewModel } from './viewModel';

interface FocusEditorProps {
  field: RowField;
  item: ItemViewModel;
  actions: ItemActions;
  productUrl: string;
  onDone: () => void;
}

// Hook host: usePlaceholderPreviews must run unconditionally, so the photo
// body is its own component rather than a branch of FocusEditor.
function PhotoFocusBody({
  item,
  actions,
}: {
  item: ItemViewModel;
  actions: ItemActions;
}) {
  const { placeholders, reroll } = usePlaceholderPreviews(item, actions);
  return (
    <PhotoEditor
      photos={item.photos}
      photoIndex={item.photoIndex}
      placeholders={placeholders}
      selectedPlaceholder={item.placeholder}
      onSelect={actions.selectPhoto}
      onSelectPlaceholder={actions.selectPlaceholder}
      onReroll={reroll}
      onAddPhoto={actions.addPhoto}
    />
  );
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
  } else if (field === 'title') {
    body = (
      <TitleEditor
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
