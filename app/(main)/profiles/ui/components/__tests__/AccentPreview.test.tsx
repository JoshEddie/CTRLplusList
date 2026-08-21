/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * The preview is an `aria-hidden` decoration mirroring the card's head, so no
 * node in it carries a role or accessible name a query could reach.
 */
/**
 * Pins `profiles-surface` — "A stored accent is the one shown" as the creator
 * sees it applied before submitting.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ACCENT_NAMES, ACCENT_PRESETS } from '@/lib/accent';
import AccentPreview from '../AccentPreview';

const ACCENT = ACCENT_NAMES[0];

describe('AccentPreview', () => {
  it('SelectedAccent_CarriesItsBandAndDiscStopsAsThePreviewsVariables', () => {
    const { container } = render(
      <AccentPreview name="Ada Lovelace" tagline="" accent={ACCENT} />
    );
    const style =
      container
        .querySelector('.profile-accent-preview')
        ?.getAttribute('style') ?? '';
    const { light, dark, ink } = ACCENT_PRESETS[ACCENT];

    expect(style).toContain(
      `--accent-bg: linear-gradient(120deg, ${light}, ${dark})`
    );
    expect(style).toContain(`--accent-disc: ${light}`);
    expect(style).toContain(`--accent-ink: ${ink}`);
  });

  it('TypedName_RendersItsInitialsAndName', () => {
    const { container } = render(
      <AccentPreview name="  Ada Lovelace  " tagline="" accent={ACCENT} />
    );
    expect(container.querySelector('.profile-card-avatar')).toHaveTextContent(
      'AL'
    );
    expect(container.querySelector('.profile-card-name')).toHaveTextContent(
      'Ada Lovelace'
    );
  });

  it('EmptyName_FallsBackToYourProfileWithNoInitials', () => {
    const { container } = render(
      <AccentPreview name="   " tagline="" accent={ACCENT} />
    );
    expect(container.querySelector('.profile-card-name')).toHaveTextContent(
      'Your profile'
    );
    expect(container.querySelector('.profile-card-avatar')).toHaveTextContent(
      ''
    );
  });

  it('TypedTagline_RendersIt-BlankTaglineRendersNoNode', () => {
    const { container: withTagline } = render(
      <AccentPreview
        name="Ada"
        tagline=" Runs the household "
        accent={ACCENT}
      />
    );
    expect(
      withTagline.querySelector('.profile-card-tagline')
    ).toHaveTextContent('Runs the household');

    const { container: blank } = render(
      <AccentPreview name="Ada" tagline="   " accent={ACCENT} />
    );
    expect(blank.querySelector('.profile-card-tagline')).toBeNull();
  });
});
