/* eslint-disable testing-library/no-node-access, testing-library/no-container --
 * The icons are decorative (aria-hidden) so they carry no role or accessible
 * name; container.querySelector is the only way to reach the rendered svg.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FIELD_ICONS } from '../field-icons';

describe('FIELD_ICONS', () => {
  it('Registry_CarriesTheSpecdFieldKinds', () => {
    expect(Object.keys(FIELD_ICONS)).toEqual([
      'name',
      'date',
      'link',
      'email',
      'search',
    ]);
  });

  it('EveryIcon_RendersAriaHiddenSvg', () => {
    for (const icon of Object.values(FIELD_ICONS)) {
      const { container } = render(icon);
      const svg = container.querySelector('svg');
      expect(svg).not.toBeNull();
      expect(svg!.getAttribute('aria-hidden')).toBe('true');
    }
  });
});
