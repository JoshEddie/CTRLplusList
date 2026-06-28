import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Deck } from '../Deck';
import type { ItemViewModel } from '../viewModel';
import { makeItem } from './test-helpers';

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
  it('Open_ShowsIntroWithAutoFilledEyebrow', () => {
    render(<Harness initial={vm()} />);
    expect(
      screen.getByText('Auto-filled from example.com')
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

  it('SingleImage_SkipsPhotoCard', async () => {
    const user = userEvent.setup();
    render(<Harness initial={vm({ photos: ['https://only'] })} />);
    await user.click(screen.getByRole('button', { name: "Let's go" }));
    expect(screen.queryByText('Pick the best photo')).not.toBeInTheDocument();
    expect(screen.getByText('Add a note')).toBeInTheDocument();
  });

  it('IntroBack_CallsOnExit', async () => {
    const user = userEvent.setup();
    const onExit = vi.fn();
    render(<Harness initial={vm()} onExit={onExit} />);
    await user.click(screen.getByRole('button', { name: 'Change link' }));
    expect(onExit).toHaveBeenCalledOnce();
  });

  it('CardBack_ReturnsToIntro', async () => {
    const user = userEvent.setup();
    render(<Harness initial={vm()} />);
    await user.click(screen.getByRole('button', { name: "Let's go" }));
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText("Here's what we pulled.")).toBeInTheDocument();
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
