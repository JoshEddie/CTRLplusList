import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Logo from '../Logo';

vi.mock('next/image', async () => ({
  default: (await import('./test-helpers')).MockNextImage,
}));

describe('Logo', () => {
  describe('DomShape', () => {
    it('Default_RendersImgNotAnchor', () => {
      render(<Logo />);
      const img = screen.getByAltText('Ctrl+List');
      expect(img.tagName).toBe('IMG');
      expect(screen.queryByRole('link')).toBeNull();
    });
  });

  describe('ImageAttributes', () => {
    it('Image_HasAltCtrlPlusList', () => {
      render(<Logo />);
      expect(screen.getByAltText('Ctrl+List')).toBeInTheDocument();
    });

    it('Image_HasClassMenuLogo', () => {
      render(<Logo />);
      expect(screen.getByAltText('Ctrl+List')).toHaveClass('menu-logo');
    });

    it('Image_HasWidth199Height52', () => {
      render(<Logo />);
      const img = screen.getByAltText('Ctrl+List');
      expect(img).toHaveAttribute('width', '199');
      expect(img).toHaveAttribute('height', '52');
    });

    it('Image_HasFetchpriorityHigh', () => {
      render(<Logo />);
      expect(screen.getByAltText('Ctrl+List')).toHaveAttribute(
        'fetchpriority',
        'high'
      );
    });
  });
});
