'use client';

import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { IntroCard } from './cards/IntroCard';
import { NoteCard } from './cards/NoteCard';
import { PhotoCard } from './cards/PhotoCard';
import { PriceCard } from './cards/PriceCard';
import { StoreCard } from './cards/StoreCard';
import { TitleCard } from './cards/TitleCard';
import {
  isStepComplete,
  isStepValid,
  neededSteps,
  stepBlocked,
  type DeckStepState,
} from './neededSteps';
import { StepTracker } from './StepTracker';
import { useItemActions } from './useItemActions';
import type { ItemViewModel } from './viewModel';

interface DeckProps {
  item: ItemViewModel;
  setItem: Dispatch<SetStateAction<ItemViewModel>>;
  productUrl: string;
  storeName: string;
  /** "Change link" from the intro card. */
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
  // The step set (membership + order) is frozen at entry so editing a field
  // never adds/removes/reorders steps; per-step status is recomputed live below.
  const [steps] = useState<DeckStepState[]>(() => neededSteps(item));
  const firstIncomplete = Math.max(
    steps.findIndex((s) => !s.complete),
    0
  );
  const [showIntro, setShowIntro] = useState(true);
  // `frontier` is the furthest the user has advanced — it keeps steps they
  // skipped past (an un-picked photo, a warn title) reachable behind them.
  const [frontier, setFrontier] = useState(firstIncomplete);
  const [viewed, setViewed] = useState(firstIncomplete);
  const actions = useItemActions(setItem);

  const next = () => {
    if (viewed >= steps.length - 1) {
      onComplete();
      return;
    }
    const target = viewed + 1;
    setViewed(target);
    if (target > frontier) setFrontier(target);
  };

  if (showIntro) {
    return (
      <IntroCard
        item={item}
        steps={steps}
        storeName={storeName}
        onBack={onExit}
        onContinue={() => setShowIntro(false)}
      />
    );
  }

  const step = steps[viewed].step;
  // Status is live: a step reads green the instant it is valid. Reach extends to
  // the working step (first incomplete) — so fixing it unlocks the next — while
  // the frontier keeps steps the user skipped past reachable behind them, and no
  // reach ever lands past a hard-invalid (blocked) step.
  const valid = steps.map((s) => isStepValid(s.step, item));
  const capOf = (i: number) => (i === -1 ? steps.length : i);
  const workingStep = capOf(
    steps.findIndex((s) => !isStepComplete(s.step, item))
  );
  const firstBlocked = capOf(steps.findIndex((s) => stepBlocked(s.step, item)));
  const reachableCap = Math.min(Math.max(frontier, workingStep), firstBlocked);
  const tracker = (
    <StepTracker
      steps={steps}
      viewed={viewed}
      valid={valid}
      reachableCap={reachableCap}
      onJump={setViewed}
    />
  );
  const shared = { item, actions, onContinue: next, tracker };

  return (
    <>
      {step === 'photo' && <PhotoCard {...shared} />}
      {step === 'title' && <TitleCard {...shared} />}
      {step === 'price' && <PriceCard {...shared} productUrl={productUrl} />}
      {step === 'store' && <StoreCard {...shared} />}
      {step === 'note' && <NoteCard {...shared} />}
    </>
  );
}
