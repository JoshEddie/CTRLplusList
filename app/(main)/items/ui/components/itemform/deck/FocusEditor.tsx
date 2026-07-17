'use client';

import { Button } from '@/app/ui/components/button';
import { DeckScreen } from './DeckShell';
import { NoteEditor } from './editors/NoteEditor';
import { PhotoEditor } from './editors/PhotoEditor';
import { PriceEditor } from './editors/PriceEditor';
import { TitleEditor } from './editors/TitleEditor';
import { FOCUS_LABELS, type FocusField } from './focus';
import type { ItemActions } from './useItemActions';
import type { ItemViewModel } from './viewModel';

interface FocusEditorProps {
  field: FocusField;
  item: ItemViewModel;
  actions: ItemActions;
  productUrl: string;
  onDone: () => void;
}

// A single field, edited in place, reusing the same editor components as the
// deck. Edits write into the item as the user types, so "Done" only closes —
// error-tier values are caught downstream (the Fill-manually advance rule and
// Preview's Create/Save gate), never by trapping the user here.
export function FocusEditor({
  field,
  item,
  actions,
  productUrl,
  onDone,
}: FocusEditorProps) {
  const store = item.stores[0];
  let body: React.ReactNode;

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
    body = (
      <TitleEditor
        name={item.name}
        description={item.description}
        onNameChange={actions.setName}
        onDescriptionChange={actions.setDescription}
      />
    );
  } else if (field === 'price') {
    body = (
      <PriceEditor
        price={store?.price ?? ''}
        onChange={(value) => actions.setStore(0, 'price', value)}
        productUrl={productUrl || store?.link}
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
      title={FOCUS_LABELS[field]}
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
