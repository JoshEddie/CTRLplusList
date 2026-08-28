/**
 * Pins `altvatar`'s customizer SHALLs: it holds a draft and writes nothing,
 * confirming hands that draft back and cancelling returns the host's prior
 * values, a style change resolves the selections it carries, and only tabs the
 * selected style has something to put in are offered.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ACCENT_NAMES } from '@/lib/accent';
import AltvatarCustomizer, { type AltvatarDraft } from '../AltvatarCustomizer';

// The art is pinned over `renderAltvatar`; the customizer only has to be
// exercised, and a real render of every tile is minutes of jsdom work.
vi.mock('@/lib/altvatar/render', () => ({
  renderAltvatar: (styleId: string) => Promise.resolve(`data:${styleId}`),
}));

const isClientState = vi.hoisted(() => ({ value: true }));
vi.mock('@/app/ui/hooks/useIsClient', () => ({
  useIsClient: () => isClientState.value,
}));

const onConfirm = vi.fn();
const onCancel = vi.fn();

function makeDraft(overrides: Partial<AltvatarDraft> = {}): AltvatarDraft {
  return {
    style: 'avataaars',
    options: { seed: 'kiddo', selections: { hair: 'bob', eyes: 'wink' } },
    accent: ACCENT_NAMES[0],
    ...overrides,
  };
}

const renderCustomizer = (draft: AltvatarDraft = makeDraft()) =>
  render(
    <AltvatarCustomizer
      value={draft}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );

const tabs = () => screen.getByRole('tablist', { name: /option groups/i });
const tabNames = () =>
  within(tabs())
    .getAllByRole('tab')
    .map((t) => t.textContent);
const openTab = (name: string) =>
  userEvent.click(within(tabs()).getByRole('tab', { name }));

beforeEach(() => {
  isClientState.value = true;
  onConfirm.mockClear();
  onCancel.mockClear();
});

describe('Basics', () => {
  it('Opened_ShowsTheStylePickerAndAccentPickerOnly', () => {
    renderCustomizer();
    expect(
      screen.getByRole('radiogroup', { name: /avatar style/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Accent')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Eyes' })).toBeNull();
  });

  it('Opened_MarksTheDraftsOwnStyleChecked', () => {
    renderCustomizer();
    const picker = screen.getByRole('radiogroup', { name: /avatar style/i });
    expect(
      within(picker)
        .getAllByRole('radio')
        .filter((r) => r.getAttribute('aria-checked') === 'true')
        .map((r) => r.textContent)
    ).toEqual(['Avataaars']);
  });

  it('ChangeAccent_UpdatesTheDraftWithoutConfirming', async () => {
    renderCustomizer();
    await userEvent.click(screen.getByRole('radio', { name: ACCENT_NAMES[2] }));
    expect(screen.getByRole('radio', { name: ACCENT_NAMES[2] })).toBeChecked();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('StyleChange', () => {
  it('SelectIcons_OffersOnlyBasicsAndIcon', async () => {
    renderCustomizer();
    await userEvent.click(screen.getByRole('radio', { name: 'Icons' }));
    expect(tabNames()).toEqual(['Basics', 'Icon']);
  });

  it('SelectToonHead_DropsTheExtrasTabItHasNothingToPutIn', async () => {
    renderCustomizer();
    expect(tabNames()).toContain('Extras');
    await userEvent.click(screen.getByRole('radio', { name: 'Toon Head' }));
    expect(tabNames()).not.toContain('Extras');
  });

  it('SelectStyleThenConfirm_HandsBackTheResolvedSelections', async () => {
    renderCustomizer();
    await userEvent.click(screen.getByRole('radio', { name: 'Icons' }));
    await userEvent.click(
      screen.getByRole('button', { name: /use this altvatar/i })
    );
    // `bob` is an avataaars hair icons has no row for, so it is left alone;
    // the axis icons does have resolves to its default rather than staying
    // unset behind a control that shows one.
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        style: 'icons',
        options: {
          seed: 'kiddo',
          selections: { hair: 'bob', eyes: 'wink', glyph: 'star' },
        },
      })
    );
  });
});

describe('OptionPanel', () => {
  it('OpenFace_ShowsThatTabsAxesAndNotAnotherTabs', async () => {
    renderCustomizer();
    await openTab('Face');
    expect(screen.getByRole('heading', { name: 'Eyes' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Hair' })).toBeNull();
  });

  it('ChooseATileThenConfirm_HandsBackThatAxisChanged', async () => {
    renderCustomizer();
    await openTab('Face');
    const eyes = screen.getByRole('radiogroup', { name: 'Eyes' });
    await userEvent.click(within(eyes).getByRole('radio', { name: /^Happy/ }));
    await userEvent.click(
      screen.getByRole('button', { name: /use this altvatar/i })
    );
    expect(onConfirm).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        options: expect.objectContaining({
          selections: expect.objectContaining({ eyes: 'happy' }),
        }),
      })
    );
  });
});

describe('Shuffle', () => {
  it('ClickSurpriseMe_RerollsTheStyleEverySelectionAndTheAccent', async () => {
    // Pinned so the roll is a fact rather than a coin flip: the last option of
    // every pool, the last rollable style, and the last accent.
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    renderCustomizer(makeDraft({ accent: ACCENT_NAMES[0] }));

    await userEvent.click(screen.getByRole('button', { name: /surprise me/i }));
    await userEvent.click(
      screen.getByRole('button', { name: /use this altvatar/i })
    );

    const draft = onConfirm.mock.calls[0][0] as AltvatarDraft;
    expect(draft.accent).toBe(ACCENT_NAMES[ACCENT_NAMES.length - 1]);
    expect(draft.options.seed).not.toBe('kiddo');
    expect(draft.style).not.toBe('avataaars');
    expect(draft.options.selections.hair).not.toBe('bob');
  });

  it('ClickSurpriseMeFromAnotherTab_ReturnsToBasics', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);
    renderCustomizer();
    await openTab('Outfit');

    await userEvent.click(screen.getByRole('button', { name: /surprise me/i }));

    // A tab renders only where the selected style has axes in it, so a roll
    // leaving the viewer on the previous style's tab could show an empty
    // panel. Basics is the one tab every style has.
    expect(within(tabs()).getByRole('tab', { selected: true })).toHaveTextContent(
      'Basics'
    );
  });
});

describe('Dismissal', () => {
  it('ClickCancel_ReportsCancel-ConfirmsNothing', async () => {
    renderCustomizer();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('ClickCloseInTheHeader_ReportsCancel-ConfirmsNothing', async () => {
    renderCustomizer();
    await userEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('EditedThenCancelled_ConfirmsNoDraft', async () => {
    renderCustomizer();
    await userEvent.click(screen.getByRole('radio', { name: 'Icons' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('Shell', () => {
  it('Opened_IsADialogNamedForWhatItSettles', () => {
    renderCustomizer();
    expect(
      screen.getByRole('dialog', { name: 'Customise your Altvatar' })
    ).toBeInTheDocument();
  });

  it('Opened_CarriesTheBrandMarkNamedAltvatar', () => {
    renderCustomizer();
    expect(screen.getByRole('img', { name: 'Altvatar' })).toBeInTheDocument();
  });

  it('BeforeClientMount_RendersNothing', () => {
    isClientState.value = false;
    const { container } = renderCustomizer();
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
