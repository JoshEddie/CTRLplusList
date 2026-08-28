/**
 * Pins `profiles-surface`'s single-disc SHALLs: the disc fills with the
 * profile's own Altvatar art, painting a glyph style through the accent's ink,
 * and falls back to initials — never to a generic user icon, and never to
 * anything the account carries.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ProfileAvatar from '../ProfileAvatar';
import { ACCENT_PRESETS } from '@/lib/accent';

const ART = 'data:image/svg+xml;utf8,%3Csvg%2F%3E';

const profile = (over: Partial<Parameters<typeof ProfileAvatar>[0]['profile']>) => ({
  name: 'Grace Hopper',
  accent: 'rose',
  art: null,
  avatarStyle: null,
  ...over,
});

describe('ProfileAvatar', () => {
  it('FigurativeStyleWithArt_PaintsTheArtItself', () => {
    render(
      <ProfileAvatar
        profile={profile({ art: ART, avatarStyle: 'avataaars' })}
      />
    );

    expect(screen.getByTestId('altvatar-art')).toHaveAttribute('src', ART);
    // The art speaks for the name beside it, so it announces nothing itself.
    expect(screen.getByTestId('altvatar-art')).toHaveAttribute('alt', '');
    expect(screen.queryByTestId('altvatar-glyph')).toBeNull();
    expect(screen.queryByText('GH')).toBeNull();
  });

  it('GlyphStyleWithArt_MasksTheAccentsInkThroughTheArt', () => {
    render(
      <ProfileAvatar
        profile={profile({ art: ART, avatarStyle: 'icons' })}
      />
    );

    // A glyph carries flat alpha and no colour, so it is a mask over the
    // accent rather than an image painted as-is.
    const glyph = screen.getByTestId('altvatar-glyph');
    expect(glyph).toHaveStyle({ maskImage: `url("${ART}")` });
    expect(screen.queryByTestId('altvatar-art')).toBeNull();
  });

  it('NoArt_FallsBackToInitialsAndNotToAnIcon', () => {
    render(<ProfileAvatar profile={profile({})} />);

    expect(screen.getByText('GH')).toBeInTheDocument();
    expect(screen.queryByTestId('altvatar-art')).toBeNull();
    expect(screen.queryByTestId('altvatar-glyph')).toBeNull();
    // No generic user icon stands in for a missing face: a profile's name is
    // required, so initials always resolve and the third leg has no reason to
    // exist.
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('NoAccent_PaintsTheFallbackPresetsFillBehindTheArt', () => {
    const { container } = render(
      <ProfileAvatar
        profile={profile({ accent: null, art: ART, avatarStyle: 'avataaars' })}
      />
    );

    // The disc is never bare: an accent-less profile takes the palette's
    // fallback preset whole, so the art still sits on a colour.
    /* eslint-disable testing-library/no-container, testing-library/no-node-access -- the disc is aria-hidden and carries the accent as custom properties, reachable by neither role nor name. */
    const disc = container.querySelector<HTMLElement>('.altvatar-disc');
    /* eslint-enable testing-library/no-container, testing-library/no-node-access */
    expect(disc?.style.getPropertyValue('--accent-disc')).toBe(
      ACCENT_PRESETS.iris.light
    );
    expect(screen.getByTestId('altvatar-art')).toBeInTheDocument();
  });
});
