'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { IntroCard } from './cards/IntroCard';
import { NoteCard } from './cards/NoteCard';
import { PhotoCard } from './cards/PhotoCard';
import { PriceCard } from './cards/PriceCard';
import { TitleCard } from './cards/TitleCard';
import { neededSteps, type DeckStep } from './neededSteps';
import { ProgressDots } from './ProgressDots';
import { useItemActions } from './useItemActions';
import type { ItemViewModel } from './viewModel';

interface DeckProps {
  item: ItemViewModel;
  setItem: Dispatch<SetStateAction<ItemViewModel>>;
  productUrl: string;
  storeName: string;
  /** Back from the first card (intro). */
  onExit: () => void;
  /** Forward from the last card → Preview. */
  onComplete: () => void;
}

export function Deck({
  item,
  setItem,
  productUrl,
  storeName,
  onExit,
  onComplete,
}: DeckProps) {
  // Computed once at entry so editing a field never reshapes the deck (D3).
  const [steps] = useState<DeckStep[]>(() => neededSteps(item));
  const [index, setIndex] = useState(0);
  const actions = useItemActions(setItem);

  const back = () => (index === 0 ? onExit() : setIndex((i) => i - 1));
  const next = () =>
    index >= steps.length - 1 ? onComplete() : setIndex((i) => i + 1);

  const progress = <ProgressDots count={steps.length} current={index} />;
  const shared = { item, actions, onBack: back, onContinue: next, progress };
  const step = steps[index];

  return (
    <div className="deck deck-body">
      {step === 'intro' && (
        <IntroCard
          item={item}
          steps={steps}
          storeName={storeName}
          onBack={back}
          onContinue={next}
          progress={progress}
        />
      )}
      {step === 'photo' && <PhotoCard {...shared} />}
      {step === 'title' && <TitleCard {...shared} />}
      {step === 'price' && <PriceCard {...shared} productUrl={productUrl} />}
      {step === 'note' && <NoteCard {...shared} />}
    </div>
  );
}
