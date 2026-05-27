import { render, screen } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { describe, expect, it, vi } from 'vitest';
import Logo from '../Logo';

type MockImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
};
vi.mock('next/image', () => ({
  default: function MockImage({
    priority,
    width,
    height,
    src,
    alt,
    ...rest
  }: MockImageProps) {
    return (
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        fetchPriority={priority ? 'high' : 'auto'}
        {...rest}
      />
    );
  },
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
