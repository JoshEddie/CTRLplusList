import type { ReactNode } from 'react';
import { PhotoEditor } from '../editors/PhotoEditor';
import type { ItemActions } from '../useItemActions';
import type { ItemViewModel } from '../viewModel';
import { DeckCard } from './DeckCard';

interface PhotoCardProps {
  item: ItemViewModel;
  actions: ItemActions;
  onBack: () => void;
  onContinue: () => void;
  progress?: ReactNode;
}

export function PhotoCard({
  item,
  actions,
  onBack,
  onContinue,
  progress,
}: PhotoCardProps) {
  const zero = item.photos.length === 0;
  return (
    <DeckCard
      progress={progress}
      eyebrow="Step · The photo"
      title={zero ? 'Add a photo' : 'Pick the best photo'}
      subtitle={
        zero
          ? 'No image came through — add your own or skip it.'
          : "We grabbed some options for you. Pick your favorite or add your own."
      }
      onBack={onBack}
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
