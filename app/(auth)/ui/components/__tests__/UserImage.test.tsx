import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UserImage from '../UserImage';

vi.mock('next/image', async () => ({
  default: (await import('./test-helpers')).MockNextImage,
}));

describe('UserImage', () => {
  it('NamedImage_RendersAvatarImgWithAltAndSrc', () => {
    render(
      <UserImage image="https://img.example/ada.png" name="Ada Lovelace" />
    );
    const img = screen.getByAltText('Ada Lovelace');
    expect(img).toHaveClass('avatar');
    expect(img).toHaveAttribute('src', 'https://img.example/ada.png');
  });

  it('EmptyName_RendersAvatarImgWithEmptyAlt', () => {
    // An empty alt makes the image presentational, so it has no `img` role —
    // query the `.avatar` class the component always applies instead. (jsdom
    // normalizes an empty `src` to null, so only `alt` is asserted here.)
    const { container } = render(<UserImage image="" name="" />);
    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- empty alt makes the img presentational (no `img` role); `.avatar` is the only stable handle
    const img = container.querySelector('img.avatar');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('alt', '');
  });
});
