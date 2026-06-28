import { priceTier, titleTier } from './utils';
import type { ItemViewModel } from './viewModel';

export type DeckStep = 'intro' | 'photo' | 'title' | 'price' | 'note';

// The smart filter (D3): surface only the steps that need a human, in order.
// Computed once at deck entry — never recomputed as the user edits, so fixing a
// field doesn't reshape the deck under them.
export function neededSteps(item: ItemViewModel): DeckStep[] {
  const titleGood = titleTier(item.name).tier === 'good';
  const priceGood = priceTier(item.stores[0]?.price).tier === 'good';

  const steps: DeckStep[] = ['intro'];

  // A photo is the one pick a fetch can't make: shown for a real choice (>1) or
  // a problem (0); bypassed for a single auto-selected image (D13).
  if (item.photos.length === 0 || item.photos.length > 1) steps.push('photo');
  if (!titleGood) steps.push('title');
  if (!priceGood) steps.push('price');
  // A flagged title surfaces the note inline (D5), so the standalone note card
  // only appears when the title is clean — never both.
  if (titleGood) steps.push('note');

  return steps;
}
