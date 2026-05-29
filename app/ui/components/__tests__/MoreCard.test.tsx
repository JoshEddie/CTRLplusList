/* eslint-disable testing-library/no-node-access --
 * MoreCard's contract is the exact DOM: the `<a class="more-card">` root, the
 * `.more-card-text` visible label, and the `aria-hidden` arrow span. Classed
 * `document` queries are required to read the label span and assert the arrow
 * glyph is hidden from the accessibility tree.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MoreCard from '../MoreCard';

vi.mock('next/link', async () => ({
  default: (await import('./test-helpers')).MockNextLink,
}));

describe('MoreCard', () => {
  describe('DomShape', () => {
    it('Default_RendersAnchorWithHrefAndAriaLabel', () => {
      render(<MoreCard moreCount={4} href="/lists" />);
      const anchor = screen.getByRole('link', { name: '4 more — see all' });
      expect(anchor).toHaveClass('more-card');
      expect(anchor).toHaveAttribute('href', '/lists');
    });

    it('Default_VisibleTextIsPlusCountMore', () => {
      render(<MoreCard moreCount={4} href="/lists" />);
      expect(document.querySelector('.more-card-text')).toHaveTextContent(
        '+4 more →'
      );
    });

    it('Default_ArrowGlyphIsAriaHidden', () => {
      render(<MoreCard moreCount={4} href="/lists" />);
      const arrow = document.querySelector(
        '.more-card-text [aria-hidden="true"]'
      );
      expect(arrow).toHaveTextContent('→');
    });
  });
});
