import type { ReactNode } from 'react';
import { PhotoEditor } from '../editors/PhotoEditor';
import type { ItemActions } from '../useItemActions';
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
  const zero = item.photos.length === 0;
  return (
    <DeckCard
      tracker={tracker}
      title={zero ? 'Add a photo' : 'Pick the best photo'}
      subtitle={
        zero
          ? 'No image came through — add your own or skip it.'
          : "We grabbed some options for you. Pick your favorite or add your own."
      }
      onContinue={onContinue}
    >
      <PhotoEditor
        photos={item.photos}
        photoIndex={item.photoIndex}
        onSelect={actions.selectPhoto}
        onAddPhoto={actions.addPhoto}
      />
    </DeckCard>
  );
}
