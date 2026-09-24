'use client';

import { PhotoEditor } from './editors/PhotoEditor';
import type { ItemActions } from './useItemActions';
import { usePlaceholderPreviews } from './usePlaceholderPreviews';
import { activeFraming, type ItemViewModel } from './viewModel';

// Hook host: usePlaceholderPreviews must run unconditionally, so the photo
// body is its own component rather than a branch of FocusEditor.
export default function PhotoFocusBody({
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
      framing={activeFraming(item)}
      onFramingChange={actions.setFraming}
    />
  );
}
