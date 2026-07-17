import { DESCRIPTION_MAX, priceTier, storeTier, titleTier } from './utils';
import type { ItemViewModel } from './viewModel';

export type DeckStep = 'photo' | 'title' | 'price' | 'store' | 'note';

export interface DeckStepState {
  step: DeckStep;
  complete: boolean;
}

// Live per-step validity, recomputed as the user edits so the tracker can flip
// a step green the instant it is satisfied. Membership/order is still frozen at
// entry (see neededSteps) — only status tracks the current item.
export function isStepComplete(step: DeckStep, item: ItemViewModel): boolean {
  switch (step) {
    case 'photo':
      // A single image is auto-selected; zero or several needs a human pick.
      return item.photos.length === 1;
    case 'title':
      return titleTier(item.name).tier === 'good';
    case 'price':
      return priceTier(item.stores[0]?.price).tier === 'good';
    case 'store':
      return storeTier(item.stores[0]).tier === 'good';
    case 'note':
      // Descriptions are never fetched, so the note always needs a human look.
      return false;
  }
}

// The colour predicate: a step reads green when it is in a valid state. Mirrors
// isStepComplete except an optional note is valid whenever it is within the
// length limit — an empty note is fine, so it goes green the moment it becomes
// reachable rather than staying flagged. (isStepComplete keeps note incomplete
// so it stays the last, landing step; only the colour differs.)
export function isStepValid(step: DeckStep, item: ItemViewModel): boolean {
  if (step === 'note') return !stepBlocked('note', item);
  return isStepComplete(step, item);
}

// The full applicable step set with per-step entry status — auto-satisfied
// steps render as done rather than being omitted. Computed once at deck entry,
// never recomputed as the user edits, so fixing a field doesn't reshape the
// deck under them. Completed steps order first; the deck opens at the first
// incomplete one.
export function neededSteps(item: ItemViewModel): DeckStepState[] {
  const titleGood = titleTier(item.name).tier === 'good';

  const steps: DeckStepState[] = [
    { step: 'photo', complete: isStepComplete('photo', item) },
    { step: 'title', complete: titleGood },
    { step: 'price', complete: isStepComplete('price', item) },
    { step: 'store', complete: isStepComplete('store', item) },
  ];
  // A flagged title surfaces the note inline, so the standalone note step
  // only appears when the title is clean — never both.
  if (titleGood) steps.push({ step: 'note', complete: isStepComplete('note', item) });

  return [
    ...steps.filter((s) => s.complete),
    ...steps.filter((s) => !s.complete),
  ];
}

// The single forward gate, consumed by both the card's continue affordance
// and the tracker's forward lock so the two can't drift.
export function stepBlocked(step: DeckStep, item: ItemViewModel): boolean {
  switch (step) {
    case 'title':
      return titleTier(item.name).tier === 'error';
    case 'price':
      return priceTier(item.stores[0]?.price).tier !== 'good';
    case 'store':
      return storeTier(item.stores[0]).tier !== 'good';
    case 'note':
      return item.description.length > DESCRIPTION_MAX;
    default:
      return false;
  }
}
