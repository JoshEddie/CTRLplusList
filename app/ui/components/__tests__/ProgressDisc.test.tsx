/* eslint-disable testing-library/no-node-access --
 * The disc is decorative: no role, no text, and `aria-hidden` by design, so no
 * Testing Library query can reach it. Its whole output is the `--progress`
 * custom property the stylesheet paints from, read off a classed `document`
 * query. */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProgressDisc from '../ProgressDisc';

// The stylesheet paints the wedge from `--progress`, so the property the disc
// carries is the whole of what it renders.
function progressOf(value: number): string | undefined {
  render(<ProgressDisc value={value} />);
  return document
    .querySelector<HTMLElement>('.progress-disc-inside')
    ?.style.getPropertyValue('--progress');
}

describe('ProgressDisc', () => {
  it('FractionInRange_PaintsTheWedgeToThatFraction', () => {
    expect(progressOf(0.25)).toBe('0.25');
  });

  it('ValueAboveOne_ClampsToAFullTurn', () => {
    expect(progressOf(1.6)).toBe('1');
  });

  it('NegativeValue_ClampsToEmpty', () => {
    expect(progressOf(-0.5)).toBe('0');
  });

  // Decorative: the count beside it is what states the fraction, so the disc
  // announcing a second time is noise in the banner's `role="status"`.
  it('Rendered_IsHiddenFromAssistiveTech', () => {
    render(<ProgressDisc value={0.5} />);
    expect(document.querySelector('.progress-disc')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
  });
});
