import { describe, expect, it } from 'vitest';
import { getMessage } from '../utils';

describe('getMessage', () => {
  it('MessageWithoutArguments_ReturnsFullyClaimed', () => {
    expect(getMessage('claim_fully_claimed')).toBe('Fully claimed');
  });

  it('MessageWithOneArgument_InterpolatesNames', () => {
    expect(getMessage('claim_banner_for_others', { names: 'Ada, Grace' })).toBe(
      'You claimed this for Ada, Grace'
    );
  });

  describe('PluralMessage', () => {
    it('Count0_ReturnsEmptyString', () => {
      expect(getMessage('claim_summary', { count: 0 })).toBe('');
    });

    it.each([
      [1, '1 person'],
      [2, '2 people'],
      [1234, '1,234 people'],
    ])('Count%i_ReturnsPersonPhrase', (count, expected) => {
      expect(getMessage('claim_summary', { count })).toBe(expected);
    });
  });

  it.each([
    ['claim_circle_viewer' as const, "Ada's circle"],
    ['claim_remove_other_aria_label' as const, "Remove Ada's claim"],
  ])('PossessiveName_RendersLiteralApostrophe', (key, expected) => {
    expect(getMessage(key, { name: 'Ada' })).toBe(expected);
  });
});
