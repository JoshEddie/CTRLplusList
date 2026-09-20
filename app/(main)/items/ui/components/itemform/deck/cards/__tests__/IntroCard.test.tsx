import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeItem } from '../../__tests__/test-helpers';
import type { DeckStepState } from '../../neededSteps';
import { IntroCard } from '../IntroCard';

const ONE_LEFT: DeckStepState[] = [
  { step: 'photo', complete: true },
  { step: 'name', complete: true },
  { step: 'price', complete: true },
  { step: 'note', complete: false },
];

const TWO_LEFT: DeckStepState[] = [
  { step: 'name', complete: true },
  { step: 'price', complete: true },
  { step: 'photo', complete: false },
  { step: 'note', complete: false },
];

const NONE_LEFT: DeckStepState[] = [
  { step: 'photo', complete: true },
  { step: 'name', complete: true },
  { step: 'price', complete: true },
];

function setup(
  over = {},
  steps: DeckStepState[] = TWO_LEFT,
  storeName = 'example.com'
) {
  render(
    <IntroCard
      item={makeItem(over)}
      steps={steps}
      storeName={storeName}
      onBack={vi.fn()}
      onContinue={vi.fn()}
    />
  );
}

describe('IntroCard', () => {
  it('AllGreen_ConfirmsPhotosNamePriceStore', () => {
    setup();
    expect(screen.getByText(/1 option found/)).toBeInTheDocument();
    expect(screen.getByText('Cast Iron Skillet')).toBeInTheDocument();
    expect(screen.getByText('$29.99')).toBeInTheDocument();
    expect(screen.getByText('Lodge • link saved')).toBeInTheDocument();
  });

  it('MultiplePhotos_PluralizesPhotoCount', () => {
    setup({ photos: ['a', 'b'] });
    expect(screen.getByText(/2 options found/)).toBeInTheDocument();
  });

  it('FlaggedFields_OmitNameAndPriceFromConfirmed', () => {
    setup({
      name: 'x'.repeat(120),
      photos: [],
      store: { name: '', link: '', price: '' },
    });
    expect(screen.queryByText(/Name:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Price:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/option(s)? found/)).not.toBeInTheDocument();
  });

  it('ZeroPhotos_ShowsNoPhotosWarningRow', () => {
    setup({ photos: [] });
    expect(screen.getByText('No photos found — add one')).toBeInTheDocument();
  });

  it('NothingConfirmed_StillShowsWarnAndErrorRows', () => {
    // The warn/error summary must render even when nothing is confirmed.
    setup({
      name: 'x'.repeat(120),
      photos: [],
      store: { name: '', link: '', price: '' },
    });
    expect(screen.getByText('Name is too long')).toBeInTheDocument();
    expect(screen.getByText('Unable to find price')).toBeInTheDocument();
  });

  it('StoreName_AttributedInSubtitle', () => {
    setup();
    expect(
      screen.getByText(/Auto-filled from example\.com/)
    ).toBeInTheDocument();
  });

  it('NoStoreName_OmitsAttribution', () => {
    setup({}, ONE_LEFT, '');
    expect(screen.queryByText(/Auto-filled from/)).not.toBeInTheDocument();
  });

  it('OneIncompleteStep_UsesSingularStep', () => {
    setup({}, ONE_LEFT);
    expect(screen.getByText('1 quick step to go.')).toBeInTheDocument();
  });

  it('TwoIncompleteSteps_UsesPluralSteps', () => {
    setup({}, TWO_LEFT);
    expect(screen.getByText('2 quick steps to go.')).toBeInTheDocument();
  });

  it('NoIncompleteSteps_ShowsEverythingLooksGood', () => {
    setup({}, NONE_LEFT);
    expect(
      screen.getByText('Everything looks good — take a last look.')
    ).toBeInTheDocument();
  });

  it('Footer_HasChangeLinkAndLetsGoButNoTracker', () => {
    setup();
    expect(
      screen.getByRole('button', { name: /Change link/ })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Let's go" })).toBeInTheDocument();
    expect(
      screen.queryByRole('group', { name: 'Progress' })
    ).not.toBeInTheDocument();
  });
});
