import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import ItemPhoto from '../ItemPhoto';

describe('ItemPhoto', () => {
  it('UrlPresent_RendersLazyImgWithSrcAndAlt', () => {
    render(<ItemPhoto name="Tea kettle" url="https://img.test/kettle.jpg" />);
    const img = screen.getByRole('img', { name: 'Tea kettle' });
    expect(img).toHaveAttribute('src', 'https://img.test/kettle.jpg');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveClass('item-image');
  });

  it('UrlEmpty_RendersNoImg', () => {
    render(<ItemPhoto name="Tea kettle" url="" />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
