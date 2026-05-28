/* eslint-disable testing-library/no-node-access --
 * AppLogo's contract is the exact DOM shape (anchor wrapping image with
 * specific classes / attrs / dimensions). Role queries reach the anchor but
 * not the `app-logo-image` class or the `width`/`height`/`fetchpriority`
 * attribute set we lock; classed descendant queries are the only path.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppLogo from '../AppLogo';

vi.mock('next/link', async () => ({
  default: (await import('./test-helpers')).MockNextLink,
}));

vi.mock('next/image', async () => ({
  default: (await import('./test-helpers')).MockNextImage,
}));

describe('AppLogo', () => {
  describe('DomShape', () => {
    it('Default_RendersAnchorWithHrefRoot', () => {
      render(<AppLogo />);
      const anchor = screen.getByRole('link', { name: 'Ctrl+List home' });
      expect(anchor.tagName).toBe('A');
      expect(anchor).toHaveAttribute('href', '/');
      expect(anchor).toHaveClass('app-logo');
      expect(anchor).toHaveAttribute('aria-label', 'Ctrl+List home');
    });

    it('Anchor_ContainsImage', () => {
      render(<AppLogo />);
      const anchor = screen.getByRole('link', { name: 'Ctrl+List home' });
      const img = anchor.querySelector('img');
      expect(img).not.toBeNull();
    });
  });

  describe('ImageAttributes', () => {
    it('Image_HasAltCtrlPlusList', () => {
      render(<AppLogo />);
      expect(screen.getByAltText('Ctrl+List').tagName).toBe('IMG');
    });

    it('Image_HasClassAppLogoImage', () => {
      render(<AppLogo />);
      expect(screen.getByAltText('Ctrl+List')).toHaveClass('app-logo-image');
    });

    it('Image_HasWidth199Height52', () => {
      render(<AppLogo />);
      const img = screen.getByAltText('Ctrl+List');
      expect(img).toHaveAttribute('width', '199');
      expect(img).toHaveAttribute('height', '52');
    });

    it('Image_HasFetchpriorityHigh', () => {
      render(<AppLogo />);
      expect(screen.getByAltText('Ctrl+List')).toHaveAttribute(
        'fetchpriority',
        'high'
      );
    });
  });
});
