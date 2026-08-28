/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * The two things this file has to reach are decorative by construction and so
 * unreachable by role: the axis-value span carries no role and its text is also
 * a tile label (so `getByText` matches both), and the generated art renders as
 * `<img alt="">` inside an `aria-hidden` disc. The AT-observable surface —
 * radio roles, accessible names, checked state — is still queried by role.
 */
/**
 * Pins `altvatar`'s option-control SHALLs: an enum axis is chosen by looking at
 * the face each value produces, a colour axis by its named swatch, and each
 * axis names the value currently held.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AltvatarControls from '../AltvatarControls';
import type { AxisOffer } from '@/lib/altvatar/resolve';

// The art itself is pinned over `renderAltvatar`; here it only has to be
// distinguishable per tile, and deterministic enough to assert on.
vi.mock('@/lib/altvatar/render', () => ({
  renderAltvatar: (styleId: string, options: { selections: object }) =>
    Promise.resolve(`data:${styleId}:${JSON.stringify(options.selections)}`),
}));

const eyesOffer: AxisOffer = {
  axis: 'eyes',
  kind: 'enum',
  values: [
    { value: 'wink', label: 'Wink' },
    { value: 'happy', label: 'Happy' },
  ],
  fallback: 'wink',
};

const skinOffer: AxisOffer = {
  axis: 'skinColor',
  kind: 'color',
  palette: [
    { value: 'edb98a', label: 'Peach' },
    { value: 'ffdbb4', label: 'Ivory' },
  ],
};

const onChange = vi.fn();

// The value the axis currently holds is announced beside its title, which is
// the one place the name appears without also being a tile label.
const heldValueName = (container: HTMLElement) =>
  container.querySelector('.altvatar-axis-value')?.textContent;

function renderControls(
  offers: AxisOffer[],
  selections: Record<string, string> = { eyes: 'wink', skinColor: 'edb98a' }
) {
  return render(
    <AltvatarControls
      styleId="avataaars"
      options={{ seed: 's', selections }}
      offers={offers}
      accent="lagoon"
      onChange={onChange}
    />
  );
}

beforeEach(() => {
  onChange.mockClear();
});

describe('EnumAxis', () => {
  it('Rendered_LabelsTheAxis-NamesTheHeldValue', async () => {
    const { container } = renderControls([eyesOffer]);
    expect(
      await screen.findByRole('heading', { name: 'Eyes' })
    ).toBeInTheDocument();
    expect(heldValueName(container)).toBe('Wink');
  });

  it('Rendered_MarksOnlyTheHeldValueChecked', async () => {
    renderControls([eyesOffer]);
    const tiles = await screen.findAllByRole('radio');
    expect(tiles.map((t) => t.getAttribute('aria-checked'))).toEqual([
      'true',
      'false',
    ]);
  });

  it('Rendered_DrawsEachValueAsTheFaceItProduces', async () => {
    renderControls([eyesOffer]);
    await waitFor(() => {
      const art = screen
        .getAllByRole('radio')
        .map((t) => t.querySelector('img')?.getAttribute('src'));
      expect(art).toEqual([
        'data:avataaars:{"eyes":"wink","skinColor":"edb98a"}',
        'data:avataaars:{"eyes":"happy","skinColor":"edb98a"}',
      ]);
    });
  });

  it('ClickUnheldTile_ReportsThatAxisAndValue', async () => {
    renderControls([eyesOffer]);
    await userEvent.click(await screen.findByRole('radio', { name: /happy/i }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith('eyes', 'happy');
  });

  it('AxisHoldingAValueTheOfferDoesNotCarry_NamesNothing-ChecksNoTile', async () => {
    const { container } = renderControls([eyesOffer], { eyes: 'dizzy' });
    await screen.findByRole('heading', { name: 'Eyes' });
    expect(heldValueName(container)).toBe('');
    expect(
      screen.getAllByRole('radio').map((t) => t.getAttribute('aria-checked'))
    ).toEqual(['false', 'false']);
  });
});

describe('ColorAxis', () => {
  it('Rendered_LabelsTheAxis-NamesTheHeldSwatch', async () => {
    const { container } = renderControls([skinOffer]);
    expect(
      await screen.findByRole('heading', { name: 'Skin' })
    ).toBeInTheDocument();
    expect(heldValueName(container)).toBe('Peach');
  });

  it('Rendered_MarksOnlyTheHeldSwatchChecked', async () => {
    renderControls([skinOffer]);
    const chips = await screen.findAllByRole('radio');
    expect(chips.map((c) => c.getAttribute('aria-checked'))).toEqual([
      'true',
      'false',
    ]);
  });

  it('ClickUnheldSwatch_ReportsThatAxisAndValue', async () => {
    renderControls([skinOffer]);
    await userEvent.click(await screen.findByRole('radio', { name: /ivory/i }));
    expect(onChange).toHaveBeenCalledExactlyOnceWith('skinColor', 'ffdbb4');
  });

  it('Rendered_DrawsNoArtTilesForAColourAxis', async () => {
    const { container } = renderControls([skinOffer]);
    await screen.findByRole('heading', { name: 'Skin' });
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });
});

describe('NoOffers', () => {
  it('EmptyOfferList_RendersNoRadioGroup', () => {
    renderControls([]);
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });
});
