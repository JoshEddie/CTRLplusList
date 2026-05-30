/* eslint-disable testing-library/no-container, testing-library/no-node-access --
 * Avatar's image carries `alt=""` (decorative) so it has no `img` role, and the
 * wrapper span / initials / FaUser fallback carry only classes and no role or
 * accessible name. Classed `container.querySelector` is the only way to assert
 * which branch rendered and the size style.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Avatar from '../Avatar';

describe('Avatar', () => {
  it('HasSrc_RendersImg', () => {
    const { container } = render(<Avatar src="https://x/a.png" name="Alice" />);
    expect(container.querySelector('img')).toHaveAttribute(
      'src',
      'https://x/a.png'
    );
  });

  it('ImgOnError_FallsBackToInitials', () => {
    const { container } = render(
      <Avatar src="https://x/a.png" name="Alice Bob" />
    );
    fireEvent.error(container.querySelector('img') as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText('AB')).toHaveClass('user-avatar-initials');
  });

  it('NoSrcWithName_RendersInitials', () => {
    render(<Avatar src={null} name="Alice Bob" />);
    expect(screen.getByText('AB')).toHaveClass('user-avatar-initials');
  });

  it('NoSrcNoName_RendersFaUserFallback', () => {
    const { container } = render(<Avatar src={null} name={null} />);
    expect(container.querySelector('.user-avatar-fallback')).not.toBeNull();
  });

  it('AriaHidden_AndSizeStyleApplied', () => {
    const { container } = render(
      <Avatar src={null} name="Alice" size={48} />
    );
    const wrap = container.querySelector('.user-avatar') as HTMLElement;
    expect(wrap).toHaveAttribute('aria-hidden');
    expect(wrap.style.width).toBe('48px');
    expect(wrap.style.height).toBe('48px');
  });
});
