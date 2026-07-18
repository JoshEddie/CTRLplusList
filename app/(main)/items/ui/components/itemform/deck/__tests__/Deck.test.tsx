import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Deck } from '../Deck';
import type { ItemViewModel } from '../viewModel';
import { makeItem } from './test-helpers';

vi.mock('@/lib/data/item.placeholder.actions', async () =>
  (await import('./test-helpers')).placeholderActionsMock()
);

function vm(over: Partial<ItemViewModel> = {}): ItemViewModel {
  return makeItem({
    photos: ['https://a', 'https://b'],
    stores: [{ name: 'shop', link: 'https://shop', price: '29.99' }],
    ...over,
  });
}

function Harness({
  initial,
  onComplete = vi.fn(),
  onExit = vi.fn(),
}: {
  initial: ItemViewModel;
  onComplete?: () => void;
  onExit?: () => void;
}) {
  const [item, setItem] = useState(initial);
  return (
    <Deck
      item={item}
      setItem={setItem}
      productUrl="https://shop/p"
      storeName="example.com"
      onExit={onExit}
      onComplete={onComplete}
    />
  );
}

describe('Deck', () => {
  it('Open_ShowsIntroWithStoreAttribution', () => {
    render(<Harness initial={vm()} />);
    expect(
      screen.getByText(/Auto-filled from example\.com/)
    ).toBeInTheDocument();
    expect(screen.getByText("Here's what we pulled.")).toBeInTheDocument();
  });

  it('Intro_ConfirmsGoodNameAndPrice', () => {
    render(<Harness initial={vm()} />);
    expect(screen.getByText('Cast Iron Skillet')).toBeInTheDocument();
    expect(screen.getByText('$29.99')).toBeInTheDocument();
  });

  it('Intro_HasNoGlobalSkipToPreview', () => {
    render(<Harness initial={vm()} />);
    expect(
      screen.queryByRole('button', { name: /straight to preview/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^skip/i })
    ).not.toBeInTheDocument();
  });

  it('CleanFetch_LetsGoAdvancesIntroPhotoNoteToComplete', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<Harness initial={vm()} onComplete={onComplete} />);
    await user.click(screen.getByRole('button', { name: "Let's go" }));
    expect(screen.getByText('Pick the best photo')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Add a note')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('FetchWithoutStoreName_StopsOnStoreCardUntilNamed', async () => {
    const user = userEvent.setup();
    render(
      <Harness
        initial={vm({
          photos: ['https://only'],
          stores: [{ name: '', link: 'https://shop', price: '29.99' }],
        })}
      />
    );
    await user.click(screen.getByRole('button', { name: "Let's go" })); // photo
    await user.click(screen.getByRole('button', { name: 'Continue' })); // store
    expect(screen.getByText("Where's it from?")).toBeInTheDocument();
    const cont = screen.getByRole('button', { name: 'Continue' });
    expect(cont).toBeDisabled();
    await user.type(screen.getByLabelText('Store name'), 'Shop');
    expect(cont).toBeEnabled();
    await user.click(cont);
    expect(screen.getByText('Add a note')).toBeInTheDocument();
  });

  it('SingleImage_StillShowsPhotoCardWithItPreSelected', async () => {
    // Placeholder art means every flow carries a real photo choice.
    const user = userEvent.setup();
    render(<Harness initial={vm({ photos: ['https://only'] })} />);
    await user.click(screen.getByRole('button', { name: "Let's go" }));
    expect(screen.getByText('Pick the best photo')).toBeInTheDocument();
    expect(screen.getByAltText('Selected product image')).toHaveAttribute(
      'src',
      'https://only'
    );
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Add a note')).toBeInTheDocument();
  });

  it('IntroBack_CallsOnExit', async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    render(<Harness initial={vm()} onExit={onExit} />);
    await user.click(screen.getByRole('button', { name: 'Change link' }));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('FieldCards_HaveNoStandaloneBackButton', async () => {
    const user = userEvent.setup();
    render(<Harness initial={vm()} />);
    await user.click(screen.getByRole('button', { name: "Let's go" }));
    expect(
      screen.queryByRole('button', { name: 'Back' })
    ).not.toBeInTheDocument();
  });

  it('TrackerDoneNode_NavigatesBackToCompletedStepWithDataIntact', async () => {
    const user = userEvent.setup();
    // Clean fetch: title and price enter done; deck opens on photo.
    render(<Harness initial={vm()} />);
    await user.click(screen.getByRole('button', { name: "Let's go" }));
    expect(screen.getByText('Pick the best photo')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Go back to The Name' })
    );
    expect(screen.getByText('Give it a clear name')).toBeInTheDocument();
    expect(screen.getByLabelText('Item name')).toHaveValue(
      'Cast Iron Skillet'
    );
  });

  it('ContinueFromViewedDoneStep_AdvancesWithoutMovingFrontier', async () => {
    const user = userEvent.setup();
    // Clean fetch: steps are title(done), price(done), photo, note.
    render(<Harness initial={vm()} />);
    await user.click(screen.getByRole('button', { name: "Let's go" })); // photo
    await user.click(
      screen.getByRole('button', { name: 'Go back to The Name' })
    );
    await user.click(screen.getByRole('button', { name: 'Continue' })); // price
    expect(screen.getByText('What does it cost?')).toBeInTheDocument();
    // Frontier stays on photo — still reachable ahead as a jump target.
    expect(
      screen.getByRole('button', { name: 'Go to The Photo' })
    ).toBeEnabled();
    // aria-current follows the on-screen step, not the frontier.
    expect(
      screen.getByRole('button', { name: 'Price step' })
    ).toHaveAttribute('aria-current', 'step');
  });

  it('ViewedDoneStep_FrontierNodeReturnsToWorkingStep', async () => {
    const user = userEvent.setup();
    render(<Harness initial={vm()} />);
    await user.click(screen.getByRole('button', { name: "Let's go" })); // photo
    await user.click(
      screen.getByRole('button', { name: 'Go back to The Name' })
    );
    await user.click(screen.getByRole('button', { name: 'Go to The Photo' }));
    expect(screen.getByText('Pick the best photo')).toBeInTheDocument();
  });

  it('BrokenDoneStep_BlocksEveryForwardPathPastIt', async () => {
    const user = userEvent.setup();
    // Good title done, price missing → deck opens on photo, price ahead.
    render(
      <Harness
        initial={vm({
          photos: ['https://only'],
          stores: [{ name: 'shop', link: 'https://shop', price: '' }],
        })}
      />
    );
    await user.click(screen.getByRole('button', { name: "Let's go" })); // photo
    await user.click(
      screen.getByRole('button', { name: 'Go back to The Name' })
    );
    const nameField = screen.getByLabelText('Item name');
    await user.clear(nameField);
    await user.type(nameField, 'x'.repeat(101));
    // The now-broken name seizes the current ring and disables Continue...
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    // ...and every forward node past the broken step locks, the previously
    // reachable photo frontier included.
    expect(screen.getByRole('button', { name: 'Photo step' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Price step' })).toBeDisabled();
  });

  it('FixedWorkingStep_FlipsGreenAndUnlocksTheNextStep', async () => {
    const user = userEvent.setup();
    // Good title, price missing → deck opens on photo; price is next.
    render(
      <Harness
        initial={vm({
          photos: ['https://only'],
          stores: [{ name: 'shop', link: 'https://shop', price: '' }],
        })}
      />
    );
    await user.click(screen.getByRole('button', { name: "Let's go" })); // photo
    await user.click(screen.getByRole('button', { name: 'Continue' })); // price
    expect(screen.getByText('What does it cost?')).toBeInTheDocument();
    // Note is locked while price is unfilled.
    expect(screen.getByRole('button', { name: 'Note step' })).toBeDisabled();
    await user.type(screen.getByLabelText('Price'), '19.99');
    // Price flips green (done) in place and no longer bars the way forward.
    expect(screen.getByRole('button', { name: 'Price step' })).toHaveAttribute(
      'data-status',
      'done'
    );
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Add a note')).toBeInTheDocument();
  });

  it('GatedTitleStep_LocksForwardTrackerNodes', async () => {
    const user = userEvent.setup();
    // Error title: steps are price(done), photo, title — title is gated last.
    render(
      <Harness
        initial={vm({
          name: 'x'.repeat(120),
        })}
      />
    );
    await user.click(screen.getByRole('button', { name: "Let's go" })); // photo
    await user.click(screen.getByRole('button', { name: 'Continue' })); // title
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    // Backward stays open while the gated step locks nothing behind it.
    expect(
      screen.getByRole('button', { name: 'Go back to The Photo' })
    ).toBeInTheDocument();
  });

  describe('WarnTitle', () => {
    const warn = vm({ name: 'x'.repeat(60) });

    it('TitleCard_ShowsInlineNoteAndNoStandaloneNoteCard', async () => {
      const user = userEvent.setup();
      const onComplete = vi.fn();
      render(<Harness initial={warn} onComplete={onComplete} />);
      await user.click(screen.getByRole('button', { name: "Let's go" })); // photo
      await user.click(screen.getByRole('button', { name: 'Continue' })); // title
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      // "Keep it anyway" is the last step's forward → no standalone note card.
      await user.click(screen.getByRole('button', { name: 'Keep it anyway' }));
      expect(onComplete).toHaveBeenCalledOnce();
      expect(screen.queryByText('Add a note')).not.toBeInTheDocument();
    });
  });

  describe('ErrorTitle', () => {
    it('TitleCard_DisablesContinue', async () => {
      const user = userEvent.setup();
      render(<Harness initial={vm({ name: 'x'.repeat(120) })} />);
      await user.click(screen.getByRole('button', { name: "Let's go" })); // photo
      await user.click(screen.getByRole('button', { name: 'Continue' })); // title
      expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    });
  });

  describe('MissingPrice', () => {
    it('PriceCard_HasNoSkip-DisablesContinueUntilPriceEntered', async () => {
      const user = userEvent.setup();
      render(
        <Harness
          initial={vm({
            stores: [{ name: 's', link: 'https://s', price: '' }],
          })}
        />
      );
      // steps: intro, photo, price, note
      await user.click(screen.getByRole('button', { name: "Let's go" })); // photo
      await user.click(screen.getByRole('button', { name: 'Continue' })); // price
      expect(screen.getByText('What does it cost?')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
      expect(
        screen.queryByRole('button', { name: /skip/i })
      ).not.toBeInTheDocument();
      await user.type(screen.getByLabelText('Price'), '12.50');
      expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
    });
  });
});
