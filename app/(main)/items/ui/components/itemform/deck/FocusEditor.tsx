'use client';

import { Button } from '@/app/ui/components/button';
import { NoteEditor } from './editors/NoteEditor';
import { PhotoEditor } from './editors/PhotoEditor';
import { PriceEditor } from './editors/PriceEditor';
import { TitleEditor } from './editors/TitleEditor';
import type { ItemActions } from './useItemActions';
import { DESCRIPTION_MAX, priceTier, titleTier } from './utils';
import type { ItemViewModel } from './viewModel';

export type FocusField = 'photo' | 'title' | 'price' | 'note';

const TITLES: Record<FocusField, string> = {
  photo: 'Photo',
  title: 'Name',
  price: 'Price',
  note: 'Note',
};

interface FocusEditorProps {
  field: FocusField;
  item: ItemViewModel;
  actions: ItemActions;
  productUrl: string;
  onDone: () => void;
}

// A single field, edited in place, reusing the same editor components as the
// deck. "Done" is gated by the same tier helpers, so an error-tier value can't
// be committed back to Preview (6.2).
export function FocusEditor({
  field,
  item,
  actions,
  productUrl,
  onDone,
}: FocusEditorProps) {
  const store = item.stores[0];
  let body: React.ReactNode;
  let blocked = false;

  if (field === 'photo') {
    body = (
      <PhotoEditor
        photos={item.photos}
        photoIndex={item.photoIndex}
        onSelect={actions.selectPhoto}
        onAddPhoto={actions.addPhoto}
      />
    );
  } else if (field === 'title') {
    blocked = titleTier(item.name).tier === 'error';
    body = (
      <TitleEditor
        name={item.name}
        description={item.description}
        onNameChange={actions.setName}
        onDescriptionChange={actions.setDescription}
      />
    );
  } else if (field === 'price') {
    blocked = priceTier(store?.price).tier !== 'good';
    body = (
      <PriceEditor
        price={store?.price ?? ''}
        onChange={(value) => actions.setStore(0, 'price', value)}
        productUrl={productUrl || store?.link}
      />
    );
  } else {
    blocked = item.description.length > DESCRIPTION_MAX;
    body = (
      <NoteEditor description={item.description} onChange={actions.setDescription} />
    );
  }

  return (
    <div className="deck-focus">
      <h2 className="deck-focus-title">{TITLES[field]}</h2>
      <div className="deck-focus-body">{body}</div>
      <Button variant="primary" onClick={onDone} disabled={blocked}>
        Done
      </Button>
    </div>
  );
}
