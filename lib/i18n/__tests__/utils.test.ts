// @vitest-environment jsdom
// getRichMessage's parts are meant for JSX, so this one test group renders
// them through Testing Library — the rest of this file stays plain `node`.
import { render, screen } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { getMessage, getRichMessage } from '../utils';

describe('getMessage', () => {
  it('MessageWithoutArguments_ReturnsFullyClaimed', () => {
    expect(getMessage('claim_fully_claimed')).toBe('Fully claimed');
  });

  it('MessageWithOneArgument_InterpolatesNames', () => {
    expect(getMessage('claim_row_meta_added_by', { name: 'Ada' })).toBe(
      'Added by Ada'
    );
  });

  describe('PluralMessage', () => {
    it.each([
      [1, '1 other claim'],
      [2, '2 other claims'],
      [1234, '1,234 other claims'],
    ])('Count%i_ReturnsTheClaimPhrase', (count, expected) => {
      expect(getMessage('claim_other_claims', { count })).toBe(expected);
    });
  });

  it.each([
    ['claim_circle_viewer' as const, "Ada's circle"],
    ['claim_remove_other_aria_label' as const, "Remove Ada's claim"],
  ])('PossessiveName_RendersLiteralApostrophe', (key, expected) => {
    expect(getMessage(key, { name: 'Ada' })).toBe(expected);
  });
});

describe('getRichMessage', () => {
  it('TaggedMessage_WrapsTheTagsChunksWithTheGivenElement-RendersSurroundingText', () => {
    const { container } = render(
      createElement(
        'span',
        null,
        getRichMessage('claim_counter', {
          claimed: 2,
          quantity: 5,
          qty: (chunks) => createElement('b', { 'data-testid': 'qty' }, chunks),
        })
      )
    );
    expect(container.textContent).toBe('2 / 5 Claimed');
    expect(screen.getByTestId('qty').textContent).toBe('5');
  });
});
