import type { ReactNode } from 'react';
import { PhotoEditor } from '../editors/PhotoEditor';
import type { ItemActions } from '../useItemActions';
import { usePlaceholderPreviews } from '../usePlaceholderPreviews';
import { isLinkless } from '../utils';
import type { ItemViewModel } from '../viewModel';
import { DeckCard } from './DeckCard';

interface PhotoCardProps {
  item: ItemViewModel;
  actions: ItemActions;
  onContinue: () => void;
  tracker?: ReactNode;
}

export function PhotoCard({
  item,
  actions,
  onContinue,
  tracker,
}: PhotoCardProps) {
  const { placeholders, reroll } = usePlaceholderPreviews(item, actions, true);
  const zero = item.photos.length === 0;
  return (
    <DeckCard
      tracker={tracker}
      title={zero ? 'Pick some art' : 'Pick the best photo'}
      subtitle={
        zero
          ? isLinkless(item)
            ? 'Pick some artwork for this one, or add your own image.'
            : 'No image came through — pick some artwork, add your own, or skip it.'
          : "We grabbed some options for you. Pick your favorite or add your own."
      }
      onContinue={onContinue}
    >
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
    </DeckCard>
  );
}
