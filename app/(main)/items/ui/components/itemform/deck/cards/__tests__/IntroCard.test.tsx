import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { makeItem } from '../../__tests__/test-helpers';
import type { DeckStep } from '../../neededSteps';
import { IntroCard } from '../IntroCard';

function setup(
  over = {},
  steps: DeckStep[] = ['intro', 'photo', 'note'],
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
      stores: [{ name: '', link: '', price: '' }],
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
      stores: [{ name: '', link: '', price: '' }],
    });
    expect(screen.getByText('Name is too long')).toBeInTheDocument();
    expect(screen.getByText('Unable to find price')).toBeInTheDocument();
  });

  it('NoStoreName_OmitsEyebrow', () => {
    setup({}, ['intro', 'note'], '');
    expect(screen.queryByText(/Auto-filled from/)).not.toBeInTheDocument();
  });

  it('OneRemainingStep_UsesSingularStep', () => {
    setup({}, ['intro', 'note']);
    expect(screen.getByText('1 quick step to go.')).toBeInTheDocument();
  });

  it('TwoRemainingSteps_UsesPluralSteps', () => {
    setup({}, ['intro', 'photo', 'note']);
    expect(screen.getByText('2 quick steps to go.')).toBeInTheDocument();
  });

  it('NoRemainingSteps_ShowsEverythingLooksGood', () => {
    setup({}, ['intro']);
    expect(
      screen.getByText('Everything looks good — take a last look.')
    ).toBeInTheDocument();
  });
});
