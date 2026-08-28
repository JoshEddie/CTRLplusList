/**
 * Pins `profiles-surface`'s one-field SHALL: the face and the accent are one
 * input, edited in one place, and the host owns the value — the customizer
 * hands one back and persists nothing itself.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ACCENT_NAMES, ACCENT_PRESETS } from '@/lib/accent';
import type { AltvatarDraft } from '../AltvatarCustomizer';
import AltvatarField from '../AltvatarField';

vi.mock('@/lib/altvatar/render', () => ({
  renderAltvatar: (styleId: string) => Promise.resolve(`data:${styleId}`),
}));

const onChange = vi.fn();

const draft: AltvatarDraft = {
  style: 'icons',
  options: { seed: 'kiddo', selections: {} },
  accent: ACCENT_NAMES[0],
};

const renderField = (
  props: Partial<Parameters<typeof AltvatarField>[0]> = {}
) =>
  render(
    <AltvatarField value={draft} onChange={onChange} name="Kiddo" {...props} />
  );

// The field wears its accent rather than naming it, so what it is holding is
// read back off the custom properties it sets.
/* eslint-disable testing-library/no-node-access -- the field carries no role of its own. */
const fieldAccentDisc = (container: HTMLElement) =>
  container
    .querySelector<HTMLElement>('.altvatar-field')
    ?.style.getPropertyValue('--accent-disc');
/* eslint-enable testing-library/no-node-access */

const openCustomizer = () =>
  userEvent.click(screen.getByRole('button', { name: /edit altvatar/i }));
const customizer = () =>
  screen.queryByRole('dialog', { name: 'Customise your Altvatar' });

beforeEach(() => {
  onChange.mockClear();
});

describe('Closed', () => {
  it('Rendered_LabelsItselfAltvatar-PreviewsTheHostsName', () => {
    const { container } = renderField();
    expect(screen.getByText('Altvatar')).toBeInTheDocument();
    expect(screen.getByText('Kiddo')).toBeInTheDocument();
    expect(fieldAccentDisc(container)).toBe(
      ACCENT_PRESETS[ACCENT_NAMES[0]].light
    );
  });

  it('Rendered_ShowsNoCustomizerUntilAsked', () => {
    renderField();
    expect(customizer()).toBeNull();
  });
  
});

describe('Open', () => {
  it('ClickEdit_OpensTheCustomizer-ReportsNoChangeYet', async () => {
    renderField();
    await openCustomizer();
    expect(customizer()).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Confirm_ReportsTheDraft-ClosesTheCustomizer', async () => {
    renderField();
    await openCustomizer();
    await userEvent.click(screen.getByRole('radio', { name: ACCENT_NAMES[2] }));
    await userEvent.click(
      screen.getByRole('button', { name: /use this altvatar/i })
    );

    expect(onChange).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ accent: ACCENT_NAMES[2] })
    );
    expect(customizer()).toBeNull();
  });

  it('Cancel_ClosesTheCustomizer-ReportsNoChange', async () => {
    const { container } = renderField();
    await openCustomizer();
    await userEvent.click(screen.getByRole('radio', { name: ACCENT_NAMES[2] }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(customizer()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
    // The host's prior accent is what the field still wears.
    expect(fieldAccentDisc(container)).toBe(
      ACCENT_PRESETS[ACCENT_NAMES[0]].light
    );
  });
});
